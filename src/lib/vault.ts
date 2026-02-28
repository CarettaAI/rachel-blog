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

async function getVaultIndex(): Promise<VaultIndex | null> {
  try {
    if (isDev) {
      const raw = await fs.readFile(path.join(LOCAL_VAULT_DIR, VAULT_INDEX_KEY), "utf-8");
      return JSON.parse(raw);
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
    let data: { content: string };
    if (isDev) {
      const raw = await fs.readFile(path.join(LOCAL_VAULT_DIR, `vault/${filePath}.json`), "utf-8");
      data = JSON.parse(raw);
    } else {
      const { blobs } = await list({ prefix: `vault/${filePath}.json` });
      if (blobs.length === 0) return null;
      const res = await fetch(blobs[0].url);
      data = await res.json();
    }
    const { data: frontmatter, content } = matter(data.content);
    const processed = await remark().use(html).process(content);
    return {
      title: (frontmatter.title as string) || slugParts[slugParts.length - 1],
      contentHtml: resolveWikiLinks(processed.toString()),
    };
  } catch {
    return null;
  }
}
