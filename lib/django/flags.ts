export const VALORES_VERDADEIROS_DJANGO = new Set(['1', 'true', 'yes'])

export type ModuloDjangoCutover =
  | 'scanner_reads'
  | 'cadastros_reads'
  | 'metas_reads'
  | 'dashboard_reads'
  | 'auth'
  | 'admin_writes'
  | 'producao_writes'
  | 'qualidade_writes'

export const FLAG_POR_MODULO: Record<ModuloDjangoCutover, string> = {
  scanner_reads: 'NEXT_PUBLIC_USE_DJANGO_SCANNER_READS',
  cadastros_reads: 'NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS',
  metas_reads: 'NEXT_PUBLIC_USE_DJANGO_METAS_READS',
  dashboard_reads: 'NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS',
  auth: 'NEXT_PUBLIC_USE_DJANGO_AUTH',
  admin_writes: 'NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES',
  producao_writes: 'NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES',
  qualidade_writes: 'NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES',
}

/** Flags server-side (runtime Docker). Corrigem SSR quando NEXT_PUBLIC_* foi embutido OFF no build. */
export const FLAG_RUNTIME_SERVIDOR_POR_MODULO: Record<ModuloDjangoCutover, string> = {
  scanner_reads: 'USE_DJANGO_SCANNER_READS',
  cadastros_reads: 'USE_DJANGO_CADASTROS_READS',
  metas_reads: 'USE_DJANGO_METAS_READS',
  dashboard_reads: 'USE_DJANGO_DASHBOARD_READS',
  auth: 'USE_DJANGO_AUTH',
  admin_writes: 'USE_DJANGO_ADMIN_WRITES',
  producao_writes: 'USE_DJANGO_PRODUCAO_WRITES',
  qualidade_writes: 'USE_DJANGO_QUALIDADE_WRITES',
}

function lerFlagBooleana(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  const normalizado = value.trim().toLowerCase()
  return VALORES_VERDADEIROS_DJANGO.has(normalizado)
}

function lerFlagModulo(nomeEnv: string | undefined): boolean {
  return lerFlagBooleana(nomeEnv)
}

function estaUsandoDjangoNoServidor(modulo: ModuloDjangoCutover): boolean {
  const flagRuntime = FLAG_RUNTIME_SERVIDOR_POR_MODULO[modulo]
  if (lerFlagModulo(process.env[flagRuntime])) {
    return true
  }

  return lerFlagModulo(process.env[FLAG_POR_MODULO[modulo]])
}

export function estaUsandoDjango(modulo: ModuloDjangoCutover): boolean {
  if (typeof window === 'undefined') {
    return estaUsandoDjangoNoServidor(modulo)
  }

  return lerFlagModulo(process.env[FLAG_POR_MODULO[modulo]])
}

export function obterFlagsDjangoCutover(): Record<ModuloDjangoCutover, boolean> {
  return {
    scanner_reads: estaUsandoDjango('scanner_reads'),
    cadastros_reads: estaUsandoDjango('cadastros_reads'),
    metas_reads: estaUsandoDjango('metas_reads'),
    dashboard_reads: estaUsandoDjango('dashboard_reads'),
    auth: estaUsandoDjango('auth'),
    admin_writes: estaUsandoDjango('admin_writes'),
    producao_writes: estaUsandoDjango('producao_writes'),
    qualidade_writes: estaUsandoDjango('qualidade_writes'),
  }
}

const MODULOS_CUTOVER_COMPLETO: ModuloDjangoCutover[] = [
  'scanner_reads',
  'cadastros_reads',
  'metas_reads',
  'dashboard_reads',
  'auth',
  'admin_writes',
  'producao_writes',
  'qualidade_writes',
]

/** Quando false, o browser nao deve abrir Realtime nem refresh Supabase Auth (MDJ-19). */
export function deveUsarSupabaseBrowser(): boolean {
  return !MODULOS_CUTOVER_COMPLETO.every((modulo) => estaUsandoDjango(modulo))
}

/** Dashboard V2: substituir Realtime Supabase por polling Django quando leitura de turno via API. */
export function deveUsarRealtimeSupabaseDashboard(): boolean {
  return !estaUsandoDjango('dashboard_reads')
}
