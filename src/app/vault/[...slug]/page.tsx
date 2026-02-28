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

  return (
    <div className="prose">
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
      {backlinks.length > 0 && (
        <div className="mt-12 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">Linked from</h3>
          <ul className="list-none pl-0 space-y-1">
            {backlinks.map((bl) => (
              <li key={bl.slug} className="pl-0">
                <Link href={`/vault/${bl.slug}`} className="text-sm hover:underline">
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
