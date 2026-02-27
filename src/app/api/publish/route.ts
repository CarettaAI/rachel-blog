import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { slugify, storeEssay } from "@/lib/essays";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.replace("Bearer ", "");
  if (!token || token !== process.env.RACHEL_BLOG_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { title, date, description, theme, content } = await req.json();

    if (!title || !date || !content) {
      return NextResponse.json(
        { error: "missing required fields: title, date, content" },
        { status: 400 }
      );
    }

    const slug = `${date}-${slugify(title)}`;

    await storeEssay(
      { slug, title, date, description: description || "", theme: theme || "" },
      content
    );

    revalidatePath("/");
    revalidatePath(`/essays/${slug}`);

    return NextResponse.json({ success: true, slug, url: `/essays/${slug}` });
  } catch (err: any) {
    return NextResponse.json(
      { error: "failed to publish", detail: err.message },
      { status: 500 }
    );
  }
}
