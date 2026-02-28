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
    contentHtml: processed.toString(),
  };
}
