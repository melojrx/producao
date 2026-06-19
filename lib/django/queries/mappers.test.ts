import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapearCodigoSetorParaNumero,
  mapearMaquinaDjango,
  mapearOperacaoDjango,
  mapearOperadorDjango,
  mapearProdutoBaseDjango,
  mapearProdutosComRoteiroDjango,
  mapearSetorDjango,
  mapearSituacaoParaAtivo,
  type DjangoMaquinaJson,
  type DjangoOperacaoJson,
  type DjangoOperadorJson,
  type DjangoProdutoJson,
  type DjangoProdutoOperacaoJson,
  type DjangoSetorJson,
} from './mappers.ts'

const FIXTURE_OPERADOR: DjangoOperadorJson = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Maria Silva',
  matricula: 'OP-001',
  funcao: 'Costureira',
  status: 'ativo',
  carga_horaria_min: 540,
  qr_code_token: 'operador-token-1',
  foto_url: '',
  maquina_preferida: '22222222-2222-2222-2222-222222222222',
  maquina_preferida_codigo: 'RT-01',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-02T10:00:00Z',
}

const FIXTURE_MAQUINA: DjangoMaquinaJson = {
  id: '22222222-2222-2222-2222-222222222222',
  codigo: 'RT-01',
  modelo: 'Reta Industrial',
  marca: 'Juki',
  numero_patrimonio: 'PAT-100',
  situacao: 'ativa',
  qr_code_token: 'maquina-token-1',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-02T10:00:00Z',
}

const FIXTURE_SETOR: DjangoSetorJson = {
  id: '33333333-3333-3333-3333-333333333333',
  codigo: '10',
  nome: 'Costura Frente',
  situacao: 'ativo',
  modo_apontamento: 'producao_padrao',
  sequencia_fluxo: 2,
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-02T10:00:00Z',
}

const FIXTURE_OPERACAO: DjangoOperacaoJson = {
  id: '44444444-4444-4444-4444-444444444444',
  codigo: 'OP-100',
  descricao: 'Pregar bolso',
  setor: FIXTURE_SETOR.id,
  setor_nome: FIXTURE_SETOR.nome,
  maquina: FIXTURE_MAQUINA.id,
  maquina_codigo: FIXTURE_MAQUINA.codigo,
  tipo_maquina: 'rt',
  tipo_maquina_nome: 'Reta',
  tempo_padrao_min: '0.2800',
  meta_hora: 214,
  meta_dia: 1928,
  situacao: 'ativa',
  imagem_url: '',
  qr_code_token: 'operacao-token-1',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-02T10:00:00Z',
}

const FIXTURE_PRODUTO: DjangoProdutoJson = {
  id: '55555555-5555-5555-5555-555555555555',
  codigo: 'REF-2026',
  nome: 'Camiseta Basica',
  ativo: true,
  imagem_frente_url: 'https://cdn.test/frente.jpg',
  imagem_costa_url: '',
  tp_produto_min: '12.5000',
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-02T10:00:00Z',
}

const FIXTURE_PRODUTO_OPERACAO: DjangoProdutoOperacaoJson = {
  id: '66666666-6666-6666-6666-666666666666',
  produto: FIXTURE_PRODUTO.id,
  produto_codigo: FIXTURE_PRODUTO.codigo,
  operacao: FIXTURE_OPERACAO.id,
  operacao_codigo: FIXTURE_OPERACAO.codigo,
  operacao_descricao: FIXTURE_OPERACAO.descricao,
  operacao_setor_nome: FIXTURE_SETOR.nome,
  operacao_tempo_padrao: '0.2800',
  sequencia: 1,
  versao_roteiro: 1,
  vigente: true,
  substituido_em: null,
  created_at: '2026-01-01T10:00:00Z',
  updated_at: '2026-01-02T10:00:00Z',
}

test('mapearSituacaoParaAtivo cobre valores Django de cadastros', () => {
  assert.equal(mapearSituacaoParaAtivo('ativo'), true)
  assert.equal(mapearSituacaoParaAtivo('ativa'), true)
  assert.equal(mapearSituacaoParaAtivo('inativo'), false)
  assert.equal(mapearSituacaoParaAtivo('inativa'), false)
})

test('mapearCodigoSetorParaNumero converte codigo numerico Django para number Supabase', () => {
  assert.equal(mapearCodigoSetorParaNumero('10'), 10)
  assert.equal(mapearCodigoSetorParaNumero('abc'), 0)
})

test('mapearOperadorDjango preserva contrato OperadorListItem sem campo setor Django', () => {
  const operador = mapearOperadorDjango(FIXTURE_OPERADOR)

  assert.equal(operador.id, FIXTURE_OPERADOR.id)
  assert.equal(operador.nome, FIXTURE_OPERADOR.nome)
  assert.equal(operador.matricula, FIXTURE_OPERADOR.matricula)
  assert.equal(operador.funcao, FIXTURE_OPERADOR.funcao)
  assert.equal(operador.status, FIXTURE_OPERADOR.status)
  assert.equal(operador.carga_horaria_min, FIXTURE_OPERADOR.carga_horaria_min)
  assert.equal(operador.qr_code_token, FIXTURE_OPERADOR.qr_code_token)
  assert.equal(operador.foto_url, null)
  assert.equal(operador.setor, null)
})

test('mapearMaquinaDjango mapeia situacao para status do contrato frontend', () => {
  const maquina = mapearMaquinaDjango(FIXTURE_MAQUINA)

  assert.equal(maquina.codigo, FIXTURE_MAQUINA.codigo)
  assert.equal(maquina.modelo, FIXTURE_MAQUINA.modelo)
  assert.equal(maquina.status, 'ativa')
  assert.equal(maquina.qr_code_token, FIXTURE_MAQUINA.qr_code_token)
})

test('mapearSetorDjango mapeia situacao para ativo booleano', () => {
  const setor = mapearSetorDjango(FIXTURE_SETOR)

  assert.equal(setor.codigo, 10)
  assert.equal(setor.nome, FIXTURE_SETOR.nome)
  assert.equal(setor.ativo, true)
  assert.equal(setor.modo_apontamento, FIXTURE_SETOR.modo_apontamento)
})

test('mapearOperacaoDjango inclui campos enriquecidos de maquina e setor', () => {
  const maquina = mapearMaquinaDjango(FIXTURE_MAQUINA)
  const setor = mapearSetorDjango(FIXTURE_SETOR)
  const maquinasPorId = new Map([[maquina.id, maquina]])
  const setoresPorId = new Map([[setor.id, setor]])

  const operacao = mapearOperacaoDjango(FIXTURE_OPERACAO, maquinasPorId, setoresPorId)

  assert.equal(operacao.codigo, FIXTURE_OPERACAO.codigo)
  assert.equal(operacao.setor_id, FIXTURE_SETOR.id)
  assert.equal(operacao.maquina_id, FIXTURE_MAQUINA.id)
  assert.equal(operacao.ativa, true)
  assert.equal(operacao.tipo_maquina_codigo, 'rt')
  assert.equal(operacao.tempo_padrao_min, 0.28)
  assert.equal(operacao.maquinaCodigo, FIXTURE_MAQUINA.codigo)
  assert.equal(operacao.maquinaModelo, FIXTURE_MAQUINA.modelo)
  assert.equal(operacao.setorCodigo, 10)
  assert.equal(operacao.setorNome, FIXTURE_SETOR.nome)
})

test('mapearProdutoBaseDjango mapeia codigo Django para referencia Supabase', () => {
  const produto = mapearProdutoBaseDjango(FIXTURE_PRODUTO)

  assert.equal(produto.referencia, FIXTURE_PRODUTO.codigo)
  assert.equal(produto.nome, FIXTURE_PRODUTO.nome)
  assert.equal(produto.ativo, true)
  assert.equal(produto.descricao, null)
  assert.equal(produto.tp_produto_min, 12.5)
  assert.equal(produto.imagem_frente_url, FIXTURE_PRODUTO.imagem_frente_url)
  assert.equal(produto.imagem_costa_url, null)
})

test('mapearProdutosComRoteiroDjango monta roteiro vigente com setores envolvidos', () => {
  const maquina = mapearMaquinaDjango(FIXTURE_MAQUINA)
  const setor = mapearSetorDjango(FIXTURE_SETOR)

  const produtos = mapearProdutosComRoteiroDjango(
    [FIXTURE_PRODUTO],
    [FIXTURE_PRODUTO_OPERACAO],
    [FIXTURE_OPERACAO],
    [maquina],
    [setor]
  )

  assert.equal(produtos.length, 1)
  assert.equal(produtos[0].roteiro.length, 1)
  assert.equal(produtos[0].roteiro[0].codigo, FIXTURE_OPERACAO.codigo)
  assert.equal(produtos[0].roteiro[0].setorNome, FIXTURE_SETOR.nome)
  assert.deepEqual(produtos[0].setoresEnvolvidos, [FIXTURE_SETOR.nome])
})

test('mapearProdutosComRoteiroDjango ignora itens de roteiro nao vigentes', () => {
  const maquina = mapearMaquinaDjango(FIXTURE_MAQUINA)
  const setor = mapearSetorDjango(FIXTURE_SETOR)
  const itemNaoVigente = { ...FIXTURE_PRODUTO_OPERACAO, vigente: false }

  const produtos = mapearProdutosComRoteiroDjango(
    [FIXTURE_PRODUTO],
    [itemNaoVigente],
    [FIXTURE_OPERACAO],
    [maquina],
    [setor]
  )

  assert.equal(produtos[0].roteiro.length, 0)
  assert.deepEqual(produtos[0].setoresEnvolvidos, [])
})
