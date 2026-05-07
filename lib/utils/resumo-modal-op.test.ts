import assert from 'node:assert/strict'
import test from 'node:test'
import { montarCardsResumoModalOp } from './resumo-modal-op.ts'

test('monta resumo bruto da OP sem cards canonicos setoriais no topo', () => {
  const cards = montarCardsResumoModalOp({
    quantidadeOp: 1300,
    pecasCompletas: 0,
    progressoOperacionalPct: 96,
    secoesConcluidas: 5,
    totalSecoes: 6,
  })

  assert.deepEqual(
    cards.map((card) => card.rotulo),
    ['Quantidade da OP', 'Peças completas', 'Progresso operacional', 'Seções concluídas']
  )

  assert.equal(cards.some((card) => card.rotulo === 'Plano do dia'), false)
  assert.equal(cards.some((card) => card.rotulo === 'Disponível agora'), false)
  assert.equal(cards.some((card) => card.rotulo === 'Excedente'), false)
})

test('formata secoes concluidas como progresso sobre o total de secoes da OP', () => {
  const cards = montarCardsResumoModalOp({
    quantidadeOp: 500,
    pecasCompletas: 120,
    progressoOperacionalPct: 42.4,
    secoesConcluidas: 2,
    totalSecoes: 5,
  })

  assert.deepEqual(cards.at(3), {
    tipo: 'secoes_concluidas',
    rotulo: 'Seções concluídas',
    valor: '2/5',
    detalhe: '3 pendentes',
  })
})
