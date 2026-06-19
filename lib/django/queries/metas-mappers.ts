import type { MetaMensal, MetaMensalResumoDashboard } from '@/types'

export interface DjangoMetaMensalJson {
  id: string
  competencia: string
  meta_pecas: number
  dias_produtivos: number
  observacao: string
  created_at: string
  updated_at: string
}

export interface DjangoMetaMensalEvolucaoDiariaJson {
  data: string
  dia_label: string
  meta_diaria_media: number
  meta_acumulada_referencia: number
  realizado_dia: number
  realizado_acumulado: number
  atingimento_acumulado_pct: number
}

export interface DjangoMetaMensalResumoSemanalJson {
  semana: string
  periodo: string
  meta_referencia_semana: number
  realizado_semana: number
  realizado_acumulado: number
  atingimento_acumulado_pct: number
}

export interface DjangoMetaMensalResumoDashboardJson {
  competencia: string
  meta_mensal: DjangoMetaMensalJson | null
  meta_pecas: number
  dias_produtivos: number
  meta_diaria_media: number
  alcancado_mes: number
  saldo_mes: number
  atingimento_pct: number
  evolucao_diaria: DjangoMetaMensalEvolucaoDiariaJson[]
  resumo_semanal: DjangoMetaMensalResumoSemanalJson[]
}

export function mapearMetaMensalDjango(meta: DjangoMetaMensalJson): MetaMensal {
  return {
    id: meta.id,
    competencia: meta.competencia,
    metaPecas: meta.meta_pecas,
    diasProdutivos: meta.dias_produtivos,
    observacao: meta.observacao,
    createdAt: meta.created_at,
    updatedAt: meta.updated_at,
  }
}

export function mapearResumoMetaMensalDashboardDjango(
  resumo: DjangoMetaMensalResumoDashboardJson
): MetaMensalResumoDashboard {
  return {
    competencia: resumo.competencia,
    metaMensal: resumo.meta_mensal ? mapearMetaMensalDjango(resumo.meta_mensal) : null,
    metaPecas: resumo.meta_pecas,
    diasProdutivos: resumo.dias_produtivos,
    metaDiariaMedia: resumo.meta_diaria_media,
    alcancadoMes: resumo.alcancado_mes,
    saldoMes: resumo.saldo_mes,
    atingimentoPct: resumo.atingimento_pct,
    evolucaoDiaria: resumo.evolucao_diaria.map((item) => ({
      data: item.data,
      diaLabel: item.dia_label,
      metaDiariaMedia: item.meta_diaria_media,
      metaAcumuladaReferencia: item.meta_acumulada_referencia,
      realizadoDia: item.realizado_dia,
      realizadoAcumulado: item.realizado_acumulado,
      atingimentoAcumuladoPct: item.atingimento_acumulado_pct,
    })),
    resumoSemanal: resumo.resumo_semanal.map((item) => ({
      semana: item.semana,
      periodo: item.periodo,
      metaReferenciaSemana: item.meta_referencia_semana,
      realizadoSemana: item.realizado_semana,
      realizadoAcumulado: item.realizado_acumulado,
      atingimentoAcumuladoPct: item.atingimento_acumulado_pct,
    })),
  }
}
