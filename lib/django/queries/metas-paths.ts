/** Sufixo canônico registrado em backend/metas/urls.py; evita APPEND_SLASH. */
export function construirCaminhoResumoMetas(competencia: string): string {
  return `/resumo/?competencia=${encodeURIComponent(competencia)}`
}
