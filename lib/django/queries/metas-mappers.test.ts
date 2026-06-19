import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapearMetaMensalDjango,
  mapearResumoMetaMensalDashboardDjango,
  type DjangoMetaMensalResumoDashboardJson,
} from './metas-mappers.ts'

const FIXTURE_RESUMO: DjangoMetaMensalResumoDashboardJson = {
  competencia: '2026-06-01',
  meta_mensal: {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    competencia: '2026-06-01',
    meta_pecas: 3000,
    dias_produtivos: 22,
    observacao: 'Meta junho',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-02T10:00:00Z',
  },
  meta_pecas: 3000,
  dias_produtivos: 22,
  meta_diaria_media: 136.36363636363637,
  alcancado_mes: 450,
  saldo_mes: 2550,
  atingimento_pct: 15,
  evolucao_diaria: [
    {
      data: '2026-06-01',
      dia_label: '01/06',
      meta_diaria_media: 136.36363636363637,
      meta_acumulada_referencia: 136.36363636363637,
      realizado_dia: 200,
      realizado_acumulado: 200,
      atingimento_acumulado_pct: 6.666666666666667,
    },
  ],
  resumo_semanal: [
    {
      semana: 'Semana 1',
      periodo: '01/06 a 01/06',
      meta_referencia_semana: 136.36363636363637,
      realizado_semana: 200,
      realizado_acumulado: 200,
      atingimento_acumulado_pct: 6.666666666666667,
    },
  ],
}

test('mapearMetaMensalDjango converte snake_case para contrato MetaMensal', () => {
  const meta = mapearMetaMensalDjango(FIXTURE_RESUMO.meta_mensal!)

  assert.equal(meta.metaPecas, 3000)
  assert.equal(meta.diasProdutivos, 22)
  assert.equal(meta.competencia, '2026-06-01')
})

test('mapearResumoMetaMensalDashboardDjango preserva KPIs do payload Django', () => {
  const resumo = mapearResumoMetaMensalDashboardDjango(FIXTURE_RESUMO)

  assert.equal(resumo.competencia, '2026-06-01')
  assert.equal(resumo.metaPecas, 3000)
  assert.equal(resumo.alcancadoMes, 450)
  assert.equal(resumo.saldoMes, 2550)
  assert.equal(resumo.atingimentoPct, 15)
  assert.equal(resumo.evolucaoDiaria.length, 1)
  assert.equal(resumo.resumoSemanal[0]?.realizadoSemana, 200)
})
