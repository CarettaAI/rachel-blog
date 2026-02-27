import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const essaysDirectory = path.join(process.cwd(), "content/essays");

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

export function getAllEssays(): EssayMeta[] {
  const fileNames = fs.readdirSync(essaysDirectory);
  return fileNames
    .filter((f) => f.endsWith(".md"))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const fullPath = path.join(essaysDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);
      return { slug, title: data.title, date: data.date, description: data.description, theme: data.theme };
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getEssay(slug: string): Promise<Essay> {
  const fullPath = path.join(essaysDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const processedContent = await remark().use(html).process(content);
  return {
    slug, title: data.title, date: data.date, description: data.description,
    theme: data.theme, contentHtml: processedContent.toString(),
  };
}

export function getAllEssaySlugs(): string[] {
  return fs.readdirSync(essaysDirectory).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
}
