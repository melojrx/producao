import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { once } from 'node:events'

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

test('SSR autorizado comunica por HTTP privado sem redirecionar POST para HTTPS', async (contexto) => {
  const envUrl = process.env.DJANGO_API_URL
  const envHttps = process.env.DJANGO_INTERNAL_API_HTTPS
  const servidor = createServer((request, response) => {
    if (request.headers['x-forwarded-proto'] !== 'https') {
      response.writeHead(301, { Location: '/redirecionamento-indevido/' }).end()
      return
    }
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ metodo: request.method, protocolo: 'https' }))
  })
  contexto.after(async () => {
    if (envUrl === undefined) delete process.env.DJANGO_API_URL
    else process.env.DJANGO_API_URL = envUrl
    if (envHttps === undefined) delete process.env.DJANGO_INTERNAL_API_HTTPS
    else process.env.DJANGO_INTERNAL_API_HTTPS = envHttps
    servidor.closeAllConnections()
    await new Promise<void>((resolve) => servidor.close(() => resolve()))
  })
  servidor.listen(0, '127.0.0.1')
  await once(servidor, 'listening')
  const endereco = servidor.address()
  assert.ok(endereco && typeof endereco !== 'string')
  process.env.DJANGO_API_URL = `http://127.0.0.1:${endereco.port}`
  process.env.DJANGO_INTERNAL_API_HTTPS = 'true'

  const resposta = await djangoFetch('/api/v1/accounts/login/', {
    method: 'POST',
    body: { email: 'teste@example.com', senha: 'fixture-sem-credencial-real' },
  })
  assert.deepEqual(resposta, { metodo: 'POST', protocolo: 'https' })
})

test('djangoFetch nao segue redirecionamentos nem repassa credenciais a outro destino', async () => {
  await assert.rejects(() => djangoFetch('/api/v1/accounts/login/', {
    method: 'POST',
    fetchImpl: async (_input, init) => {
      assert.equal(init?.redirect, 'manual')
      return new Response(null, { status: 301, headers: { Location: 'https://outro.test/' } })
    },
  }), (error: unknown) => {
    assert.ok(error instanceof DjangoApiError)
    assert.equal(error.status, 301)
    return true
  })
})

test('HTTPS encaminhado fica restrito ao servidor com URL HTTP e flag explicita', async (contexto) => {
  const envUrl = process.env.DJANGO_API_URL
  const envHttps = process.env.DJANGO_INTERNAL_API_HTTPS
  const descriptorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  contexto.after(() => {
    if (envUrl === undefined) delete process.env.DJANGO_API_URL
    else process.env.DJANGO_API_URL = envUrl
    if (envHttps === undefined) delete process.env.DJANGO_INTERNAL_API_HTTPS
    else process.env.DJANGO_INTERNAL_API_HTTPS = envHttps
    if (descriptorWindow) Object.defineProperty(globalThis, 'window', descriptorWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  })
  const semHeaderForcado = async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(new Headers(init?.headers).has('X-Forwarded-Proto'), false)
    assert.ok(init?.signal instanceof AbortSignal)
    return new Response('{}', { status: 200 })
  }
  process.env.DJANGO_API_URL = 'http://producao-api:8000'
  delete process.env.DJANGO_INTERNAL_API_HTTPS
  await djangoFetch('/health/', { fetchImpl: semHeaderForcado })
  process.env.DJANGO_INTERNAL_API_HTTPS = 'true'
  process.env.DJANGO_API_URL = 'https://producao.costurai.com.br'
  await djangoFetch('/health/', { fetchImpl: semHeaderForcado })
  process.env.DJANGO_API_URL = 'http://producao-api:8000'
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} })
  await djangoFetch('/health/', { fetchImpl: semHeaderForcado })
})
