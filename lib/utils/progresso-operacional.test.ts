import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProgressoOperacionalItem } from './progresso-operacional'

const moduloProgressoUrl = new URL('./progresso-operacional.ts', import.meta.url)
const {
  calcularCargaOperacionalTp,
  calcularIndicadoresOperacionaisPorItens,
  montarIndicadoresOperacionais,
  somarCargasOperacionaisTp,
}: typeof import('./progresso-operacional') = await import(moduloProgressoUrl.href)

test('pondera o progresso operacional pelo T.P. das operações', () => {
  const itens: ProgressoOperacionalItem[] = [
    {
      quantidadePlanejada: 100,
      quantidadeRealizada: 100,
      tempoPadraoMin: 0.5,
    },
    {
      quantidadePlanejada: 100,
      quantidadeRealizada: 50,
      tempoPadraoMin: 1.5,
    },
    {
      quantidadePlanejada: 100,
      quantidadeRealizada: 25,
      tempoPadraoMin: 3,
    },
  ]

  const indicadores = calcularIndicadoresOperacionaisPorItens(25, itens)

  assert.equal(indicadores.quantidadeConcluida, 25)
  assert.equal(indicadores.cargaPlanejadaTp, 500)
  assert.equal(indicadores.cargaRealizadaTp, 200)
  assert.equal(indicadores.progressoOperacionalPct, 40)
})

test('limita a carga realizada ao planejado da operação antes de consolidar o progresso', () => {
  const itens: ProgressoOperacionalItem[] = [
    {
      quantidadePlanejada: 80,
      quantidadeRealizada: 120,
      tempoPadraoMin: 2,
    },
  ]

  const indicadores = calcularIndicadoresOperacionaisPorItens(80, itens)

  assert.equal(indicadores.cargaPlanejadaTp, 160)
  assert.equal(indicadores.cargaRealizadaTp, 160)
  assert.equal(indicadores.progressoOperacionalPct, 100)
})

test('soma cargas parciais de setores distintos sem perder a separação entre progresso e peças completas', () => {
  const cargaPreparacao = calcularCargaOperacionalTp([
    {
      quantidadePlanejada: 100,
      quantidadeRealizada: 100,
      tempoPadraoMin: 1,
    },
    {
      quantidadePlanejada: 100,
      quantidadeRealizada: 20,
      tempoPadraoMin: 4,
    },
  ])

  const cargaMontagem = calcularCargaOperacionalTp([
    {
      quantidadePlanejada: 100,
      quantidadeRealizada: 10,
      tempoPadraoMin: 3,
    },
  ])

  const cargaTotal = somarCargasOperacionaisTp([cargaPreparacao, cargaMontagem])
  const indicadores = montarIndicadoresOperacionais(10, cargaTotal)

  assert.deepEqual(cargaTotal, {
    cargaPlanejadaTp: 800,
    cargaRealizadaTp: 210,
  })
  assert.equal(indicadores.quantidadeConcluida, 10)
  assert.equal(indicadores.progressoOperacionalPct, 26.25)
})
