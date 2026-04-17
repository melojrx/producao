import test from 'node:test'
import assert from 'node:assert/strict'

const moduloCapacidadeSetorUrl = new URL('./capacidade-setor.ts', import.meta.url)
const {
  calcularCapacidadeSetorEmMinutos,
  calcularCargaPendenteSetorEmMinutos,
  calcularResumoCapacidadeSetor,
  criarPosicaoFilaSetor,
  resolverPosicaoAtualFluxoOpLote,
}: typeof import('./capacidade-setor') = await import(moduloCapacidadeSetorUrl.href)

test('calcula resumo de capacidade do setor com diagnóstico acima da capacidade', () => {
  const resumo = calcularResumoCapacidadeSetor({
    operadoresAlocados: 2,
    minutosTurno: 510,
    cargaPendenteMinutos: 1200,
    tpTotalSetorProduto: 5,
  })

  assert.equal(calcularCapacidadeSetorEmMinutos(2, 510), 1020)
  assert.equal(calcularCargaPendenteSetorEmMinutos(240, 5), 1200)
  assert.deepEqual(resumo, {
    operadoresAlocados: 2,
    minutosTurno: 510,
    cargaPendenteMinutos: 1200,
    capacidadeMinutosTotal: 1020,
    capacidadeMinutosRestante: 0,
    capacidadePecas: 204,
    eficienciaRequeridaPct: 117.647,
    diagnosticoCapacidade: 'acima_capacidade',
  })
})

test('cria posição de fila coerente e resolve a etapa atual da OP no fluxo', () => {
  const fila = criarPosicaoFilaSetor({
    quantidadePlanejada: 500,
    quantidadeConcluida: 0,
    posicaoFila: 1,
  })

  const posicaoFluxo = resolverPosicaoAtualFluxoOpLote([
    {
      setorId: 'setor-preparacao',
      setorCodigo: 10,
      setorNome: 'Preparação',
      quantidadePlanejada: 500,
      quantidadeConcluida: 500,
      statusFila: 'concluida_setor',
    },
    {
      setorId: 'setor-frente',
      setorCodigo: 20,
      setorNome: 'Frente',
      quantidadePlanejada: 500,
      quantidadeConcluida: 120,
      posicaoFila: 1,
      statusFila: 'parcial',
    },
    {
      setorId: 'setor-costa',
      setorCodigo: 30,
      setorNome: 'Costa',
      quantidadePlanejada: 500,
      quantidadeConcluida: 0,
      posicaoFila: 2,
      statusFila: 'em_fila',
    },
  ])

  assert.deepEqual(fila, {
    posicaoFila: 1,
    statusFila: 'liberada',
  })

  assert.deepEqual(posicaoFluxo, {
    setorFluxoAtualId: 'setor-frente',
    setorFluxoAtualCodigo: 20,
    setorFluxoAtualNome: 'Frente',
    ordemFluxoAtual: 20,
    statusFilaAtual: 'parcial',
    quantidadePendenteAtual: 380,
    quantidadeFinalizada: 0,
  })
})
