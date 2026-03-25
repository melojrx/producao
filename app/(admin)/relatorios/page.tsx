export default async function RelatoriosPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/relatorios')
}
