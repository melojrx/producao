import { fileURLToPath } from 'node:url'

const TIMEOUT_HEALTH_MS = 5_000

// Executado na imagem standalone; não depende de pacotes nem contém credenciais.
export async function verificarIntegracaoFrontend({
  frontendUrl = 'http://127.0.0.1:3000',
  apiUrl = process.env.DJANGO_API_URL,
  internalHttps = process.env.DJANGO_INTERNAL_API_HTTPS === 'true',
} = {}) {
  if (!apiUrl) throw new Error('DJANGO_API_URL ausente no frontend')
  const headers = internalHttps && new URL(apiUrl).protocol === 'http:'
    ? { 'X-Forwarded-Proto': 'https' } : {}
  const frontend = await fetch(frontendUrl, {
    redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_HEALTH_MS),
  })
  if (frontend.status !== 200 && frontend.status !== 307) {
    throw new Error(`Frontend retornou ${frontend.status}`)
  }
  await frontend.body?.cancel()
  const health = await fetch(new URL('/health/', apiUrl), {
    headers, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_HEALTH_MS),
  })
  if (health.status !== 200) throw new Error(`Django health retornou ${health.status}`)
  const payload = await health.json()
  if (payload.status !== 'ok' || payload.database !== 'ok') {
    throw new Error('Django ou banco indisponível')
  }
  const auth = await fetch(new URL('/api/v1/accounts/me/', apiUrl), {
    headers, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_HEALTH_MS),
  })
  if (auth.status !== 401) throw new Error(`Fronteira JWT retornou ${auth.status}`)
  await auth.body?.cancel()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verificarIntegracaoFrontend().then(() => {
    process.stdout.write('Frontend, Django, banco e fronteira JWT: OK\n')
  }).catch((error) => {
    process.stderr.write(`Health integrado falhou: ${error.message}\n`)
    process.exitCode = 1
  })
}
