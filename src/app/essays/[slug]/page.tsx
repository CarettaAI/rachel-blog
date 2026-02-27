import { getEssay, getAllEssaySlugs } from "@/lib/essays";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return getAllEssaySlugs().map((slug) => ({ slug }));
}

export default async function EssayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const essay = await getEssay(slug);
    return (
      <article className="pt-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "var(--font-serif)", lineHeight: "1.2" }}>
            {essay.title}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {essay.date} · {essay.theme}
          </p>
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: essay.contentHtml }} />
        <div className="mt-16 pt-8" style={{ borderTop: "1px solid var(--color-border)" }}>
          <a href="/" className="text-sm hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>← back to essays</a>
        </div>
      </article>
    );
  } catch {
    notFound();
  }
}
