#!/usr/bin/env node
/**
 * Smoke test da stack dev Docker (MDJ-17).
 * Carrega .env.local e valida health, auth Supabase e paginas admin.
 * Credenciais: SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD ou defaults de docs/AUTH.md
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(import.meta.dirname, '..')
const ENV_PATH = resolve(ROOT, '.env.local')

function carregarEnvLocal() {
  const env = {}
  try {
    const conteudo = readFileSync(ENV_PATH, 'utf8')
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
  } catch {
    console.error('ERRO: .env.local nao encontrado em', ENV_PATH)
    process.exit(1)
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
  const env = carregarEnvLocal()
  const resultados = []

  function ok(nome, detalhe) {
    resultados.push({ nome, ok: true, detalhe })
    console.log(`OK  ${nome} — ${detalhe}`)
  }

  function falha(nome, detalhe) {
    resultados.push({ nome, ok: false, detalhe })
    console.error(`FAIL ${nome} — ${detalhe}`)
  }

  const djangoUrl = env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8001'
  const frontendUrl = env.SMOKE_FRONTEND_URL || 'http://localhost:3000'
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const email = env.SMOKE_ADMIN_EMAIL || 'codex.admin@example.com'
  const senha = env.SMOKE_ADMIN_PASSWORD || 'CodexAdmin#2026'
  const authDjango = flagAtiva(env, 'NEXT_PUBLIC_USE_DJANGO_AUTH')

  // 1. Health backend
  try {
    const res = await fetch(`${djangoUrl}/health/`)
    const body = await res.json()
    if (res.ok && body.status === 'ok' && body.database === 'ok') {
      ok('backend-health', JSON.stringify(body))
    } else {
      falha('backend-health', `status ${res.status} body=${JSON.stringify(body)}`)
    }
  } catch (error) {
    falha('backend-health', String(error))
  }

  // 2. Frontend login publico
  try {
    const { status } = await checarHttp(`${frontendUrl}/login`)
    if (status === 200) ok('frontend-login', `HTTP ${status}`)
    else falha('frontend-login', `HTTP ${status}`)
  } catch (error) {
    falha('frontend-login', String(error))
  }

  // 3. Admin protegido sem sessao
  try {
    const { status, headers } = await checarHttp(`${frontendUrl}/admin/dashboard`)
    const location = headers.get('location') ?? ''
    if (status === 307 || status === 302) {
      ok('admin-redirect-sem-sessao', `HTTP ${status} → ${location}`)
    } else {
      falha('admin-redirect-sem-sessao', `HTTP ${status} (esperado redirect login)`)
    }
  } catch (error) {
    falha('admin-redirect-sem-sessao', String(error))
  }

  // 4. Auth path conforme flags
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
        ok('django-login', `usuario ${body.user?.email ?? email}`)
      } else {
        falha('django-login', body.detail ?? JSON.stringify(body))
      }
    } catch (error) {
      falha('django-login', String(error))
    }

    if (accessToken) {
      const authHeader = { Authorization: `Bearer ${accessToken}` }
      for (const [nome, path] of [
        ['django-me', '/api/v1/accounts/me/'],
        ['django-setores', '/api/v1/cadastros/setores/'],
        ['django-operadores', '/api/v1/cadastros/operadores/'],
        ['django-produtos', '/api/v1/produtos/'],
      ]) {
        try {
          const res = await fetch(`${djangoUrl}${path}`, { headers: authHeader })
          if (res.ok) {
            const body = await res.json()
            const total = Array.isArray(body) ? body.length : body?.count ?? 'ok'
            ok(nome, `HTTP ${res.status} items=${total}`)
          } else {
            falha(nome, `HTTP ${res.status}`)
          }
        } catch (error) {
          falha(nome, String(error))
        }
      }
    }
  } else {
    if (!supabaseUrl || !supabaseAnon) {
      falha('supabase-login', 'NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes no .env.local')
    } else {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnon, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error || !data.session) {
          falha('supabase-login', error?.message ?? 'sessao ausente')
        } else {
          ok('supabase-login', `usuario ${data.user?.email ?? email}`)
          const role =
            data.user?.app_metadata?.role ?? data.user?.user_metadata?.role ?? '(sem role metadata)'
          ok('supabase-role', String(role))
        }
      } catch (error) {
        falha('supabase-login', String(error))
      }
    }
  }

  const falhas = resultados.filter((r) => !r.ok)
  console.log('')
  console.log(`Smoke concluido: ${resultados.length - falhas.length}/${resultados.length} OK`)
  if (falhas.length > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
