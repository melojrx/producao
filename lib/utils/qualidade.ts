import type { SetorModoApontamento } from '@/types'

export function inferirModoApontamentoSetor(
  setorNome: string,
  modoApontamento?: SetorModoApontamento | null
): SetorModoApontamento {
  if (modoApontamento === 'revisao_qualidade') {
    return modoApontamento
  }

  return setorNome.trim().toLowerCase() === 'qualidade'
    ? 'revisao_qualidade'
    : 'producao_padrao'
}

export function setorUsaRevisaoQualidade(
  setorNome: string,
  modoApontamento?: SetorModoApontamento | null
): boolean {
  return inferirModoApontamentoSetor(setorNome, modoApontamento) === 'revisao_qualidade'
}
