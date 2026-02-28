import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getVaultTree } from "@/lib/vault";
import { VaultSidebar } from "./sidebar";

export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const tree = await getVaultTree();

  return (
    <div className="flex gap-8 pt-6" style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.5rem" }}>
      <aside className="w-56 shrink-0">
        <div className="sticky top-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--color-text-muted)" }}>
            vault
          </h2>
          <VaultSidebar tree={tree} />
          <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{session.user.email}</p>
            <a href="/api/auth/signout" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--color-accent)" }}>
              sign out
            </a>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 pb-20">{children}</main>
    </div>
  );
}
