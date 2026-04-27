import { ScannerPageClient } from '@/components/scanner/ScannerPageClient'
import { buscarUsuarioSistemaPorAuthUserId } from '@/lib/queries/usuarios-sistema'
import { createClient } from '@/lib/supabase/server'

export default async function ScannerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const usuarioSistema = user ? await buscarUsuarioSistemaPorAuthUserId(supabase, user.id) : null

  return (
    <ScannerPageClient
      podeRegistrarQualidade={usuarioSistema?.pode_revisar_qualidade === true}
      revisorNome={usuarioSistema?.nome ?? null}
    />
  )
}
