import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import matter from "gray-matter";
import type { VaultFile, Backlink } from "@/lib/vault";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.replace("Bearer ", "");
  if (!token || token !== process.env.RACHEL_BLOG_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { files } = (await req.json()) as { files: { path: string; content: string }[] };

    if (!Array.isArray(files)) {
      return NextResponse.json({ error: "files must be an array" }, { status: 400 });
    }

    // Reject unsafe paths
    for (const file of files) {
      if (
        typeof file.path !== "string" ||
        file.path.startsWith("/") ||
        file.path.split("/").some((part) => part === ".." || part === ".")
      ) {
        return NextResponse.json({ error: "invalid file path" }, { status: 400 });
      }
    }

    const updatedAt = new Date().toISOString();

    // Store individual files
    for (const file of files) {
      await put(
        `vault/${file.path}.json`,
        JSON.stringify({ path: file.path, content: file.content, updatedAt }),
        { access: "public", allowOverwrite: true, addRandomSuffix: false }
      );
    }

    // Build tree from paths
    const tree = buildTree(files.map((f) => f.path));

    // Compute backlinks from file content
    const backlinks: Record<string, Backlink[]> = {};
    for (const file of files) {
      const { data, content } = matter(file.content, { engines: {} });
      const slug = file.path;
      const title = (data.title as string) || slug.split("/").pop() || slug;

      const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
      let match;
      while ((match = wikiLinkRegex.exec(content)) !== null) {
        const inner = match[1];
        const target = inner.includes("|") ? inner.split("|").pop()!.trim() : inner.trim();
        const targetSlug = target.toLowerCase().replace(/\s+/g, "-");
        if (targetSlug !== slug) {
          if (!backlinks[targetSlug]) backlinks[targetSlug] = [];
          if (!backlinks[targetSlug].some((b) => b.slug === slug)) {
            backlinks[targetSlug].push({ slug, title });
          }
        }
      }

      const mdLinkRegex = /\[([^\]]*)\]\(\/vault\/([^)]+)\)/g;
      while ((match = mdLinkRegex.exec(content)) !== null) {
        const targetSlug = match[2].replace(/^\/+|\/+$/g, "");
        if (targetSlug !== slug) {
          if (!backlinks[targetSlug]) backlinks[targetSlug] = [];
          if (!backlinks[targetSlug].some((b) => b.slug === slug)) {
            backlinks[targetSlug].push({ slug, title });
          }
        }
      }
    }

    // Store index
    await put("vault-index.json", JSON.stringify({ tree, backlinks }), {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
    });

    revalidatePath("/vault", "layout");

    return NextResponse.json({ success: true, synced: files.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: "failed to sync", detail: message }, { status: 500 });
  }
}

function buildTree(paths: string[]): VaultFile[] {
  const root: VaultFile[] = [];

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const slug = parts.slice(0, i + 1).join("/");
      let dir = current.find((f) => f.isDir && f.name === part);
      if (!dir) {
        dir = { slug, name: part, isDir: true, children: [] };
        current.push(dir);
      }
      current = dir.children!;
    }

    const fileName = parts[parts.length - 1];
    current.push({ slug: filePath, name: fileName, isDir: false });
  }

  sortTree(root);
  return root;
}

function sortTree(nodes: VaultFile[]): void {
  nodes.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const node of nodes) {
    if (node.children) sortTree(node.children);
  }
}
