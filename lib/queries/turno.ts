import { createClient } from '@/lib/supabase/server'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type { ConfiguracaoTurno, ProdutoTurnoOption } from '@/types'

export async function buscarConfiguracaoHoje(): Promise<ConfiguracaoTurno | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('configuracao_turno')
    .select('id, data, funcionarios_ativos, minutos_turno, produto_id, tp_produto_min, meta_grupo')
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

export async function listarProdutosAtivosParaTurno(): Promise<ProdutoTurnoOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, referencia, tp_produto_min, ativo')
    .order('nome')

  if (error) {
    throw new Error(`Erro ao listar produtos para configuração do turno: ${error.message}`)
  }

  return data
    .filter((produto) => (produto.ativo ?? true) && produto.tp_produto_min !== null)
    .map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      referencia: produto.referencia,
      tpProdutoMin: produto.tp_produto_min ?? 0,
    }))
}
