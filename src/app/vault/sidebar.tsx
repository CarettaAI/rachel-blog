"use client";

import type { VaultFile } from "@/lib/vault";
import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";

function matchesSearch(file: VaultFile, query: string): boolean {
  const q = query.toLowerCase();
  if (file.name.toLowerCase().includes(q)) return true;
  if (file.children?.some((child) => matchesSearch(child, q))) return true;
  return false;
}

function FileNode({
  file,
  depth = 0,
  search,
  currentSlug,
}: {
  file: VaultFile;
  depth?: number;
  search: string;
  currentSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const forceOpen = search.length > 0;
  const isOpen = forceOpen || open;

  if (file.isDir) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="vault-tree-dir"
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          <span className="text-xs">{isOpen ? "▾" : "▸"}</span>
          {file.name}
        </button>
        {isOpen &&
          file.children
            ?.filter((child) => !search || matchesSearch(child, search))
            .map((child) => (
              <FileNode
                key={child.slug}
                file={child}
                depth={depth + 1}
                search={search}
                currentSlug={currentSlug}
              />
            ))}
      </div>
    );
  }

  const isActive = currentSlug === `/vault/${file.slug}`;

  return (
    <a
      href={`/vault/${file.slug}`}
      className={`vault-tree-file ${isActive ? "active" : ""}`}
      style={{ paddingLeft: `${depth * 12 + 16}px` }}
    >
      {file.name}
    </a>
  );
}

export function VaultSidebar({ tree }: { tree: VaultFile[] }) {
  const [search, setSearch] = useState("");
  const pathname = usePathname();

  const filtered = useMemo(() => {
    if (!search) return tree;
    return tree.filter((file) => matchesSearch(file, search));
  }, [tree, search]);

  return (
    <nav>
      <input
        type="text"
        placeholder="Search vault…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="vault-search"
      />
      {filtered.map((file) => (
        <FileNode key={file.slug} file={file} search={search} currentSlug={pathname} />
      ))}
    </nav>
  );
}
