import assert from 'node:assert/strict'
import test from 'node:test'

const moduloClientUrl = new URL('./client.ts', import.meta.url)
const {
  DJANGO_API_URL_PADRAO,
  DjangoApiError,
  djangoFetch,
  obterUrlBaseDjangoApi,
}: typeof import('./client') = await import(moduloClientUrl.href)

test('obterUrlBaseDjangoApi usa padrao localhost:8001 quando env ausente', () => {
  const envOriginal = process.env.NEXT_PUBLIC_DJANGO_API_URL
  const envServidorOriginal = process.env.DJANGO_API_URL
  delete process.env.NEXT_PUBLIC_DJANGO_API_URL
  delete process.env.DJANGO_API_URL

  assert.equal(obterUrlBaseDjangoApi(), DJANGO_API_URL_PADRAO)

  if (envOriginal === undefined) {
    delete process.env.NEXT_PUBLIC_DJANGO_API_URL
  } else {
    process.env.NEXT_PUBLIC_DJANGO_API_URL = envOriginal
  }

  if (envServidorOriginal === undefined) {
    delete process.env.DJANGO_API_URL
  } else {
    process.env.DJANGO_API_URL = envServidorOriginal
  }
})

test('obterUrlBaseDjangoApi prioriza DJANGO_API_URL no server-side', () => {
  const envPublicoOriginal = process.env.NEXT_PUBLIC_DJANGO_API_URL
  const envServidorOriginal = process.env.DJANGO_API_URL
  process.env.NEXT_PUBLIC_DJANGO_API_URL = 'http://localhost:8001'
  process.env.DJANGO_API_URL = 'http://backend:8000'

  assert.equal(obterUrlBaseDjangoApi(), 'http://backend:8000')

  if (envPublicoOriginal === undefined) {
    delete process.env.NEXT_PUBLIC_DJANGO_API_URL
  } else {
    process.env.NEXT_PUBLIC_DJANGO_API_URL = envPublicoOriginal
  }

  if (envServidorOriginal === undefined) {
    delete process.env.DJANGO_API_URL
  } else {
    process.env.DJANGO_API_URL = envServidorOriginal
  }
})

test('djangoFetch monta URL absoluta a partir do path da API', async () => {
  const envOriginal = process.env.NEXT_PUBLIC_DJANGO_API_URL
  process.env.NEXT_PUBLIC_DJANGO_API_URL = 'http://django.test'

  let urlChamada = ''
  await djangoFetch('/api/v1/accounts/me/', {
    method: 'GET',
    accessToken: 'token-teste',
    fetchImpl: async (input, init) => {
      urlChamada = String(input)
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer token-teste')
      return new Response(JSON.stringify({ id: '1', email: 'a@b.com' }), { status: 200 })
    },
  })

  assert.equal(urlChamada, 'http://django.test/api/v1/accounts/me/')

  if (envOriginal === undefined) {
    delete process.env.NEXT_PUBLIC_DJANGO_API_URL
  } else {
    process.env.NEXT_PUBLIC_DJANGO_API_URL = envOriginal
  }
})

test('djangoFetch lanca DjangoApiError com detail em resposta 401', async () => {
  await assert.rejects(
    () =>
      djangoFetch('/api/v1/accounts/me/', {
        method: 'GET',
        fetchImpl: async () =>
          new Response(JSON.stringify({ detail: 'Credenciais invalidas.' }), { status: 401 }),
      }),
    (error: unknown) => {
      assert.ok(error instanceof DjangoApiError)
      assert.equal(error.status, 401)
      assert.equal(error.message, 'Credenciais invalidas.')
      assert.equal(error.details, null)
      return true
    }
  )
})

test('djangoFetch lanca DjangoApiError com erros de campo em resposta 400', async () => {
  await assert.rejects(
    () =>
      djangoFetch('/api/v1/accounts/login/', {
        method: 'POST',
        body: { email: '', senha: '' },
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              email: ['Este campo nao pode ser vazio.'],
              senha: ['Este campo e obrigatorio.'],
            }),
            { status: 400 }
          ),
      }),
    (error: unknown) => {
      assert.ok(error instanceof DjangoApiError)
      assert.equal(error.status, 400)
      assert.equal(error.message, 'Este campo nao pode ser vazio.')
      assert.deepEqual(error.details, {
        email: ['Este campo nao pode ser vazio.'],
        senha: ['Este campo e obrigatorio.'],
      })
      return true
    }
  )
})
