import { list } from "@vercel/blob";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const VAULT_INDEX_KEY = "vault-index.json";

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
    const { blobs } = await list({ prefix: `vault/${filePath}.json` });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    const data = await res.json();
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
