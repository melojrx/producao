import assert from 'node:assert/strict'
import { test } from 'node:test'

const moduloUrl = new URL('./turno-legado.ts', import.meta.url)
const { fluxoTurnoLegadoDesativado, MENSAGEM_FLUXO_TURNO_LEGADO_DESATIVADO }: typeof import('./turno-legado') =
  await import(moduloUrl.href)

const FLAG_DASHBOARD = 'NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS'

test('fluxoTurnoLegadoDesativado retorna true quando dashboard_reads ON', () => {
  const anterior = process.env[FLAG_DASHBOARD]
  process.env[FLAG_DASHBOARD] = 'true'
  assert.equal(fluxoTurnoLegadoDesativado(), true)
  if (anterior === undefined) {
    delete process.env[FLAG_DASHBOARD]
  } else {
    process.env[FLAG_DASHBOARD] = anterior
  }
})

test('MENSAGEM_FLUXO_TURNO_LEGADO_DESATIVADO orienta uso do turno V2', () => {
  assert.match(MENSAGEM_FLUXO_TURNO_LEGADO_DESATIVADO, /Novo Turno/)
})
