import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { storeEssay } from "@/lib/essays";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.replace("Bearer ", "");
  if (!token || token !== process.env.RACHEL_BLOG_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const essaysDir = path.join(process.cwd(), "content/essays");
    const files = fs.readdirSync(essaysDir).filter((f) => f.endsWith(".md"));
    const results = [];

    for (const file of files) {
      const fullPath = path.join(essaysDir, file);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);
      const slug = file.replace(/\.md$/, "");

      await storeEssay(
        {
          slug,
          title: data.title,
          date: data.date,
          description: data.description || "",
          theme: data.theme || "",
        },
        content
      );
      results.push(slug);
    }

    return NextResponse.json({ success: true, seeded: results });
  } catch (err: any) {
    return NextResponse.json(
      { error: "seed failed", detail: err.message },
      { status: 500 }
    );
  }
}
