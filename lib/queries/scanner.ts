import { createClient } from '@/lib/supabase/client'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type {
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
