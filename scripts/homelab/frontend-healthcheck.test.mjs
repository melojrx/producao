import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'
import { verificarIntegracaoFrontend } from './frontend-healthcheck.mjs'

async function criarApi(contexto, aceitaHttps) {
  const servidor = createServer((request, response) => {
    if (request.url === '/') {
      response.writeHead(200).end('Frontend disponível')
      return
    }
    if (!aceitaHttps || request.headers['x-forwarded-proto'] !== 'https') {
      response.writeHead(301, { Location: 'https://api-interna:8000/health/' }).end()
      return
    }
    response.setHeader('Content-Type', 'application/json')
    if (request.url === '/api/v1/accounts/me/') {
      response.writeHead(401).end('{"detail":"Authentication required"}')
      return
    }
    response.end('{"status":"ok","database":"ok"}')
  })
  contexto.after(async () => {
    servidor.closeAllConnections()
    await new Promise((resolve) => servidor.close(resolve))
  })
  servidor.listen(0, '127.0.0.1')
  await once(servidor, 'listening')
  const endereco = servidor.address()
  assert.ok(endereco && typeof endereco !== 'string')
  return `http://127.0.0.1:${endereco.port}`
}

test('health integrado aceita API, banco e fronteira JWT pela rede interna', async (contexto) => {
  const apiUrl = await criarApi(contexto, true)
  await verificarIntegracaoFrontend({ frontendUrl: apiUrl, apiUrl, internalHttps: true })
})

test('health integrado falha quando Django redireciona para HTTPS interno', async (contexto) => {
  const apiUrl = await criarApi(contexto, false)
  await assert.rejects(
    verificarIntegracaoFrontend({ frontendUrl: apiUrl, apiUrl, internalHttps: true }),
    /Django health retornou 301/
  )
})
