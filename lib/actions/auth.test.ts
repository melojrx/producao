import assert from 'node:assert/strict'
import test from 'node:test'

const moduloSessaoUrl = new URL('../auth/sessao-django.ts', import.meta.url)
const { usuarioDjangoTemAcessoAdmin }: typeof import('../auth/sessao-django') =
  await import(moduloSessaoUrl.href)

const moduloSessionUrl = new URL('../django/session.ts', import.meta.url)
const { DJANGO_ACCESS_TOKEN_COOKIE, DJANGO_REFRESH_TOKEN_COOKIE } = await import(
  moduloSessionUrl.href
)

const moduloCookiesUrl = new URL('../django/cookie-options.ts', import.meta.url)
const { construirOpcoesCookieJwt } = await import(moduloCookiesUrl.href)

test('entrarAdminDjango rejeita usuario inativo antes de persistir cookies', () => {
  const usuarioInativo = {
    id: 'usr-3',
    email: 'inativo@teste.com',
    nome: 'Inativo',
    papel: 'admin' as const,
    pode_revisar_qualidade: false,
    ativo: false,
  }

  assert.equal(usuarioDjangoTemAcessoAdmin(usuarioInativo), false)
})

test('entrarAdminDjango rejeita supervisor inativo', () => {
  const usuario = {
    id: 'usr-4',
    email: 'sup@teste.com',
    nome: 'Sup',
    papel: 'supervisor' as const,
    pode_revisar_qualidade: true,
    ativo: false,
  }

  assert.equal(usuarioDjangoTemAcessoAdmin(usuario), false)
})

test('logout limpa cookies django_access_token e django_refresh_token', () => {
  assert.equal(DJANGO_ACCESS_TOKEN_COOKIE, 'django_access_token')
  assert.equal(DJANGO_REFRESH_TOKEN_COOKIE, 'django_refresh_token')

  const opcoes = construirOpcoesCookieJwt(0)

  assert.equal(opcoes.httpOnly, true)
  assert.equal(opcoes.maxAge, 0)
})
