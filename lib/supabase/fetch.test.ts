import assert from 'node:assert/strict'
import test from 'node:test'

const moduloFetchUrl = new URL('./fetch.ts', import.meta.url)
const {
  createSupabaseFetch,
}: typeof import('./fetch') = await import(moduloFetchUrl.href)

test('repete falhas transitórias de transporte antes de retornar a resposta', async () => {
  let tentativas = 0
  const resposta = new Response('ok', { status: 200 })
  const fetchSupabase = createSupabaseFetch(async () => {
    tentativas += 1

    if (tentativas === 1) {
      throw new TypeError('fetch failed')
    }

    return resposta
  })

  const resultado = await fetchSupabase('https://example.com/rest/v1/turnos')

  assert.equal(resultado, resposta)
  assert.equal(tentativas, 2)
})
