import { consolidarDemandasPorOperacoes, consolidarOpsPorDemandas } from '@/lib/utils/consolidacao-turno'
import { createClient } from '@/lib/supabase/server'
import { normalizarCompetenciaMensal, obterCompetenciaMesAtual, obterDiasDaCompetencia } from '@/lib/utils/data'
import type {
  MetaMensal,
  MetaMensalEvolucaoDiariaItem,
  MetaMensalResumoDashboard,
  MetaMensalResumoSemanalItem,
  TurnoOpStatusV2,
  TurnoSetorDemandaStatusV2,
  TurnoSetorOperacaoStatusV2,
} from '@/types'
import type { Tables } from '@/types/supabase'

type MetaMensalRow = Tables<'metas_mensais'>
type TurnoRow = Pick<Tables<'turnos'>, 'id' | 'iniciado_em'>
type TurnoOpRow = Pick<
  Tables<'turno_ops'>,
  'id' | 'turno_id' | 'quantidade_planejada' | 'quantidade_realizada' | 'status'
>
type TurnoSetorDemandaRow = Pick<
  Tables<'turno_setor_demandas'>,
  | 'id'
  | 'turno_setor_id'
  | 'turno_op_id'
  | 'turno_setor_op_legacy_id'
  | 'quantidade_planejada'
  | 'quantidade_realizada'
  | 'status'
>
type TurnoSetorOperacaoRow = Pick<
  Tables<'turno_setor_operacoes'>,
  | 'id'
  | 'turno_op_id'
  | 'turno_setor_op_id'
  | 'turno_setor_demanda_id'
  | 'quantidade_planejada'
  | 'quantidade_realizada'
  | 'tempo_padrao_min_snapshot'
  | 'status'
>

const FUSO_HORARIO_FABRICA = 'America/Fortaleza'

function construirIntervaloCompetencia(competencia: string): {
  competencia: string
  dataInicio: string
  dataFim: string
  inicioTimestamp: string
  fimTimestamp: string
} {
  const competenciaNormalizada =
    normalizarCompetenciaMensal(competencia) ?? normalizarCompetenciaMensal(obterCompetenciaMesAtual())

  if (!competenciaNormalizada) {
    throw new Error('Competência mensal inválida.')
  }

  const diasDaCompetencia = obterDiasDaCompetencia(competenciaNormalizada)
  const dataInicio = competenciaNormalizada
  const dataFim = `${competenciaNormalizada.slice(0, 8)}${diasDaCompetencia.toString().padStart(2, '0')}`

  return {
    competencia: competenciaNormalizada,
    dataInicio,
    dataFim,
    inicioTimestamp: `${dataInicio}T00:00:00-03:00`,
    fimTimestamp: `${dataFim}T23:59:59.999-03:00`,
  }
}

function mapearMetaMensal(metaMensal: MetaMensalRow) {
  return {
    id: metaMensal.id,
    competencia: metaMensal.competencia,
    metaPecas: metaMensal.meta_pecas,
    diasProdutivos: metaMensal.dias_produtivos,
    observacao: metaMensal.observacao,
    createdAt: metaMensal.created_at,
    updatedAt: metaMensal.updated_at,
  }
}

export async function buscarMetaMensalCompetencia(
  competenciaSelecionada?: string
): Promise<{
  competencia: string
  metaMensal: MetaMensal | null
}> {
  const supabase = await createClient()
  const competencia =
    normalizarCompetenciaMensal(competenciaSelecionada ?? obterCompetenciaMesAtual()) ??
    obterCompetenciaMesAtual()

  const { data: metaMensal, error } = await supabase
    .from('metas_mensais')
    .select('*')
    .eq('competencia', competencia)
    .maybeSingle<MetaMensalRow>()

  if (error) {
    throw new Error(`Erro ao buscar meta mensal da competência: ${error.message}`)
  }

  return {
    competencia,
    metaMensal: metaMensal ? mapearMetaMensal(metaMensal) : null,
  }
}

function listarDatasCompetencia(competencia: string): string[] {
  const diasDaCompetencia = obterDiasDaCompetencia(competencia)
  const prefixo = competencia.slice(0, 8)

  return Array.from({ length: diasDaCompetencia }, (_, indice) => {
    const dia = (indice + 1).toString().padStart(2, '0')
    return `${prefixo}${dia}`
  })
}

function formatarDataLocalIso(dataHoraIso: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_HORARIO_FABRICA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dataHoraIso))

  const ano = partes.find((parte) => parte.type === 'year')?.value
  const mes = partes.find((parte) => parte.type === 'month')?.value
  const dia = partes.find((parte) => parte.type === 'day')?.value

  if (!ano || !mes || !dia) {
    throw new Error('Não foi possível normalizar a data local da competência mensal.')
  }

  return `${ano}-${mes}-${dia}`
}

function formatarDiaMes(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

function formatarPeriodoSemana(inicio: string, fim: string): string {
  if (inicio === fim) {
    return formatarDiaMes(inicio)
  }

  return `${formatarDiaMes(inicio)} a ${formatarDiaMes(fim)}`
}

function agruparPorChave<TItem>(itens: TItem[], extrairChave: (item: TItem) => string): Map<string, TItem[]> {
  const mapa = new Map<string, TItem[]>()

  for (const item of itens) {
    const chave = extrairChave(item)
    const grupoAtual = mapa.get(chave) ?? []
    grupoAtual.push(item)
    mapa.set(chave, grupoAtual)
  }

  return mapa
}

function calcularQuantidadeConcluidaConsolidada(
  turnosOps: TurnoOpRow[],
  demandas: TurnoSetorDemandaRow[],
  operacoes: TurnoSetorOperacaoRow[]
): number {
  if (turnosOps.length === 0) {
    return 0
  }

  const demandasConsolidadas = consolidarDemandasPorOperacoes(
    demandas.map((demanda) => ({
      id: demanda.id,
      turnoOpId: demanda.turno_op_id,
      turnoSetorId: demanda.turno_setor_id,
      turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
      quantidadePlanejada: demanda.quantidade_planejada,
      quantidadeRealizada: demanda.quantidade_realizada,
      quantidadeConcluida: demanda.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      status: demanda.status as TurnoSetorDemandaStatusV2,
    })),
    operacoes.map((operacao) => ({
      id: operacao.id,
      turnoId: '',
      turnoOpId: operacao.turno_op_id,
      turnoSetorOpId: operacao.turno_setor_op_id,
      turnoSetorId: null,
      turnoSetorDemandaId: operacao.turno_setor_demanda_id,
      produtoOperacaoId: '',
      operacaoId: '',
      setorId: '',
      sequencia: 0,
      tempoPadraoMinSnapshot: operacao.tempo_padrao_min_snapshot,
      quantidadePlanejada: operacao.quantidade_planejada,
      quantidadeRealizada: operacao.quantidade_realizada,
      status: operacao.status as TurnoSetorOperacaoStatusV2,
      iniciadoEm: null,
      encerradoEm: null,
      operacaoCodigo: '',
      operacaoDescricao: '',
      maquinaCodigo: null,
      maquinaModelo: null,
    }))
  )

  const opsConsolidadas = consolidarOpsPorDemandas(
    turnosOps.map((op) => ({
      id: op.id,
      quantidadePlanejada: op.quantidade_planejada,
      quantidadeRealizada: op.quantidade_realizada,
      quantidadeConcluida: op.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      quantidadePlanejadaRemanescente: Math.max(op.quantidade_planejada - op.quantidade_realizada, 0),
      status: op.status as TurnoOpStatusV2,
    })),
    demandasConsolidadas
  )

  return opsConsolidadas.reduce((soma, op) => soma + Math.max(op.quantidadeConcluida, 0), 0)
}

function construirEvolucaoDiaria(
  datasCompetencia: string[],
  metaPecas: number,
  metaDiariaMedia: number,
  realizadoPorData: Map<string, number>
): MetaMensalEvolucaoDiariaItem[] {
  let realizadoAcumulado = 0

  return datasCompetencia.map((data, indice) => {
    const realizadoDia = realizadoPorData.get(data) ?? 0
    realizadoAcumulado += realizadoDia

    const metaAcumuladaReferencia =
      metaPecas > 0 && metaDiariaMedia > 0 ? Math.min(metaDiariaMedia * (indice + 1), metaPecas) : 0

    return {
      data,
      diaLabel: formatarDiaMes(data),
      metaDiariaMedia,
      metaAcumuladaReferencia,
      realizadoDia,
      realizadoAcumulado,
      atingimentoAcumuladoPct: metaPecas > 0 ? (realizadoAcumulado / metaPecas) * 100 : 0,
    }
  })
}

function construirResumoSemanal(
  evolucaoDiaria: MetaMensalEvolucaoDiariaItem[]
): MetaMensalResumoSemanalItem[] {
  if (evolucaoDiaria.length === 0) {
    return []
  }

  const resumoSemanal: MetaMensalResumoSemanalItem[] = []

  let indiceSemana = 0
  let inicioSemana = ''
  let fimSemana = ''
  let realizadoSemana = 0
  let metaAcumuladaAntesDaSemana = 0
  let metaAcumuladaAtual = 0
  let realizadoAcumuladoAtual = 0
  let atingimentoAcumuladoPctAtual = 0

  const fecharSemanaAtual = () => {
    if (!inicioSemana || !fimSemana) {
      return
    }

    resumoSemanal.push({
      semana: `Semana ${indiceSemana}`,
      periodo: formatarPeriodoSemana(inicioSemana, fimSemana),
      metaReferenciaSemana: Math.max(metaAcumuladaAtual - metaAcumuladaAntesDaSemana, 0),
      realizadoSemana,
      realizadoAcumulado: realizadoAcumuladoAtual,
      atingimentoAcumuladoPct: atingimentoAcumuladoPctAtual,
    })
  }

  evolucaoDiaria.forEach((item, indice) => {
    const dataAtual = new Date(`${item.data}T12:00:00-03:00`)
    const iniciouNovaSemana = indice === 0 || dataAtual.getUTCDay() === 0

    if (iniciouNovaSemana) {
      if (indice > 0) {
        fecharSemanaAtual()
      }

      indiceSemana += 1
      inicioSemana = item.data
      fimSemana = item.data
      realizadoSemana = 0
      metaAcumuladaAntesDaSemana =
        indice > 0 ? evolucaoDiaria[indice - 1]?.metaAcumuladaReferencia ?? 0 : 0
    }

    fimSemana = item.data
    realizadoSemana += item.realizadoDia
    metaAcumuladaAtual = item.metaAcumuladaReferencia
    realizadoAcumuladoAtual = item.realizadoAcumulado
    atingimentoAcumuladoPctAtual = item.atingimentoAcumuladoPct

    if (indice === evolucaoDiaria.length - 1) {
      fecharSemanaAtual()
    }
  })

  return resumoSemanal
}

export async function buscarResumoMetaMensalDashboard(
  competenciaSelecionada?: string
): Promise<MetaMensalResumoDashboard> {
  const supabase = await createClient()
  const intervalo = construirIntervaloCompetencia(competenciaSelecionada ?? obterCompetenciaMesAtual())

  const { data: metaMensal, error: metaMensalError } = await supabase
    .from('metas_mensais')
    .select('*')
    .eq('competencia', intervalo.competencia)
    .maybeSingle<MetaMensalRow>()

  if (metaMensalError) {
    throw new Error(`Erro ao buscar meta mensal da dashboard: ${metaMensalError.message}`)
  }

  const { data: turnos, error: turnosError } = await supabase
    .from('turnos')
    .select('id, iniciado_em')
    .gte('iniciado_em', intervalo.inicioTimestamp)
    .lte('iniciado_em', intervalo.fimTimestamp)
    .order('iniciado_em', { ascending: true })
    .returns<TurnoRow[]>()

  if (turnosError) {
    throw new Error(`Erro ao buscar turnos da competência mensal: ${turnosError.message}`)
  }

  const turnoIds = (turnos ?? []).map((turno) => turno.id)

  const { data: turnosOps, error: turnosOpsError } =
    turnoIds.length > 0
      ? await supabase
          .from('turno_ops')
          .select('id, turno_id, quantidade_planejada, quantidade_realizada, status')
          .in('turno_id', turnoIds)
          .returns<TurnoOpRow[]>()
      : { data: [], error: null }

  if (turnosOpsError) {
    throw new Error(`Erro ao buscar OPs da competência mensal: ${turnosOpsError.message}`)
  }

  const turnoOpIds = (turnosOps ?? []).map((op) => op.id)

  const [{ data: demandas, error: demandasError }, { data: operacoes, error: operacoesError }] =
    turnoOpIds.length > 0
      ? await Promise.all([
          supabase
            .from('turno_setor_demandas')
            .select(
              'id, turno_setor_id, turno_op_id, turno_setor_op_legacy_id, quantidade_planejada, quantidade_realizada, status'
            )
            .in('turno_op_id', turnoOpIds)
            .returns<TurnoSetorDemandaRow[]>(),
          supabase
            .from('turno_setor_operacoes')
            .select(
              'id, turno_op_id, turno_setor_op_id, turno_setor_demanda_id, quantidade_planejada, quantidade_realizada, tempo_padrao_min_snapshot, status'
            )
            .in('turno_op_id', turnoOpIds)
            .returns<TurnoSetorOperacaoRow[]>(),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ]

  if (demandasError) {
    throw new Error(`Erro ao buscar demandas da competência mensal: ${demandasError.message}`)
  }

  if (operacoesError) {
    throw new Error(`Erro ao buscar operações da competência mensal: ${operacoesError.message}`)
  }

  const metaMapeada = metaMensal ? mapearMetaMensal(metaMensal) : null
  const metaPecas = metaMapeada?.metaPecas ?? 0
  const diasProdutivos = metaMapeada?.diasProdutivos ?? 0
  const metaDiariaMedia = diasProdutivos > 0 ? metaPecas / diasProdutivos : 0

  const turnoIdsPorData = agruparPorChave(turnos ?? [], (turno) => formatarDataLocalIso(turno.iniciado_em))
  const opsPorTurnoId = agruparPorChave(turnosOps ?? [], (op) => op.turno_id)
  const demandasPorTurnoOpId = agruparPorChave(demandas ?? [], (demanda) => demanda.turno_op_id)
  const operacoesPorTurnoOpId = agruparPorChave(operacoes ?? [], (operacao) => operacao.turno_op_id)

  const realizadoPorData = new Map<string, number>()

  for (const dataCompetencia of listarDatasCompetencia(intervalo.competencia)) {
    const turnoIdsDaData = turnoIdsPorData.get(dataCompetencia)?.map((turno) => turno.id) ?? []
    const opsDaData = turnoIdsDaData.flatMap((turnoId) => opsPorTurnoId.get(turnoId) ?? [])
    const opIdsDaData = opsDaData.map((op) => op.id)
    const demandasDaData = opIdsDaData.flatMap((turnoOpId) => demandasPorTurnoOpId.get(turnoOpId) ?? [])
    const operacoesDaData = opIdsDaData.flatMap(
      (turnoOpId) => operacoesPorTurnoOpId.get(turnoOpId) ?? []
    )

    realizadoPorData.set(
      dataCompetencia,
      calcularQuantidadeConcluidaConsolidada(opsDaData, demandasDaData, operacoesDaData)
    )
  }

  const evolucaoDiaria =
    metaMapeada !== null
      ? construirEvolucaoDiaria(
          listarDatasCompetencia(intervalo.competencia),
          metaPecas,
          metaDiariaMedia,
          realizadoPorData
        )
      : []
  const resumoSemanal = metaMapeada !== null ? construirResumoSemanal(evolucaoDiaria) : []
  const alcancadoMes = Array.from(realizadoPorData.values()).reduce((soma, valor) => soma + valor, 0)
  const saldoMes = Math.max(metaPecas - alcancadoMes, 0)
  const atingimentoPct = metaPecas > 0 ? (alcancadoMes / metaPecas) * 100 : 0

  return {
    competencia: intervalo.competencia,
    metaMensal: metaMapeada,
    metaPecas,
    diasProdutivos,
    metaDiariaMedia,
    alcancadoMes,
    saldoMes,
    atingimentoPct,
    evolucaoDiaria,
    resumoSemanal,
  }
}
