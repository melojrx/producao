import assert from 'node:assert/strict'
import test from 'node:test'
import { montarRankingOperacoesQualidade } from './dashboard-qualidade.ts'
import type { QualidadeResumoOpV2 } from '@/types'

function criarResumoOp(
  turnoOpId: string,
  operacoesComDefeito: QualidadeResumoOpV2['operacoesComDefeito']
): QualidadeResumoOpV2 {
  return {
    turnoOpId,
    quantidadeAprovada: 0,
    quantidadeReprovada: 0,
    quantidadeRevisada: 0,
    totalDefeitos: operacoesComDefeito.reduce(
      (soma, operacao) => soma + operacao.quantidadeDefeitos,
      0
    ),
    operacoesProdutivasCount: operacoesComDefeito.length,
    oportunidadesRevisadas: 0,
    percentualReprovacao: null,
    percentualDefeitosOp: null,
    operacoesComDefeito,
  }
}

test('monta ranking de operações por ocorrências de defeito somadas', () => {
  const ranking = montarRankingOperacoesQualidade([
    criarResumoOp('op-1', [
      {
        turnoSetorOperacaoIdOrigem: 'costura-lateral',
        operacaoIdOrigem: 'operacao-1',
        setorIdOrigem: 'setor-1',
        setorNomeOrigem: 'Costura',
        operacaoCodigoOrigem: 'OP-01',
        operacaoDescricaoOrigem: 'Costura lateral',
        quantidadeDefeitos: 2,
        percentualDefeitosOperacao: null,
        possuiApontamentos: true,
        operadoresEnvolvidos: [],
      },
    ]),
    criarResumoOp('op-2', [
      {
        turnoSetorOperacaoIdOrigem: 'costura-lateral',
        operacaoIdOrigem: 'operacao-1',
        setorIdOrigem: 'setor-1',
        setorNomeOrigem: 'Costura',
        operacaoCodigoOrigem: 'OP-01',
        operacaoDescricaoOrigem: 'Costura lateral',
        quantidadeDefeitos: 4,
        percentualDefeitosOperacao: null,
        possuiApontamentos: true,
        operadoresEnvolvidos: [],
      },
      {
        turnoSetorOperacaoIdOrigem: 'rebatimento',
        operacaoIdOrigem: 'operacao-2',
        setorIdOrigem: 'setor-2',
        setorNomeOrigem: 'Frente',
        operacaoCodigoOrigem: 'OP-02',
        operacaoDescricaoOrigem: 'Rebatimento lateral',
        quantidadeDefeitos: 3,
        percentualDefeitosOperacao: null,
        possuiApontamentos: true,
        operadoresEnvolvidos: [],
      },
    ]),
  ])

  assert.deepEqual(
    ranking.map((operacao) => [operacao.turnoSetorOperacaoIdOrigem, operacao.quantidadeDefeitos]),
    [
      ['costura-lateral', 6],
      ['rebatimento', 3],
    ]
  )
})
