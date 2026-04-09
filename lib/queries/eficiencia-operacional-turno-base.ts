import type { SupabaseClient } from '@supabase/supabase-js'
import { listarTurnoSetorOperacoesDoTurnoComClient } from '@/lib/queries/turno-setor-operacoes-base'
import { calcularMetaHora } from '@/lib/utils/producao'
import type {
  EficienciaOperacionalDiaRegistroV2,
  EficienciaOperacionalHoraRegistroV2,
  EficienciaOperacionalOperacaoRegistroV2,
  ResumoEficienciaOperacionalTurnoV2,
  TurnoSetorOperacaoApontamentoV2,
} from '@/types'
import type { Database, Tables } from '@/types/supabase'

const MINUTOS_POR_HORA = 60
const TIMEZONE_OPERACIONAL = 'America/Fortaleza'

type TurnoResumoEficienciaRow = Pick<Tables<'turnos'>, 'id' | 'iniciado_em' | 'minutos_turno'>
type RegistroEficienciaRow = Pick<
  Tables<'registros_producao'>,
  'hora_registro' | 'quantidade' | 'operador_id' | 'turno_setor_operacao_id'
>
type OperadorResumoEficienciaRow = Pick<Tables<'operadores'>, 'id' | 'nome' | 'matricula'>

export interface TurnoEficienciaOperacionalConsolidavel {
  id: string
  iniciadoEm: string
  minutosTurno: number
}

export interface RegistroEficienciaOperacionalConsolidavel {
  horaRegistro: string
  quantidade: number
  operadorId: string
  turnoSetorOperacaoId: string
}

export interface OperadorEficienciaOperacionalConsolidavel {
  id: string
  nome: string
  matricula: string
}

const FORMATADOR_HORA_LOCAL = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_OPERACIONAL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

const FORMATADOR_DATA_LOCAL = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_OPERACIONAL,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function arredondarIndicador(valor: number): number {
  if (!Number.isFinite(valor)) {
    return 0
  }

  return Math.round(valor * 100) / 100
}

function calcularMinutosPadraoRealizados(
  quantidadeRealizada: number,
  tempoPadraoMinSnapshot: number
): number {
  if (
    !Number.isFinite(quantidadeRealizada) ||
    !Number.isFinite(tempoPadraoMinSnapshot) ||
    quantidadeRealizada <= 0 ||
    tempoPadraoMinSnapshot <= 0
  ) {
    return 0
  }

  return quantidadeRealizada * tempoPadraoMinSnapshot
}

function calcularEficienciaOperacionalPct(
  minutosPadraoRealizados: number,
  minutosDisponiveis: number
): number {
  if (
    !Number.isFinite(minutosPadraoRealizados) ||
    !Number.isFinite(minutosDisponiveis) ||
    minutosPadraoRealizados <= 0 ||
    minutosDisponiveis <= 0
  ) {
    return 0
  }

  return arredondarIndicador((minutosPadraoRealizados / minutosDisponiveis) * 100)
}

function formatarHoraLocal(timestamp: string): string {
  const data = new Date(timestamp)

  if (Number.isNaN(data.getTime())) {
    return ''
  }

  const partes = FORMATADOR_HORA_LOCAL.formatToParts(data)
  const ano = partes.find((parte) => parte.type === 'year')?.value
  const mes = partes.find((parte) => parte.type === 'month')?.value
  const dia = partes.find((parte) => parte.type === 'day')?.value
  const hora = partes.find((parte) => parte.type === 'hour')?.value

  if (!ano || !mes || !dia || !hora) {
    return ''
  }

  return `${ano}-${mes}-${dia}T${hora}:00:00`
}

function formatarDataLocal(timestamp: string): string {
  const data = new Date(timestamp)

  if (Number.isNaN(data.getTime())) {
    return ''
  }

  return FORMATADOR_DATA_LOCAL.format(data)
}

export function consolidarResumoEficienciaOperacionalTurno(
  turno: TurnoEficienciaOperacionalConsolidavel,
  operacoesTurno: TurnoSetorOperacaoApontamentoV2[],
  registros: RegistroEficienciaOperacionalConsolidavel[],
  operadores: OperadorEficienciaOperacionalConsolidavel[]
): ResumoEficienciaOperacionalTurnoV2 {
  const operacoesPorId = new Map(operacoesTurno.map((operacao) => [operacao.id, operacao]))

  if (operacoesPorId.size === 0 || registros.length === 0 || operadores.length === 0) {
    return {
      porHora: [],
      porDia: [],
      porOperacao: [],
    }
  }

  const operadoresPorId = new Map(operadores.map((operador) => [operador.id, operador]))
  const dataTurno = formatarDataLocal(turno.iniciadoEm)
  const agregacaoPorHoraOperador = new Map<string, EficienciaOperacionalHoraRegistroV2>()
  const agregacaoPorOperacao = new Map<string, EficienciaOperacionalOperacaoRegistroV2>()
  const agregacaoPorDia = new Map<string, EficienciaOperacionalDiaRegistroV2>()

  for (const registro of registros) {
    const operador = operadoresPorId.get(registro.operadorId)
    const operacaoTurno = operacoesPorId.get(registro.turnoSetorOperacaoId)

    if (!operador || !operacaoTurno) {
      continue
    }

    const hora = formatarHoraLocal(registro.horaRegistro)
    const tempoPadraoMinSnapshot = operacaoTurno.tempoPadraoMinSnapshot

    if (!hora || tempoPadraoMinSnapshot <= 0) {
      continue
    }

    const quantidadeRealizada = registro.quantidade
    const minutosPadraoRealizados = calcularMinutosPadraoRealizados(
      quantidadeRealizada,
      tempoPadraoMinSnapshot
    )

    if (minutosPadraoRealizados <= 0) {
      continue
    }

    const chaveHoraOperador = [hora, registro.operadorId].join(':')
    const horaOperadorAtual = agregacaoPorHoraOperador.get(chaveHoraOperador)

    if (horaOperadorAtual) {
      horaOperadorAtual.quantidadeRealizada += quantidadeRealizada
      horaOperadorAtual.minutosPadraoRealizados = arredondarIndicador(
        horaOperadorAtual.minutosPadraoRealizados + minutosPadraoRealizados
      )
      horaOperadorAtual.eficienciaPct = calcularEficienciaOperacionalPct(
        horaOperadorAtual.minutosPadraoRealizados,
        MINUTOS_POR_HORA
      )
    } else {
      agregacaoPorHoraOperador.set(chaveHoraOperador, {
        turnoId: turno.id,
        hora,
        operadorId: operador.id,
        operadorNome: operador.nome,
        operadorMatricula: operador.matricula,
        totalOperacoes: 0,
        quantidadeRealizada,
        minutosPadraoRealizados: arredondarIndicador(minutosPadraoRealizados),
        eficienciaPct: calcularEficienciaOperacionalPct(
          minutosPadraoRealizados,
          MINUTOS_POR_HORA
        ),
      })
    }

    const chaveOperacao = [
      hora,
      registro.operadorId,
      operacaoTurno.operacaoId,
      tempoPadraoMinSnapshot,
    ].join(':')
    const operacaoAtual = agregacaoPorOperacao.get(chaveOperacao)

    if (operacaoAtual) {
      operacaoAtual.quantidadeRealizada += quantidadeRealizada
      operacaoAtual.minutosPadraoRealizados = arredondarIndicador(
        operacaoAtual.minutosPadraoRealizados + minutosPadraoRealizados
      )
      operacaoAtual.eficienciaPct = calcularEficienciaOperacionalPct(
        operacaoAtual.minutosPadraoRealizados,
        MINUTOS_POR_HORA
      )
    } else {
      agregacaoPorOperacao.set(chaveOperacao, {
        turnoId: turno.id,
        hora,
        operadorId: operador.id,
        operadorNome: operador.nome,
        operadorMatricula: operador.matricula,
        operacaoId: operacaoTurno.operacaoId,
        operacaoCodigo: operacaoTurno.operacaoCodigo,
        operacaoDescricao: operacaoTurno.operacaoDescricao,
        tempoPadraoMinSnapshot,
        metaHora: calcularMetaHora(tempoPadraoMinSnapshot),
        quantidadeRealizada,
        minutosPadraoRealizados: arredondarIndicador(minutosPadraoRealizados),
        eficienciaPct: calcularEficienciaOperacionalPct(
          minutosPadraoRealizados,
          MINUTOS_POR_HORA
        ),
      })
    }

    const chaveDia = [dataTurno, registro.operadorId].join(':')
    const diaAtual = agregacaoPorDia.get(chaveDia)

    if (diaAtual) {
      diaAtual.quantidadeRealizada += quantidadeRealizada
      diaAtual.minutosPadraoRealizados = arredondarIndicador(
        diaAtual.minutosPadraoRealizados + minutosPadraoRealizados
      )
      diaAtual.eficienciaPct = calcularEficienciaOperacionalPct(
        diaAtual.minutosPadraoRealizados,
        turno.minutosTurno
      )
    } else {
      agregacaoPorDia.set(chaveDia, {
        turnoId: turno.id,
        data: dataTurno,
        operadorId: operador.id,
        operadorNome: operador.nome,
        operadorMatricula: operador.matricula,
        minutosTurno: turno.minutosTurno,
        quantidadeRealizada,
        minutosPadraoRealizados: arredondarIndicador(minutosPadraoRealizados),
        eficienciaPct: calcularEficienciaOperacionalPct(
          minutosPadraoRealizados,
          turno.minutosTurno
        ),
      })
    }
  }

  const totaisOperacoesPorHoraOperador = new Map<string, number>()

  for (const operacao of agregacaoPorOperacao.values()) {
    const chaveHoraOperador = `${operacao.hora}:${operacao.operadorId}`
    totaisOperacoesPorHoraOperador.set(
      chaveHoraOperador,
      (totaisOperacoesPorHoraOperador.get(chaveHoraOperador) ?? 0) + 1
    )
  }

  for (const registroPorHora of agregacaoPorHoraOperador.values()) {
    registroPorHora.totalOperacoes =
      totaisOperacoesPorHoraOperador.get(`${registroPorHora.hora}:${registroPorHora.operadorId}`) ??
      0
  }

  return {
    porHora: Array.from(agregacaoPorHoraOperador.values()).sort(
      (primeiroRegistro, segundoRegistro) =>
        primeiroRegistro.hora.localeCompare(segundoRegistro.hora) ||
        primeiroRegistro.operadorNome.localeCompare(segundoRegistro.operadorNome)
    ),
    porDia: Array.from(agregacaoPorDia.values()).sort(
      (primeiroRegistro, segundoRegistro) =>
        segundoRegistro.eficienciaPct - primeiroRegistro.eficienciaPct ||
        primeiroRegistro.operadorNome.localeCompare(segundoRegistro.operadorNome)
    ),
    porOperacao: Array.from(agregacaoPorOperacao.values()).sort(
      (primeiroRegistro, segundoRegistro) =>
        primeiroRegistro.hora.localeCompare(segundoRegistro.hora) ||
        primeiroRegistro.operadorNome.localeCompare(segundoRegistro.operadorNome) ||
        primeiroRegistro.operacaoDescricao.localeCompare(segundoRegistro.operacaoDescricao)
    ),
  }
}

export async function listarResumoEficienciaOperacionalTurnoComClient(
  supabase: SupabaseClient<Database>,
  turnoId: string
): Promise<ResumoEficienciaOperacionalTurnoV2> {
  const [{ data: turno, error: turnoError }, operacoesTurno] = await Promise.all([
    supabase
      .from('turnos')
      .select('id, iniciado_em, minutos_turno')
      .eq('id', turnoId)
      .maybeSingle<TurnoResumoEficienciaRow>(),
    listarTurnoSetorOperacoesDoTurnoComClient(supabase, turnoId),
  ])

  if (turnoError) {
    throw new Error(`Erro ao carregar turno para eficiência operacional: ${turnoError.message}`)
  }

  if (!turno) {
    throw new Error(`Turno ${turnoId} não encontrado para eficiência operacional.`)
  }

  const turnoSetorOperacaoIds = operacoesTurno.map((operacao) => operacao.id)

  if (turnoSetorOperacaoIds.length === 0) {
    return {
      porHora: [],
      porDia: [],
      porOperacao: [],
    }
  }

  const { data: registros, error: registrosError } = await supabase
    .from('registros_producao')
    .select('hora_registro, quantidade, operador_id, turno_setor_operacao_id')
    .in('turno_setor_operacao_id', turnoSetorOperacaoIds)
    .not('hora_registro', 'is', null)
    .not('operador_id', 'is', null)
    .not('turno_setor_operacao_id', 'is', null)
    .order('hora_registro', { ascending: true })
    .returns<RegistroEficienciaRow[]>()

  if (registrosError) {
    throw new Error(
      `Erro ao carregar registros para eficiência operacional do turno: ${registrosError.message}`
    )
  }

  const registrosValidos = (registros ?? []).filter(
    (
      registro
    ): registro is RegistroEficienciaRow & {
      hora_registro: string
      operador_id: string
      turno_setor_operacao_id: string
    } =>
      Boolean(registro.hora_registro && registro.operador_id && registro.turno_setor_operacao_id) &&
      Number.isFinite(registro.quantidade) &&
      (registro.quantidade ?? 0) > 0
  )

  if (registrosValidos.length === 0) {
    return {
      porHora: [],
      porDia: [],
      porOperacao: [],
    }
  }

  const operadorIds = Array.from(new Set(registrosValidos.map((registro) => registro.operador_id)))

  const { data: operadores, error: operadoresError } = await supabase
    .from('operadores')
    .select('id, nome, matricula')
    .in('id', operadorIds)
    .returns<OperadorResumoEficienciaRow[]>()

  if (operadoresError) {
    throw new Error(
      `Erro ao carregar operadores para eficiência operacional do turno: ${operadoresError.message}`
    )
  }

  return consolidarResumoEficienciaOperacionalTurno(
    {
      id: turno.id,
      iniciadoEm: turno.iniciado_em,
      minutosTurno: turno.minutos_turno,
    },
    operacoesTurno,
    registrosValidos.map((registro) => ({
      horaRegistro: registro.hora_registro,
      quantidade: registro.quantidade ?? 0,
      operadorId: registro.operador_id,
      turnoSetorOperacaoId: registro.turno_setor_operacao_id,
    })),
    (operadores ?? []).map((operador) => ({
      id: operador.id,
      nome: operador.nome,
      matricula: operador.matricula,
    }))
  )
}
