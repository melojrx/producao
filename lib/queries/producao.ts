import { createClient } from '@/lib/supabase/client'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type {
  ConfiguracaoTurno,
  ConfiguracaoTurnoComBlocos,
  ProducaoBlocoResumo,
  ProducaoHojeRegistro,
  ProducaoPorHoraRegistro,
  StatusMaquinaRegistro,
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

export async function listarStatusMaquinas(): Promise<StatusMaquinaRegistro[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('vw_status_maquinas')
    .select('*')
    .order('codigo', { ascending: true })

  if (error) {
    throw new Error(`Erro ao buscar status das máquinas: ${error.message}`)
  }

  return (data ?? []).map((registro) => ({
    id: registro.id ?? '',
    codigo: registro.codigo ?? 'Máquina sem código',
    descricaoPatrimonial: registro.descricao ?? 'Máquina patrimonial',
    status: (registro.status ?? 'parada') as StatusMaquinaRegistro['status'],
    ultimoUso: registro.ultimo_uso,
    minutosSemUso: registro.minutos_sem_uso ?? 0,
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

export async function buscarConfiguracaoTurnoComBlocosHojeClient(): Promise<ConfiguracaoTurnoComBlocos | null> {
  const supabase = createClient()

  const { data: configuracao, error: configuracaoError } = await supabase
    .from('configuracao_turno')
    .select('id, data, funcionarios_ativos, minutos_turno, produto_id, tp_produto_min, meta_grupo')
    .eq('data', obterDataHojeLocal())
    .maybeSingle()

  if (configuracaoError || !configuracao) {
    return null
  }

  const { data: blocos, error: blocosError } = await supabase
    .from('configuracao_turno_blocos')
    .select(
      'id, configuracao_turno_id, produto_id, descricao_bloco, sequencia, funcionarios_ativos, minutos_planejados, tp_produto_min, origem_tp, meta_grupo, status, iniciado_em, encerrado_em'
    )
    .eq('configuracao_turno_id', configuracao.id)
    .order('sequencia', { ascending: true })

  if (blocosError) {
    throw new Error(`Erro ao buscar blocos do turno: ${blocosError.message}`)
  }

  const blocosMapeados = (blocos ?? []).map((bloco) => ({
    id: bloco.id,
    configuracaoTurnoId: bloco.configuracao_turno_id,
    produtoId: bloco.produto_id,
    descricaoBloco: bloco.descricao_bloco,
    sequencia: bloco.sequencia,
    funcionariosAtivos: bloco.funcionarios_ativos,
    minutosPlanejados: bloco.minutos_planejados,
    tpProdutoMin: bloco.tp_produto_min,
    origemTp: bloco.origem_tp as ProducaoBlocoResumo['origemTp'],
    metaGrupo: bloco.meta_grupo,
    status: bloco.status as ProducaoBlocoResumo['status'],
    iniciadoEm: bloco.iniciado_em,
    encerradoEm: bloco.encerrado_em,
  }))

  const metaGrupoTotal = blocosMapeados.reduce((soma, bloco) => soma + bloco.metaGrupo, 0)
  const blocoAtivo = blocosMapeados.find((bloco) => bloco.status === 'ativo') ?? null

  return {
    id: configuracao.id,
    data: configuracao.data,
    funcionariosAtivos: configuracao.funcionarios_ativos,
    minutosTurno: configuracao.minutos_turno,
    produtoId: configuracao.produto_id,
    tpProdutoMin: configuracao.tp_produto_min,
    metaGrupo: configuracao.meta_grupo,
    blocos: blocosMapeados,
    metaGrupoTotal,
    blocoAtivo,
  }
}

export async function listarResumoBlocosHoje(): Promise<ProducaoBlocoResumo[]> {
  const supabase = createClient()
  const configuracaoTurno = await buscarConfiguracaoTurnoComBlocosHojeClient()

  if (!configuracaoTurno || configuracaoTurno.blocos.length === 0) {
    return []
  }

  const { data: registros, error: registrosError } = await supabase
    .from('registros_producao')
    .select('configuracao_turno_bloco_id, quantidade')
    .eq('data_producao', obterDataHojeLocal())
    .not('configuracao_turno_bloco_id', 'is', null)

  if (registrosError) {
    throw new Error(`Erro ao buscar realizado por bloco: ${registrosError.message}`)
  }

  const realizadoPorBloco = new Map<string, number>()

  for (const registro of registros ?? []) {
    if (!registro.configuracao_turno_bloco_id) {
      continue
    }

    realizadoPorBloco.set(
      registro.configuracao_turno_bloco_id,
      (realizadoPorBloco.get(registro.configuracao_turno_bloco_id) ?? 0) + registro.quantidade
    )
  }

  return configuracaoTurno.blocos.map((bloco) => {
    const realizado = realizadoPorBloco.get(bloco.id) ?? 0
    const progressoPct =
      bloco.metaGrupo > 0 ? Math.min((realizado / bloco.metaGrupo) * 100, 999.99) : 0

    return {
      ...bloco,
      realizado,
      progressoPct,
    }
  })
}
