import { QR_TIPOS } from '@/lib/constants'
import type { Tables } from '@/types/supabase'

export type QRTipo = typeof QR_TIPOS[number]
export type OperadorStatus = 'ativo' | 'inativo' | 'afastado'
export type MaquinaStatus = 'ativa' | 'parada' | 'manutencao'
export type OrigemTpBloco = 'produto' | 'manual'
export type StatusConfiguracaoTurnoBloco = 'planejado' | 'ativo' | 'concluido'
export type UsuarioSistemaPapel = 'admin' | 'supervisor'
export type UsuarioSistemaStatus = 'ativo' | 'inativo' | 'pendente_ativacao'
export type TurnoStatusV2 = 'aberto' | 'encerrado'
export type OrigemPlanejamentoTurnoV2 = 'aberto' | 'ultimo_encerrado'
export type OrigemApontamentoProducaoV2 =
  | 'operador_qr'
  | 'operador_manual'
  | 'supervisor_manual'
export type TurnoOpStatusV2 =
  | 'planejada'
  | 'em_andamento'
  | 'concluida'
  | 'encerrada_manualmente'
export type TurnoSetorOpStatusV2 =
  | 'planejada'
  | 'aberta'
  | 'em_andamento'
  | 'concluida'
  | 'encerrada_manualmente'
export type TurnoSetorStatusV2 =
  | 'planejada'
  | 'aberta'
  | 'em_andamento'
  | 'concluida'
  | 'encerrada_manualmente'
export type TurnoSetorDemandaStatusV2 =
  | 'planejada'
  | 'aberta'
  | 'em_andamento'
  | 'concluida'
  | 'encerrada_manualmente'
export type TurnoSetorOperacaoStatusV2 =
  | 'planejada'
  | 'aberta'
  | 'em_andamento'
  | 'concluida'
  | 'encerrada_manualmente'

export interface FormActionState {
  erro?: string
  sucesso?: boolean
}

export interface MetaMensal {
  id: string
  competencia: string
  metaPecas: number
  diasProdutivos: number
  observacao: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface MetaMensalActionState extends FormActionState {
  metaMensal?: MetaMensal
}

export interface MetaMensalEvolucaoDiariaItem {
  data: string
  diaLabel: string
  metaDiariaMedia: number
  metaAcumuladaReferencia: number
  realizadoDia: number
  realizadoAcumulado: number
  atingimentoAcumuladoPct: number
}

export interface MetaMensalResumoSemanalItem {
  semana: string
  periodo: string
  metaReferenciaSemana: number
  realizadoSemana: number
  realizadoAcumulado: number
  atingimentoAcumuladoPct: number
}

export interface MetaMensalResumoDashboard {
  competencia: string
  metaMensal: MetaMensal | null
  metaPecas: number
  diasProdutivos: number
  metaDiariaMedia: number
  alcancadoMes: number
  saldoMes: number
  atingimentoPct: number
  evolucaoDiaria: MetaMensalEvolucaoDiariaItem[]
  resumoSemanal: MetaMensalResumoSemanalItem[]
}

export interface QRScanResult {
  tipo: QRTipo
  token: string
}

export interface IndicadoresOperacionais {
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
}

export interface TurnoSetorOpScaneado {
  id: string
  turnoId: string
  turnoIniciadoEm: string
  turnoOpId: string
  setorId: string
  setorNome: string
  numeroOp: string
  produtoId: string
  produtoNome: string
  produtoReferencia: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
  saldoRestante: number
  qrCodeToken: string
  status: TurnoSetorOpStatusV2
}

export interface TurnoSetorScaneado {
  id: string
  turnoId: string
  turnoIniciadoEm: string
  setorId: string
  setorNome: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
  saldoRestante: number
  qrCodeToken: string
  status: TurnoSetorStatusV2
}

export interface TurnoSetorDemandaScaneada {
  id: string
  turnoSetorId: string
  turnoId: string
  turnoOpId: string
  setorId: string
  numeroOp: string
  produtoId: string
  produtoNome: string
  produtoReferencia: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
  saldoRestante: number
  status: TurnoSetorDemandaStatusV2
  turnoSetorOpLegacyId: string | null
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
  descricaoPatrimonial: string
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

export interface ConfiguracaoTurnoBloco {
  id: string
  configuracaoTurnoId: string
  produtoId: string | null
  descricaoBloco: string
  sequencia: number
  funcionariosAtivos: number
  minutosPlanejados: number
  tpProdutoMin: number
  origemTp: OrigemTpBloco
  metaGrupo: number
  status: StatusConfiguracaoTurnoBloco
  iniciadoEm: string | null
  encerradoEm: string | null
}

export interface ConfiguracaoTurnoComBlocos extends ConfiguracaoTurno {
  blocos: ConfiguracaoTurnoBloco[]
  metaGrupoTotal: number
  blocoAtivo: ConfiguracaoTurnoBloco | null
}

export interface ProducaoBlocoResumo extends ConfiguracaoTurnoBloco {
  realizado: number
  progressoPct: number
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

export interface RegistroProducaoTurnoHora {
  horaRegistro: string
  quantidade: number
  turnoSetorOperacaoId: string
}

export interface EficienciaOperacionalHoraRegistroV2 {
  turnoId: string
  hora: string
  operadorId: string
  operadorNome: string
  operadorMatricula: string
  operacaoId: string
  operacaoCodigo: string
  operacaoDescricao: string
  tempoPadraoMinSnapshot: number
  metaHora: number
  quantidadeRealizada: number
  minutosPadraoRealizados: number
  eficienciaPct: number
}

export interface EficienciaOperacionalDiaRegistroV2 {
  turnoId: string
  data: string
  operadorId: string
  operadorNome: string
  operadorMatricula: string
  minutosTurno: number
  quantidadeRealizada: number
  minutosPadraoRealizados: number
  eficienciaPct: number
}

export interface ResumoEficienciaOperacionalTurnoV2 {
  porHora: EficienciaOperacionalHoraRegistroV2[]
  porDia: EficienciaOperacionalDiaRegistroV2[]
}

export interface ComparativoMetaGrupoHoraItem {
  hora: string
  planejado: number
  realizado: number
}

export interface StatusMaquinaRegistro {
  id: string
  codigo: string
  descricaoPatrimonial: string
  status: MaquinaStatus
  ultimoUso: string | null
  minutosSemUso: number
}

export interface RelatorioTurnoOption {
  id: string
  label: string
  status: TurnoStatusV2
  iniciadoEm: string
}

export interface RelatorioTurnoOpOption {
  id: string
  turnoId: string
  label: string
  numeroOp: string
  produtoReferencia: string
  produtoNome: string
}

export interface RelatorioSetorOption {
  id: string
  nome: string
}

export interface RelatorioRegistroItem {
  id: string
  origem: 'v2' | 'legado'
  turnoId: string
  turnoLabel: string
  turnoStatus: TurnoStatusV2
  turnoOpId: string
  numeroOp: string
  produtoReferencia: string
  produtoNome: string
  turnoSetorOpId: string
  setorId: string
  setorNome: string
  turnoSetorOperacaoId: string
  operacaoId: string
  operacaoCodigo: string
  operacaoDescricao: string
  operadorId: string
  operadorNome: string
  quantidadeApontada: number
  quantidadeRealizadaOperacao: number
  quantidadeRealizadaSecao: number
  quantidadeRealizadaOp: number
  statusOperacao: TurnoSetorOperacaoStatusV2
  statusSecao: TurnoSetorOpStatusV2
  statusOp: TurnoOpStatusV2
  ultimaLeituraEm: string
}

export interface RelatorioResumoItem {
  turnosNoEscopo: number
  opsNoEscopo: number
  totalPlanejado: number
  totalRealizado: number
  totalCargaPlanejadaTp: number
  totalCargaRealizadaTp: number
  saldo: number
  saldoCargaTp: number
  progressoPct: number
  secoesConcluidas: number
  secoesPendentes: number
  quantidadeApontadaFiltro: number
  registrosLegados: number
  statusGeral: 'planejada' | 'em_andamento' | 'concluida' | 'encerrada_manualmente' | 'misto'
}

export interface ComparativoMetaGrupoItem {
  data: string
  planejado: number
  realizado: number
}

export interface RelatorioFiltros {
  dataInicio: string
  dataFim: string
  turnoId: string
  turnoOpId: string
  setorId: string
  operadorId: string
}

export interface TipoMaquinaOption extends Tables<'tipos_maquina'> {}

export interface SetorOption extends Tables<'setores'> {}

export interface SetorListItem extends Tables<'setores'> {}

export interface UsuarioSistemaV2 {
  id: string
  auth_user_id: string
  nome: string
  email: string
  papel: UsuarioSistemaPapel
  ativo: boolean | null
  status: UsuarioSistemaStatus
  created_at: string | null
  updated_at: string | null
}

export interface UsuarioSistemaListItem extends UsuarioSistemaV2 {
}

export interface MaquinaListItem extends Tables<'maquinas'> {}

export interface OperadorListItem extends Tables<'operadores'> {}

export interface OperacaoListItem extends Tables<'operacoes'> {
  tipoNome: string | null
  setorCodigo: number | null
  setorNome: string | null
}

export interface ProdutoRoteiroItem {
  produtoOperacaoId: string
  operacaoId: string
  sequencia: number
  codigo: string
  descricao: string
  tempoPadraoMin: number
  tipoMaquinaCodigo: string | null
  setorId: string | null
  setorCodigo: number | null
  setorNome: string | null
}

export interface ProdutoListItem extends Tables<'produtos'> {
  roteiro: ProdutoRoteiroItem[]
  setoresEnvolvidos: string[]
}

export interface TurnoOperadorV2 {
  id: string
  turnoId: string
  operadorId: string
  setorId: string | null
  operadorNome: string
  matricula: string
  funcao: string | null
  cargaHorariaMin: number
}

export interface TurnoOperadorAtividadeSetorV2 {
  turnoSetorOpId: string
  operadorId: string
  operadorNome: string
  matricula: string
  funcao: string | null
  totalRegistros: number
  totalPecas: number
  ultimoRegistroEm: string | null
}

export interface TurnoV2 {
  id: string
  iniciadoEm: string
  encerradoEm: string | null
  status: TurnoStatusV2
  operadoresDisponiveis: number
  minutosTurno: number
  observacao: string | null
}

export interface TurnoOpV2 {
  id: string
  turnoId: string
  numeroOp: string
  produtoId: string
  produtoReferencia: string
  produtoNome: string
  tpProdutoMin: number
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
  quantidadePlanejadaOriginal: number
  quantidadePlanejadaRemanescente: number
  turnoOpOrigemId: string | null
  status: TurnoOpStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
}

export interface TurnoSetorV2 {
  id: string
  turnoId: string
  setorId: string
  setorCodigo: number
  setorNome: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
  qrCodeToken: string
  status: TurnoSetorStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
}

export interface TurnoSetorDemandaV2 {
  id: string
  turnoSetorId: string
  turnoId: string
  turnoOpId: string
  setorId: string
  setorCodigo: number
  produtoId: string
  numeroOp: string
  produtoReferencia: string
  produtoNome: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
  status: TurnoSetorDemandaStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
  turnoSetorOpLegacyId: string | null
}

export interface TurnoSetorOpV2 {
  id: string
  turnoId: string
  turnoOpId: string
  setorId: string
  setorCodigo: number
  setorNome: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
  qrCodeToken: string
  status: TurnoSetorOpStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
}

export interface TurnoSetorOperacaoV2 {
  id: string
  turnoId: string
  turnoOpId: string
  turnoSetorOpId: string
  turnoSetorId: string | null
  turnoSetorDemandaId: string | null
  produtoOperacaoId: string
  operacaoId: string
  setorId: string
  sequencia: number
  tempoPadraoMinSnapshot: number
  quantidadePlanejada: number
  quantidadeRealizada: number
  status: TurnoSetorOperacaoStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
}

export interface TurnoSetorOperacaoApontamentoV2 extends TurnoSetorOperacaoV2 {
  operacaoCodigo: string
  operacaoDescricao: string
  tipoMaquinaCodigo: string | null
}

export interface PlanejamentoTurnoV2 {
  turno: TurnoV2
  operadores: TurnoOperadorV2[]
  operadoresAtividadeSetor?: TurnoOperadorAtividadeSetorV2[]
  ops: TurnoOpV2[]
  setoresAtivos?: TurnoSetorV2[]
  demandasSetor?: TurnoSetorDemandaV2[]
  secoesSetorOp: TurnoSetorOpV2[]
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
  eficienciaOperacional?: ResumoEficienciaOperacionalTurnoV2
}

export interface PlanejamentoTurnoDashboardV2 extends PlanejamentoTurnoV2 {
  origem: OrigemPlanejamentoTurnoV2
}

export interface TurnoOpPlanejadaInput {
  numeroOp: string
  produtoId: string
  quantidadePlanejada: number
}

export interface CriarTurnoV2Input {
  operadoresDisponiveis: number
  minutosTurno: number
  observacao?: string
  operadorIds?: string[]
  ops: TurnoOpPlanejadaInput[]
  carregarPendenciasTurnoAnterior?: boolean
  turnoOrigemPendenciasId?: string | null
  turnoOpIdsPendentes?: string[]
}

export interface AdicionarTurnoOpV2Input extends TurnoOpPlanejadaInput {
  turnoId: string
}

export interface CarregarPendenciasTurnoAnteriorInput {
  turnoOrigemId: string
  turnoDestinoId: string
  turnoOpIds?: string[]
}

export interface EditarTurnoOpV2Input {
  turnoOpId: string
  numeroOp: string
  produtoId: string
  quantidadePlanejada: number
}
