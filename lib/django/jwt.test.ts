import assert from 'node:assert/strict'
import test from 'node:test'

const moduloJwtUrl = new URL('./jwt.ts', import.meta.url)
const { tokenJwtExpirado, tokenJwtPareceValido }: typeof import('./jwt') =
  await import(moduloJwtUrl.href)

function criarTokenJwtComExpiracao(expSegundos: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ exp: expSegundos })).toString('base64url')
  return `${header}.${payload}.assinatura`
}

test('tokenJwtExpirado retorna true para token malformado', () => {
  assert.equal(tokenJwtExpirado('token-invalido'), true)
})

test('tokenJwtExpirado retorna false para token com exp futuro', () => {
  const expFuturo = Math.floor(Date.now() / 1000) + 3600
  const token = criarTokenJwtComExpiracao(expFuturo)
  assert.equal(tokenJwtExpirado(token), false)
  assert.equal(tokenJwtPareceValido(token), true)
})

test('tokenJwtExpirado retorna true para token expirado', () => {
  const expPassado = Math.floor(Date.now() / 1000) - 60
  const token = criarTokenJwtComExpiracao(expPassado)
  assert.equal(tokenJwtExpirado(token), true)
  assert.equal(tokenJwtPareceValido(token), false)
})
