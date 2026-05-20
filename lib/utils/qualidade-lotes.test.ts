import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aplicarLoteQualidadePendenteIdempotente,
  montarLoteQualidadePendenteDeApontamento,
  podeCriarNovoLoteQualidadeParaRetorno,
  validarRevisaoCompletaLoteQualidade,
  validarRevisaoLoteComDefeitosQualidade,
} from './qualidade-lotes.ts'

test('finaliza lote quando aprovadas e reprovadas fecham a quantidade do lote', () => {
  assert.deepEqual(
    validarRevisaoCompletaLoteQualidade({
      quantidadeLote: 100,
      quantidadeAprovada: 95,
      quantidadeReprovada: 5,
      statusAtual: 'pendente',
    }),
    {
      permitido: true,
      quantidadeRevisada: 100,
      proximoStatus: 'revisado',
    }
  )
})

test('recusa revisao parcial do mesmo lote no primeiro contrato da fila continua', () => {
  assert.deepEqual(
    validarRevisaoCompletaLoteQualidade({
      quantidadeLote: 100,
      quantidadeAprovada: 80,
      quantidadeReprovada: 5,
      statusAtual: 'em_revisao',
    }),
    {
      permitido: false,
      quantidadeRevisada: 85,
      mensagem:
        'A soma de aprovadas e reprovadas precisa fechar exatamente a quantidade do lote de qualidade.',
    }
  )
})

test('recusa nova revisao em lote ja finalizado', () => {
  assert.deepEqual(
    validarRevisaoCompletaLoteQualidade({
      quantidadeLote: 100,
      quantidadeAprovada: 100,
      quantidadeReprovada: 0,
      statusAtual: 'revisado',
    }),
    {
      permitido: false,
      quantidadeRevisada: 0,
      mensagem: 'O lote de qualidade já foi finalizado e não pode receber nova revisão.',
    }
  )
})

test('permite que peca corrigida retorne como novo lote somente apos revisao anterior', () => {
  assert.equal(podeCriarNovoLoteQualidadeParaRetorno('pendente'), false)
  assert.equal(podeCriarNovoLoteQualidadeParaRetorno('em_revisao'), false)
  assert.equal(podeCriarNovoLoteQualidadeParaRetorno('cancelado'), false)
  assert.equal(podeCriarNovoLoteQualidadeParaRetorno('revisado'), true)
})

test('monta lote pendente apenas quando apontamento entrega pecas para qualidade', () => {
  assert.deepEqual(
    montarLoteQualidadePendenteDeApontamento({
      registroProducaoId: 'registro-1',
      turnoId: 'turno-1',
      turnoOpId: 'turno-op-1',
      produtoId: 'produto-1',
      turnoSetorOperacaoIdOrigem: 'operacao-turno-1',
      operacaoIdOrigem: 'operacao-1',
      setorIdOrigem: 'setor-1',
      quantidade: 100,
      entregaParaQualidade: true,
      criadoEm: '2026-05-14T10:00:00.000Z',
    }),
    {
      registroProducaoId: 'registro-1',
      turnoId: 'turno-1',
      turnoOpId: 'turno-op-1',
      produtoId: 'produto-1',
      turnoSetorOperacaoIdOrigem: 'operacao-turno-1',
      operacaoIdOrigem: 'operacao-1',
      setorIdOrigem: 'setor-1',
      quantidadeLote: 100,
      status: 'pendente',
      criadoEm: '2026-05-14T10:00:00.000Z',
    }
  )
})

test('recusa lote de qualidade gerado por apontamento produtivo intermediario', () => {
  assert.throws(
    () =>
      montarLoteQualidadePendenteDeApontamento({
        registroProducaoId: 'registro-1',
        turnoId: 'turno-1',
        turnoOpId: 'turno-op-1',
        produtoId: 'produto-1',
        turnoSetorOperacaoIdOrigem: 'operacao-turno-1',
        operacaoIdOrigem: 'operacao-1',
        setorIdOrigem: 'setor-1',
        quantidade: 100,
        entregaParaQualidade: false,
        criadoEm: '2026-05-14T10:00:00.000Z',
      }),
    /entrega final para a Qualidade/
  )
})

test('aplica lote de qualidade de forma idempotente por registro produtivo de origem', () => {
  const lote = montarLoteQualidadePendenteDeApontamento({
    registroProducaoId: 'registro-1',
    turnoId: 'turno-1',
    turnoOpId: 'turno-op-1',
    produtoId: 'produto-1',
    turnoSetorOperacaoIdOrigem: 'operacao-turno-1',
    operacaoIdOrigem: 'operacao-1',
    setorIdOrigem: 'setor-1',
    quantidade: 100,
    entregaParaQualidade: true,
    criadoEm: '2026-05-14T10:00:00.000Z',
  })

  const primeiraAplicacao = aplicarLoteQualidadePendenteIdempotente([], lote)
  const segundaAplicacao = aplicarLoteQualidadePendenteIdempotente(primeiraAplicacao.lotes, lote)

  assert.equal(primeiraAplicacao.criado, true)
  assert.equal(primeiraAplicacao.lotes.length, 1)
  assert.equal(segundaAplicacao.criado, false)
  assert.equal(segundaAplicacao.lotes.length, 1)
  assert.deepEqual(segundaAplicacao.lotes, primeiraAplicacao.lotes)
})

test('exige defeito catalogado quando lote possui reprovadas', () => {
  assert.deepEqual(
    validarRevisaoLoteComDefeitosQualidade({
      quantidadeLote: 100,
      quantidadeAprovada: 95,
      quantidadeReprovada: 5,
      statusAtual: 'pendente',
      defeitos: [],
    }),
    {
      permitido: false,
      quantidadeRevisada: 100,
      mensagem: 'Informe ao menos um defeito do catálogo para as peças reprovadas.',
    }
  )

  assert.deepEqual(
    validarRevisaoLoteComDefeitosQualidade({
      quantidadeLote: 100,
      quantidadeAprovada: 95,
      quantidadeReprovada: 5,
      statusAtual: 'pendente',
      defeitos: [
        {
          turnoSetorOperacaoIdOrigem: 'operacao-rebatimento-lateral',
          qualidadeDefeitoId: 'defeito-1',
          quantidadeDefeito: 5,
        },
      ],
    }),
    {
      permitido: true,
      quantidadeRevisada: 100,
      proximoStatus: 'revisado',
    }
  )
})

test('permite multiplas ocorrencias de defeito acima da quantidade reprovada', () => {
  assert.deepEqual(
    validarRevisaoLoteComDefeitosQualidade({
      quantidadeLote: 10,
      quantidadeAprovada: 9,
      quantidadeReprovada: 1,
      statusAtual: 'pendente',
      defeitos: [
        {
          turnoSetorOperacaoIdOrigem: 'operacao-rebatimento-lateral',
          qualidadeDefeitoId: 'defeito-ponto-falho',
          quantidadeDefeito: 2,
        },
        {
          turnoSetorOperacaoIdOrigem: 'operacao-rebatimento-lateral',
          qualidadeDefeitoId: 'defeito-borda-larga',
          quantidadeDefeito: 2,
        },
      ],
    }),
    {
      permitido: true,
      quantidadeRevisada: 10,
      proximoStatus: 'revisado',
    }
  )
})

test('exige operacao produtiva em cada defeito registrado no lote', () => {
  assert.deepEqual(
    validarRevisaoLoteComDefeitosQualidade({
      quantidadeLote: 10,
      quantidadeAprovada: 9,
      quantidadeReprovada: 1,
      statusAtual: 'pendente',
      defeitos: [
        {
          qualidadeDefeitoId: 'defeito-ponto-falho',
          quantidadeDefeito: 1,
        },
      ],
    }),
    {
      permitido: false,
      quantidadeRevisada: 10,
      mensagem: 'Cada defeito precisa informar a operação produtiva analisada.',
    }
  )
})

test('recusa defeitos informados em lote sem reprovadas', () => {
  assert.deepEqual(
    validarRevisaoLoteComDefeitosQualidade({
      quantidadeLote: 100,
      quantidadeAprovada: 100,
      quantidadeReprovada: 0,
      statusAtual: 'pendente',
      defeitos: [
        {
          qualidadeDefeitoId: 'defeito-1',
          quantidadeDefeito: 1,
        },
      ],
    }),
    {
      permitido: false,
      quantidadeRevisada: 100,
      mensagem: 'Não informe defeitos quando o lote não possuir peças reprovadas.',
    }
  )
})
