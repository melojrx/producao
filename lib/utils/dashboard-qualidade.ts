import type { QualidadeIndicadorOperacaoV2, QualidadeResumoOpV2 } from '@/types'

export function montarRankingOperacoesQualidade(
  qualidadeResumoOps: QualidadeResumoOpV2[]
): QualidadeIndicadorOperacaoV2[] {
  const operacoesPorId = new Map<string, QualidadeIndicadorOperacaoV2>()

  for (const resumoOp of qualidadeResumoOps) {
    for (const operacao of resumoOp.operacoesComDefeito) {
      const operacaoAtual = operacoesPorId.get(operacao.turnoSetorOperacaoIdOrigem)

      if (operacaoAtual) {
        operacoesPorId.set(operacao.turnoSetorOperacaoIdOrigem, {
          ...operacaoAtual,
          quantidadeDefeitos: operacaoAtual.quantidadeDefeitos + operacao.quantidadeDefeitos,
        })
        continue
      }

      operacoesPorId.set(operacao.turnoSetorOperacaoIdOrigem, operacao)
    }
  }

  return [...operacoesPorId.values()].sort((primeiraOperacao, segundaOperacao) => {
    if (primeiraOperacao.quantidadeDefeitos !== segundaOperacao.quantidadeDefeitos) {
      return segundaOperacao.quantidadeDefeitos - primeiraOperacao.quantidadeDefeitos
    }

    return primeiraOperacao.operacaoDescricaoOrigem.localeCompare(
      segundaOperacao.operacaoDescricaoOrigem
    )
  })
}
