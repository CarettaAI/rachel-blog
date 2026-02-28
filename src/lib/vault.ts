import { list } from "@vercel/blob";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import fs from "fs/promises";
import path from "path";
import os from "os";

const VAULT_INDEX_KEY = "vault-index.json";
const isDev = process.env.NODE_ENV === "development";
const LOCAL_VAULT_DIR = path.join(os.homedir(), "Documents", "rachel-vault");

const SKIP_DIRS = new Set([".obsidian", "projects/done"]);

export interface VaultFile {
  slug: string;
  name: string;
  isDir: boolean;
  children?: VaultFile[];
}

export interface Backlink {
  slug: string;
  title: string;
}

interface VaultIndex {
  tree: VaultFile[];
  backlinks: Record<string, Backlink[]>;
}

// --- Dev mode: walk local filesystem ---

async function walkDir(dir: string, relPrefix: string = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || SKIP_DIRS.has(rel)) continue;
      files.push(...await walkDir(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith(".md")) {
      files.push(rel);
    }
  }
  return files;
}

function buildTree(mdPaths: string[]): VaultFile[] {
  const root: Record<string, VaultFile> = {};

  for (const filePath of mdPaths) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        // leaf file
        const name = part.replace(/\.md$/, "");
        const slug = filePath.replace(/\.md$/, "");
        const key = `file:${slug}`;
        current[key] = { slug, name, isDir: false };
      } else {
        // directory node
        const dirSlug = parts.slice(0, i + 1).join("/");
        const key = `dir:${dirSlug}`;
        if (!current[key]) {
          current[key] = { slug: dirSlug, name: part, isDir: true, children: [] };
        }
        // descend into the children map for this directory
        if (!(current[key] as any)._childMap) {
          (current[key] as any)._childMap = {};
        }
        current = (current[key] as any)._childMap;
      }
    }
  }

  function collect(map: Record<string, VaultFile>): VaultFile[] {
    const result: VaultFile[] = [];
    for (const [, node] of Object.entries(map)) {
      if (node.isDir && (node as any)._childMap) {
        node.children = collect((node as any)._childMap);
        delete (node as any)._childMap;
      }
      result.push(node);
    }
    // Sort: directories first, then alphabetically
    result.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return result;
  }

  return collect(root);
}

function extractWikiLinkTargets(content: string): string[] {
  const targets: string[] = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const inner = m[1];
    // [[display|target]] or [[target]]
    const target = inner.includes("|") ? inner.split("|")[1].trim() : inner.trim();
    targets.push(target.toLowerCase().replace(/\s+/g, "-"));
  }
  return targets;
}

async function computeDevBacklinks(mdPaths: string[]): Promise<Record<string, Backlink[]>> {
  const backlinks: Record<string, Backlink[]> = {};

  for (const filePath of mdPaths) {
    const slug = filePath.replace(/\.md$/, "");
    const raw = await fs.readFile(path.join(LOCAL_VAULT_DIR, filePath), "utf-8");
    const { data: frontmatter, content } = matter(raw);
    const title = (frontmatter.title as string) || slug.split("/").pop()!;
    const targets = extractWikiLinkTargets(content);

    for (const target of targets) {
      if (!backlinks[target]) backlinks[target] = [];
      // Avoid duplicates
      if (!backlinks[target].some((bl) => bl.slug === slug)) {
        backlinks[target].push({ slug, title });
      }
    }
  }

  return backlinks;
}

// --- Shared index loading ---

async function getVaultIndex(): Promise<VaultIndex | null> {
  try {
    if (isDev) {
      const mdPaths = await walkDir(LOCAL_VAULT_DIR);
      const tree = buildTree(mdPaths);
      const backlinks = await computeDevBacklinks(mdPaths);
      return { tree, backlinks };
    }
    const { blobs } = await list({ prefix: VAULT_INDEX_KEY });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    return null;
  }
}

export async function getVaultTree(): Promise<VaultFile[]> {
  const index = await getVaultIndex();
  return index?.tree ?? [];
}

export async function getBacklinks(): Promise<Record<string, Backlink[]>> {
  const index = await getVaultIndex();
  return index?.backlinks ?? {};
}

function resolveWikiLinks(htmlContent: string): string {
  return htmlContent.replace(/\[\[([^\]]+)\]\]/g, (_match, inner: string) => {
    let display: string;
    let target: string;
    if (inner.includes("|")) {
      const parts = inner.split("|");
      display = parts[0].trim();
      target = parts[1].trim();
    } else {
      display = inner.trim();
      target = inner.trim();
    }
    const slug = target.toLowerCase().replace(/\s+/g, "-");
    return `<a href="/vault/${slug}">${display}</a>`;
  });
}

export async function getVaultPage(slugParts: string[]): Promise<{ title: string; contentHtml: string } | null> {
  const filePath = slugParts.join("/");
  try {
    let rawContent: string;
    if (isDev) {
      rawContent = await fs.readFile(path.join(LOCAL_VAULT_DIR, `${filePath}.md`), "utf-8");
    } else {
      const { blobs } = await list({ prefix: `vault/${filePath}.json` });
      if (blobs.length === 0) return null;
      const res = await fetch(blobs[0].url);
      const data = await res.json();
      rawContent = data.content;
    }
    const { data: frontmatter, content } = matter(rawContent);
    const processed = await remark().use(html).process(content);
    return {
      title: (frontmatter.title as string) || slugParts[slugParts.length - 1],
      contentHtml: resolveWikiLinks(processed.toString()),
    };
  } catch {
    return null;
  }
}
