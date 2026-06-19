import assert from 'node:assert/strict'
import test from 'node:test'

import {
  contarHistoricoPorDefeitoId,
  mapearDefeitosComHistoricoDjango,
  type DjangoQualidadeDefeitoJson,
  type DjangoQualidadeDetalheJson,
} from './qualidade-defeitos-mappers.ts'

const DEFEITO_A: DjangoQualidadeDefeitoJson = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  nome: 'Borda torta',
  classificacao: 'operador',
  ativo: true,
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-01T10:00:00Z',
}

const DEFEITO_B: DjangoQualidadeDefeitoJson = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  nome: 'Costura aberta',
  classificacao: 'processo',
  ativo: false,
  created_at: '2026-06-02T10:00:00Z',
  updated_at: '2026-06-02T10:00:00Z',
}

const DETALHES: DjangoQualidadeDetalheJson[] = [
  { id: 'd1', defeito: DEFEITO_A.id },
  { id: 'd2', defeito: DEFEITO_A.id },
  { id: 'd3', defeito: DEFEITO_B.id },
]

test('contarHistoricoPorDefeitoId agrega vinculos por defeito', () => {
  const mapa = contarHistoricoPorDefeitoId(DETALHES)

  assert.equal(mapa.get(DEFEITO_A.id), 2)
  assert.equal(mapa.get(DEFEITO_B.id), 1)
})

test('mapearDefeitosComHistoricoDjango inclui totalVinculosHistoricos e ordem derivada', () => {
  const historico = contarHistoricoPorDefeitoId(DETALHES)
  const itens = mapearDefeitosComHistoricoDjango([DEFEITO_B, DEFEITO_A], historico)

  assert.equal(itens.length, 2)
  assert.equal(itens[0]?.nome, 'Borda torta')
  assert.equal(itens[0]?.ordem, 0)
  assert.equal(itens[0]?.totalVinculosHistoricos, 2)
  assert.equal(itens[1]?.nome, 'Costura aberta')
  assert.equal(itens[1]?.ordem, 1)
  assert.equal(itens[1]?.totalVinculosHistoricos, 1)
})
