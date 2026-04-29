export interface OperacaoBaseDuplicacao {
  codigo: string
  descricao: string
  imagem_url: string | null
  maquina_id: string | null
  qr_code_token: string
  setor_id: string | null
  tempo_padrao_min: number
}

export interface OperacaoDuplicadaInicial {
  ativa: true
  codigo: string
  descricao: string
  imagem_url: null
  maquina_id: string | null
  qr_code_token: null
  setor_id: string | null
  tempo_padrao_min: number
}

export function sugerirCodigoOperacaoDuplicada(codigoBase: string): string {
  const codigoNormalizado = codigoBase.trim()

  if (codigoNormalizado.toLocaleUpperCase('pt-BR').endsWith('-COPIA')) {
    return `${codigoNormalizado}-2`
  }

  return `${codigoNormalizado}-COPIA`
}

export function prepararOperacaoParaDuplicacao(
  operacao: OperacaoBaseDuplicacao
): OperacaoDuplicadaInicial {
  return {
    ativa: true,
    codigo: sugerirCodigoOperacaoDuplicada(operacao.codigo),
    descricao: operacao.descricao,
    imagem_url: null,
    maquina_id: operacao.maquina_id,
    qr_code_token: null,
    setor_id: operacao.setor_id,
    tempo_padrao_min: operacao.tempo_padrao_min,
  }
}
