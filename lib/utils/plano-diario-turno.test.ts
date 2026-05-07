import assert from 'node:assert/strict'
import test from 'node:test'
import { resumirPlanoDiarioTurno } from './plano-diario-turno.ts'

test('resume os KPIs do plano diario separando plano fixo e disponibilidade imediata', () => {
  assert.deepEqual(
    resumirPlanoDiarioTurno({
      quantidadePlanoDoDia: 572,
      quantidadeConcluida: 0,
      quantidadeDisponivelApontamento: 500,
      quantidadeSelecionada: 572,
    }),
    {
      planoDiaPecas: 572,
      quantidadeConcluida: 0,
      saldoPlanoPecas: 572,
      quantidadeDisponivelAgora: 500,
      excedePlanoAtual: false,
      excedePlanoComQuantidade: false,
    }
  )
})

test('sinaliza quando o lancamento ultrapassa o plano do dia, mesmo com operacao tendo saldo maior', () => {
  assert.equal(
    resumirPlanoDiarioTurno({
      quantidadePlanoDoDia: 572,
      quantidadeConcluida: 0,
      quantidadeDisponivelApontamento: 500,
      quantidadeSelecionada: 1000,
    }).excedePlanoComQuantidade,
    true
  )
})
