import test from 'node:test'
import assert from 'node:assert/strict'

const moduloOperacaoLifecycleCopyUrl = new URL('./operacao-lifecycle-copy.ts', import.meta.url)
const {
  obterConteudoConfirmacaoOperacao,
}: typeof import('./operacao-lifecycle-copy') = await import(moduloOperacaoLifecycleCopyUrl.href)

test('monta conteúdo de confirmação para desativar operação preservando histórico', () => {
  const conteudo = obterConteudoConfirmacaoOperacao({
    acao: 'desativar',
    codigo: 'P64',
    executando: false,
  })

  assert.equal(conteudo.titulo, 'Desativar operação')
  assert.equal(conteudo.rotuloConfirmacao, 'Confirmar desativação')
  assert.match(conteudo.descricao, /P64/)
  assert.match(conteudo.aviso, /histórico/)
})

test('monta conteúdo de confirmação para exclusão permanente condicionada a dependências', () => {
  const conteudo = obterConteudoConfirmacaoOperacao({
    acao: 'excluir',
    codigo: 'P64',
    executando: true,
  })

  assert.equal(conteudo.titulo, 'Excluir permanentemente')
  assert.equal(conteudo.rotuloConfirmacao, 'Excluindo operação...')
  assert.match(conteudo.descricao, /sem dependências/)
  assert.match(conteudo.aviso, /roteiro ou histórico/)
})
