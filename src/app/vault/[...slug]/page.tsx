import { getVaultPage, getBacklinks } from "@/lib/vault";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function VaultPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = await getVaultPage(slug);

  if (!page) notFound();

  const allBacklinks = await getBacklinks();
  const currentSlug = slug.join("/");
  const backlinks = allBacklinks[currentSlug] || [];

  const breadcrumbs = slug.map((segment, i) => ({
    label: segment.replace(/-/g, " "),
    href: `/vault/${slug.slice(0, i + 1).join("/")}`,
  }));

  return (
    <div className="vault-prose">
      <nav
        className="flex items-center gap-1 text-sm mb-4"
        style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-muted)" }}
      >
        <Link href="/vault" className="hover:underline" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>
          vault
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            <span>/</span>
            {i === breadcrumbs.length - 1 ? (
              <span style={{ color: "var(--color-text)" }}>{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:underline" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
      {backlinks.length > 0 && (
        <div className="vault-backlinks">
          <h3>Linked from</h3>
          <ul>
            {backlinks.map((bl) => (
              <li key={bl.slug}>
                <Link href={`/vault/${bl.slug}`}>
                  {bl.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
