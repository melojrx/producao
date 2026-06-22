#!/usr/bin/env node
/**
 * Smoke test da stack producao Docker (MDJ-18).
 * Requer stack no ar: docker compose -f docker-compose.prod.yml up -d
 * Carrega `.env.local` (dev) e depois `.env` (prod local) — **`.env` prevalece**.
 * API e base URL do smoke usam sempre o proxy (`PROD_HTTP_PORT`, default 8080).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

function parseEnvFile(path) {
  const env = {}
  if (!existsSync(path)) {
    return env
  }

  const conteudo = readFileSync(path, 'utf8')
  for (const linha of conteudo.split('\n')) {
    const trimmed = linha.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const chave = trimmed.slice(0, idx).trim()
    let valor = trimmed.slice(idx + 1).trim()
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1)
    }
    env[chave] = valor
  }
  return env
}

function flagAtiva(env, nome) {
  const valor = env[nome]
  return valor === 'true' || valor === '1'
}

async function checarHttp(url, opcoes = {}) {
  const resposta = await fetch(url, { redirect: 'manual', ...opcoes })
  return { status: resposta.status, headers: resposta.headers }
}

async function main() {
  const env = {
    ...parseEnvFile(resolve(ROOT, '.env.local')),
    ...parseEnvFile(resolve(ROOT, '.env')),
  }

  const resultados = []

  function ok(nome, detalhe) {
    resultados.push({ nome, ok: true, detalhe })
    console.log(`OK  ${nome} — ${detalhe}`)
  }

  function falha(nome, detalhe) {
    resultados.push({ nome, ok: false, detalhe })
    console.error(`FAIL ${nome} — ${detalhe}`)
  }

  const baseUrl = env.SMOKE_PROD_BASE_URL || `http://localhost:${env.PROD_HTTP_PORT || '8080'}`
  const djangoUrl = baseUrl
  const email = env.SMOKE_ADMIN_EMAIL || 'codex.admin@example.com'
  const senha = env.SMOKE_ADMIN_PASSWORD || 'CodexAdmin#2026'
  const authDjango = flagAtiva(env, 'NEXT_PUBLIC_USE_DJANGO_AUTH')

  try {
    const res = await fetch(`${baseUrl}/health/`)
    const body = await res.json()
    if (res.ok && body.status === 'ok' && body.database === 'ok') {
      ok('proxy-health', JSON.stringify(body))
    } else {
      falha('proxy-health', `status ${res.status} body=${JSON.stringify(body)}`)
    }
  } catch (error) {
    falha('proxy-health', String(error))
  }

  try {
    const res = await fetch(`${djangoUrl}/api/v1/cadastros/setores/`)
    if (res.status === 401 || res.status === 403) {
      ok('api-via-proxy', `HTTP ${res.status} (auth exigida — roteamento OK)`)
    } else if (res.ok) {
      ok('api-via-proxy', `HTTP ${res.status}`)
    } else {
      falha('api-via-proxy', `HTTP ${res.status}`)
    }
  } catch (error) {
    falha('api-via-proxy', String(error))
  }

  try {
    const { status } = await checarHttp(`${baseUrl}/login`)
    if (status === 200) ok('frontend-login', `HTTP ${status}`)
    else falha('frontend-login', `HTTP ${status}`)
  } catch (error) {
    falha('frontend-login', String(error))
  }

  try {
    const { status, headers } = await checarHttp(`${baseUrl}/admin/dashboard`)
    const location = headers.get('location') ?? ''
    if (status === 307 || status === 302) {
      ok('admin-redirect-sem-sessao', `HTTP ${status} → ${location}`)
    } else {
      falha('admin-redirect-sem-sessao', `HTTP ${status}`)
    }
  } catch (error) {
    falha('admin-redirect-sem-sessao', String(error))
  }

  if (authDjango) {
    let accessToken = ''
    try {
      const res = await fetch(`${djangoUrl}/api/v1/accounts/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const body = await res.json()
      if (res.ok && body.access) {
        accessToken = body.access
        ok('django-login-via-proxy', `usuario ${body.user?.email ?? email}`)
      } else {
        falha('django-login-via-proxy', body.detail ?? JSON.stringify(body))
      }
    } catch (error) {
      falha('django-login-via-proxy', String(error))
    }

    const cutover = flagAtiva(env, 'SMOKE_CUTOVER') || flagAtiva(env, 'NEXT_PUBLIC_USE_DJANGO_SCANNER_READS')
    if (cutover && accessToken) {
      const authHeader = { Authorization: `Bearer ${accessToken}` }
      for (const [nome, path] of [
        ['cutover-setores', '/api/v1/cadastros/setores/'],
        ['cutover-turnos', '/api/v1/turnos/'],
        ['cutover-dashboard', '/api/v1/relatorios/dashboard/'],
      ]) {
        try {
          const res = await fetch(`${djangoUrl}${path}`, { headers: authHeader })
          if (res.ok) {
            const body = await res.json()
            const total = Array.isArray(body) ? body.length : 'ok'
            ok(nome, `HTTP ${res.status} items=${total}`)
          } else {
            falha(nome, `HTTP ${res.status}`)
          }
        } catch (error) {
          falha(nome, String(error))
        }
      }

      const operadorToken = env.SMOKE_SCANNER_OPERADOR_TOKEN
      if (operadorToken) {
        try {
          const res = await fetch(`${djangoUrl}/api/v1/scanner/operador/${operadorToken}/`)
          if (res.ok) {
            const body = await res.json()
            ok('cutover-scanner-operador', body.nome ?? 'operador ok')
          } else {
            falha('cutover-scanner-operador', `HTTP ${res.status}`)
          }
        } catch (error) {
          falha('cutover-scanner-operador', String(error))
        }
      } else {
        ok('cutover-scanner-operador', 'SKIP — defina SMOKE_SCANNER_OPERADOR_TOKEN no .env')
      }

      try {
        const turnosRes = await fetch(`${djangoUrl}/api/v1/turnos/`, { headers: authHeader })
        if (!turnosRes.ok) {
          falha('cutover-producao-registros', `turnos HTTP ${turnosRes.status}`)
        } else {
          const turnos = await turnosRes.json()
          const turnoAlvo = Array.isArray(turnos)
            ? (turnos.find((turno) => turno.status === 'aberto') ?? turnos[0])
            : null
          const turnoId = turnoAlvo?.id

          if (!turnoId) {
            ok('cutover-producao-registros', 'SKIP — nenhum turno no banco')
          } else {
            const regRes = await fetch(
              `${djangoUrl}/api/v1/producao/registros/?turno=${encodeURIComponent(turnoId)}`,
              { headers: authHeader }
            )
            if (regRes.ok) {
              const registros = await regRes.json()
              const total = Array.isArray(registros) ? registros.length : 'ok'
              ok('cutover-producao-registros', `turno=${turnoId} items=${total}`)
            } else {
              falha('cutover-producao-registros', `HTTP ${regRes.status}`)
            }
          }
        }
      } catch (error) {
        falha('cutover-producao-registros', String(error))
      }

      const mediaPath = env.SMOKE_MEDIA_PATH?.trim()
      if (mediaPath) {
        try {
          const urlMedia = mediaPath.startsWith('http')
            ? mediaPath
            : `${baseUrl}${mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`}`
          const { status } = await checarHttp(urlMedia)
          if (status === 200) {
            ok('cutover-media', `HTTP ${status}`)
          } else {
            falha('cutover-media', `HTTP ${status}`)
          }
        } catch (error) {
          falha('cutover-media', String(error))
        }
      } else {
        ok('cutover-media', 'SKIP — defina SMOKE_MEDIA_PATH para spot-check de midia')
      }
    }
  } else {
    ok('django-login-via-proxy', 'SKIP — NEXT_PUBLIC_USE_DJANGO_AUTH=false')
  }

  const falhas = resultados.filter((r) => !r.ok)
  console.log('')
  console.log(`Smoke producao: ${resultados.length - falhas.length}/${resultados.length} OK`)
  if (falhas.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
