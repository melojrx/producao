#!/usr/bin/env node
/**
 * MDJ-19 — Verifica flags Django no ambiente local (.env) antes do checklist de desligamento Supabase.
 * Nao valida VPS remotamente; use smoke-stack-prod.mjs contra producao.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')

const FLAGS = [
  'NEXT_PUBLIC_USE_DJANGO_AUTH',
  'NEXT_PUBLIC_USE_DJANGO_SCANNER_READS',
  'NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS',
  'NEXT_PUBLIC_USE_DJANGO_METAS_READS',
  'NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS',
  'NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES',
  'NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES',
  'NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES',
]

const FLAGS_RUNTIME_SERVIDOR = FLAGS.map((flag) => flag.replace('NEXT_PUBLIC_', ''))

function parseEnvFile(path) {
  const env = {}
  if (!existsSync(path)) {
    return env
  }

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

const env = {
  ...parseEnvFile(resolve(ROOT, '.env')),
  ...parseEnvFile(resolve(ROOT, '.env.local')),
}

let falhas = 0

for (const flag of FLAGS) {
  const ativa = flagAtiva(env, flag)
  if (ativa) {
    console.log(`OK  ${flag}`)
  } else {
    console.error(`OFF ${flag}`)
    falhas += 1
  }
}

for (const flag of FLAGS_RUNTIME_SERVIDOR) {
  const ativa = flagAtiva(env, flag)
  if (ativa) {
    console.log(`OK  ${flag} (runtime SSR)`)
  } else {
    console.error(`OFF ${flag} (runtime SSR) — adicione ao .env da VPS para corrigir SSR sem rebuild`)
    falhas += 1
  }
}

console.log('')
if (falhas === 0) {
  const total = FLAGS.length + FLAGS_RUNTIME_SERVIDOR.length
  console.log(`MDJ-19 flags: ${total}/${total} ON`)
} else {
  const total = FLAGS.length + FLAGS_RUNTIME_SERVIDOR.length
  console.error(`MDJ-19 flags: ${total - falhas}/${total} ON — cutover incompleto`)
  process.exit(1)
}
