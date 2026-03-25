import type { Tables } from '@/types/supabase'

export type QRTipo = 'operador' | 'maquina' | 'operacao'
export type OperadorStatus = 'ativo' | 'inativo' | 'afastado'
export type MaquinaStatus = 'ativa' | 'parada' | 'manutencao'

export interface FormActionState {
  erro?: string
  sucesso?: boolean
}

export interface QRScanResult {
  tipo: QRTipo
  token: string
}

export interface OperadorScaneado {
  id: string
  nome: string
  matricula: string
  fotoUrl: string | null
}

export interface MaquinaScaneada {
  id: string
  codigo: string
  tipoNome: string
  status: 'ativa' | 'parada' | 'manutencao'
}

export interface OperacaoScaneada {
  id: string
  descricao: string
  metaHora: number
  metaIndividual: number
  tempoPadraoMin: number
}

export interface SessaoScanner {
  operador: OperadorScaneado
  maquina: MaquinaScaneada | null
}

export interface ConfiguracaoTurno {
  id: string
  data: string
  funcionariosAtivos: number
  minutosTurno: number
  produtoId: string | null
  tpProdutoMin: number | null
  metaGrupo: number | null
}

export interface TipoMaquinaOption extends Tables<'tipos_maquina'> {}

export interface MaquinaListItem extends Tables<'maquinas'> {
  tipoNome: string | null
}

export interface OperacaoListItem extends Tables<'operacoes'> {
  tipoNome: string | null
}

export interface ProdutoRoteiroItem {
  produtoOperacaoId: string
  operacaoId: string
  sequencia: number
  codigo: string
  descricao: string
  tempoPadraoMin: number
  tipoMaquinaCodigo: string | null
}

export interface ProdutoListItem extends Tables<'produtos'> {
  roteiro: ProdutoRoteiroItem[]
}
