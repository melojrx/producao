#!/usr/bin/env node
/**
 * Reproduz SSR e POST de /admin/apontamentos no ambiente local ou producao.
 *
 * Uso:
 *   node scripts/repro-apontamentos-500.mjs
 *   node scripts/repro-apontamentos-500.mjs --ciclo
 *   node scripts/repro-apontamentos-500.mjs --diagnostico-env
 *   node scripts/repro-apontamentos-500.mjs --post-actions
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

const FLAGS_DJANGO = [
  'NEXT_PUBLIC_USE_DJANGO_AUTH',
  'NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES',
  'NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES',
  'NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS',
  'NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS',
]

const FLAGS_RUNTIME = FLAGS_DJANGO.map((flag) => flag.replace('NEXT_PUBLIC_', ''))

function parseEnvFile(path) {
  const env = {}
  if (!existsSync(path)) return env
  for (const linha of readFileSync(path, 'utf8').split('\n')) {
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

const envLocal = parseEnvFile(resolve(ROOT, '.env.local'))
const envShared = parseEnvFile(resolve(ROOT, '.env'))
const env = { ...envShared, ...envLocal, ...process.env }

const djangoUrl =
  process.env.NEXT_PUBLIC_DJANGO_API_URL ||
  envLocal.NEXT_PUBLIC_DJANGO_API_URL ||
  envShared.NEXT_PUBLIC_DJANGO_API_URL ||
  'http://localhost:8001'
const frontendUrl =
  process.env.SMOKE_FRONTEND_URL || envLocal.SMOKE_FRONTEND_URL || 'http://localhost:3000'
const isStackDevLocal =
  djangoUrl.includes('localhost:8001') || djangoUrl.includes('127.0.0.1:8001')
const email =
  process.env.SMOKE_ADMIN_EMAIL ||
  envLocal.SMOKE_ADMIN_EMAIL ||
  (isStackDevLocal ? 'codex.admin@example.com' : envShared.SMOKE_ADMIN_EMAIL) ||
  'codex.admin@example.com'
const senha =
  process.env.SMOKE_ADMIN_PASSWORD ||
  envLocal.SMOKE_ADMIN_PASSWORD ||
  (isStackDevLocal ? 'CodexAdmin#2026' : envShared.SMOKE_ADMIN_PASSWORD) ||
  'CodexAdmin#2026'

const encerrarTurno = process.argv.includes('--encerrar-turno')
const abrirTurno = process.argv.includes('--abrir-turno')
const cicloCompleto = process.argv.includes('--ciclo')
const diagnosticoEnv = process.argv.includes('--diagnostico-env')
const postActions = process.argv.includes('--post-actions')

function executarDiagnosticoEnv() {
  console.log('=== Diagnóstico env (POST vs SSR) ===')
  console.log(`frontend=${frontendUrl}`)
  console.log(`django=${djangoUrl}`)

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? ''
  const supabaseConfigurado = Boolean(supabaseUrl && serviceRole)

  console.log(`NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl ? '[preenchido]' : '[VAZIO]'}`)
  console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRole ? '[preenchido]' : '[AUSENTE]'}`)

  for (const flag of FLAGS_DJANGO) {
    console.log(`${flagAtiva(env, flag) ? 'ON ' : 'OFF'} ${flag}`)
  }

  for (const flag of FLAGS_RUNTIME) {
    console.log(`${flagAtiva(env, flag) ? 'ON ' : 'OFF'} ${flag} (runtime SSR)`)
  }

  const djangoCutoverLeitura =
    flagAtiva(env, 'USE_DJANGO_DASHBOARD_READS') ||
    flagAtiva(env, 'NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS')
  const djangoCutoverEscrita =
    flagAtiva(env, 'USE_DJANGO_ADMIN_WRITES') ||
    flagAtiva(env, 'NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES')

  if (djangoCutoverLeitura && !supabaseConfigurado) {
    console.log('')
    console.log('OK  Leituras SSR via Django sem Supabase (esperado em producao pos-cutover).')
  }

  if (djangoCutoverEscrita && !supabaseConfigurado) {
    console.log(
      'OK  Escritas devem usar Django (abrirTurno/registrarApontamentos) — Supabase admin ausente.'
    )
  }

  if (djangoCutoverEscrita && supabaseConfigurado) {
    console.log('INFO Stack hibrida: Django writes + Supabase ainda configurado.')
  }

  if (!djangoCutoverEscrita && !supabaseConfigurado) {
    console.log('')
    console.log(
      'RISCO POST 500: flags Django OFF e Supabase admin ausente — createAdminClient() lança exceção.'
    )
  }

  console.log('')
  console.log('No DevTools (Network), POST de Server Action usa header Next-Action na mesma rota.')
  console.log('Se POST retorna 500 e GET ?_rsc= também, verifique logs do container frontend.')
}

async function loginDjango() {
  const res = await fetch(`${djangoUrl}/api/v1/accounts/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
  const body = await res.json()
  if (!res.ok || !body.access) {
    throw new Error(`Login falhou: ${JSON.stringify(body)}`)
  }
  return { access: body.access, refresh: body.refresh }
}

function montarCookieHeader(access, refresh) {
  return [`django_access_token=${access}`, `django_refresh_token=${refresh}`].join('; ')
}

async function fetchAutenticado(path, tokens, init = {}) {
  return fetch(`${frontendUrl}${path}`, {
    ...init,
    redirect: 'manual',
    headers: {
      ...(init.headers ?? {}),
      Cookie: montarCookieHeader(tokens.access, tokens.refresh),
      Accept: init.headers?.Accept ?? 'text/html,application/xhtml+xml',
    },
  })
}

async function obterTurnoAberto(tokens) {
  const res = await fetch(`${djangoUrl}/api/v1/turnos/aberto/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    const texto = await res.text()
    throw new Error(`turnos/aberto HTTP ${res.status}: ${texto.slice(0, 200)}`)
  }
  return res.json()
}

async function encerrarTurnoAberto(tokens, turnoId) {
  const res = await fetch(`${djangoUrl}/api/v1/turnos/${turnoId}/encerrar/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })
  const texto = await res.text()
  console.log(`encerrar turno ${turnoId}: HTTP ${res.status}`, texto.slice(0, 300))
  return res.ok
}

async function abrirTurnoViaApiDjango(tokens) {
  const produtosRes = await fetch(`${djangoUrl}/api/v1/produtos/`, {
    headers: { Authorization: `Bearer ${tokens.access}` },
  })
  const produtos = await produtosRes.json()
  const produto = produtos[0]
  if (!produto?.id) {
    throw new Error('Nenhum produto disponível para abrir turno de teste')
  }

  const numeroOp = `TEST-${Date.now()}`
  const res = await fetch(`${djangoUrl}/api/v1/turnos/abrir/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.access}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      operadores_disponiveis: 18,
      minutos_turno: 510,
      ops: [{ numero_op: numeroOp, produto_id: produto.id, quantidade_planejada: 50 }],
    }),
  })
  const texto = await res.text()
  console.log(`POST API Django abrir turno ${numeroOp}: HTTP ${res.status}`, texto.slice(0, 300))
  if (!res.ok) return null
  return JSON.parse(texto)
}

async function testarPaginas(tokens, rotulo = '') {
  const paths = [
    '/admin/apontamentos?aba=operacao_turno',
    '/admin/apontamentos?aba=gestao_mensal',
    '/admin/apontamentos?aba=qualidade_turno',
  ]

  if (rotulo) {
    console.log(`--- ${rotulo} ---`)
  }

  for (const path of paths) {
    const res = await fetchAutenticado(path, tokens)
    const texto = await res.text()
    console.log(
      `${res.status === 200 ? 'OK' : 'FAIL'} GET ${path} → HTTP ${res.status} (${texto.length} bytes)`
    )
    if (res.status !== 200) {
      console.log('  preview:', texto.replace(/\s+/g, ' ').slice(0, 160))
    }
    if (texto.includes('Application error') || texto.includes('digest')) {
      console.log('  possível erro RSC no HTML')
    }
  }
}

async function testarRefreshRscAposPost(tokens) {
  console.log('--- refresh RSC após POST (simula router.refresh) ---')
  const path = '/admin/apontamentos?aba=operacao_turno'
  const res = await fetchAutenticado(path, tokens, {
    headers: {
      Accept: 'text/x-component',
      RSC: '1',
    },
  })
  const texto = await res.text()
  console.log(
    `${res.status === 200 ? 'OK' : 'FAIL'} RSC ${path} → HTTP ${res.status} (${texto.length} bytes)`
  )
  if (res.status !== 200) {
    console.log('  preview:', texto.replace(/\s+/g, ' ').slice(0, 160))
  }
}

async function executarPostActions() {
  executarDiagnosticoEnv()
  console.log('=== Matriz POST ===')

  const tokens = await loginDjango()
  console.log('login Django OK')

  const turnoAntes = await obterTurnoAberto(tokens)
  console.log('turno aberto antes:', turnoAntes?.id ?? 'nenhum')

  const turnoCriado = await abrirTurnoViaApiDjango(tokens)
  if (!turnoCriado?.id) {
    console.log('FAIL POST API Django abrir turno')
    process.exitCode = 1
    return
  }

  await testarPaginas(tokens, 'GET SSR após POST abrir turno')
  await testarRefreshRscAposPost(tokens)

  await encerrarTurnoAberto(tokens, turnoCriado.id)
  await testarPaginas(tokens, 'GET SSR após encerrar turno')

  console.log('')
  console.log(
    'Server Actions (abrirTurnoFormulario, registrarApontamentosSupervisor) usam Django quando'
  )
  console.log('USE_DJANGO_ADMIN_WRITES / USE_DJANGO_PRODUCAO_WRITES estão ON no container frontend.')
}

async function main() {
  if (diagnosticoEnv) {
    executarDiagnosticoEnv()
    return
  }

  if (postActions) {
    await executarPostActions()
    return
  }

  console.log(`frontend=${frontendUrl} django=${djangoUrl}`)
  const tokens = await loginDjango()
  console.log('login OK')

  let turnoAberto = await obterTurnoAberto(tokens)
  console.log('turno aberto:', turnoAberto?.id ?? 'nenhum')

  if (abrirTurno && !turnoAberto) {
    turnoAberto = await abrirTurnoViaApiDjango(tokens)
    console.log('turno aberto após abrir:', turnoAberto?.id ?? 'falhou')
  }

  if (cicloCompleto) {
    if (!turnoAberto?.id) {
      turnoAberto = await abrirTurnoViaApiDjango(tokens)
    }
    await testarPaginas(tokens, 'com turno aberto')
    if (turnoAberto?.id) {
      await encerrarTurnoAberto(tokens, turnoAberto.id)
    }
    await testarPaginas(tokens, 'após encerrar turno')
    return
  }

  if (encerrarTurno && turnoAberto?.id) {
    await encerrarTurnoAberto(tokens, turnoAberto.id)
  }

  await testarPaginas(tokens)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
