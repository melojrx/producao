export default async function QRCodesPage() {
  const { redirect } = await import('next/navigation')
  redirect('/admin/qrcodes')
}
