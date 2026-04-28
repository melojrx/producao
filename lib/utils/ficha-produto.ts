import type { ProdutoRoteiroItem } from '@/types'

const CHAVE_SETOR_AUSENTE = 'sem-setor'
const NOME_SETOR_AUSENTE = 'Sem setor definido'

export interface FichaProdutoSetor {
  setorId: string | null
  setorCodigo: number | null
  setorNome: string
  operacoes: ProdutoRoteiroItem[]
  totalOperacoes: number
  tempoPadraoTotalMin: number
}

function obterChaveSetor(operacao: ProdutoRoteiroItem): string {
  return operacao.setorId ?? CHAVE_SETOR_AUSENTE
}

function arredondarTempoPadrao(valor: number): number {
  return Math.round(valor * 10000) / 10000
}

function compararSetoresFicha(primeiro: FichaProdutoSetor, segundo: FichaProdutoSetor): number {
  if (primeiro.setorCodigo !== null && segundo.setorCodigo !== null) {
    return primeiro.setorCodigo - segundo.setorCodigo
  }

  if (primeiro.setorCodigo !== null) {
    return -1
  }

  if (segundo.setorCodigo !== null) {
    return 1
  }

  return primeiro.setorNome.localeCompare(segundo.setorNome)
}

export function agruparRoteiroProdutoParaFicha(
  roteiro: ProdutoRoteiroItem[]
): FichaProdutoSetor[] {
  const gruposPorSetor = new Map<string, FichaProdutoSetor>()
  const operacoesOrdenadas = [...roteiro].sort(
    (primeira, segunda) => primeira.sequencia - segunda.sequencia
  )

  operacoesOrdenadas.forEach((operacao) => {
    const chaveSetor = obterChaveSetor(operacao)
    const grupoAtual =
      gruposPorSetor.get(chaveSetor) ??
      {
        setorId: operacao.setorId,
        setorCodigo: operacao.setorCodigo,
        setorNome: operacao.setorNome ?? NOME_SETOR_AUSENTE,
        operacoes: [],
        totalOperacoes: 0,
        tempoPadraoTotalMin: 0,
      }

    grupoAtual.operacoes.push(operacao)
    grupoAtual.totalOperacoes = grupoAtual.operacoes.length
    grupoAtual.tempoPadraoTotalMin = arredondarTempoPadrao(
      grupoAtual.tempoPadraoTotalMin + operacao.tempoPadraoMin
    )
    gruposPorSetor.set(chaveSetor, grupoAtual)
  })

  return Array.from(gruposPorSetor.values()).sort(compararSetoresFicha)
}
