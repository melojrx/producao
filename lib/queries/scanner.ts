import { createClient } from '@/lib/supabase/client'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type {
  ConfiguracaoTurnoBloco,
  ConfiguracaoTurno,
  MaquinaScaneada,
  OperacaoScaneada,
  OperadorScaneado,
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
    .select(
      `
        id,
        codigo,
        status,
        tipos_maquina (
          nome
        )
      `
    )
    .eq('qr_code_token', token)
    .single()

  if (error || !data || !data.status) {
    return null
  }

  const tipoNome =
    Array.isArray(data.tipos_maquina) && data.tipos_maquina.length > 0
      ? data.tipos_maquina[0]?.nome
      : null

  return {
    id: data.id,
    codigo: data.codigo,
    tipoNome: tipoNome ?? 'Tipo não informado',
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
