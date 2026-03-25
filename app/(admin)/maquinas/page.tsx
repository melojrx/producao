export default async function MaquinasPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/maquinas')
}
