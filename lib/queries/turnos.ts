import { createClient } from '@/lib/supabase/server'
import { listarTurnoSetorOperacoesDoTurnoComClient } from '@/lib/queries/turno-setor-operacoes-base'
import { consolidarOpsPorDemandas } from '@/lib/utils/consolidacao-turno'
import type {
  PlanejamentoTurnoDashboardV2,
  PlanejamentoTurnoV2,
  TurnoOpV2,
  TurnoOperadorV2,
  TurnoSetorDemandaV2,
  TurnoSetorOpV2,
  TurnoSetorV2,
  TurnoV2,
} from '@/types'
import type { Tables } from '@/types/supabase'

type TurnoRow = Tables<'turnos'>
type TurnoOperadorRow = Tables<'turno_operadores'>
type TurnoOpRow = Tables<'turno_ops'>
type TurnoSetorDemandaRow = Tables<'turno_setor_demandas'>
type TurnoSetorOpRow = Tables<'turno_setor_ops'>
type TurnoSetorRow = Tables<'turno_setores'>

type OperadorResumoRow = Pick<
  Tables<'operadores'>,
  'id' | 'nome' | 'matricula' | 'funcao' | 'carga_horaria_min'
>
type ProdutoResumoRow = Pick<Tables<'produtos'>, 'id' | 'nome' | 'referencia'>
type SetorResumoRow = Pick<Tables<'setores'>, 'id' | 'codigo' | 'nome'>

interface QueryErrorLike {
  code?: string
  message?: string
}

function isQueryErrorLike(value: unknown): value is QueryErrorLike {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    candidate.code === undefined || typeof candidate.code === 'string'
  ) && (candidate.message === undefined || typeof candidate.message === 'string')
}

function isSchemaLegadoIncompativel(error: unknown): boolean {
  if (!isQueryErrorLike(error)) {
    return false
  }

  if (error.code === '42P01' || error.code === '42703') {
    return true
  }

  const mensagem = (error.message ?? '').toLowerCase()

  return (
    mensagem.includes('does not exist') ||
    mensagem.includes('could not find the table') ||
    mensagem.includes('schema cache')
  )
}

function mapearTurno(turno: TurnoRow): TurnoV2 {
  return {
    id: turno.id,
    iniciadoEm: turno.iniciado_em,
    encerradoEm: turno.encerrado_em,
    status: turno.status as TurnoV2['status'],
    operadoresDisponiveis: turno.operadores_disponiveis,
    minutosTurno: turno.minutos_turno,
    observacao: turno.observacao,
  }
}

async function buscarTurnoBase(
  tipo: 'aberto' | 'ultimo_encerrado'
): Promise<TurnoRow | null> {
  const supabase = await createClient()

  const query = supabase
    .from('turnos')
    .select(
      'id, iniciado_em, encerrado_em, operadores_disponiveis, minutos_turno, status, observacao, created_at, updated_at'
    )

  if (tipo === 'aberto') {
    const { data, error } = await query.eq('status', 'aberto').order('iniciado_em', {
      ascending: false,
    }).maybeSingle<TurnoRow>()

    if (error || !data) {
      return null
    }

    return data
  }

  const { data, error } = await query
    .eq('status', 'encerrado')
    .order('encerrado_em', { ascending: false, nullsFirst: false })
    .limit(1)
    .returns<TurnoRow[]>()

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0]
}

async function listarTurnoOperadores(turnoId: string): Promise<TurnoOperadorV2[]> {
  const supabase = await createClient()

  const { data: alocacoes, error: alocacoesError } = await supabase
    .from('turno_operadores')
    .select('id, turno_id, operador_id, setor_id')
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
    .returns<TurnoOperadorRow[]>()

  if (alocacoesError) {
    throw new Error(`Erro ao listar operadores do turno: ${alocacoesError.message}`)
  }

  const operadorIds = Array.from(
    new Set((alocacoes ?? []).map((alocacao) => alocacao.operador_id).filter(Boolean))
  )

  if (operadorIds.length === 0) {
    return []
  }

  const { data: operadores, error: operadoresError } = await supabase
    .from('operadores')
    .select('id, nome, matricula, funcao, carga_horaria_min')
    .in('id', operadorIds)
    .returns<OperadorResumoRow[]>()

  if (operadoresError) {
    throw new Error(`Erro ao carregar operadores do turno: ${operadoresError.message}`)
  }

  const operadoresPorId = new Map((operadores ?? []).map((operador) => [operador.id, operador]))

  return (alocacoes ?? [])
    .map((alocacao) => {
      const operador = operadoresPorId.get(alocacao.operador_id)
      if (!operador) {
        return null
      }

      return {
        id: alocacao.id,
        turnoId: alocacao.turno_id,
        operadorId: alocacao.operador_id,
        setorId: alocacao.setor_id,
        operadorNome: operador.nome,
        matricula: operador.matricula,
        funcao: operador.funcao,
        cargaHorariaMin: operador.carga_horaria_min ?? 0,
      }
    })
    .filter((alocacao): alocacao is TurnoOperadorV2 => Boolean(alocacao))
}

async function listarTurnoOps(turnoId: string): Promise<TurnoOpV2[]> {
  const supabase = await createClient()

  const { data: ops, error: opsError } = await supabase
    .from('turno_ops')
    .select(
      'id, turno_id, numero_op, produto_id, quantidade_planejada, quantidade_realizada, status, iniciado_em, encerrado_em'
    )
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
    .returns<TurnoOpRow[]>()

  let opsCompativeis = ops

  if (opsError && isSchemaLegadoIncompativel(opsError)) {
    const { data: opsLegadas, error: opsLegadasError } = await supabase
      .from('turno_ops')
      .select(
        'id, turno_id, numero_op, produto_id, quantidade_planejada, quantidade_realizada, status, iniciado_em, encerrado_em'
      )
      .eq('turno_id', turnoId)
      .order('created_at', { ascending: true })
      .returns<TurnoOpRow[]>()

    if (opsLegadasError) {
      throw new Error(`Erro ao listar OPs do turno: ${opsLegadasError.message}`)
    }

    opsCompativeis = (opsLegadas ?? []).map((opLegada) => ({
      ...opLegada,
      quantidade_planejada_original: opLegada.quantidade_planejada,
      quantidade_planejada_remanescente: Math.max(
        opLegada.quantidade_planejada - opLegada.quantidade_realizada,
        0
      ),
      turno_op_origem_id: null,
    })) as TurnoOpRow[]
  } else if (opsError) {
    throw new Error(`Erro ao listar OPs do turno: ${opsError.message}`)
  }

  const produtoIds = Array.from(
    new Set((opsCompativeis ?? []).map((op) => op.produto_id).filter(Boolean))
  )

  if (produtoIds.length === 0) {
    return []
  }

  const { data: produtos, error: produtosError } = await supabase
    .from('produtos')
    .select('id, nome, referencia')
    .in('id', produtoIds)
    .returns<ProdutoResumoRow[]>()

  if (produtosError) {
    throw new Error(`Erro ao carregar produtos do turno: ${produtosError.message}`)
  }

  const produtosPorId = new Map((produtos ?? []).map((produto) => [produto.id, produto]))

  return (opsCompativeis ?? [])
    .map((op) => {
      const produto = produtosPorId.get(op.produto_id)
      if (!produto) {
        return null
      }

      return {
        id: op.id,
        turnoId: op.turno_id,
        numeroOp: op.numero_op,
        produtoId: op.produto_id,
        produtoReferencia: produto.referencia,
        produtoNome: produto.nome,
        quantidadePlanejada: op.quantidade_planejada,
        quantidadeRealizada: op.quantidade_realizada,
        quantidadePlanejadaOriginal: op.quantidade_planejada_original,
        quantidadePlanejadaRemanescente: op.quantidade_planejada_remanescente,
        turnoOpOrigemId: op.turno_op_origem_id,
        status: op.status as TurnoOpV2['status'],
        iniciadoEm: op.iniciado_em,
        encerradoEm: op.encerrado_em,
      }
    })
    .filter((op): op is TurnoOpV2 => Boolean(op))
}

async function listarTurnoSetorOps(turnoId: string): Promise<TurnoSetorOpV2[]> {
  const supabase = await createClient()

  const { data: secoes, error: secoesError } = await supabase
    .from('turno_setor_ops')
    .select(
      'id, turno_id, turno_op_id, setor_id, quantidade_planejada, quantidade_realizada, qr_code_token, status, iniciado_em, encerrado_em'
    )
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
    .returns<TurnoSetorOpRow[]>()

  if (secoesError) {
    throw new Error(`Erro ao listar seções do turno: ${secoesError.message}`)
  }

  const setorIds = Array.from(new Set((secoes ?? []).map((secao) => secao.setor_id).filter(Boolean)))

  if (setorIds.length === 0) {
    return []
  }

  const { data: setores, error: setoresError } = await supabase
    .from('setores')
    .select('id, codigo, nome')
    .in('id', setorIds)
    .returns<SetorResumoRow[]>()

  if (setoresError) {
    throw new Error(`Erro ao carregar setores do turno: ${setoresError.message}`)
  }

  const setoresPorId = new Map((setores ?? []).map((setor) => [setor.id, setor]))

  return (secoes ?? [])
    .map((secao) => {
      const setor = setoresPorId.get(secao.setor_id)
      if (!setor) {
        return null
      }

      return {
        id: secao.id,
        turnoId: secao.turno_id,
        turnoOpId: secao.turno_op_id,
        setorId: secao.setor_id,
        setorNome: setor.nome,
        quantidadePlanejada: secao.quantidade_planejada,
        quantidadeRealizada: secao.quantidade_realizada,
        qrCodeToken: secao.qr_code_token,
        status: secao.status as TurnoSetorOpV2['status'],
        iniciadoEm: secao.iniciado_em,
        encerradoEm: secao.encerrado_em,
      }
    })
    .filter((secao): secao is TurnoSetorOpV2 => Boolean(secao))
    .sort((primeiraSecao, segundaSecao) => {
      const primeiroSetor = setoresPorId.get(primeiraSecao.setorId)
      const segundoSetor = setoresPorId.get(segundaSecao.setorId)

      const primeiroCodigo = primeiroSetor?.codigo ?? Number.MAX_SAFE_INTEGER
      const segundoCodigo = segundoSetor?.codigo ?? Number.MAX_SAFE_INTEGER

      if (primeiroCodigo !== segundoCodigo) {
        return primeiroCodigo - segundoCodigo
      }

      return primeiraSecao.setorNome.localeCompare(segundaSecao.setorNome)
    })
}

async function listarTurnoSetores(turnoId: string): Promise<TurnoSetorV2[]> {
  const supabase = await createClient()

  const { data: setoresTurno, error: setoresTurnoError } = await supabase
    .from('turno_setores')
    .select(
      'id, turno_id, setor_id, quantidade_planejada, quantidade_realizada, qr_code_token, status, iniciado_em, encerrado_em'
    )
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
    .returns<TurnoSetorRow[]>()

  if (setoresTurnoError && isSchemaLegadoIncompativel(setoresTurnoError)) {
    return []
  }

  if (setoresTurnoError) {
    throw new Error(`Erro ao listar setores ativos do turno: ${setoresTurnoError.message}`)
  }

  const setorIds = Array.from(
    new Set((setoresTurno ?? []).map((setorTurno) => setorTurno.setor_id).filter(Boolean))
  )

  if (setorIds.length === 0) {
    return []
  }

  const { data: setores, error: setoresError } = await supabase
    .from('setores')
    .select('id, codigo, nome')
    .in('id', setorIds)
    .returns<SetorResumoRow[]>()

  if (setoresError) {
    throw new Error(`Erro ao carregar setores ativos do turno: ${setoresError.message}`)
  }

  const setoresPorId = new Map((setores ?? []).map((setor) => [setor.id, setor]))

  return (setoresTurno ?? [])
    .map((setorTurno) => {
      const setor = setoresPorId.get(setorTurno.setor_id)
      if (!setor) {
        return null
      }

      return {
        id: setorTurno.id,
        turnoId: setorTurno.turno_id,
        setorId: setorTurno.setor_id,
        setorNome: setor.nome,
        quantidadePlanejada: setorTurno.quantidade_planejada,
        quantidadeRealizada: setorTurno.quantidade_realizada,
        qrCodeToken: setorTurno.qr_code_token,
        status: setorTurno.status as TurnoSetorV2['status'],
        iniciadoEm: setorTurno.iniciado_em,
        encerradoEm: setorTurno.encerrado_em,
      }
    })
    .filter((setorTurno): setorTurno is TurnoSetorV2 => Boolean(setorTurno))
    .sort((primeiroSetorTurno, segundoSetorTurno) => {
      const primeiroSetor = setoresPorId.get(primeiroSetorTurno.setorId)
      const segundoSetor = setoresPorId.get(segundoSetorTurno.setorId)

      const primeiroCodigo = primeiroSetor?.codigo ?? Number.MAX_SAFE_INTEGER
      const segundoCodigo = segundoSetor?.codigo ?? Number.MAX_SAFE_INTEGER

      if (primeiroCodigo !== segundoCodigo) {
        return primeiroCodigo - segundoCodigo
      }

      return primeiroSetorTurno.setorNome.localeCompare(segundoSetorTurno.setorNome)
    })
}

async function listarTurnoSetorDemandas(
  turnoId: string,
  opsTurno: TurnoOpV2[]
): Promise<TurnoSetorDemandaV2[]> {
  const supabase = await createClient()

  const { data: demandas, error: demandasError } = await supabase
    .from('turno_setor_demandas')
    .select(
      'id, turno_setor_id, turno_id, turno_op_id, produto_id, setor_id, turno_setor_op_legacy_id, quantidade_planejada, quantidade_realizada, status, iniciado_em, encerrado_em'
    )
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
    .returns<TurnoSetorDemandaRow[]>()

  if (demandasError && isSchemaLegadoIncompativel(demandasError)) {
    return []
  }

  if (demandasError) {
    throw new Error(`Erro ao listar demandas dos setores do turno: ${demandasError.message}`)
  }

  if (!demandas || demandas.length === 0) {
    return []
  }

  const setorIds = Array.from(new Set(demandas.map((demanda) => demanda.setor_id).filter(Boolean)))

  const { data: setores, error: setoresError } = await supabase
    .from('setores')
    .select('id, codigo, nome')
    .in('id', setorIds)
    .returns<SetorResumoRow[]>()

  if (setoresError) {
    throw new Error(`Erro ao carregar setores das demandas do turno: ${setoresError.message}`)
  }

  const setoresPorId = new Map((setores ?? []).map((setor) => [setor.id, setor]))
  const opsPorId = new Map(opsTurno.map((op) => [op.id, op]))

  return demandas
    .map((demanda) => {
      const setor = setoresPorId.get(demanda.setor_id)
      const op = opsPorId.get(demanda.turno_op_id)

      if (!setor || !op) {
        return null
      }

      return {
        id: demanda.id,
        turnoSetorId: demanda.turno_setor_id,
        turnoId: demanda.turno_id,
        turnoOpId: demanda.turno_op_id,
        setorId: demanda.setor_id,
        produtoId: demanda.produto_id,
        numeroOp: op.numeroOp,
        produtoReferencia: op.produtoReferencia,
        produtoNome: op.produtoNome,
        quantidadePlanejada: demanda.quantidade_planejada,
        quantidadeRealizada: demanda.quantidade_realizada,
        status: demanda.status as TurnoSetorDemandaV2['status'],
        iniciadoEm: demanda.iniciado_em,
        encerradoEm: demanda.encerrado_em,
        turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
      }
    })
    .filter((demanda): demanda is TurnoSetorDemandaV2 => Boolean(demanda))
    .sort((primeiraDemanda, segundaDemanda) => {
      const primeiroSetor = setoresPorId.get(primeiraDemanda.setorId)
      const segundoSetor = setoresPorId.get(segundaDemanda.setorId)

      const primeiroCodigo = primeiroSetor?.codigo ?? Number.MAX_SAFE_INTEGER
      const segundoCodigo = segundoSetor?.codigo ?? Number.MAX_SAFE_INTEGER

      if (primeiroCodigo !== segundoCodigo) {
        return primeiroCodigo - segundoCodigo
      }

      const comparacaoOp = primeiraDemanda.numeroOp.localeCompare(segundaDemanda.numeroOp)
      if (comparacaoOp !== 0) {
        return comparacaoOp
      }

      return primeiraDemanda.produtoNome.localeCompare(segundaDemanda.produtoNome)
    })
}

export async function buscarPlanejamentoTurnoPorId(turnoId: string): Promise<PlanejamentoTurnoV2 | null> {
  const supabase = await createClient()

  const { data: turno, error } = await supabase
    .from('turnos')
    .select(
      'id, iniciado_em, encerrado_em, operadores_disponiveis, minutos_turno, status, observacao, created_at, updated_at'
    )
    .eq('id', turnoId)
    .maybeSingle<TurnoRow>()

  if (error || !turno) {
    return null
  }

  const [operadores, ops, secoesSetorOp, operacoesSecao, setoresAtivos] = await Promise.all([
    listarTurnoOperadores(turno.id),
    listarTurnoOps(turno.id),
    listarTurnoSetorOps(turno.id),
    listarTurnoSetorOperacoesDoTurnoComClient(supabase, turno.id),
    listarTurnoSetores(turno.id),
  ])

  const demandasSetor = await listarTurnoSetorDemandas(turno.id, ops)
  const opsConsolidadas = consolidarOpsPorDemandas(ops, demandasSetor)

  return {
    turno: mapearTurno(turno),
    operadores,
    ops: opsConsolidadas,
    setoresAtivos,
    demandasSetor,
    secoesSetorOp,
    operacoesSecao,
  }
}

export async function buscarTurnoAberto(): Promise<PlanejamentoTurnoV2 | null> {
  const turno = await buscarTurnoBase('aberto')

  if (!turno) {
    return null
  }

  return buscarPlanejamentoTurnoPorId(turno.id)
}

export async function buscarUltimoTurnoEncerrado(): Promise<PlanejamentoTurnoV2 | null> {
  const turno = await buscarTurnoBase('ultimo_encerrado')

  if (!turno) {
    return null
  }

  return buscarPlanejamentoTurnoPorId(turno.id)
}

export async function buscarTurnoAbertoOuUltimoEncerrado(): Promise<PlanejamentoTurnoDashboardV2 | null> {
  const turnoAberto = await buscarTurnoAberto()

  if (turnoAberto) {
    return {
      ...turnoAberto,
      origem: 'aberto',
    }
  }

  const ultimoTurnoEncerrado = await buscarUltimoTurnoEncerrado()

  if (!ultimoTurnoEncerrado) {
    return null
  }

  return {
    ...ultimoTurnoEncerrado,
    origem: 'ultimo_encerrado',
  }
}
