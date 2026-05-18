export default async function TiposDefeitoPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/tipos-defeito')
}
