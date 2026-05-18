import type { SetorModoApontamento } from '@/types'

function normalizarNomeSetor(setorNome: string): string {
  return setorNome.trim().toLocaleLowerCase('pt-BR')
}

export function setorEhQualidadeLegado(
  setorNome: string,
  modoApontamento?: SetorModoApontamento | string | null
): boolean {
  return modoApontamento === 'revisao_qualidade' || normalizarNomeSetor(setorNome) === 'qualidade'
}

export function setorParticipaFluxoProdutivoAtivo(
  setorNome: string,
  modoApontamento?: SetorModoApontamento | string | null
): boolean {
  return !setorEhQualidadeLegado(setorNome, modoApontamento)
}

export function inferirModoApontamentoSetor(
  setorNome: string,
  modoApontamento?: SetorModoApontamento | null
): SetorModoApontamento {
  if (modoApontamento === 'revisao_qualidade') {
    return modoApontamento
  }

  return normalizarNomeSetor(setorNome) === 'qualidade'
    ? 'revisao_qualidade'
    : 'producao_padrao'
}

export function setorUsaRevisaoQualidade(
  setorNome: string,
  modoApontamento?: SetorModoApontamento | null
): boolean {
  return inferirModoApontamentoSetor(setorNome, modoApontamento) === 'revisao_qualidade'
}
