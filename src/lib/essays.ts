import { list, put, head } from "@vercel/blob";
import { remark } from "remark";
import html from "remark-html";

const INDEX_KEY = "essays-index.json";

export interface EssayMeta {
  slug: string;
  title: string;
  date: string;
  description: string;
  theme: string;
}

export interface Essay extends EssayMeta {
  contentHtml: string;
}

export async function getAllEssays(): Promise<EssayMeta[]> {
  try {
    const { blobs } = await list({ prefix: INDEX_KEY });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    const essays: EssayMeta[] = await res.json();
    return essays.sort((a, b) => (a.date > b.date ? -1 : 1));
  } catch {
    return [];
  }
}

export async function getEssay(slug: string): Promise<Essay | null> {
  try {
    const { blobs } = await list({ prefix: `essays/${slug}.json` });
    if (blobs.length === 0) return null;
    const res = await fetch(blobs[0].url);
    const data = await res.json();
    const processedContent = await remark().use(html).process(data.content);
    return {
      slug: data.slug,
      title: data.title,
      date: data.date,
      description: data.description,
      theme: data.theme,
      contentHtml: processedContent.toString(),
    };
  } catch {
    return null;
  }
}

export async function getAllEssaySlugs(): Promise<string[]> {
  const essays = await getAllEssays();
  return essays.map((e) => e.slug);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function storeEssay(
  meta: EssayMeta,
  content: string
): Promise<void> {
  // Store individual essay
  await put(`essays/${meta.slug}.json`, JSON.stringify({ ...meta, content }), {
    
    allowOverwrite: true,
    addRandomSuffix: false,
  });

  // Update index
  const existing = await getAllEssays();
  const filtered = existing.filter((e) => e.slug !== meta.slug);
  filtered.push(meta);
  filtered.sort((a, b) => (a.date > b.date ? -1 : 1));
  await put(INDEX_KEY, JSON.stringify(filtered), {
    
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}
