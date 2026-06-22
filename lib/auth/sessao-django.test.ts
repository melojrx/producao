import assert from 'node:assert/strict'
import test from 'node:test'

const moduloSessaoUrl = new URL('./sessao-django.ts', import.meta.url)
const {
  mapearUsuarioDjangoParaSessaoAdmin,
  resolverSessaoAdminDjango,
  usuarioDjangoTemAcessoAdmin,
}: typeof import('./sessao-django') = await import(moduloSessaoUrl.href)

const usuarioAdminAtivo = {
  id: 'usr-1',
  email: 'admin@teste.com',
  nome: 'Admin',
  papel: 'admin' as const,
  pode_revisar_qualidade: true,
  ativo: true,
}

const usuarioSupervisorAtivo = {
  ...usuarioAdminAtivo,
  id: 'usr-2',
  email: 'supervisor@teste.com',
  papel: 'supervisor' as const,
}

function criarTokenJwtComExpiracao(expSegundos: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ exp: expSegundos })).toString('base64url')
  return `${header}.${payload}.assinatura`
}

test('usuarioDjangoTemAcessoAdmin aceita admin e supervisor ativos', () => {
  assert.equal(usuarioDjangoTemAcessoAdmin(usuarioAdminAtivo), true)
  assert.equal(usuarioDjangoTemAcessoAdmin(usuarioSupervisorAtivo), true)
})

test('usuarioDjangoTemAcessoAdmin rejeita inativo ou papel invalido', () => {
  assert.equal(usuarioDjangoTemAcessoAdmin({ ...usuarioAdminAtivo, ativo: false }), false)

  const usuarioPapelInvalido = {
    ...usuarioAdminAtivo,
    papel: 'operador',
  }

  assert.equal(
    usuarioDjangoTemAcessoAdmin(
      usuarioPapelInvalido as unknown as typeof usuarioAdminAtivo
    ),
    false
  )
})

test('mapearUsuarioDjangoParaSessaoAdmin expoe email para AdminShell', () => {
  const sessao = mapearUsuarioDjangoParaSessaoAdmin(usuarioAdminAtivo)

  assert.equal(sessao.user.id, 'usr-1')
  assert.equal(sessao.user.email, 'admin@teste.com')
  assert.equal(sessao.role, 'admin')
})

test('resolverSessaoAdminDjango retorna sessao com access token valido', async () => {
  const accessValido = criarTokenJwtComExpiracao(Math.floor(Date.now() / 1000) + 3600)

  const sessao = await resolverSessaoAdminDjango(
    {
      obterUsuarioAtual: async () => usuarioAdminAtivo,
    },
    { accessTokenOverride: accessValido }
  )

  assert.deepEqual(sessao, {
    user: { id: 'usr-1', email: 'admin@teste.com' },
    role: 'admin',
  })
})

test('resolverSessaoAdminDjango usa token informado para validar /me', async () => {
  const accessNovo = criarTokenJwtComExpiracao(Math.floor(Date.now() / 1000) + 3600)

  const sessao = await resolverSessaoAdminDjango(
    {
      obterUsuarioAtual: async (token) => {
        assert.equal(token, accessNovo)
        return usuarioSupervisorAtivo
      },
    },
    { accessTokenOverride: accessNovo }
  )

  assert.equal(sessao?.role, 'supervisor')
})

test('resolverSessaoAdminDjango retorna null sem token', async () => {
  const sessao = await resolverSessaoAdminDjango(
    {
      obterUsuarioAtual: async () => usuarioAdminAtivo,
    },
    { accessTokenOverride: null }
  )

  assert.equal(sessao, null)
})

test('resolverSessaoAdminDjango retorna null para usuario sem papel admin', async () => {
  const accessValido = criarTokenJwtComExpiracao(Math.floor(Date.now() / 1000) + 3600)

  const sessao = await resolverSessaoAdminDjango(
    {
      obterUsuarioAtual: async () => ({
        ...usuarioAdminAtivo,
        ativo: false,
      }),
    },
    { accessTokenOverride: accessValido }
  )

  assert.equal(sessao, null)
})

test('resolverSessaoAdminDjango retorna null apos falha em /me', async () => {
  const accessValido = criarTokenJwtComExpiracao(Math.floor(Date.now() / 1000) + 3600)

  const sessao = await resolverSessaoAdminDjango(
    {
      obterUsuarioAtual: async () => {
        const erro = new Error('Credenciais invalidas.')
        ;(erro as Error & { status: number }).status = 401
        throw erro
      },
    },
    { accessTokenOverride: accessValido }
  )

  assert.equal(sessao, null)
})
