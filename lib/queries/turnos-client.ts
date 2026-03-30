import { createClient } from '@/lib/supabase/client'
import { listarTurnoSetorOperacoesDoTurnoComClient } from '@/lib/queries/turno-setor-operacoes-base'
import type {
  PlanejamentoTurnoDashboardV2,
  PlanejamentoTurnoV2,
  TurnoOpV2,
  TurnoOperadorV2,
  TurnoSetorOpV2,
  TurnoV2,
} from '@/types'
import type { Tables } from '@/types/supabase'

type TurnoRow = Tables<'turnos'>
type TurnoOperadorRow = Tables<'turno_operadores'>
type TurnoOpRow = Tables<'turno_ops'>
type TurnoSetorOpRow = Tables<'turno_setor_ops'>

type OperadorResumoRow = Pick<
  Tables<'operadores'>,
  'id' | 'nome' | 'matricula' | 'funcao' | 'carga_horaria_min'
>
type ProdutoResumoRow = Pick<Tables<'produtos'>, 'id' | 'nome' | 'referencia'>
type SetorResumoRow = Pick<Tables<'setores'>, 'id' | 'codigo' | 'nome'>

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
  const supabase = createClient()

  const query = supabase
    .from('turnos')
    .select(
      'id, iniciado_em, encerrado_em, operadores_disponiveis, minutos_turno, status, observacao, created_at, updated_at'
    )

  if (tipo === 'aberto') {
    const { data, error } = await query
      .eq('status', 'aberto')
      .order('iniciado_em', { ascending: false })
      .maybeSingle<TurnoRow>()

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
  const supabase = createClient()

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
  const supabase = createClient()

  const { data: ops, error: opsError } = await supabase
    .from('turno_ops')
    .select(
      'id, turno_id, numero_op, produto_id, quantidade_planejada, quantidade_realizada, status, iniciado_em, encerrado_em'
    )
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
    .returns<TurnoOpRow[]>()

  if (opsError) {
    throw new Error(`Erro ao listar OPs do turno: ${opsError.message}`)
  }

  const produtoIds = Array.from(new Set((ops ?? []).map((op) => op.produto_id).filter(Boolean)))

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

  return (ops ?? [])
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
        status: op.status as TurnoOpV2['status'],
        iniciadoEm: op.iniciado_em,
        encerradoEm: op.encerrado_em,
      }
    })
    .filter((op): op is TurnoOpV2 => Boolean(op))
}

async function listarTurnoSetorOps(turnoId: string): Promise<TurnoSetorOpV2[]> {
  const supabase = createClient()

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

export async function buscarPlanejamentoTurnoPorIdClient(
  turnoId: string
): Promise<PlanejamentoTurnoV2 | null> {
  const supabase = createClient()

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

  const [operadores, ops, secoesSetorOp, operacoesSecao] = await Promise.all([
    listarTurnoOperadores(turno.id),
    listarTurnoOps(turno.id),
    listarTurnoSetorOps(turno.id),
    listarTurnoSetorOperacoesDoTurnoComClient(supabase, turno.id),
  ])

  return {
    turno: mapearTurno(turno),
    operadores,
    ops,
    secoesSetorOp,
    operacoesSecao,
  }
}

export async function buscarTurnoAbertoOuUltimoEncerradoClient(): Promise<PlanejamentoTurnoDashboardV2 | null> {
  const turnoAberto = await buscarTurnoBase('aberto')

  if (turnoAberto) {
    const planejamento = await buscarPlanejamentoTurnoPorIdClient(turnoAberto.id)
    return planejamento
      ? {
          ...planejamento,
          origem: 'aberto',
        }
      : null
  }

  const ultimoTurnoEncerrado = await buscarTurnoBase('ultimo_encerrado')

  if (!ultimoTurnoEncerrado) {
    return null
  }

  const planejamento = await buscarPlanejamentoTurnoPorIdClient(ultimoTurnoEncerrado.id)

  return planejamento
    ? {
        ...planejamento,
        origem: 'ultimo_encerrado',
      }
    : null
}
