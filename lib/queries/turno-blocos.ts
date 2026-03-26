import { createClient } from '@/lib/supabase/server'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type { ConfiguracaoTurnoBloco, ConfiguracaoTurnoComBlocos } from '@/types'

function mapearBloco(
  bloco: {
    id: string
    configuracao_turno_id: string
    produto_id: string | null
    descricao_bloco: string
    sequencia: number
    funcionarios_ativos: number
    minutos_planejados: number
    tp_produto_min: number
    origem_tp: string
    meta_grupo: number
    status: string
    iniciado_em: string | null
    encerrado_em: string | null
  }
): ConfiguracaoTurnoBloco {
  return {
    id: bloco.id,
    configuracaoTurnoId: bloco.configuracao_turno_id,
    produtoId: bloco.produto_id,
    descricaoBloco: bloco.descricao_bloco,
    sequencia: bloco.sequencia,
    funcionariosAtivos: bloco.funcionarios_ativos,
    minutosPlanejados: bloco.minutos_planejados,
    tpProdutoMin: bloco.tp_produto_min,
    origemTp: bloco.origem_tp as ConfiguracaoTurnoBloco['origemTp'],
    metaGrupo: bloco.meta_grupo,
    status: bloco.status as ConfiguracaoTurnoBloco['status'],
    iniciadoEm: bloco.iniciado_em,
    encerradoEm: bloco.encerrado_em,
  }
}

export async function listarBlocosDoTurno(
  configuracaoTurnoId: string
): Promise<ConfiguracaoTurnoBloco[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('configuracao_turno_blocos')
    .select(
      'id, configuracao_turno_id, produto_id, descricao_bloco, sequencia, funcionarios_ativos, minutos_planejados, tp_produto_min, origem_tp, meta_grupo, status, iniciado_em, encerrado_em'
    )
    .eq('configuracao_turno_id', configuracaoTurnoId)
    .order('sequencia', { ascending: true })

  if (error) {
    throw new Error(`Erro ao listar blocos do turno: ${error.message}`)
  }

  return (data ?? []).map(mapearBloco)
}

export async function buscarBlocoAtivoHoje(): Promise<ConfiguracaoTurnoBloco | null> {
  const supabase = await createClient()

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

  return mapearBloco(data)
}

export async function buscarConfiguracaoTurnoComBlocosHoje(): Promise<ConfiguracaoTurnoComBlocos | null> {
  const supabase = await createClient()

  const { data: configuracao, error: configuracaoError } = await supabase
    .from('configuracao_turno')
    .select('id, data, funcionarios_ativos, minutos_turno, produto_id, tp_produto_min, meta_grupo')
    .eq('data', obterDataHojeLocal())
    .maybeSingle()

  if (configuracaoError || !configuracao) {
    return null
  }

  const blocos = await listarBlocosDoTurno(configuracao.id)
  const metaGrupoTotal = blocos.reduce((soma, bloco) => soma + bloco.metaGrupo, 0)
  const blocoAtivo = blocos.find((bloco) => bloco.status === 'ativo') ?? null

  return {
    id: configuracao.id,
    data: configuracao.data,
    funcionariosAtivos: configuracao.funcionarios_ativos,
    minutosTurno: configuracao.minutos_turno,
    produtoId: configuracao.produto_id,
    tpProdutoMin: configuracao.tp_produto_min,
    metaGrupo: configuracao.meta_grupo,
    blocos,
    metaGrupoTotal,
    blocoAtivo,
  }
}
