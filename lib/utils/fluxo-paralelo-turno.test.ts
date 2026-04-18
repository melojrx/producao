import assert from 'node:assert/strict'
import test from 'node:test'

const moduloFluxoParaleloTurnoUrl = new URL('./fluxo-paralelo-turno.ts', import.meta.url)
const {
  calcularLiberacaoParalelaAposPreparacao,
  calcularSincronizacaoParcialMontagem,
  enriquecerDemandasComFluxoParalelo,
  listarDependenciasFluxoCosturaParalela,
  mapearEtapaFluxoCosturaPorNomeSetor,
  resolverPosicoesFluxoAtivasCosturaParalela,
  resolverResumoFluxoOpParalelo,
}: typeof import('./fluxo-paralelo-turno') = await import(moduloFluxoParaleloTurnoUrl.href)

test('expõe o grafo oficial do fluxo com fork em Preparação e join parcial em Montagem', () => {
  const dependencias = listarDependenciasFluxoCosturaParalela()

  assert.deepEqual(dependencias, [
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
  ])
})

test('duplica o teto de liberação de Preparação para Frente e Costa sem consumir a quantidade duas vezes', () => {
  assert.deepEqual(
    calcularLiberacaoParalelaAposPreparacao({
      quantidadePlanejada: 100,
      quantidadeConcluidaPreparacao: 40,
      quantidadeRealizadaFrente: 10,
      quantidadeRealizadaCosta: 25,
    }),
    {
      frente: {
        quantidadeLiberada: 40,
        quantidadeDisponivel: 30,
        quantidadePendente: 90,
      },
      costa: {
        quantidadeLiberada: 40,
        quantidadeDisponivel: 15,
        quantidadePendente: 75,
      },
    }
  )
})

test('calcula a sincronização parcial de Montagem pela interseção entre Frente e Costa', () => {
  assert.deepEqual(
    calcularSincronizacaoParcialMontagem({
      quantidadePlanejada: 100,
      quantidadeConcluidaFrente: 40,
      quantidadeConcluidaCosta: 25,
      quantidadeRealizadaMontagem: 10,
    }),
    {
      quantidadeConcluidaFrente: 40,
      quantidadeConcluidaCosta: 25,
      quantidadeRealizadaMontagem: 10,
      quantidadeSincronizadaMontagem: 25,
      quantidadeDisponivelMontagem: 15,
      quantidadeBloqueadaSincronizacao: 75,
    }
  )
})

test('resolve as posições ativas da OP permitindo Frente e Costa simultâneas e Montagem bloqueada por sincronização', () => {
  const resultado = resolverPosicoesFluxoAtivasCosturaParalela({
    preparacao: {
      etapa: 'preparacao',
      setorId: 'setor-preparacao',
      setorCodigo: 10,
      setorNome: 'Preparação',
      quantidadePlanejada: 100,
      quantidadeConcluida: 40,
      quantidadeRealizada: 40,
      posicaoFila: 1,
      statusFila: 'parcial',
    },
    frente: {
      etapa: 'frente',
      setorId: 'setor-frente',
      setorCodigo: 20,
      setorNome: 'Frente',
      quantidadePlanejada: 100,
      quantidadeConcluida: 40,
      quantidadeRealizada: 10,
      posicaoFila: 1,
      statusFila: 'parcial',
    },
    costa: {
      etapa: 'costa',
      setorId: 'setor-costa',
      setorCodigo: 30,
      setorNome: 'Costa',
      quantidadePlanejada: 100,
      quantidadeConcluida: 25,
      quantidadeRealizada: 25,
      posicaoFila: 1,
      statusFila: 'parcial',
    },
    montagem: {
      etapa: 'montagem',
      setorId: 'setor-montagem',
      setorCodigo: 40,
      setorNome: 'Montagem',
      quantidadePlanejada: 100,
      quantidadeConcluida: 0,
      quantidadeRealizada: 0,
      posicaoFila: 1,
      statusFila: 'em_fila',
    },
    final: {
      etapa: 'final',
      setorId: 'setor-final',
      setorCodigo: 50,
      setorNome: 'Final',
      quantidadePlanejada: 100,
      quantidadeConcluida: 0,
      quantidadeRealizada: 0,
      posicaoFila: 1,
      statusFila: 'em_fila',
    },
  })

  assert.deepEqual(
    {
      etapasAtivas: resultado.posicoesFluxoAtivas.map((posicao) => posicao.etapa),
      quantidadeSincronizadaMontagem: resultado.quantidadeSincronizadaMontagem,
      quantidadeBloqueadaSincronizacao: resultado.quantidadeBloqueadaSincronizacao,
    },
    {
      etapasAtivas: ['preparacao', 'frente', 'costa', 'montagem'],
      quantidadeSincronizadaMontagem: 25,
      quantidadeBloqueadaSincronizacao: 75,
    }
  )

  const montagem = resultado.posicoesFluxoAtivas.find((posicao) => posicao.etapa === 'montagem')
  assert.deepEqual(
    {
      quantidadeLiberada: montagem?.quantidadeLiberada,
      quantidadeDisponivel: montagem?.quantidadeDisponivel,
      quantidadeBloqueadaSincronizacao: montagem?.quantidadeBloqueadaSincronizacao,
      tipoDependenciaEntrada: montagem?.tipoDependenciaEntrada,
    },
    {
      quantidadeLiberada: 25,
      quantidadeDisponivel: 25,
      quantidadeBloqueadaSincronizacao: 75,
      tipoDependenciaEntrada: 'join_parcial',
    }
  )
})

test('mapeia os nomes canônicos do fluxo paralelo com tolerância a acentos e finalização', () => {
  assert.equal(mapearEtapaFluxoCosturaPorNomeSetor('Preparação'), 'preparacao')
  assert.equal(mapearEtapaFluxoCosturaPorNomeSetor('Frente'), 'frente')
  assert.equal(mapearEtapaFluxoCosturaPorNomeSetor('Costa'), 'costa')
  assert.equal(mapearEtapaFluxoCosturaPorNomeSetor('Montagem'), 'montagem')
  assert.equal(mapearEtapaFluxoCosturaPorNomeSetor('Finalização'), 'final')
  assert.equal(mapearEtapaFluxoCosturaPorNomeSetor('Expedição'), null)
})

test('enriquece as demandas do fluxo paralelo liberando Montagem apenas pela interseção real', () => {
  const demandas = enriquecerDemandasComFluxoParalelo([
    {
      id: 'demanda-preparacao',
      turnoOpId: 'op-1',
      setorId: 'setor-preparacao',
      setorCodigo: 10,
      setorNome: 'Preparação',
      quantidadePlanejada: 100,
      quantidadeRealizada: 40,
      status: 'em_andamento',
      iniciadoEm: '2026-04-17T08:00:00.000Z',
      encerradoEm: null,
    },
    {
      id: 'demanda-frente',
      turnoOpId: 'op-1',
      setorId: 'setor-frente',
      setorCodigo: 20,
      setorNome: 'Frente',
      quantidadePlanejada: 100,
      quantidadeRealizada: 40,
      status: 'em_andamento',
      iniciadoEm: '2026-04-17T09:00:00.000Z',
      encerradoEm: null,
    },
    {
      id: 'demanda-costa',
      turnoOpId: 'op-1',
      setorId: 'setor-costa',
      setorCodigo: 30,
      setorNome: 'Costa',
      quantidadePlanejada: 100,
      quantidadeRealizada: 25,
      status: 'em_andamento',
      iniciadoEm: '2026-04-17T09:15:00.000Z',
      encerradoEm: null,
    },
    {
      id: 'demanda-montagem',
      turnoOpId: 'op-1',
      setorId: 'setor-montagem',
      setorCodigo: 40,
      setorNome: 'Montagem',
      quantidadePlanejada: 100,
      quantidadeRealizada: 10,
      status: 'aberta',
      iniciadoEm: null,
      encerradoEm: null,
    },
    {
      id: 'demanda-final',
      turnoOpId: 'op-1',
      setorId: 'setor-final',
      setorCodigo: 50,
      setorNome: 'Final',
      quantidadePlanejada: 100,
      quantidadeRealizada: 0,
      status: 'planejada',
      iniciadoEm: null,
      encerradoEm: null,
    },
  ])
  const montagem = demandas.find((demanda) => demanda.id === 'demanda-montagem')
  const frente = demandas.find((demanda) => demanda.id === 'demanda-frente')
  const final = demandas.find((demanda) => demanda.id === 'demanda-final')

  assert.deepEqual(
    {
      etapaFluxoChave: montagem?.etapaFluxoChave,
      quantidadeLiberadaSetor: montagem?.quantidadeLiberadaSetor,
      quantidadeDisponivelApontamento: montagem?.quantidadeDisponivelApontamento,
      quantidadeSincronizadaMontagem: montagem?.quantidadeSincronizadaMontagem,
      quantidadeBloqueadaSincronizacao: montagem?.quantidadeBloqueadaSincronizacao,
      setorAnteriorNome: montagem?.setorAnteriorNome,
    },
    {
      etapaFluxoChave: 'montagem',
      quantidadeLiberadaSetor: 25,
      quantidadeDisponivelApontamento: 15,
      quantidadeSincronizadaMontagem: 25,
      quantidadeBloqueadaSincronizacao: 75,
      setorAnteriorNome: 'Frente + Costa',
    }
  )

  assert.deepEqual(
    {
      etapaFluxoChave: frente?.etapaFluxoChave,
      quantidadeLiberadaSetor: frente?.quantidadeLiberadaSetor,
      quantidadeDisponivelApontamento: frente?.quantidadeDisponivelApontamento,
      setorAnteriorNome: frente?.setorAnteriorNome,
    },
    {
      etapaFluxoChave: 'frente',
      quantidadeLiberadaSetor: 40,
      quantidadeDisponivelApontamento: 0,
      setorAnteriorNome: 'Preparação',
    }
  )

  assert.deepEqual(
    {
      etapaFluxoChave: final?.etapaFluxoChave,
      quantidadeLiberadaSetor: final?.quantidadeLiberadaSetor,
      quantidadeDisponivelApontamento: final?.quantidadeDisponivelApontamento,
      setorAnteriorNome: final?.setorAnteriorNome,
    },
    {
      etapaFluxoChave: 'final',
      quantidadeLiberadaSetor: 10,
      quantidadeDisponivelApontamento: 10,
      setorAnteriorNome: 'Montagem',
    }
  )
})

test('resume a OP com múltiplas posições ativas e mantém um resumo compatível para a UI atual', () => {
  const resumo = resolverResumoFluxoOpParalelo([
    {
      etapaFluxoChave: 'preparacao',
      setorId: 'setor-preparacao',
      setorCodigo: 10,
      setorNome: 'Preparação',
      quantidadePlanejada: 100,
      quantidadeConcluida: 40,
      posicaoFila: 1,
      statusFila: 'parcial',
    },
    {
      etapaFluxoChave: 'frente',
      setorId: 'setor-frente',
      setorCodigo: 20,
      setorNome: 'Frente',
      quantidadePlanejada: 100,
      quantidadeConcluida: 40,
      posicaoFila: 1,
      statusFila: 'parcial',
    },
    {
      etapaFluxoChave: 'costa',
      setorId: 'setor-costa',
      setorCodigo: 30,
      setorNome: 'Costa',
      quantidadePlanejada: 100,
      quantidadeConcluida: 25,
      posicaoFila: 1,
      statusFila: 'parcial',
    },
    {
      etapaFluxoChave: 'montagem',
      setorId: 'setor-montagem',
      setorCodigo: 40,
      setorNome: 'Montagem',
      quantidadePlanejada: 100,
      quantidadeConcluida: 10,
      posicaoFila: 1,
      statusFila: 'liberada',
    },
    {
      etapaFluxoChave: 'final',
      setorId: 'setor-final',
      setorCodigo: 50,
      setorNome: 'Final',
      quantidadePlanejada: 100,
      quantidadeConcluida: 0,
      posicaoFila: 1,
      statusFila: 'em_fila',
    },
  ])

  assert.deepEqual(
    {
      setorFluxoAtualNome: resumo.setorFluxoAtualNome,
      statusFilaAtual: resumo.statusFilaAtual,
      quantidadePendenteAtual: resumo.quantidadePendenteAtual,
      etapasAtivas: resumo.posicoesFluxoAtivas.map((posicao) => posicao.etapa),
      quantidadeSincronizadaMontagem: resumo.quantidadeSincronizadaMontagem,
      quantidadeBloqueadaSincronizacao: resumo.quantidadeBloqueadaSincronizacao,
    },
    {
      setorFluxoAtualNome: 'Preparação',
      statusFilaAtual: 'parcial',
      quantidadePendenteAtual: 60,
      etapasAtivas: ['preparacao', 'frente', 'costa', 'montagem', 'final'],
      quantidadeSincronizadaMontagem: 25,
      quantidadeBloqueadaSincronizacao: 75,
    }
  )
})
