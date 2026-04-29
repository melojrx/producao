import test from 'node:test'
import assert from 'node:assert/strict'

const moduloOperacaoDuplicacaoUrl = new URL('./operacao-duplicacao.ts', import.meta.url)
const {
  prepararOperacaoParaDuplicacao,
}: typeof import('./operacao-duplicacao') = await import(moduloOperacaoDuplicacaoUrl.href)

test('prepara operacao duplicada reaproveitando campos tecnicos sem imagem nem qr', () => {
  const operacaoDuplicada = prepararOperacaoParaDuplicacao({
    codigo: 'P64',
    descricao: 'Pregar etiqueta',
    imagem_url: 'https://example.com/storage/v1/object/public/operacoes/op-1/imagem.webp',
    maquina_id: 'maquina-1',
    qr_code_token: 'token-original',
    setor_id: 'setor-qualidade',
    tempo_padrao_min: 0.42,
  })

  assert.deepEqual(operacaoDuplicada, {
    ativa: true,
    codigo: 'P64-COPIA',
    descricao: 'Pregar etiqueta',
    imagem_url: null,
    maquina_id: 'maquina-1',
    qr_code_token: null,
    setor_id: 'setor-qualidade',
    tempo_padrao_min: 0.42,
  })
})

test('mantem codigo sugerido editavel mesmo quando a operacao base ja termina com copia', () => {
  const operacaoDuplicada = prepararOperacaoParaDuplicacao({
    codigo: 'P64-COPIA',
    descricao: 'Pregar etiqueta',
    imagem_url: null,
    maquina_id: 'maquina-1',
    qr_code_token: 'token-original',
    setor_id: 'setor-qualidade',
    tempo_padrao_min: 0.42,
  })

  assert.equal(operacaoDuplicada.codigo, 'P64-COPIA-2')
})
