export type DashboardTabId = 'visao_geral' | 'visao_operacional' | 'qualidade' | 'operadores'

export interface DashboardTabDefinition {
  id: DashboardTabId
  titulo: string
  descricao: string
}

export function obterDashboardTabs(): DashboardTabDefinition[] {
  return [
    {
      id: 'visao_geral',
      titulo: 'Visão Geral',
      descricao: 'Meta mensal, alcançado, saldo e leitura gerencial da competência.',
    },
    {
      id: 'visao_operacional',
      titulo: 'Visão Operacional',
      descricao: 'Monitor do turno, OPs, setores, capacidade e progresso operacional.',
    },
    {
      id: 'qualidade',
      titulo: 'Qualidade',
      descricao: 'Pendências de revisão, aprovação, reprovação, defeitos e rankings do turno.',
    },
    {
      id: 'operadores',
      titulo: 'Operadores',
      descricao:
        'Eficiência por hora, eficiência do dia por operador e detalhamento por operação.',
    },
  ]
}
