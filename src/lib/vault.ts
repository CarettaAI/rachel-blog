import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const VAULT_DIR = path.join(process.cwd(), "content", "vault");

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

export function getVaultTree(dir: string = VAULT_DIR, prefix: string = ""): VaultFile[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  return entries
    .filter((e) => !e.name.startsWith("."))
    .map((entry) => {
      const slug = prefix ? `${prefix}/${entry.name.replace(/\.md$/, "")}` : entry.name.replace(/\.md$/, "");
      if (entry.isDirectory()) {
        return {
          slug,
          name: entry.name,
          isDir: true,
          children: getVaultTree(path.join(dir, entry.name), slug),
        };
      }
      if (entry.name.endsWith(".md")) {
        return { slug, name: entry.name.replace(/\.md$/, ""), isDir: false };
      }
      return null;
    })
    .filter(Boolean) as VaultFile[];
}

function getAllVaultFiles(dir: string = VAULT_DIR, prefix: string = ""): { slug: string; fullPath: string }[] {
  if (!fs.existsSync(dir)) return [];
  const results: { slug: string; fullPath: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllVaultFiles(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name));
    } else if (entry.name.endsWith(".md")) {
      const slug = prefix ? `${prefix}/${entry.name.replace(/\.md$/, "")}` : entry.name.replace(/\.md$/, "");
      results.push({ slug, fullPath });
    }
  }
  return results;
}

export function getBacklinks(): Record<string, Backlink[]> {
  const allFiles = getAllVaultFiles();
  const backlinks: Record<string, Backlink[]> = {};

  for (const file of allFiles) {
    const raw = fs.readFileSync(file.fullPath, "utf-8");
    const { data, content } = matter(raw);
    const title = (data.title as string) || file.slug.split("/").pop() || file.slug;

    // Wiki-style links: [[page]] or [[display text|page-name]]
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = wikiLinkRegex.exec(content)) !== null) {
      const inner = match[1];
      const target = inner.includes("|") ? inner.split("|").pop()!.trim() : inner.trim();
      const targetSlug = target.toLowerCase().replace(/\s+/g, "-");
      if (targetSlug !== file.slug) {
        if (!backlinks[targetSlug]) backlinks[targetSlug] = [];
        if (!backlinks[targetSlug].some((b) => b.slug === file.slug)) {
          backlinks[targetSlug].push({ slug: file.slug, title });
        }
      }
    }

    // Markdown links to vault pages: [text](/vault/some-page)
    const mdLinkRegex = /\[([^\]]*)\]\(\/vault\/([^)]+)\)/g;
    while ((match = mdLinkRegex.exec(content)) !== null) {
      const targetSlug = match[2].replace(/^\/+|\/+$/g, "");
      if (targetSlug !== file.slug) {
        if (!backlinks[targetSlug]) backlinks[targetSlug] = [];
        if (!backlinks[targetSlug].some((b) => b.slug === file.slug)) {
          backlinks[targetSlug].push({ slug: file.slug, title });
        }
      }
    }
  }

  return backlinks;
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
  const filePath = path.join(VAULT_DIR, ...slugParts) + ".md";
  const indexPath = path.join(VAULT_DIR, ...slugParts, "index.md");

  let fullPath: string;
  if (fs.existsSync(filePath)) {
    fullPath = filePath;
  } else if (fs.existsSync(indexPath)) {
    fullPath = indexPath;
  } else {
    return null;
  }

  const raw = fs.readFileSync(fullPath, "utf-8");
  const { data, content } = matter(raw);
  const processed = await remark().use(html).process(content);

  return {
    title: (data.title as string) || slugParts[slugParts.length - 1],
    contentHtml: resolveWikiLinks(processed.toString()),
  };
}
