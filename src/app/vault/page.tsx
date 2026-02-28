import { getVaultPage } from "@/lib/vault";

export default async function VaultIndex() {
  const page = await getVaultPage(["index"]);

  if (!page) {
    return (
      <div className="prose">
        <h1>vault</h1>
        <p>welcome to the vault. select a page from the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="prose">
      <h1>{page.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
    </div>
  );
}
