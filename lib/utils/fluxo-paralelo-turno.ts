import type {
  EstadoEtapaFluxoOpV2,
  EtapaDependenciaFluxoV2,
  EtapaFluxoChaveV2,
  EtapaFluxoSetorV2,
  LiberacaoEtapaFluxoV2,
  PosicaoFluxoOpLoteV2,
  PosicaoFluxoAtivaOpV2,
  SnapshotSincronizacaoParcialMontagemV2,
} from '@/types'
import { criarPosicaoFilaSetor, resolverPosicaoAtualFluxoOpLote } from './capacidade-setor.ts'
import {
  criarSnapshotParcelamentoDemandaTurno,
  enriquecerDemandasComFluxoSequencial,
} from './fluxo-sequencial-turno.ts'
import type {
  DemandaFluxoSequencialBase,
  DiagnosticoFluxoSequencialDemandaV2,
} from './fluxo-sequencial-turno.ts'

const ETAPAS_FLUXO_COSTURA_PARALELO_PADRAO: readonly EtapaDependenciaFluxoV2[] = [
  {
    etapa: 'preparacao',
    predecessoras: [],
    sucessoras: ['frente', 'costa'],
    tipoDependenciaEntrada: 'sem_predecessora',
    tipoDependenciaSaida: 'fork_paralelo',
    permiteSimultaneidade: false,
  },
  {
    etapa: 'frente',
    predecessoras: ['preparacao'],
    sucessoras: ['montagem'],
    tipoDependenciaEntrada: 'sequencial',
    tipoDependenciaSaida: 'sequencial',
    permiteSimultaneidade: true,
  },
  {
    etapa: 'costa',
    predecessoras: ['preparacao'],
    sucessoras: ['montagem'],
    tipoDependenciaEntrada: 'sequencial',
    tipoDependenciaSaida: 'sequencial',
    permiteSimultaneidade: true,
  },
  {
    etapa: 'montagem',
    predecessoras: ['frente', 'costa'],
    sucessoras: ['final'],
    tipoDependenciaEntrada: 'join_parcial',
    tipoDependenciaSaida: 'sequencial',
    permiteSimultaneidade: false,
  },
  {
    etapa: 'final',
    predecessoras: ['montagem'],
    sucessoras: [],
    tipoDependenciaEntrada: 'sequencial',
    tipoDependenciaSaida: 'sem_sucessora',
    permiteSimultaneidade: false,
  },
] as const

const ETAPAS_FLUXO_COSTURA_PARALELO: readonly EtapaFluxoChaveV2[] = [
  'preparacao',
  'frente',
  'costa',
  'montagem',
  'final',
] as const

type DiagnosticoFluxoBaseSemFilaV2 = Omit<
  DiagnosticoFluxoParaleloDemandaV2,
  'posicaoFila' | 'statusFila'
>

interface EtapasFluxoCanonicasPorOpV2<TDemanda> {
  preparacao: TDemanda
  frente: TDemanda
  costa: TDemanda
  montagem: TDemanda
  final: TDemanda
}

export interface DiagnosticoFluxoParaleloDemandaV2
  extends DiagnosticoFluxoSequencialDemandaV2 {
  etapaFluxoChave?: EtapaFluxoChaveV2
  quantidadeSincronizadaMontagem: number
  quantidadeBloqueadaSincronizacao: number
}

export interface ResumoFluxoOpParaleloV2 extends PosicaoFluxoOpLoteV2 {
  posicoesFluxoAtivas: PosicaoFluxoAtivaOpV2[]
  quantidadeSincronizadaMontagem: number
  quantidadeBloqueadaSincronizacao: number
}

function normalizarInteiroNaoNegativo(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    return 0
  }

  return Math.floor(valor)
}

function normalizarNomeSetorParaEtapa(valor: string): string {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function calcularQuantidadePendente(
  quantidadePlanejada: number,
  quantidadeRealizada: number
): number {
  return Math.max(
    normalizarInteiroNaoNegativo(quantidadePlanejada) -
      normalizarInteiroNaoNegativo(quantidadeRealizada),
    0
  )
}

function criarLiberacaoEtapa(input: {
  quantidadePlanejada: number
  quantidadeLiberada: number
  quantidadeRealizada: number
}): LiberacaoEtapaFluxoV2 {
  const quantidadePlanejada = normalizarInteiroNaoNegativo(input.quantidadePlanejada)
  const quantidadeRealizada = normalizarInteiroNaoNegativo(input.quantidadeRealizada)
  const quantidadeLiberada = Math.min(
    quantidadePlanejada,
    normalizarInteiroNaoNegativo(input.quantidadeLiberada)
  )

  return {
    quantidadeLiberada,
    quantidadeDisponivel: Math.max(quantidadeLiberada - quantidadeRealizada, 0),
    quantidadePendente: calcularQuantidadePendente(quantidadePlanejada, quantidadeRealizada),
  }
}

function obterDependenciaEtapaFluxo(
  etapa: EtapaFluxoChaveV2
): EtapaDependenciaFluxoV2 {
  return (
    ETAPAS_FLUXO_COSTURA_PARALELO_PADRAO.find((dependencia) => dependencia.etapa === etapa) ?? {
      etapa,
      predecessoras: [],
      sucessoras: [],
      tipoDependenciaEntrada: 'sem_predecessora',
      tipoDependenciaSaida: 'sem_sucessora',
      permiteSimultaneidade: false,
    }
  )
}

function criarDiagnosticoFluxoSemFila(input: {
  etapaFluxoChave?: EtapaFluxoChaveV2
  demanda: DemandaFluxoSequencialBase
  quantidadeLiberadaSetor: number
  setorAnteriorId?: string | null
  setorAnteriorCodigo?: number | null
  setorAnteriorNome?: string | null
  quantidadeSincronizadaMontagem?: number
  quantidadeBloqueadaSincronizacao?: number
}): DiagnosticoFluxoBaseSemFilaV2 {
  const quantidadePendenteSetor = calcularQuantidadePendente(
    input.demanda.quantidadePlanejada,
    input.demanda.quantidadeRealizada
  )
  const quantidadeLiberadaSetor = Math.min(
    normalizarInteiroNaoNegativo(input.demanda.quantidadePlanejada),
    normalizarInteiroNaoNegativo(input.quantidadeLiberadaSetor)
  )
  const quantidadeDisponivelApontamento = Math.max(
    quantidadeLiberadaSetor - normalizarInteiroNaoNegativo(input.demanda.quantidadeRealizada),
    0
  )
  const snapshotParcelamento = criarSnapshotParcelamentoDemandaTurno({
    quantidadePlanejada: input.demanda.quantidadePlanejada,
    quantidadeRealizadaAtual: input.demanda.quantidadeRealizada,
    quantidadeDisponivelApontamento,
  })

  return {
    etapaFluxoChave: input.etapaFluxoChave,
    quantidadeBacklogSetor: snapshotParcelamento.quantidadeBacklogSetor,
    quantidadeAceitaTurno: snapshotParcelamento.quantidadeAceitaTurno,
    quantidadeExcedenteTurno: snapshotParcelamento.quantidadeExcedenteTurno,
    quantidadePendenteSetor,
    quantidadeLiberadaSetor,
    quantidadeDisponivelApontamento,
    quantidadeBloqueadaAnterior: Math.max(
      quantidadePendenteSetor - quantidadeDisponivelApontamento,
      0
    ),
    quantidadeSincronizadaMontagem: normalizarInteiroNaoNegativo(
      input.quantidadeSincronizadaMontagem ?? 0
    ),
    quantidadeBloqueadaSincronizacao: normalizarInteiroNaoNegativo(
      input.quantidadeBloqueadaSincronizacao ?? 0
    ),
    setorAnteriorId: input.setorAnteriorId ?? null,
    setorAnteriorCodigo: input.setorAnteriorCodigo ?? null,
    setorAnteriorNome: input.setorAnteriorNome ?? null,
  }
}

function tentarMapearEtapasCanonicasPorOp<TDemanda extends Pick<EtapaFluxoSetorV2, 'setorNome'> & {
  etapaFluxoChave?: EtapaFluxoChaveV2
}>(
  etapas: TDemanda[]
): EtapasFluxoCanonicasPorOpV2<TDemanda> | null {
  const etapasPorChave = new Map<EtapaFluxoChaveV2, TDemanda>()

  for (const etapa of etapas) {
    const etapaFluxoChave = etapa.etapaFluxoChave ?? mapearEtapaFluxoCosturaPorNomeSetor(etapa.setorNome)

    if (!etapaFluxoChave || etapasPorChave.has(etapaFluxoChave)) {
      return null
    }

    etapasPorChave.set(etapaFluxoChave, etapa)
  }

  if (!ETAPAS_FLUXO_COSTURA_PARALELO.every((etapa) => etapasPorChave.has(etapa))) {
    return null
  }

  const preparacao = etapasPorChave.get('preparacao')
  const frente = etapasPorChave.get('frente')
  const costa = etapasPorChave.get('costa')
  const montagem = etapasPorChave.get('montagem')
  const final = etapasPorChave.get('final')

  if (!preparacao || !frente || !costa || !montagem || !final) {
    return null
  }

  return {
    preparacao,
    frente,
    costa,
    montagem,
    final,
  }
}

function criarPosicaoFluxoAtiva(input: {
  etapa: EtapaFluxoChaveV2
  setorId: string | null
  setorCodigo: number | null
  setorNome: string
  quantidadePlanejada: number
  quantidadeConcluida: number
  quantidadeLiberada: number
  quantidadeDisponivel: number
  quantidadePendente: number
  quantidadeBloqueadaSincronizacao?: number
  posicaoFila?: number | null
  statusFila?: EstadoEtapaFluxoOpV2['statusFila']
}): PosicaoFluxoAtivaOpV2 {
  const dependencia = obterDependenciaEtapaFluxo(input.etapa)

  return {
    etapa: input.etapa,
    setorId: input.setorId,
    setorCodigo: input.setorCodigo,
    setorNome: input.setorNome,
    tipoDependenciaEntrada: dependencia.tipoDependenciaEntrada,
    tipoDependenciaSaida: dependencia.tipoDependenciaSaida,
    quantidadePlanejada: normalizarInteiroNaoNegativo(input.quantidadePlanejada),
    quantidadeConcluida: normalizarInteiroNaoNegativo(input.quantidadeConcluida),
    quantidadeLiberada: normalizarInteiroNaoNegativo(input.quantidadeLiberada),
    quantidadeDisponivel: normalizarInteiroNaoNegativo(input.quantidadeDisponivel),
    quantidadePendente: normalizarInteiroNaoNegativo(input.quantidadePendente),
    quantidadeBloqueadaSincronizacao: normalizarInteiroNaoNegativo(
      input.quantidadeBloqueadaSincronizacao ?? 0
    ),
    posicaoFila: input.posicaoFila ?? null,
    statusFila: input.statusFila ?? null,
  }
}

export function listarDependenciasFluxoCosturaParalela(): EtapaDependenciaFluxoV2[] {
  return ETAPAS_FLUXO_COSTURA_PARALELO_PADRAO.map((dependencia) => ({
    ...dependencia,
    predecessoras: [...dependencia.predecessoras],
    sucessoras: [...dependencia.sucessoras],
  }))
}

export function mapearEtapaFluxoCosturaPorNomeSetor(
  setorNome: string
): EtapaFluxoChaveV2 | null {
  const setorNormalizado = normalizarNomeSetorParaEtapa(setorNome)

  if (setorNormalizado === 'preparacao') {
    return 'preparacao'
  }

  if (setorNormalizado === 'frente') {
    return 'frente'
  }

  if (setorNormalizado === 'costa') {
    return 'costa'
  }

  if (setorNormalizado === 'montagem') {
    return 'montagem'
  }

  if (setorNormalizado === 'final' || setorNormalizado === 'finalizacao') {
    return 'final'
  }

  return null
}

export function calcularLiberacaoParalelaAposPreparacao(input: {
  quantidadePlanejada: number
  quantidadeConcluidaPreparacao: number
  quantidadeRealizadaFrente: number
  quantidadeRealizadaCosta: number
}): {
  frente: LiberacaoEtapaFluxoV2
  costa: LiberacaoEtapaFluxoV2
} {
  const quantidadePlanejada = normalizarInteiroNaoNegativo(input.quantidadePlanejada)
  const quantidadeConcluidaPreparacao = Math.min(
    quantidadePlanejada,
    normalizarInteiroNaoNegativo(input.quantidadeConcluidaPreparacao)
  )

  return {
    frente: criarLiberacaoEtapa({
      quantidadePlanejada,
      quantidadeLiberada: quantidadeConcluidaPreparacao,
      quantidadeRealizada: input.quantidadeRealizadaFrente,
    }),
    costa: criarLiberacaoEtapa({
      quantidadePlanejada,
      quantidadeLiberada: quantidadeConcluidaPreparacao,
      quantidadeRealizada: input.quantidadeRealizadaCosta,
    }),
  }
}

export function calcularSincronizacaoParcialMontagem(input: {
  quantidadePlanejada: number
  quantidadeConcluidaFrente: number
  quantidadeConcluidaCosta: number
  quantidadeRealizadaMontagem: number
}): SnapshotSincronizacaoParcialMontagemV2 {
  const quantidadePlanejada = normalizarInteiroNaoNegativo(input.quantidadePlanejada)
  const quantidadeConcluidaFrente = Math.min(
    quantidadePlanejada,
    normalizarInteiroNaoNegativo(input.quantidadeConcluidaFrente)
  )
  const quantidadeConcluidaCosta = Math.min(
    quantidadePlanejada,
    normalizarInteiroNaoNegativo(input.quantidadeConcluidaCosta)
  )
  const quantidadeRealizadaMontagem = Math.min(
    quantidadePlanejada,
    normalizarInteiroNaoNegativo(input.quantidadeRealizadaMontagem)
  )
  const quantidadeSincronizadaMontagem = Math.min(
    quantidadeConcluidaFrente,
    quantidadeConcluidaCosta
  )

  return {
    quantidadeConcluidaFrente,
    quantidadeConcluidaCosta,
    quantidadeRealizadaMontagem,
    quantidadeSincronizadaMontagem,
    quantidadeDisponivelMontagem: Math.max(
      quantidadeSincronizadaMontagem - quantidadeRealizadaMontagem,
      0
    ),
    quantidadeBloqueadaSincronizacao: Math.max(
      quantidadePlanejada - quantidadeSincronizadaMontagem,
      0
    ),
  }
}

export function enriquecerDemandasComFluxoParalelo<
  TDemanda extends DemandaFluxoSequencialBase
>(demandas: TDemanda[]): Array<TDemanda & DiagnosticoFluxoParaleloDemandaV2> {
  const demandasPorTurnoOp = new Map<string, TDemanda[]>()

  for (const demanda of demandas) {
    const demandasTurnoOp = demandasPorTurnoOp.get(demanda.turnoOpId) ?? []
    demandasTurnoOp.push(demanda)
    demandasPorTurnoOp.set(demanda.turnoOpId, demandasTurnoOp)
  }

  const diagnosticosPorDemandaId = new Map<string, DiagnosticoFluxoBaseSemFilaV2>()

  for (const demandasTurnoOp of demandasPorTurnoOp.values()) {
    const etapasCanonicas = tentarMapearEtapasCanonicasPorOp(demandasTurnoOp)

    if (!etapasCanonicas) {
      const demandasSequenciais = enriquecerDemandasComFluxoSequencial(demandasTurnoOp)

      for (const demanda of demandasSequenciais) {
        diagnosticosPorDemandaId.set(demanda.id, {
          etapaFluxoChave:
            mapearEtapaFluxoCosturaPorNomeSetor(demanda.setorNome) ?? undefined,
          quantidadeBacklogSetor: demanda.quantidadeBacklogSetor,
          quantidadeAceitaTurno: demanda.quantidadeAceitaTurno,
          quantidadeExcedenteTurno: demanda.quantidadeExcedenteTurno,
          quantidadePendenteSetor: demanda.quantidadePendenteSetor,
          quantidadeLiberadaSetor: demanda.quantidadeLiberadaSetor,
          quantidadeDisponivelApontamento: demanda.quantidadeDisponivelApontamento,
          quantidadeBloqueadaAnterior: demanda.quantidadeBloqueadaAnterior,
          quantidadeSincronizadaMontagem: 0,
          quantidadeBloqueadaSincronizacao: 0,
          setorAnteriorId: demanda.setorAnteriorId,
          setorAnteriorCodigo: demanda.setorAnteriorCodigo,
          setorAnteriorNome: demanda.setorAnteriorNome,
        })
      }

      continue
    }

    const liberacaoPreparacao = criarLiberacaoEtapa({
      quantidadePlanejada: etapasCanonicas.preparacao.quantidadePlanejada,
      quantidadeLiberada: etapasCanonicas.preparacao.quantidadePlanejada,
      quantidadeRealizada: etapasCanonicas.preparacao.quantidadeRealizada,
    })
    const liberacaoFrente = criarLiberacaoEtapa({
      quantidadePlanejada: etapasCanonicas.frente.quantidadePlanejada,
      quantidadeLiberada: etapasCanonicas.preparacao.quantidadeRealizada,
      quantidadeRealizada: etapasCanonicas.frente.quantidadeRealizada,
    })
    const liberacaoCosta = criarLiberacaoEtapa({
      quantidadePlanejada: etapasCanonicas.costa.quantidadePlanejada,
      quantidadeLiberada: etapasCanonicas.preparacao.quantidadeRealizada,
      quantidadeRealizada: etapasCanonicas.costa.quantidadeRealizada,
    })
    const sincronizacaoMontagem = calcularSincronizacaoParcialMontagem({
      quantidadePlanejada: etapasCanonicas.montagem.quantidadePlanejada,
      quantidadeConcluidaFrente: etapasCanonicas.frente.quantidadeRealizada,
      quantidadeConcluidaCosta: etapasCanonicas.costa.quantidadeRealizada,
      quantidadeRealizadaMontagem: etapasCanonicas.montagem.quantidadeRealizada,
    })
    const liberacaoFinal = criarLiberacaoEtapa({
      quantidadePlanejada: etapasCanonicas.final.quantidadePlanejada,
      quantidadeLiberada: etapasCanonicas.montagem.quantidadeRealizada,
      quantidadeRealizada: etapasCanonicas.final.quantidadeRealizada,
    })

    diagnosticosPorDemandaId.set(
      etapasCanonicas.preparacao.id,
      criarDiagnosticoFluxoSemFila({
        etapaFluxoChave: 'preparacao',
        demanda: etapasCanonicas.preparacao,
        quantidadeLiberadaSetor: liberacaoPreparacao.quantidadeLiberada,
      })
    )
    diagnosticosPorDemandaId.set(
      etapasCanonicas.frente.id,
      criarDiagnosticoFluxoSemFila({
        etapaFluxoChave: 'frente',
        demanda: etapasCanonicas.frente,
        quantidadeLiberadaSetor: liberacaoFrente.quantidadeLiberada,
        setorAnteriorId: etapasCanonicas.preparacao.setorId,
        setorAnteriorCodigo: etapasCanonicas.preparacao.setorCodigo,
        setorAnteriorNome: etapasCanonicas.preparacao.setorNome,
      })
    )
    diagnosticosPorDemandaId.set(
      etapasCanonicas.costa.id,
      criarDiagnosticoFluxoSemFila({
        etapaFluxoChave: 'costa',
        demanda: etapasCanonicas.costa,
        quantidadeLiberadaSetor: liberacaoCosta.quantidadeLiberada,
        setorAnteriorId: etapasCanonicas.preparacao.setorId,
        setorAnteriorCodigo: etapasCanonicas.preparacao.setorCodigo,
        setorAnteriorNome: etapasCanonicas.preparacao.setorNome,
      })
    )
    diagnosticosPorDemandaId.set(
      etapasCanonicas.montagem.id,
      criarDiagnosticoFluxoSemFila({
        etapaFluxoChave: 'montagem',
        demanda: etapasCanonicas.montagem,
        quantidadeLiberadaSetor: sincronizacaoMontagem.quantidadeSincronizadaMontagem,
        setorAnteriorNome: 'Frente + Costa',
        quantidadeSincronizadaMontagem:
          sincronizacaoMontagem.quantidadeSincronizadaMontagem,
        quantidadeBloqueadaSincronizacao:
          sincronizacaoMontagem.quantidadeBloqueadaSincronizacao,
      })
    )
    diagnosticosPorDemandaId.set(
      etapasCanonicas.final.id,
      criarDiagnosticoFluxoSemFila({
        etapaFluxoChave: 'final',
        demanda: etapasCanonicas.final,
        quantidadeLiberadaSetor: liberacaoFinal.quantidadeLiberada,
        setorAnteriorId: etapasCanonicas.montagem.setorId,
        setorAnteriorCodigo: etapasCanonicas.montagem.setorCodigo,
        setorAnteriorNome: etapasCanonicas.montagem.setorNome,
      })
    )
  }

  const posicoesPorDemandaId = new Map<string, number | null>()
  const demandasPorSetor = new Map<string, TDemanda[]>()

  for (const demanda of demandas) {
    const demandasSetor = demandasPorSetor.get(demanda.setorId) ?? []
    demandasSetor.push(demanda)
    demandasPorSetor.set(demanda.setorId, demandasSetor)
  }

  for (const demandasSetor of demandasPorSetor.values()) {
    const filaAtiva = demandasSetor.filter(
      (demanda) => demanda.status !== 'concluida' && demanda.status !== 'encerrada_manualmente'
    )

    filaAtiva.forEach((demanda, indice) => {
      posicoesPorDemandaId.set(demanda.id, indice + 1)
    })
  }

  return demandas.map((demanda) => {
    const diagnostico = diagnosticosPorDemandaId.get(demanda.id)
    const quantidadeDisponivelApontamento =
      diagnostico?.quantidadeDisponivelApontamento ?? 0
    const snapshotParcelamento = criarSnapshotParcelamentoDemandaTurno({
      quantidadePlanejada: demanda.quantidadePlanejada,
      quantidadeRealizadaAtual: demanda.quantidadeRealizada,
      quantidadeDisponivelApontamento,
    })
    const posicaoFila = demanda.encerradoEm ? null : (posicoesPorDemandaId.get(demanda.id) ?? null)
    const fila = criarPosicaoFilaSetor({
      quantidadePlanejada: demanda.quantidadePlanejada,
      quantidadeConcluida: demanda.quantidadeRealizada,
      quantidadeDisponivelApontamento,
      posicaoFila,
      iniciadoEm: demanda.iniciadoEm,
      encerradoEm: demanda.encerradoEm,
    })

    return {
      ...demanda,
      etapaFluxoChave: diagnostico?.etapaFluxoChave,
      posicaoFila: fila.posicaoFila,
      statusFila: fila.statusFila,
      quantidadeBacklogSetor: snapshotParcelamento.quantidadeBacklogSetor,
      quantidadeAceitaTurno: snapshotParcelamento.quantidadeAceitaTurno,
      quantidadeExcedenteTurno: snapshotParcelamento.quantidadeExcedenteTurno,
      quantidadePendenteSetor: diagnostico?.quantidadePendenteSetor ?? 0,
      quantidadeLiberadaSetor: diagnostico?.quantidadeLiberadaSetor ?? 0,
      quantidadeDisponivelApontamento,
      quantidadeBloqueadaAnterior: diagnostico?.quantidadeBloqueadaAnterior ?? 0,
      quantidadeSincronizadaMontagem:
        diagnostico?.quantidadeSincronizadaMontagem ?? 0,
      quantidadeBloqueadaSincronizacao:
        diagnostico?.quantidadeBloqueadaSincronizacao ?? 0,
      setorAnteriorId: diagnostico?.setorAnteriorId ?? null,
      setorAnteriorCodigo: diagnostico?.setorAnteriorCodigo ?? null,
      setorAnteriorNome: diagnostico?.setorAnteriorNome ?? null,
    }
  })
}

function ordenarPosicoesFluxoAtivas(
  primeiraPosicao: PosicaoFluxoAtivaOpV2,
  segundaPosicao: PosicaoFluxoAtivaOpV2
): number {
  const dependencias = listarDependenciasFluxoCosturaParalela()
  const ordemPrimeira = dependencias.findIndex(
    (dependencia) => dependencia.etapa === primeiraPosicao.etapa
  )
  const ordemSegunda = dependencias.findIndex(
    (dependencia) => dependencia.etapa === segundaPosicao.etapa
  )

  if (ordemPrimeira !== ordemSegunda) {
    return ordemPrimeira - ordemSegunda
  }

  const codigoPrimeiro = primeiraPosicao.setorCodigo ?? Number.MAX_SAFE_INTEGER
  const codigoSegundo = segundaPosicao.setorCodigo ?? Number.MAX_SAFE_INTEGER

  if (codigoPrimeiro !== codigoSegundo) {
    return codigoPrimeiro - codigoSegundo
  }

  return primeiraPosicao.setorNome.localeCompare(segundaPosicao.setorNome)
}

export function resolverPosicoesFluxoAtivasCosturaParalela(input: {
  preparacao: EstadoEtapaFluxoOpV2
  frente: EstadoEtapaFluxoOpV2
  costa: EstadoEtapaFluxoOpV2
  montagem: EstadoEtapaFluxoOpV2
  final: EstadoEtapaFluxoOpV2
}): {
  posicoesFluxoAtivas: PosicaoFluxoAtivaOpV2[]
  quantidadeSincronizadaMontagem: number
  quantidadeBloqueadaSincronizacao: number
} {
  const quantidadePlanejada = normalizarInteiroNaoNegativo(input.preparacao.quantidadePlanejada)
  const liberacaoPreparacao = criarLiberacaoEtapa({
    quantidadePlanejada,
    quantidadeLiberada: quantidadePlanejada,
    quantidadeRealizada: input.preparacao.quantidadeRealizada,
  })
  const liberacaoParalela = calcularLiberacaoParalelaAposPreparacao({
    quantidadePlanejada,
    quantidadeConcluidaPreparacao: input.preparacao.quantidadeConcluida,
    quantidadeRealizadaFrente: input.frente.quantidadeRealizada,
    quantidadeRealizadaCosta: input.costa.quantidadeRealizada,
  })
  const sincronizacaoMontagem = calcularSincronizacaoParcialMontagem({
    quantidadePlanejada,
    quantidadeConcluidaFrente: input.frente.quantidadeConcluida,
    quantidadeConcluidaCosta: input.costa.quantidadeConcluida,
    quantidadeRealizadaMontagem: input.montagem.quantidadeRealizada,
  })
  const liberacaoFinal = criarLiberacaoEtapa({
    quantidadePlanejada,
    quantidadeLiberada: input.montagem.quantidadeConcluida,
    quantidadeRealizada: input.final.quantidadeRealizada,
  })

  const posicoesFluxoAtivas: PosicaoFluxoAtivaOpV2[] = []

  if (liberacaoPreparacao.quantidadePendente > 0) {
    posicoesFluxoAtivas.push(
      criarPosicaoFluxoAtiva({
        etapa: 'preparacao',
        setorId: input.preparacao.setorId,
        setorCodigo: input.preparacao.setorCodigo,
        setorNome: input.preparacao.setorNome,
        quantidadePlanejada,
        quantidadeConcluida: input.preparacao.quantidadeConcluida,
        quantidadeLiberada: liberacaoPreparacao.quantidadeLiberada,
        quantidadeDisponivel: liberacaoPreparacao.quantidadeDisponivel,
        quantidadePendente: liberacaoPreparacao.quantidadePendente,
        posicaoFila: input.preparacao.posicaoFila,
        statusFila: input.preparacao.statusFila,
      })
    )
  }

  if (
    liberacaoParalela.frente.quantidadePendente > 0 &&
    input.preparacao.quantidadeConcluida > 0
  ) {
    posicoesFluxoAtivas.push(
      criarPosicaoFluxoAtiva({
        etapa: 'frente',
        setorId: input.frente.setorId,
        setorCodigo: input.frente.setorCodigo,
        setorNome: input.frente.setorNome,
        quantidadePlanejada,
        quantidadeConcluida: input.frente.quantidadeConcluida,
        quantidadeLiberada: liberacaoParalela.frente.quantidadeLiberada,
        quantidadeDisponivel: liberacaoParalela.frente.quantidadeDisponivel,
        quantidadePendente: liberacaoParalela.frente.quantidadePendente,
        posicaoFila: input.frente.posicaoFila,
        statusFila: input.frente.statusFila,
      })
    )
  }

  if (
    liberacaoParalela.costa.quantidadePendente > 0 &&
    input.preparacao.quantidadeConcluida > 0
  ) {
    posicoesFluxoAtivas.push(
      criarPosicaoFluxoAtiva({
        etapa: 'costa',
        setorId: input.costa.setorId,
        setorCodigo: input.costa.setorCodigo,
        setorNome: input.costa.setorNome,
        quantidadePlanejada,
        quantidadeConcluida: input.costa.quantidadeConcluida,
        quantidadeLiberada: liberacaoParalela.costa.quantidadeLiberada,
        quantidadeDisponivel: liberacaoParalela.costa.quantidadeDisponivel,
        quantidadePendente: liberacaoParalela.costa.quantidadePendente,
        posicaoFila: input.costa.posicaoFila,
        statusFila: input.costa.statusFila,
      })
    )
  }

  if (
    input.montagem.quantidadeConcluida > 0 ||
    sincronizacaoMontagem.quantidadeDisponivelMontagem > 0 ||
    sincronizacaoMontagem.quantidadeBloqueadaSincronizacao > 0
  ) {
    posicoesFluxoAtivas.push(
      criarPosicaoFluxoAtiva({
        etapa: 'montagem',
        setorId: input.montagem.setorId,
        setorCodigo: input.montagem.setorCodigo,
        setorNome: input.montagem.setorNome,
        quantidadePlanejada,
        quantidadeConcluida: input.montagem.quantidadeConcluida,
        quantidadeLiberada: sincronizacaoMontagem.quantidadeSincronizadaMontagem,
        quantidadeDisponivel: sincronizacaoMontagem.quantidadeDisponivelMontagem,
        quantidadePendente: calcularQuantidadePendente(
          quantidadePlanejada,
          input.montagem.quantidadeRealizada
        ),
        quantidadeBloqueadaSincronizacao:
          sincronizacaoMontagem.quantidadeBloqueadaSincronizacao,
        posicaoFila: input.montagem.posicaoFila,
        statusFila: input.montagem.statusFila,
      })
    )
  }

  if (liberacaoFinal.quantidadePendente > 0 && input.montagem.quantidadeConcluida > 0) {
    posicoesFluxoAtivas.push(
      criarPosicaoFluxoAtiva({
        etapa: 'final',
        setorId: input.final.setorId,
        setorCodigo: input.final.setorCodigo,
        setorNome: input.final.setorNome,
        quantidadePlanejada,
        quantidadeConcluida: input.final.quantidadeConcluida,
        quantidadeLiberada: liberacaoFinal.quantidadeLiberada,
        quantidadeDisponivel: liberacaoFinal.quantidadeDisponivel,
        quantidadePendente: liberacaoFinal.quantidadePendente,
        posicaoFila: input.final.posicaoFila,
        statusFila: input.final.statusFila,
      })
    )
  }

  return {
    posicoesFluxoAtivas: posicoesFluxoAtivas.sort(ordenarPosicoesFluxoAtivas),
    quantidadeSincronizadaMontagem: sincronizacaoMontagem.quantidadeSincronizadaMontagem,
    quantidadeBloqueadaSincronizacao:
      sincronizacaoMontagem.quantidadeBloqueadaSincronizacao,
  }
}

export function resolverResumoFluxoOpParalelo(
  etapas: EtapaFluxoSetorV2[]
): ResumoFluxoOpParaleloV2 {
  const resumoSequencial = resolverPosicaoAtualFluxoOpLote(etapas)
  const etapasCanonicas = tentarMapearEtapasCanonicasPorOp(etapas)

  if (!etapasCanonicas) {
    return {
      ...resumoSequencial,
      posicoesFluxoAtivas: [],
      quantidadeSincronizadaMontagem: 0,
      quantidadeBloqueadaSincronizacao: 0,
    }
  }

  const resumoParalelo = resolverPosicoesFluxoAtivasCosturaParalela({
    preparacao: {
      etapa: 'preparacao',
      setorId: etapasCanonicas.preparacao.setorId,
      setorCodigo: etapasCanonicas.preparacao.setorCodigo,
      setorNome: etapasCanonicas.preparacao.setorNome,
      quantidadePlanejada: etapasCanonicas.preparacao.quantidadePlanejada,
      quantidadeConcluida: etapasCanonicas.preparacao.quantidadeConcluida,
      quantidadeRealizada: etapasCanonicas.preparacao.quantidadeConcluida,
      posicaoFila: etapasCanonicas.preparacao.posicaoFila,
      statusFila: etapasCanonicas.preparacao.statusFila,
    },
    frente: {
      etapa: 'frente',
      setorId: etapasCanonicas.frente.setorId,
      setorCodigo: etapasCanonicas.frente.setorCodigo,
      setorNome: etapasCanonicas.frente.setorNome,
      quantidadePlanejada: etapasCanonicas.frente.quantidadePlanejada,
      quantidadeConcluida: etapasCanonicas.frente.quantidadeConcluida,
      quantidadeRealizada: etapasCanonicas.frente.quantidadeConcluida,
      posicaoFila: etapasCanonicas.frente.posicaoFila,
      statusFila: etapasCanonicas.frente.statusFila,
    },
    costa: {
      etapa: 'costa',
      setorId: etapasCanonicas.costa.setorId,
      setorCodigo: etapasCanonicas.costa.setorCodigo,
      setorNome: etapasCanonicas.costa.setorNome,
      quantidadePlanejada: etapasCanonicas.costa.quantidadePlanejada,
      quantidadeConcluida: etapasCanonicas.costa.quantidadeConcluida,
      quantidadeRealizada: etapasCanonicas.costa.quantidadeConcluida,
      posicaoFila: etapasCanonicas.costa.posicaoFila,
      statusFila: etapasCanonicas.costa.statusFila,
    },
    montagem: {
      etapa: 'montagem',
      setorId: etapasCanonicas.montagem.setorId,
      setorCodigo: etapasCanonicas.montagem.setorCodigo,
      setorNome: etapasCanonicas.montagem.setorNome,
      quantidadePlanejada: etapasCanonicas.montagem.quantidadePlanejada,
      quantidadeConcluida: etapasCanonicas.montagem.quantidadeConcluida,
      quantidadeRealizada: etapasCanonicas.montagem.quantidadeConcluida,
      posicaoFila: etapasCanonicas.montagem.posicaoFila,
      statusFila: etapasCanonicas.montagem.statusFila,
    },
    final: {
      etapa: 'final',
      setorId: etapasCanonicas.final.setorId,
      setorCodigo: etapasCanonicas.final.setorCodigo,
      setorNome: etapasCanonicas.final.setorNome,
      quantidadePlanejada: etapasCanonicas.final.quantidadePlanejada,
      quantidadeConcluida: etapasCanonicas.final.quantidadeConcluida,
      quantidadeRealizada: etapasCanonicas.final.quantidadeConcluida,
      posicaoFila: etapasCanonicas.final.posicaoFila,
      statusFila: etapasCanonicas.final.statusFila,
    },
  })
  const posicaoAtual = resumoParalelo.posicoesFluxoAtivas[0]

  return {
    setorFluxoAtualId: posicaoAtual?.setorId ?? resumoSequencial.setorFluxoAtualId,
    setorFluxoAtualCodigo:
      posicaoAtual?.setorCodigo ?? resumoSequencial.setorFluxoAtualCodigo,
    setorFluxoAtualNome:
      posicaoAtual?.setorNome ?? resumoSequencial.setorFluxoAtualNome,
    ordemFluxoAtual:
      posicaoAtual?.setorCodigo ?? resumoSequencial.ordemFluxoAtual ?? null,
    statusFilaAtual:
      posicaoAtual?.statusFila ?? resumoSequencial.statusFilaAtual,
    quantidadePendenteAtual:
      posicaoAtual?.quantidadePendente ?? resumoSequencial.quantidadePendenteAtual,
    quantidadeFinalizada: resumoSequencial.quantidadeFinalizada,
    posicoesFluxoAtivas: resumoParalelo.posicoesFluxoAtivas,
    quantidadeSincronizadaMontagem:
      resumoParalelo.quantidadeSincronizadaMontagem,
    quantidadeBloqueadaSincronizacao:
      resumoParalelo.quantidadeBloqueadaSincronizacao,
  }
}
