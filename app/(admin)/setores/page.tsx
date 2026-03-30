export default async function SetoresPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/setores')
}
