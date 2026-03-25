const FORMATADOR_DATA_LOCAL = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Fortaleza',
})

export function obterDataHojeLocal(): string {
  return FORMATADOR_DATA_LOCAL.format(new Date())
}
