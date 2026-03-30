export default async function UsuariosPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/usuarios')
}
