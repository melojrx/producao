import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const caminhoComponente = new URL('./ApontamentosTabs.tsx', import.meta.url)

test('conteudo ativo das abas de apontamentos possui chave estavel de renderizacao', () => {
  const codigoFonte = readFileSync(caminhoComponente, 'utf8')

  assert.match(codigoFonte, /key=\{abaAtiva\}/)
  assert.match(codigoFonte, /conteudoAtivo/)
})
