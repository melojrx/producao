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

export interface ProdutoTurnoOption {
  id: string
  nome: string
  referencia: string
  tpProdutoMin: number
}

export interface ProducaoHojeRegistro {
  operadorId: string
  operadorNome: string
  operadorStatus: OperadorStatus
  totalRegistros: number
  totalPecas: number
  minutosProdutivos: number
  eficienciaPct: number
}

export interface ProducaoPorHoraRegistro {
  hora: string
  totalRegistros: number
  totalPecas: number
}

export interface StatusMaquinaRegistro {
  id: string
  codigo: string
  tipoNome: string
  status: MaquinaStatus
  ultimoUso: string | null
  minutosSemUso: number
}

export interface RelatorioRegistroItem {
  id: string
  operadorId: string | null
  operadorNome: string
  operacaoId: string | null
  operacaoCodigo: string
  operacaoDescricao: string
  maquinaCodigo: string | null
  quantidade: number
  dataProducao: string
  horaRegistro: string
}

export interface ComparativoMetaGrupoItem {
  data: string
  metaGrupo: number
  realizado: number
}

export interface RelatorioFiltros {
  dataInicio: string
  dataFim: string
  operadorId: string
  operacaoId: string
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
