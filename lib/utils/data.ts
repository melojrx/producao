const FORMATADOR_DATA_LOCAL = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Fortaleza',
})

export function obterDataHojeLocal(): string {
  return FORMATADOR_DATA_LOCAL.format(new Date())
}

function formatarDoisDigitos(valor: number): string {
  return valor.toString().padStart(2, '0')
}

function extrairAnoMesLocal(data: Date): { ano: number; mes: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(data)
    .reduce<Record<string, string>>((acumulado, parte) => {
      if (parte.type !== 'literal') {
        acumulado[parte.type] = parte.value
      }

      return acumulado
    }, {})

  return {
    ano: Number.parseInt(partes.year ?? '0', 10),
    mes: Number.parseInt(partes.month ?? '0', 10),
  }
}

export function obterCompetenciaMesAtual(): string {
  const { ano, mes } = extrairAnoMesLocal(new Date())
  return `${ano}-${formatarDoisDigitos(mes)}-01`
}

export function normalizarCompetenciaMensal(valor: string): string | null {
  const valorNormalizado = valor.trim()

  if (!valorNormalizado) {
    return null
  }

  const correspondencia = valorNormalizado.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (!correspondencia) {
    return null
  }

  const ano = Number.parseInt(correspondencia[1], 10)
  const mes = Number.parseInt(correspondencia[2], 10)

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return null
  }

  return `${ano}-${formatarDoisDigitos(mes)}-01`
}

export function obterDiasDaCompetencia(competencia: string): number {
  const competenciaNormalizada = normalizarCompetenciaMensal(competencia)

  if (!competenciaNormalizada) {
    return 0
  }

  const [anoTexto, mesTexto] = competenciaNormalizada.split('-')
  const ano = Number.parseInt(anoTexto, 10)
  const mes = Number.parseInt(mesTexto, 10)

  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}
