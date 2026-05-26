export type ApontamentosTabId = 'gestao_mensal' | 'operacao_turno' | 'qualidade_turno'

interface CriarHrefAbaApontamentosInput {
  pathname: string
  search: string
  aba: ApontamentosTabId
}

export function criarHrefAbaApontamentos({
  pathname,
  search,
  aba,
}: CriarHrefAbaApontamentosInput): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  if (aba === 'gestao_mensal') {
    params.delete('aba')
  } else {
    params.set('aba', aba)
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
