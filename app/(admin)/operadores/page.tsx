export default async function OperadoresPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/operadores')
}
