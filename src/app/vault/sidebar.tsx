"use client";

import type { VaultFile } from "@/lib/vault";
import { useState } from "react";

function FileNode({ file, depth = 0 }: { file: VaultFile; depth?: number }) {
  const [open, setOpen] = useState(true);

  if (file.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 w-full text-left text-sm py-1 hover:opacity-70 transition-opacity"
          style={{ paddingLeft: `${depth * 12}px`, color: "var(--color-text-muted)", fontFamily: "var(--font-sans)" }}
        >
          <span className="text-xs">{open ? "▾" : "▸"}</span>
          {file.name}
        </button>
        {open && file.children?.map((child) => <FileNode key={child.slug} file={child} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <a
      href={`/vault/${file.slug}`}
      className="block text-sm py-1 hover:opacity-70 transition-opacity"
      style={{ paddingLeft: `${depth * 12 + 16}px`, color: "var(--color-text)", fontFamily: "var(--font-sans)", textDecoration: "none" }}
    >
      {file.name}
    </a>
  );
}

export function VaultSidebar({ tree }: { tree: VaultFile[] }) {
  return (
    <nav>
      {tree.map((file) => (
        <FileNode key={file.slug} file={file} />
      ))}
    </nav>
  );
}
