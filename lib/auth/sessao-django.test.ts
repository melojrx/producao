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

  const sessao = await resolverSessaoAdminDjango({
    obterTokens: async () => ({ accessToken: accessValido, refreshToken: 'refresh-1' }),
    persistirTokens: async () => {},
    limparTokens: async () => {
      throw new Error('nao deveria limpar tokens')
    },
    refreshAccessToken: async () => {
      throw new Error('nao deveria renovar token')
    },
    obterUsuarioAtual: async () => usuarioAdminAtivo,
  })

  assert.deepEqual(sessao, {
    user: { id: 'usr-1', email: 'admin@teste.com' },
    role: 'admin',
  })
})

test('resolverSessaoAdminDjango renova access expirado com refresh', async () => {
  const accessExpirado = criarTokenJwtComExpiracao(Math.floor(Date.now() / 1000) - 60)
  const accessNovo = criarTokenJwtComExpiracao(Math.floor(Date.now() / 1000) + 3600)
  const tokensPersistidos: string[] = []

  const sessao = await resolverSessaoAdminDjango({
    obterTokens: async () => ({ accessToken: accessExpirado, refreshToken: 'refresh-1' }),
    persistirTokens: async (access, refresh) => {
      tokensPersistidos.push(access, refresh)
    },
    limparTokens: async () => {
      throw new Error('nao deveria limpar tokens')
    },
    refreshAccessToken: async () => ({ access: accessNovo }),
    obterUsuarioAtual: async (token) => {
      assert.equal(token, accessNovo)
      return usuarioSupervisorAtivo
    },
  })

  assert.equal(sessao?.role, 'supervisor')
  assert.deepEqual(tokensPersistidos, [accessNovo, 'refresh-1'])
})

test('resolverSessaoAdminDjango retorna null sem tokens', async () => {
  const sessao = await resolverSessaoAdminDjango({
    obterTokens: async () => ({}),
    persistirTokens: async () => {},
    limparTokens: async () => {},
    refreshAccessToken: async () => ({ access: 'novo' }),
    obterUsuarioAtual: async () => usuarioAdminAtivo,
  })

  assert.equal(sessao, null)
})

test('resolverSessaoAdminDjango retorna null para usuario sem papel admin', async () => {
  const accessValido = criarTokenJwtComExpiracao(Math.floor(Date.now() / 1000) + 3600)

  const sessao = await resolverSessaoAdminDjango({
    obterTokens: async () => ({ accessToken: accessValido }),
    persistirTokens: async () => {},
    limparTokens: async () => {},
    refreshAccessToken: async () => ({ access: 'novo' }),
    obterUsuarioAtual: async () => ({
      ...usuarioAdminAtivo,
      ativo: false,
    }),
  })

  assert.equal(sessao, null)
})

test('resolverSessaoAdminDjango limpa cookies apos 401 em /me', async () => {
  const accessValido = criarTokenJwtComExpiracao(Math.floor(Date.now() / 1000) + 3600)
  let limpouCookies = false

  const sessao = await resolverSessaoAdminDjango({
    obterTokens: async () => ({ accessToken: accessValido }),
    persistirTokens: async () => {},
    limparTokens: async () => {
      limpouCookies = true
    },
    refreshAccessToken: async () => ({ access: 'novo' }),
    obterUsuarioAtual: async () => {
      const erro = new Error('Credenciais invalidas.')
      ;(erro as Error & { status: number }).status = 401
      throw erro
    },
  })

  assert.equal(sessao, null)
  assert.equal(limpouCookies, true)
})
