import type { DjangoErroDetalhes } from './types.ts'

export const DJANGO_API_URL_PADRAO = 'http://localhost:8001'
export const DJANGO_API_URL_SERVIDOR_PADRAO = DJANGO_API_URL_PADRAO

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function obterUrlPublicaDjangoApi(): string {
  const url = process.env.NEXT_PUBLIC_DJANGO_API_URL?.trim()
  return url || DJANGO_API_URL_PADRAO
}

/** URL da API para fetch server-side (SSR, Server Actions). No Docker usa rede interna. */
export function obterUrlBaseDjangoApi(): string {
  if (typeof window === 'undefined') {
    const urlServidor = process.env.DJANGO_API_URL?.trim()
    if (urlServidor) {
      return urlServidor
    }
  }

  return obterUrlPublicaDjangoApi()
}

export class DjangoApiError extends Error {
  readonly status: number
  readonly details: DjangoErroDetalhes | null

  constructor(status: number, message: string, details: DjangoErroDetalhes | null = null) {
    super(message)
    this.name = 'DjangoApiError'
    this.status = status
    this.details = details
  }
}

export interface DjangoFetchOptions extends Omit<RequestInit, 'body'> {
  accessToken?: string
  body?: unknown
  fetchImpl?: FetchLike
}

function construirUrlAbsoluta(path: string): string {
  const base = obterUrlBaseDjangoApi().replace(/\/$/, '')
  const caminho = path.startsWith('/') ? path : `/${path}`
  return `${base}${caminho}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJsonResposta(texto: string): unknown {
  if (!texto.trim()) {
    return null
  }

  try {
    return JSON.parse(texto) as unknown
  } catch {
    return null
  }
}

function extrairMensagemErro(payload: unknown): { message: string; details: DjangoErroDetalhes | null } {
  if (!isRecord(payload)) {
    return { message: 'Erro desconhecido na API Django', details: null }
  }

  if (typeof payload.detail === 'string') {
    return { message: payload.detail, details: null }
  }

  if (Array.isArray(payload.detail)) {
    const mensagens = payload.detail.filter((item): item is string => typeof item === 'string')
    return {
      message: mensagens.join(' ') || 'Erro de validação na API Django',
      details: null,
    }
  }

  const details: DjangoErroDetalhes = {}
  let mensagem = 'Erro de validação na API Django'

  for (const [campo, valor] of Object.entries(payload)) {
    if (campo === 'detail') {
      continue
    }

    if (typeof valor === 'string') {
      details[campo] = valor
      if (mensagem === 'Erro de validação na API Django') {
        mensagem = valor
      }
      continue
    }

    if (Array.isArray(valor) && valor.every((item) => typeof item === 'string')) {
      details[campo] = valor
      if (mensagem === 'Erro de validação na API Django') {
        mensagem = valor[0] ?? mensagem
      }
    }
  }

  if (Object.keys(details).length > 0) {
    return { message: mensagem, details }
  }

  return { message: 'Erro desconhecido na API Django', details: null }
}

export async function djangoFetch<T>(
  path: string,
  options: DjangoFetchOptions = {}
): Promise<T> {
  const { accessToken, body, fetchImpl = fetch, headers, ...restInit } = options

  const requestHeaders = new Headers(headers)

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetchImpl(construirUrlAbsoluta(path), {
    ...restInit,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const payload = parseJsonResposta(await response.text())

  if (!response.ok) {
    const { message, details } = extrairMensagemErro(payload)
    throw new DjangoApiError(response.status, message, details)
  }

  return payload as T
}
