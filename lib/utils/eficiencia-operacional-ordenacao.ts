import type {
  EficienciaOperacionalDiaRegistroV2,
  EficienciaOperacionalHoraRegistroV2,
  EficienciaOperacionalOperacaoRegistroV2,
  SortDirection,
} from '@/types'

export type EficienciaHoraSortField =
  | 'hora'
  | 'operadorNome'
  | 'totalOperacoes'
  | 'quantidadeRealizada'
  | 'minutosPadraoRealizados'
  | 'eficienciaPct'

export type EficienciaDiaSortField =
  | 'data'
  | 'operadorNome'
  | 'quantidadeRealizada'
  | 'minutosPadraoRealizados'
  | 'eficienciaPct'

export type EficienciaOperacaoSortField =
  | 'hora'
  | 'operadorNome'
  | 'operacaoCodigo'
  | 'operacaoDescricao'
  | 'tempoPadraoMinSnapshot'
  | 'metaHora'
  | 'quantidadeRealizada'
  | 'minutosPadraoRealizados'
  | 'eficienciaPct'

export interface EficienciaSortState<TField extends string> {
  field: TField
  direction: SortDirection
}

const COMPARADOR_TEXTO = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
})

function fatorOrdenacao(direction: SortDirection): number {
  return direction === 'asc' ? 1 : -1
}

function compararTexto(primeiroValor: string, segundoValor: string): number {
  return COMPARADOR_TEXTO.compare(primeiroValor, segundoValor)
}

function compararNumero(primeiroValor: number, segundoValor: number): number {
  const primeiroNumero = Number.isFinite(primeiroValor) ? primeiroValor : 0
  const segundoNumero = Number.isFinite(segundoValor) ? segundoValor : 0

  return primeiroNumero - segundoNumero
}

function compararPorDirecao(comparacao: number, direction: SortDirection): number {
  return comparacao * fatorOrdenacao(direction)
}

function ordenarComFallback<TRegistro>(
  registros: TRegistro[],
  sort: EficienciaSortState<string>,
  compararCampo: (primeiro: TRegistro, segundo: TRegistro) => number,
  compararFallback: (primeiro: TRegistro, segundo: TRegistro) => number
): TRegistro[] {
  return registros
    .map((registro, indiceOriginal) => ({ registro, indiceOriginal }))
    .sort((primeiroItem, segundoItem) => {
      const comparacaoCampo = compararCampo(primeiroItem.registro, segundoItem.registro)

      if (comparacaoCampo !== 0) {
        return compararPorDirecao(comparacaoCampo, sort.direction)
      }

      const comparacaoFallback = compararFallback(primeiroItem.registro, segundoItem.registro)

      if (comparacaoFallback !== 0) {
        return comparacaoFallback
      }

      return primeiroItem.indiceOriginal - segundoItem.indiceOriginal
    })
    .map((item) => item.registro)
}

function compararCampoHora(
  primeiro: EficienciaOperacionalHoraRegistroV2,
  segundo: EficienciaOperacionalHoraRegistroV2,
  field: EficienciaHoraSortField
): number {
  if (
    field === 'totalOperacoes' ||
    field === 'quantidadeRealizada' ||
    field === 'minutosPadraoRealizados' ||
    field === 'eficienciaPct'
  ) {
    return compararNumero(primeiro[field], segundo[field])
  }

  return compararTexto(primeiro[field], segundo[field])
}

function compararFallbackHora(
  primeiro: EficienciaOperacionalHoraRegistroV2,
  segundo: EficienciaOperacionalHoraRegistroV2
): number {
  return (
    segundo.hora.localeCompare(primeiro.hora) ||
    compararTexto(primeiro.operadorNome, segundo.operadorNome)
  )
}

function compararCampoDia(
  primeiro: EficienciaOperacionalDiaRegistroV2,
  segundo: EficienciaOperacionalDiaRegistroV2,
  field: EficienciaDiaSortField
): number {
  if (
    field === 'quantidadeRealizada' ||
    field === 'minutosPadraoRealizados' ||
    field === 'eficienciaPct'
  ) {
    return compararNumero(primeiro[field], segundo[field])
  }

  return compararTexto(primeiro[field], segundo[field])
}

function compararFallbackDia(
  primeiro: EficienciaOperacionalDiaRegistroV2,
  segundo: EficienciaOperacionalDiaRegistroV2
): number {
  return (
    compararNumero(segundo.eficienciaPct, primeiro.eficienciaPct) ||
    compararTexto(primeiro.operadorNome, segundo.operadorNome)
  )
}

function compararCampoOperacao(
  primeiro: EficienciaOperacionalOperacaoRegistroV2,
  segundo: EficienciaOperacionalOperacaoRegistroV2,
  field: EficienciaOperacaoSortField
): number {
  if (
    field === 'tempoPadraoMinSnapshot' ||
    field === 'metaHora' ||
    field === 'quantidadeRealizada' ||
    field === 'minutosPadraoRealizados' ||
    field === 'eficienciaPct'
  ) {
    return compararNumero(primeiro[field], segundo[field])
  }

  return compararTexto(primeiro[field], segundo[field])
}

function compararFallbackOperacao(
  primeiro: EficienciaOperacionalOperacaoRegistroV2,
  segundo: EficienciaOperacionalOperacaoRegistroV2
): number {
  return (
    compararNumero(segundo.eficienciaPct, primeiro.eficienciaPct) ||
    segundo.hora.localeCompare(primeiro.hora) ||
    compararTexto(primeiro.operadorNome, segundo.operadorNome) ||
    compararTexto(primeiro.operacaoDescricao, segundo.operacaoDescricao)
  )
}

export function ordenarEficienciaOperacionalPorHora(
  registros: EficienciaOperacionalHoraRegistroV2[],
  sort: EficienciaSortState<EficienciaHoraSortField>
): EficienciaOperacionalHoraRegistroV2[] {
  return ordenarComFallback(
    registros,
    sort,
    (primeiro, segundo) => compararCampoHora(primeiro, segundo, sort.field),
    compararFallbackHora
  )
}

export function ordenarEficienciaOperacionalPorDia(
  registros: EficienciaOperacionalDiaRegistroV2[],
  sort: EficienciaSortState<EficienciaDiaSortField>
): EficienciaOperacionalDiaRegistroV2[] {
  return ordenarComFallback(
    registros,
    sort,
    (primeiro, segundo) => compararCampoDia(primeiro, segundo, sort.field),
    compararFallbackDia
  )
}

export function ordenarEficienciaOperacionalPorOperacao(
  registros: EficienciaOperacionalOperacaoRegistroV2[],
  sort: EficienciaSortState<EficienciaOperacaoSortField>
): EficienciaOperacionalOperacaoRegistroV2[] {
  return ordenarComFallback(
    registros,
    sort,
    (primeiro, segundo) => compararCampoOperacao(primeiro, segundo, sort.field),
    compararFallbackOperacao
  )
}
