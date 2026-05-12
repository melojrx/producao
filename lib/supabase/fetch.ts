import {
  SUPABASE_FETCH_RETRY_DELAY_MS,
  SUPABASE_FETCH_RETRY_TENTATIVAS,
} from '../constants.ts'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function isErroTransporteSupabase(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false
  }

  const mensagem = error.message.toLowerCase()

  return mensagem.includes('fetch failed') || mensagem.includes('failed to fetch')
}

function aguardarRetry(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, SUPABASE_FETCH_RETRY_DELAY_MS)
  })
}

export function createSupabaseFetch(fetchBase: FetchLike = fetch): FetchLike {
  return async (input, init) => {
    for (let tentativa = 1; tentativa <= SUPABASE_FETCH_RETRY_TENTATIVAS; tentativa += 1) {
      try {
        return await fetchBase(input, init)
      } catch (error) {
        const deveTentarNovamente =
          isErroTransporteSupabase(error) && tentativa < SUPABASE_FETCH_RETRY_TENTATIVAS

        if (!deveTentarNovamente) {
          throw error
        }

        await aguardarRetry()
      }
    }

    throw new Error('Fetch do Supabase finalizado sem resposta')
  }
}
