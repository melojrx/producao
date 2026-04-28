import test from 'node:test'
import assert from 'node:assert/strict'

const moduloFichaProdutoUrl = new URL('./ficha-produto.ts', import.meta.url)
const {
  agruparRoteiroProdutoParaFicha,
}: typeof import('./ficha-produto') = await import(moduloFichaProdutoUrl.href)

test('agrupa roteiro por setor com subtotais e preserva sequencia interna', () => {
  const grupos = agruparRoteiroProdutoParaFicha([
    {
      produtoOperacaoId: 'po-1',
      operacaoId: 'op-1',
      sequencia: 2,
      codigo: 'F20',
      descricao: 'Fechar lateral',
      tempoPadraoMin: 0.42,
      maquinaId: 'maq-1',
      maquinaCodigo: 'RT-001',
      maquinaModelo: 'Reta',
      setorId: 'setor-frente',
      setorCodigo: 20,
      setorNome: 'Frente',
    },
    {
      produtoOperacaoId: 'po-2',
      operacaoId: 'op-2',
      sequencia: 1,
      codigo: 'P10',
      descricao: 'Preparar bolso',
      tempoPadraoMin: 0.28,
      maquinaId: null,
      maquinaCodigo: null,
      maquinaModelo: null,
      setorId: 'setor-preparacao',
      setorCodigo: 10,
      setorNome: 'Preparação',
    },
    {
      produtoOperacaoId: 'po-3',
      operacaoId: 'op-3',
      sequencia: 3,
      codigo: 'F30',
      descricao: 'Rebater frente',
      tempoPadraoMin: 0.31,
      maquinaId: 'maq-1',
      maquinaCodigo: 'RT-001',
      maquinaModelo: 'Reta',
      setorId: 'setor-frente',
      setorCodigo: 20,
      setorNome: 'Frente',
    },
  ])

  assert.deepEqual(
    grupos.map((grupo) => ({
      setorNome: grupo.setorNome,
      totalOperacoes: grupo.totalOperacoes,
      tempoPadraoTotalMin: grupo.tempoPadraoTotalMin,
      sequencias: grupo.operacoes.map((operacao) => operacao.sequencia),
    })),
    [
      {
        setorNome: 'Preparação',
        totalOperacoes: 1,
        tempoPadraoTotalMin: 0.28,
        sequencias: [1],
      },
      {
        setorNome: 'Frente',
        totalOperacoes: 2,
        tempoPadraoTotalMin: 0.73,
        sequencias: [2, 3],
      },
    ]
  )
})

test('coloca operacoes sem setor em grupo documental explicito no final', () => {
  const grupos = agruparRoteiroProdutoParaFicha([
    {
      produtoOperacaoId: 'po-1',
      operacaoId: 'op-1',
      sequencia: 1,
      codigo: 'S10',
      descricao: 'Operação sem setor',
      tempoPadraoMin: 0.5,
      maquinaId: null,
      maquinaCodigo: null,
      maquinaModelo: null,
      setorId: null,
      setorCodigo: null,
      setorNome: null,
    },
  ])

  assert.equal(grupos.length, 1)
  assert.equal(grupos[0]?.setorNome, 'Sem setor definido')
  assert.equal(grupos[0]?.setorCodigo, null)
  assert.equal(grupos[0]?.tempoPadraoTotalMin, 0.5)
})

test('retorna lista vazia para produto sem roteiro', () => {
  assert.deepEqual(agruparRoteiroProdutoParaFicha([]), [])
})
