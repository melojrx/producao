import assert from 'node:assert/strict'
import test from 'node:test'

const moduloFlagsUrl = new URL('./flags.ts', import.meta.url)
const {
  FLAG_POR_MODULO,
  estaUsandoDjango,
  obterFlagsDjangoCutover,
  deveUsarSupabaseBrowser,
  deveUsarRealtimeSupabaseDashboard,
}: typeof import('./flags') = await import(moduloFlagsUrl.href)

type ModuloDjangoCutover = keyof typeof FLAG_POR_MODULO

const MODULOS = Object.keys(FLAG_POR_MODULO) as ModuloDjangoCutover[]
const TODAS_FLAGS = Object.values(FLAG_POR_MODULO)

function salvarEnvFlags(): Record<string, string | undefined> {
  const snapshot: Record<string, string | undefined> = {}
  for (const nomeEnv of TODAS_FLAGS) {
    snapshot[nomeEnv] = process.env[nomeEnv]
  }
  return snapshot
}

function restaurarEnvFlags(snapshot: Record<string, string | undefined>): void {
  for (const nomeEnv of TODAS_FLAGS) {
    const valor = snapshot[nomeEnv]
    if (valor === undefined) {
      delete process.env[nomeEnv]
    } else {
      process.env[nomeEnv] = valor
    }
  }
}

function limparEnvFlags(): void {
  for (const nomeEnv of TODAS_FLAGS) {
    delete process.env[nomeEnv]
  }
}

test('estaUsandoDjango retorna false quando env ausente', () => {
  const snapshot = salvarEnvFlags()
  limparEnvFlags()

  for (const modulo of MODULOS) {
    assert.equal(estaUsandoDjango(modulo), false, `modulo ${modulo} deveria estar OFF`)
  }

  restaurarEnvFlags(snapshot)
})

test('estaUsandoDjango retorna false para valores falsos explicitos', () => {
  const snapshot = salvarEnvFlags()
  const valoresFalsos = ['false', '0', 'off', '', '   ', 'no', 'random']

  for (const valor of valoresFalsos) {
    limparEnvFlags()
    process.env.NEXT_PUBLIC_USE_DJANGO_AUTH = valor
    assert.equal(estaUsandoDjango('auth'), false, `valor "${valor}" deveria ser false`)
  }

  restaurarEnvFlags(snapshot)
})

test('estaUsandoDjango retorna true para valores verdadeiros explicitos', () => {
  const snapshot = salvarEnvFlags()
  const valoresVerdadeiros = ['true', '1', 'yes', 'TRUE', ' Yes ']

  for (const valor of valoresVerdadeiros) {
    limparEnvFlags()
    process.env.NEXT_PUBLIC_USE_DJANGO_AUTH = valor
    assert.equal(estaUsandoDjango('auth'), true, `valor "${valor}" deveria ser true`)
  }

  restaurarEnvFlags(snapshot)
})

test('cada modulo le a env var correta', () => {
  const snapshot = salvarEnvFlags()
  limparEnvFlags()

  for (const modulo of MODULOS) {
    const nomeEnv = FLAG_POR_MODULO[modulo]
    process.env[nomeEnv] = 'true'

    for (const outroModulo of MODULOS) {
      const esperado = outroModulo === modulo
      assert.equal(
        estaUsandoDjango(outroModulo),
        esperado,
        `${outroModulo} deveria ser ${esperado} quando apenas ${nomeEnv}=true`
      )
    }

    delete process.env[nomeEnv]
  }

  restaurarEnvFlags(snapshot)
})

test('obterFlagsDjangoCutover reflete estado atual de todas as flags', () => {
  const snapshot = salvarEnvFlags()
  limparEnvFlags()
  process.env.NEXT_PUBLIC_USE_DJANGO_SCANNER_READS = 'true'
  process.env.NEXT_PUBLIC_USE_DJANGO_AUTH = 'yes'

  const flags = obterFlagsDjangoCutover()

  assert.equal(flags.scanner_reads, true)
  assert.equal(flags.auth, true)
  assert.equal(flags.cadastros_reads, false)
  assert.equal(flags.metas_reads, false)
  assert.equal(flags.dashboard_reads, false)
  assert.equal(flags.admin_writes, false)
  assert.equal(flags.producao_writes, false)
  assert.equal(flags.qualidade_writes, false)

  restaurarEnvFlags(snapshot)
})

test('deveUsarSupabaseBrowser retorna false quando cutover completo', () => {
  const snapshot = salvarEnvFlags()
  limparEnvFlags()
  for (const nomeEnv of TODAS_FLAGS) {
    process.env[nomeEnv] = 'true'
  }
  assert.equal(deveUsarSupabaseBrowser(), false)
  assert.equal(deveUsarRealtimeSupabaseDashboard(), false)
  restaurarEnvFlags(snapshot)
})

test('deveUsarSupabaseBrowser retorna true quando alguma flag OFF', () => {
  const snapshot = salvarEnvFlags()
  limparEnvFlags()
  for (const nomeEnv of TODAS_FLAGS) {
    process.env[nomeEnv] = 'true'
  }
  delete process.env.NEXT_PUBLIC_USE_DJANGO_AUTH
  assert.equal(deveUsarSupabaseBrowser(), true)
  restaurarEnvFlags(snapshot)
})

test('estaUsandoDjango no servidor usa USE_DJANGO_* em runtime quando NEXT_PUBLIC OFF', () => {
  const snapshot = salvarEnvFlags()
  limparEnvFlags()
  process.env.NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS = 'false'
  process.env.USE_DJANGO_CADASTROS_READS = 'true'

  assert.equal(estaUsandoDjango('cadastros_reads'), true)

  restaurarEnvFlags(snapshot)
  delete process.env.USE_DJANGO_CADASTROS_READS
})
