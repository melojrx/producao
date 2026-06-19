import type { ComparativoMetaGrupoItem } from '@/types'

export interface DjangoDashboardResumoJson {
  producao_hoje: number
  revisoes_hoje: number
  turno_aberto: string | null
  ultimo_turno_id: string | null
}

export interface DjangoProducaoDiariaJson {
  data: string
  total: number
  registros: number
}

export interface DjangoIndicadoresQualidadeJson {
  total_aprovado: number
  total_reprovado: number
  taxa_aprovacao: number
  defeitos_por_classificacao: Array<Record<string, unknown>>
}

export function mapearProducaoDiariaDjango(
  itens: DjangoProducaoDiariaJson[]
): ComparativoMetaGrupoItem[] {
  return itens.map((item) => ({
    data: item.data,
    planejado: 0,
    realizado: item.total,
  }))
}

export function mapearDashboardResumoDjango(resumo: DjangoDashboardResumoJson) {
  return {
    producaoHoje: resumo.producao_hoje,
    revisoesHoje: resumo.revisoes_hoje,
    turnoAbertoId: resumo.turno_aberto,
    ultimoTurnoId: resumo.ultimo_turno_id,
  }
}

export function mapearIndicadoresQualidadeDjango(indicadores: DjangoIndicadoresQualidadeJson) {
  return {
    totalAprovado: indicadores.total_aprovado,
    totalReprovado: indicadores.total_reprovado,
    taxaAprovacao: indicadores.taxa_aprovacao,
    defeitosPorClassificacao: indicadores.defeitos_por_classificacao,
  }
}
