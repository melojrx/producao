import assert from 'node:assert/strict'
import test from 'node:test'

const moduloCookiesUrl = new URL('./cookie-options.ts', import.meta.url)
const { construirOpcoesCookieJwt }: typeof import('./cookie-options') =
  await import(moduloCookiesUrl.href)

test('construirOpcoesCookieJwt define httpOnly, sameSite lax e path /', () => {
  const opcoes = construirOpcoesCookieJwt(3600)

  assert.equal(opcoes.httpOnly, true)
  assert.equal(opcoes.sameSite, 'lax')
  assert.equal(opcoes.path, '/')
  assert.equal(opcoes.maxAge, 3600)
})

test('construirOpcoesCookieJwt usa secure apenas em producao', () => {
  const opcoesDev = construirOpcoesCookieJwt(60)
  const secureEmDev = opcoesDev.secure

  assert.equal(typeof secureEmDev, 'boolean')
  assert.equal(secureEmDev, process.env.NODE_ENV === 'production')
})
