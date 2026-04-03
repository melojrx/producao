import { createClient } from '@/lib/supabase/client'
import {
  listarTurnoSetorOperacoesPorDemandaComClient,
  listarTurnoSetorOperacoesPorSecaoComClient,
} from '@/lib/queries/turno-setor-operacoes-base'
import {
  consolidarDemandasPorOperacoes,
  consolidarSetorScaneadoPorDemandas,
} from '@/lib/utils/consolidacao-turno'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type {
  ConfiguracaoTurnoBloco,
  ConfiguracaoTurno,
  MaquinaScaneada,
  OperacaoScaneada,
  OperadorScaneado,
  TurnoSetorDemandaScaneada,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorScaneado,
  TurnoSetorOpScaneado,
} from '@/types'

export async function buscarOperadorScaneadoPorToken(
  token: string
): Promise<OperadorScaneado | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('id, nome, matricula, foto_url, status')
    .eq('qr_code_token', token)
    .single()

  if (error || !data || data.status !== 'ativo') {
    return null
  }

  return {
    id: data.id,
    nome: data.nome,
    matricula: data.matricula,
    fotoUrl: data.foto_url,
  }
}

export async function buscarMaquinaScaneadaPorToken(
  token: string
): Promise<MaquinaScaneada | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('maquinas')
    .select('id, codigo, modelo, marca, numero_patrimonio, status')
    .eq('qr_code_token', token)
    .single()

  if (error || !data || !data.status) {
    return null
  }

  const descricaoPatrimonial =
    [data.marca, data.modelo]
      .map((valor) => valor?.trim() ?? '')
      .filter(Boolean)
      .join(' · ') || (data.numero_patrimonio ? `Patrimônio ${data.numero_patrimonio}` : '')

  return {
    id: data.id,
    codigo: data.codigo,
    descricaoPatrimonial: descricaoPatrimonial || 'Máquina patrimonial',
    status: data.status as MaquinaScaneada['status'],
  }
}

export async function buscarOperacaoBasePorToken(
  token: string
): Promise<Omit<OperacaoScaneada, 'metaIndividual'> | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('operacoes')
    .select('id, descricao, meta_hora, tempo_padrao_min, ativa')
    .eq('qr_code_token', token)
    .single()

  if (error || !data || data.ativa !== true) {
    return null
  }

  return {
    id: data.id,
    descricao: data.descricao,
    metaHora: data.meta_hora ?? 0,
    tempoPadraoMin: data.tempo_padrao_min,
  }
}

export async function buscarConfiguracaoTurnoHoje(): Promise<ConfiguracaoTurno | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('configuracao_turno')
    .select(
      'id, data, funcionarios_ativos, minutos_turno, produto_id, tp_produto_min, meta_grupo'
    )
    .eq('data', obterDataHojeLocal())
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    data: data.data,
    funcionariosAtivos: data.funcionarios_ativos,
    minutosTurno: data.minutos_turno,
    produtoId: data.produto_id,
    tpProdutoMin: data.tp_produto_min,
    metaGrupo: data.meta_grupo,
  }
}

export async function buscarBlocoAtivoHoje(): Promise<ConfiguracaoTurnoBloco | null> {
  const supabase = createClient()

  const { data: configuracao, error: configuracaoError } = await supabase
    .from('configuracao_turno')
    .select('id')
    .eq('data', obterDataHojeLocal())
    .maybeSingle()

  if (configuracaoError || !configuracao) {
    return null
  }

  const { data, error } = await supabase
    .from('configuracao_turno_blocos')
    .select(
      'id, configuracao_turno_id, produto_id, descricao_bloco, sequencia, funcionarios_ativos, minutos_planejados, tp_produto_min, origem_tp, meta_grupo, status, iniciado_em, encerrado_em'
    )
    .eq('configuracao_turno_id', configuracao.id)
    .eq('status', 'ativo')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    configuracaoTurnoId: data.configuracao_turno_id,
    produtoId: data.produto_id,
    descricaoBloco: data.descricao_bloco,
    sequencia: data.sequencia,
    funcionariosAtivos: data.funcionarios_ativos,
    minutosPlanejados: data.minutos_planejados,
    tpProdutoMin: data.tp_produto_min,
    origemTp: data.origem_tp as ConfiguracaoTurnoBloco['origemTp'],
    metaGrupo: data.meta_grupo,
    status: data.status as ConfiguracaoTurnoBloco['status'],
    iniciadoEm: data.iniciado_em,
    encerradoEm: data.encerrado_em,
  }
}

export async function buscarTurnoSetorOpScaneadoPorToken(
  token: string
): Promise<TurnoSetorOpScaneado | null> {
  const supabase = createClient()

  const { data: secao, error: secaoError } = await supabase
    .rpc('buscar_turno_setor_op_scanner', { p_qr_code_token: token })
    .maybeSingle()

  if (secaoError || !secao) {
    return null
  }

  return {
    id: secao.id,
    turnoId: secao.turno_id,
    turnoIniciadoEm: secao.turno_iniciado_em,
    turnoOpId: secao.turno_op_id,
    setorId: secao.setor_id,
    setorNome: secao.setor_nome,
    numeroOp: secao.numero_op,
    produtoId: secao.produto_id,
    produtoNome: secao.produto_nome,
    produtoReferencia: secao.produto_referencia,
    quantidadePlanejada: secao.quantidade_planejada,
    quantidadeRealizada: secao.quantidade_realizada,
    quantidadeConcluida: secao.quantidade_realizada,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    saldoRestante: Math.max(secao.quantidade_planejada - secao.quantidade_realizada, 0),
    qrCodeToken: secao.qr_code_token,
    status: secao.status as TurnoSetorOpScaneado['status'],
  }
}

interface TurnoSetorScannerRow {
  id: string
  turno_id: string
  turno_iniciado_em: string
  setor_id: string
  setor_nome: string
  quantidade_planejada: number
  quantidade_realizada: number
  qr_code_token: string
  status: string
}

export async function buscarTurnoSetorScaneadoPorToken(
  token: string
): Promise<TurnoSetorScaneado | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('turno_setores')
    .select(
      `
        id,
        turno_id,
        setor_id,
        quantidade_planejada,
        quantidade_realizada,
        qr_code_token,
        status,
        turnos!inner (
          iniciado_em,
          status
        ),
        setores!inner (
          nome
        )
      `
    )
    .eq('qr_code_token', token)
    .eq('turnos.status', 'aberto')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const turno = Array.isArray(data.turnos) ? data.turnos[0] : data.turnos
  const setor = Array.isArray(data.setores) ? data.setores[0] : data.setores

  if (!turno?.iniciado_em || !setor?.nome) {
    return null
  }

  const turnoSetor = {
    id: data.id,
    turno_id: data.turno_id,
    turno_iniciado_em: turno.iniciado_em,
    setor_id: data.setor_id,
    setor_nome: setor.nome,
    quantidade_planejada: data.quantidade_planejada,
    quantidade_realizada: data.quantidade_realizada,
    qr_code_token: data.qr_code_token,
    status: data.status,
  } satisfies TurnoSetorScannerRow

  const setorBase: TurnoSetorScaneado = {
    id: turnoSetor.id,
    turnoId: turnoSetor.turno_id,
    turnoIniciadoEm: turnoSetor.turno_iniciado_em,
    setorId: turnoSetor.setor_id,
    setorNome: turnoSetor.setor_nome,
    quantidadePlanejada: turnoSetor.quantidade_planejada,
    quantidadeRealizada: turnoSetor.quantidade_realizada,
    quantidadeConcluida: turnoSetor.quantidade_realizada,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    saldoRestante: Math.max(
      turnoSetor.quantidade_planejada - turnoSetor.quantidade_realizada,
      0
    ),
    qrCodeToken: turnoSetor.qr_code_token,
    status: turnoSetor.status as TurnoSetorScaneado['status'],
  }

  const demandasNormalizadas = await buscarDemandasScaneadasPorTurnoSetor(setorBase.id)

  return consolidarSetorScaneadoPorDemandas(setorBase, demandasNormalizadas)
}

interface TurnoSetorDemandaScannerRow {
  id: string
  turno_setor_id: string
  turno_id: string
  turno_op_id: string
  produto_id: string
  setor_id: string
  turno_setor_op_legacy_id: string | null
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
  turno_ops?: {
    numero_op: string
  } | {
    numero_op: string
  }[] | null
  produtos?: {
    nome: string
    referencia: string
  } | {
    nome: string
    referencia: string
  }[] | null
}

export async function buscarDemandasScaneadasPorTurnoSetor(
  turnoSetorId: string
): Promise<TurnoSetorDemandaScaneada[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('turno_setor_demandas')
    .select(
      `
        id,
        turno_setor_id,
        turno_id,
        turno_op_id,
        produto_id,
        setor_id,
        turno_setor_op_legacy_id,
        quantidade_planejada,
        quantidade_realizada,
        status,
        turno_ops!inner (
          numero_op
        ),
        produtos!inner (
          nome,
          referencia
        )
      `
    )
    .eq('turno_setor_id', turnoSetorId)
    .order('created_at', { ascending: true })
    .returns<TurnoSetorDemandaScannerRow[]>()

  if (error || !data) {
    return []
  }

  const demandasBase = data.map((demanda) => {
    const turnoOp = Array.isArray(demanda.turno_ops) ? demanda.turno_ops[0] : demanda.turno_ops
    const produto = Array.isArray(demanda.produtos) ? demanda.produtos[0] : demanda.produtos

    return {
      id: demanda.id,
      turnoSetorId: demanda.turno_setor_id,
      turnoId: demanda.turno_id,
      turnoOpId: demanda.turno_op_id,
      setorId: demanda.setor_id,
      numeroOp: turnoOp?.numero_op ?? 'OP sem número',
      produtoId: demanda.produto_id,
      produtoNome: produto?.nome ?? 'Produto sem nome',
      produtoReferencia: produto?.referencia ?? 'Sem referência',
      quantidadePlanejada: demanda.quantidade_planejada,
      quantidadeRealizada: demanda.quantidade_realizada,
      quantidadeConcluida: demanda.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      saldoRestante: Math.max(
        demanda.quantidade_planejada - demanda.quantidade_realizada,
        0
      ),
      status: demanda.status as TurnoSetorDemandaScaneada['status'],
      turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
    }
  })

  const operacoesPorDemanda = await Promise.all(
    demandasBase.map((demanda) => buscarOperacoesScaneadasPorDemanda(demanda))
  )

  return consolidarDemandasPorOperacoes(demandasBase, operacoesPorDemanda.flat())
}

export async function buscarOperacoesScaneadasPorSecao(
  turnoSetorOpId: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  const supabase = createClient()
  return listarTurnoSetorOperacoesPorSecaoComClient(supabase, turnoSetorOpId)
}

export async function buscarOperacoesScaneadasPorDemanda(
  turnoSetorDemanda: Pick<TurnoSetorDemandaScaneada, 'id' | 'turnoSetorOpLegacyId'>
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  const supabase = createClient()
  const operacoesPorDemanda = await listarTurnoSetorOperacoesPorDemandaComClient(
    supabase,
    turnoSetorDemanda.id
  )

  if (operacoesPorDemanda.length > 0 || !turnoSetorDemanda.turnoSetorOpLegacyId) {
    return operacoesPorDemanda
  }

  return listarTurnoSetorOperacoesPorSecaoComClient(
    supabase,
    turnoSetorDemanda.turnoSetorOpLegacyId
  )
}
