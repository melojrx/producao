#!/usr/bin/env node
/**
 * Reproduz SSR de /admin/apontamentos?aba=operacao_turno no ambiente local.
 * Uso: node scripts/repro-apontamentos-500.mjs [--encerrar-turno]
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

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

const envLocal = parseEnvFile(resolve(ROOT, '.env.local'))
const envShared = parseEnvFile(resolve(ROOT, '.env'))
const env = { ...envShared, ...envLocal }

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
  const partes = [`django_access_token=${access}`, `django_refresh_token=${refresh}`]
  return partes.join('; ')
}

async function fetchAutenticado(path, tokens, init = {}) {
  return fetch(`${frontendUrl}${path}`, {
    ...init,
    redirect: 'manual',
    headers: {
      ...(init.headers ?? {}),
      Cookie: montarCookieHeader(tokens.access, tokens.refresh),
      Accept: 'text/html,application/xhtml+xml',
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

async function abrirTurnoNovo(tokens) {
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
  console.log(`abrir turno ${numeroOp}: HTTP ${res.status}`, texto.slice(0, 300))
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
    const preview = texto.replace(/\s+/g, ' ').slice(0, 160)
    console.log(`${res.status === 200 ? 'OK' : 'FAIL'} ${path} → HTTP ${res.status} (${texto.length} bytes)`)
    if (res.status !== 200) {
      console.log('  preview:', preview)
    }
    if (texto.includes('Application error') || texto.includes('digest')) {
      console.log('  possível erro RSC no HTML')
    }
  }
}

async function main() {
  console.log(`frontend=${frontendUrl} django=${djangoUrl}`)
  const tokens = await loginDjango()
  console.log('login OK')

  let turnoAberto = await obterTurnoAberto(tokens)
  console.log('turno aberto:', turnoAberto?.id ?? 'nenhum')

  if (abrirTurno && !turnoAberto) {
    turnoAberto = await abrirTurnoNovo(tokens)
    console.log('turno aberto após abrir:', turnoAberto?.id ?? 'falhou')
  }

  if (cicloCompleto) {
    if (!turnoAberto?.id) {
      turnoAberto = await abrirTurnoNovo(tokens)
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
