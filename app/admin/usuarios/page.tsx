import { ListaUsuariosSistema } from '../../(admin)/usuarios/ListaUsuariosSistema'
import { requireSystemAdmin } from '@/lib/auth/require-admin-user'
import { listarUsuariosSistema } from '@/lib/queries/usuarios-sistema'

export default async function AdminUsuariosPage() {
  await requireSystemAdmin()
  const usuarios = await listarUsuariosSistema()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">
          Apenas administradores podem criar, editar e inativar admins e supervisores.
        </p>
      </div>

      <ListaUsuariosSistema usuariosIniciais={usuarios} />
    </div>
  )
}
