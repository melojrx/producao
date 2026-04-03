import test from 'node:test'
import assert from 'node:assert/strict'

import type { DimensionamentoPessoasSetorInput } from './dimensionamento-pessoas-setor'

const moduloDimensionamentoUrl = new URL('./dimensionamento-pessoas-setor.ts', import.meta.url)
const { calcularDimensionamentoPessoasPorSetor }: typeof import('./dimensionamento-pessoas-setor') =
  await import(moduloDimensionamentoUrl.href)

test('calcula a necessidade de pessoas por setor com arredondamento para cima', () => {
  const input: DimensionamentoPessoasSetorInput = {
    operadoresDisponiveis: 20,
    minutosTurno: 510,
    ops: [
      {
        numeroOp: 'OP-1111',
        produtoId: 'produto-1111',
        produtoNome: 'Modelo 1111',
        produtoReferencia: '1111',
        quantidadePlanejada: 637,
        roteiro: [
          {
            operacaoId: 'op-prep-1',
            setorId: 'setor-preparacao',
            setorNome: 'Preparação',
            tempoPadraoMin: 5,
          },
          {
            operacaoId: 'op-prep-2',
            setorId: 'setor-preparacao',
            setorNome: 'Preparação',
            tempoPadraoMin: 3,
          },
        ],
      },
    ],
  }

  const resultado = calcularDimensionamentoPessoasPorSetor(input)

  assert.equal(resultado.totalPessoasSugeridas, 10)
  assert.equal(resultado.deficitOperadores, 0)
  assert.equal(resultado.setores.length, 1)
  assert.deepEqual(resultado.setores[0], {
    setorId: 'setor-preparacao',
    setorCodigo: null,
    setorNome: 'Preparação',
    cargaMinutos: 5096,
    pessoasNecessarias: 10,
    contribuicoes: [
      {
        numeroOp: 'OP-1111',
        produtoId: 'produto-1111',
        produtoNome: 'Modelo 1111',
        produtoReferencia: '1111',
        quantidadePlanejada: 637,
        tpTotalSetorProduto: 8,
        cargaMinutos: 5096,
      },
    ],
  })
})

test('consolida múltiplas OPs no mesmo setor e sinaliza déficit agregado', () => {
  const input: DimensionamentoPessoasSetorInput = {
    operadoresDisponiveis: 4,
    minutosTurno: 300,
    ops: [
      {
        numeroOp: 'OP-200',
        produtoId: 'produto-200',
        produtoNome: 'Camisa Polo',
        produtoReferencia: 'REF-200',
        quantidadePlanejada: 100,
        roteiro: [
          {
            operacaoId: 'prep-a',
            setorId: 'setor-preparacao',
            setorNome: 'Preparação',
            tempoPadraoMin: 5,
          },
          {
            operacaoId: 'prep-b',
            setorId: 'setor-preparacao',
            setorNome: 'Preparação',
            tempoPadraoMin: 3,
          },
          {
            operacaoId: 'mont-1',
            setorId: 'setor-montagem',
            setorNome: 'Montagem',
            tempoPadraoMin: 4,
          },
        ],
      },
      {
        numeroOp: 'OP-201',
        produtoId: 'produto-201',
        produtoNome: 'Calça Work',
        produtoReferencia: 'REF-201',
        quantidadePlanejada: 50,
        roteiro: [
          {
            operacaoId: 'prep-c',
            setorId: 'setor-preparacao',
            setorNome: 'Preparação',
            tempoPadraoMin: 1.5,
          },
          {
            operacaoId: 'final-1',
            setorId: 'setor-finalizacao',
            setorNome: 'Finalização',
            tempoPadraoMin: 2,
          },
        ],
      },
    ],
  }

  const resultado = calcularDimensionamentoPessoasPorSetor(input)
  const preparacao = resultado.setores.find((setor) => setor.setorId === 'setor-preparacao')
  const montagem = resultado.setores.find((setor) => setor.setorId === 'setor-montagem')
  const finalizacao = resultado.setores.find((setor) => setor.setorId === 'setor-finalizacao')

  assert.equal(resultado.totalPessoasSugeridas, 6)
  assert.equal(resultado.deficitOperadores, 2)
  assert.equal(preparacao?.cargaMinutos, 875)
  assert.equal(preparacao?.pessoasNecessarias, 3)
  assert.equal(preparacao?.contribuicoes.length, 2)
  assert.equal(montagem?.cargaMinutos, 400)
  assert.equal(montagem?.pessoasNecessarias, 2)
  assert.equal(finalizacao?.cargaMinutos, 100)
  assert.equal(finalizacao?.pessoasNecessarias, 1)
})

test('ignora operações inválidas do roteiro e quantidades não positivas sem quebrar a consolidação', () => {
  const input: DimensionamentoPessoasSetorInput = {
    operadoresDisponiveis: 3,
    minutosTurno: 240,
    ops: [
      {
        numeroOp: 'OP-300',
        produtoId: 'produto-300',
        produtoNome: 'Jaqueta',
        produtoReferencia: 'REF-300',
        quantidadePlanejada: 40,
        roteiro: [
          {
            operacaoId: 'prep-valida',
            setorId: 'setor-preparacao',
            setorNome: 'Preparação',
            tempoPadraoMin: 2.5,
          },
          {
            operacaoId: 'sem-setor',
            setorId: null,
            setorNome: null,
            tempoPadraoMin: 9,
          },
          {
            operacaoId: 'tp-invalido',
            setorId: 'setor-preparacao',
            setorNome: 'Preparação',
            tempoPadraoMin: 0,
          },
        ],
      },
      {
        numeroOp: 'OP-301',
        produtoId: 'produto-301',
        produtoNome: 'Blazer',
        produtoReferencia: 'REF-301',
        quantidadePlanejada: 0,
        roteiro: [
          {
            operacaoId: 'montagem-inutilizada',
            setorId: 'setor-montagem',
            setorNome: 'Montagem',
            tempoPadraoMin: 10,
          },
        ],
      },
    ],
  }

  const resultado = calcularDimensionamentoPessoasPorSetor(input)

  assert.equal(resultado.setores.length, 1)
  assert.equal(resultado.setores[0]?.setorNome, 'Preparação')
  assert.equal(resultado.setores[0]?.cargaMinutos, 100)
  assert.equal(resultado.setores[0]?.pessoasNecessarias, 1)
  assert.equal(resultado.totalPessoasSugeridas, 1)
  assert.equal(resultado.deficitOperadores, 0)
})
