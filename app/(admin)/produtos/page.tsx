export default async function ProdutosPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/produtos')
}
