import { createClient } from '@/lib/supabase/client'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type {
  ConfiguracaoTurno,
  ProducaoHojeRegistro,
  ProducaoPorHoraRegistro,
} from '@/types'

export async function listarProducaoHoje(): Promise<ProducaoHojeRegistro[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('vw_producao_hoje')
    .select('*')
    .order('eficiencia_pct', { ascending: false })
    .order('operador_nome', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar produção de hoje: ${error.message}`)
  }

  return (data ?? []).map((registro) => ({
    operadorId: registro.operador_id ?? '',
    operadorNome: registro.operador_nome ?? 'Operador sem nome',
    operadorStatus: (registro.operador_status ?? 'inativo') as ProducaoHojeRegistro['operadorStatus'],
    totalRegistros: registro.total_registros ?? 0,
    totalPecas: registro.total_pecas ?? 0,
    minutosProdutivos: registro.minutos_produtivos ?? 0,
    eficienciaPct: registro.eficiencia_pct ?? 0,
  }))
}

export async function listarProducaoPorHora(): Promise<ProducaoPorHoraRegistro[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('vw_producao_por_hora')
    .select('*')
    .order('hora', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar produção por hora: ${error.message}`)
  }

  return (data ?? [])
    .filter((registro) => Boolean(registro.hora))
    .map((registro) => ({
      hora: registro.hora ?? '',
      totalRegistros: registro.total_registros ?? 0,
      totalPecas: registro.total_pecas ?? 0,
    }))
}

export async function buscarConfiguracaoTurnoHojeClient(): Promise<ConfiguracaoTurno | null> {
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
