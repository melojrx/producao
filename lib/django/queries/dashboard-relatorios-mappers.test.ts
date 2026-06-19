import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapearDashboardResumoDjango,
  mapearProducaoDiariaDjango,
  type DjangoDashboardResumoJson,
  type DjangoProducaoDiariaJson,
} from './dashboard-relatorios-mappers.ts'

test('mapearDashboardResumoDjango expoe KPIs operacionais', () => {
  const payload: DjangoDashboardResumoJson = {
    producao_hoje: 150,
    revisoes_hoje: 4,
    turno_aberto: '11111111-1111-1111-1111-111111111111',
    ultimo_turno_id: '22222222-2222-2222-2222-222222222222',
  }

  const resumo = mapearDashboardResumoDjango(payload)

  assert.equal(resumo.producaoHoje, 150)
  assert.equal(resumo.revisoesHoje, 4)
  assert.equal(resumo.turnoAbertoId, payload.turno_aberto)
})

test('mapearProducaoDiariaDjango monta comparativo com realizado diario', () => {
  const payload: DjangoProducaoDiariaJson[] = [
    { data: '2026-06-16', total: 80, registros: 12 },
    { data: '2026-06-17', total: 95, registros: 15 },
  ]

  const comparativo = mapearProducaoDiariaDjango(payload)

  assert.deepEqual(comparativo, [
    { data: '2026-06-16', planejado: 0, realizado: 80 },
    { data: '2026-06-17', planejado: 0, realizado: 95 },
  ])
})
