import { getVaultPage } from "@/lib/vault";
import { notFound } from "next/navigation";

export default async function VaultPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = await getVaultPage(slug);

  if (!page) notFound();

  return (
    <div className="prose">
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
    </div>
  );
}
