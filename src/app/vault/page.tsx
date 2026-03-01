import { getVaultTree, getRecentFiles } from "@/lib/vault";
import type { VaultFile } from "@/lib/vault";
import Link from "next/link";
import { RelativeTime } from "./relative-time";

function countFiles(node: VaultFile): number {
  if (!node.isDir) return 1;
  return node.children?.reduce((sum, child) => sum + countFiles(child), 0) ?? 0;
}

export default async function VaultIndex() {
  const [tree, recentFiles] = await Promise.all([getVaultTree(), getRecentFiles()]);

  const sections = tree.filter((node) => node.isDir);

  return (
    <div>
      <h1 className="vault-home-title">vault</h1>
      <p className="vault-home-subtitle">personal knowledge base</p>

      {/* Section overview */}
      <div className="vault-sections-grid">
        {sections.map((section) => {
          const count = countFiles(section);
          return (
            <Link
              key={section.slug}
              href={`/vault/${section.slug}`}
              className="vault-section-card"
            >
              <span className="vault-section-name">{section.name}</span>
              <span className="vault-section-count">
                {count} {count === 1 ? "note" : "notes"}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Recent entries */}
      {recentFiles.length > 0 && (
        <section className="vault-recent">
          <h2 className="vault-recent-heading">recently updated</h2>
          <div className="vault-recent-list">
            {recentFiles.map((file) => (
              <Link
                key={file.path}
                href={`/vault/${file.path}`}
                className="vault-recent-card"
              >
                <span className="vault-recent-title">{file.title}</span>
                <span className="vault-recent-meta">
                  <span className="vault-recent-path">
                    {file.path.split("/").slice(0, -1).join(" / ")}
                  </span>
                  <RelativeTime date={file.updatedAt} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
