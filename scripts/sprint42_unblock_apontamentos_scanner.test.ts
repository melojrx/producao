import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const script = readFileSync('scripts/sprint42_unblock_apontamentos_scanner.sql', 'utf8')

test('remove a constraint legada que bloqueia apontamento acima do plano visual da operacao', () => {
  assert.match(
    script,
    /ALTER TABLE public\.turno_setor_operacoes\s+DROP CONSTRAINT IF EXISTS turno_setor_operacoes_check/i
  )
  assert.match(
    script,
    /ADD CONSTRAINT turno_setor_operacoes_quantidade_realizada_non_negative_check\s+CHECK \(quantidade_realizada >= 0\)/i
  )
})
