import { ScannerPageClient } from '@/components/scanner/ScannerPageClient'
import { listarCatalogoDefeitosQualidadeComClient } from '@/lib/queries/qualidade'
import { buscarUsuarioSistemaPorAuthUserId } from '@/lib/queries/usuarios-sistema'
import { createClient } from '@/lib/supabase/server'

export default async function ScannerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [usuarioSistema, defeitosCatalogo] = await Promise.all([
    user ? buscarUsuarioSistemaPorAuthUserId(supabase, user.id) : null,
    listarCatalogoDefeitosQualidadeComClient(supabase),
  ])

  return (
    <ScannerPageClient
      podeRegistrarQualidade={usuarioSistema?.pode_revisar_qualidade === true}
      revisorNome={usuarioSistema?.nome ?? null}
      defeitosCatalogo={defeitosCatalogo}
    />
  )
}
