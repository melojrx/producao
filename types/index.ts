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
export type TurnoSetorFilaStatusV2 =
  | 'sem_fila'
  | 'em_fila'
  | 'liberada'
  | 'em_producao'
  | 'parcial'
  | 'concluida_setor'
export type DiagnosticoCapacidadeSetorV2 =
  | 'sem_carga'
  | 'dentro_capacidade'
  | 'no_limite'
  | 'acima_capacidade'
export type EtapaFluxoChaveV2 =
  | 'preparacao'
  | 'frente'
  | 'costa'
  | 'montagem'
  | 'final'
export type TipoDependenciaEntradaFluxoV2 =
  | 'sem_predecessora'
  | 'sequencial'
  | 'join_parcial'
export type TipoDependenciaSaidaFluxoV2 =
  | 'sem_sucessora'
  | 'sequencial'
  | 'fork_paralelo'

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

export interface CalculoCapacidadeSetorInput {
  operadoresAlocados: number
  minutosTurno: number
  cargaPendenteMinutos: number
  cargaConsumidaMinutos?: number | null
  cargaReservadaMinutos?: number | null
  tpTotalSetorProduto?: number | null
}

export interface ResumoCapacidadeSetorV2 {
  operadoresAlocados: number
  minutosTurno: number
  cargaPendenteMinutos: number
  cargaConsumidaMinutos: number
  cargaReservadaMinutos: number
  capacidadeMinutosTotal: number
  capacidadeMinutosRestante: number
  capacidadePecas: number | null
  eficienciaRequeridaPct: number | null
  diagnosticoCapacidade: DiagnosticoCapacidadeSetorV2
}

export interface PosicaoFilaSetorV2 {
  posicaoFila: number | null
  statusFila: TurnoSetorFilaStatusV2
}

export interface SnapshotParcelamentoDemandaTurnoV2 {
  quantidadeBacklogSetor: number
  quantidadeAceitaTurno: number
  quantidadeExcedenteTurno: number
}

export interface EtapaDependenciaFluxoV2 {
  etapa: EtapaFluxoChaveV2
  predecessoras: EtapaFluxoChaveV2[]
  sucessoras: EtapaFluxoChaveV2[]
  tipoDependenciaEntrada: TipoDependenciaEntradaFluxoV2
  tipoDependenciaSaida: TipoDependenciaSaidaFluxoV2
  permiteSimultaneidade: boolean
}

export interface EtapaFluxoSetorV2 {
  etapaFluxoChave?: EtapaFluxoChaveV2
  setorId: string
  setorCodigo: number | null
  setorNome: string
  quantidadePlanejada: number
  quantidadeConcluida: number
  posicaoFila?: number | null
  statusFila?: TurnoSetorFilaStatusV2 | null
}

export interface PosicaoFluxoOpLoteV2 {
  setorFluxoAtualId: string | null
  setorFluxoAtualCodigo: number | null
  setorFluxoAtualNome: string | null
  ordemFluxoAtual: number | null
  statusFilaAtual: TurnoSetorFilaStatusV2
  quantidadePendenteAtual: number
  quantidadeFinalizada: number
}

export interface LiberacaoEtapaFluxoV2 {
  quantidadeLiberada: number
  quantidadeDisponivel: number
  quantidadePendente: number
}

export interface SnapshotSincronizacaoParcialMontagemV2 {
  quantidadeConcluidaFrente: number
  quantidadeConcluidaCosta: number
  quantidadeRealizadaMontagem: number
  quantidadeSincronizadaMontagem: number
  quantidadeDisponivelMontagem: number
  quantidadeBloqueadaSincronizacao: number
}

export interface PosicaoFluxoAtivaOpV2 {
  etapa: EtapaFluxoChaveV2
  setorId: string | null
  setorCodigo: number | null
  setorNome: string
  tipoDependenciaEntrada: TipoDependenciaEntradaFluxoV2
  tipoDependenciaSaida: TipoDependenciaSaidaFluxoV2
  quantidadePlanejada: number
  quantidadeConcluida: number
  quantidadeLiberada: number
  quantidadeDisponivel: number
  quantidadePendente: number
  quantidadeBloqueadaSincronizacao: number
  posicaoFila?: number | null
  statusFila?: TurnoSetorFilaStatusV2 | null
}

export interface EstadoEtapaFluxoOpV2 {
  etapa: EtapaFluxoChaveV2
  setorId: string | null
  setorCodigo: number | null
  setorNome: string
  quantidadePlanejada: number
  quantidadeConcluida: number
  quantidadeRealizada: number
  posicaoFila?: number | null
  statusFila?: TurnoSetorFilaStatusV2 | null
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
  etapaFluxoChave?: EtapaFluxoChaveV2
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
  posicaoFila?: number | null
  statusFila?: TurnoSetorFilaStatusV2
  quantidadeBacklogSetor?: number
  quantidadeAceitaTurno?: number
  quantidadeExcedenteTurno?: number
  quantidadePendenteSetor?: number
  quantidadeLiberadaSetor?: number
  quantidadeDisponivelApontamento?: number
  quantidadeBloqueadaAnterior?: number
  quantidadeSincronizadaMontagem?: number
  quantidadeBloqueadaSincronizacao?: number
  setorAnteriorId?: string | null
  setorAnteriorCodigo?: number | null
  setorAnteriorNome?: string | null
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
  totalOperacoes: number
  quantidadeRealizada: number
  minutosPadraoRealizados: number
  eficienciaPct: number
}

export interface EficienciaOperacionalOperacaoRegistroV2 {
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
  porOperacao: EficienciaOperacionalOperacaoRegistroV2[]
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

export type RelatorioSortField =
  | 'origem'
  | 'numeroOp'
  | 'setorNome'
  | 'operadorNome'
  | 'operacaoCodigo'
  | 'quantidadeApontada'
  | 'quantidadeRealizadaOperacao'
  | 'quantidadeRealizadaSecao'
  | 'quantidadeRealizadaOp'
  | 'statusOp'
  | 'ultimaLeituraEm'

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

export interface MaquinaOption extends Tables<'maquinas'> {}

export interface OperadorListItem extends Tables<'operadores'> {}

export interface OperacaoListItem extends Tables<'operacoes'> {
  maquinaCodigo: string | null
  maquinaModelo: string | null
  setorCodigo: number | null
  setorNome: string | null
}

export type SortDirection = 'asc' | 'desc'

export type OperacaoSortField =
  | 'codigo'
  | 'descricao'
  | 'maquina'
  | 'setor'
  | 'tempo_padrao_min'
  | 'meta_hora'
  | 'meta_dia'
  | 'ativa'

export interface OperacoesListagemParams {
  busca: string
  page: number
  pageSize: number
  sortBy: OperacaoSortField
  sortDir: SortDirection
}

export interface OperacoesPaginadas {
  items: OperacaoListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  busca: string
  sortBy: OperacaoSortField
  sortDir: SortDirection
}

export interface RelatoriosListagemParams {
  filtros: RelatorioFiltros
  page: number
  pageSize: number
  sortBy: RelatorioSortField
  sortDir: SortDirection
}

export interface RelatoriosPaginados {
  items: RelatorioRegistroItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortBy: RelatorioSortField
  sortDir: SortDirection
}

export interface ProdutoRoteiroItem {
  produtoOperacaoId: string
  operacaoId: string
  sequencia: number
  codigo: string
  descricao: string
  tempoPadraoMin: number
  maquinaId: string | null
  maquinaCodigo: string | null
  maquinaModelo: string | null
  setorId: string | null
  setorCodigo: number | null
  setorNome: string | null
}

export interface ProdutoImagens {
  imagem_frente_url: string | null
  imagem_costa_url: string | null
}

export interface ProdutoListItem extends Tables<'produtos'>, ProdutoImagens {
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
  mediaTpProdutoCapacidade?: number
  capacidadeGlobalTurnoPecas?: number
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
  setorFluxoAtualId?: string | null
  setorFluxoAtualCodigo?: number | null
  setorFluxoAtualNome?: string | null
  ordemFluxoAtual?: number | null
  statusFilaAtual?: TurnoSetorFilaStatusV2
  quantidadePendenteAtual?: number
  posicoesFluxoAtivas?: PosicaoFluxoAtivaOpV2[]
  quantidadeSincronizadaMontagem?: number
  quantidadeBloqueadaSincronizacao?: number
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
  operadoresAlocados?: number
  capacidadeMinutosTotal?: number
  capacidadeMinutosConsumida?: number
  capacidadeMinutosReservada?: number
  capacidadeMinutosRestante?: number
  eficienciaRequeridaPct?: number | null
  diagnosticoCapacidade?: DiagnosticoCapacidadeSetorV2
  status: TurnoSetorStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
}

export interface TurnoSetorDemandaV2 {
  id: string
  turnoSetorId: string
  turnoId: string
  turnoOpId: string
  etapaFluxoChave?: EtapaFluxoChaveV2
  setorId: string
  setorCodigo: number
  setorNome: string
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
  posicaoFila?: number | null
  statusFila?: TurnoSetorFilaStatusV2
  quantidadeBacklogSetor?: number
  quantidadeAceitaTurno?: number
  quantidadeExcedenteTurno?: number
  quantidadePendenteSetor?: number
  quantidadeLiberadaSetor?: number
  quantidadeEntradaAcumuladaSetor?: number
  quantidadeAceitaAcumuladaSetor?: number
  quantidadeDisponivelApontamento?: number
  saldoManualPermitido?: number
  quantidadeBloqueadaAnterior?: number
  quantidadeSincronizadaMontagem?: number
  quantidadeBloqueadaSincronizacao?: number
  setorAnteriorId?: string | null
  setorAnteriorCodigo?: number | null
  setorAnteriorNome?: string | null
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
  maquinaCodigo: string | null
  maquinaModelo: string | null
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
