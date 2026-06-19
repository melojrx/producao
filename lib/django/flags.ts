const VALORES_VERDADEIROS_DJANGO = new Set(['1', 'true', 'yes'])

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

function lerFlagBooleana(value: string | undefined): boolean {
  if (!value) {
    return false
  }

  const normalizado = value.trim().toLowerCase()
  return VALORES_VERDADEIROS_DJANGO.has(normalizado)
}

export function estaUsandoDjango(modulo: ModuloDjangoCutover): boolean {
  const nomeEnv = FLAG_POR_MODULO[modulo]
  return lerFlagBooleana(process.env[nomeEnv])
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
