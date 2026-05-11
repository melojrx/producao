import test from 'node:test'
import assert from 'node:assert/strict'

const moduloPermissoesUrl = new URL('./usuarios-sistema-permissoes.ts', import.meta.url)
const {
  obterPermissaoRevisarQualidade,
}: typeof import('./usuarios-sistema-permissoes') = await import(moduloPermissoesUrl.href)

test('normaliza permissão de revisar qualidade somente quando o formulário envia true', () => {
  const formData = new FormData()
  formData.set('pode_revisar_qualidade', 'true')

  assert.equal(obterPermissaoRevisarQualidade(formData), true)
})

test('mantém permissão de revisar qualidade desligada quando o campo está ausente', () => {
  const formData = new FormData()

  assert.equal(obterPermissaoRevisarQualidade(formData), false)
})

test('não concede permissão de revisar qualidade para valor inesperado', () => {
  const formData = new FormData()
  formData.set('pode_revisar_qualidade', 'on')

  assert.equal(obterPermissaoRevisarQualidade(formData), false)
})
