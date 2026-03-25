export default async function OperacoesPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/operacoes')
}
