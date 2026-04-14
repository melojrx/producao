export type TemaTV = 'dark' | 'light'

export interface TokensTemaTV {
  pagina: string
  card: string
  cardBorda: string
  gaugeContainer: string
  tabelaFundo: string
  tabelaBorda: string
  tabelaLinhaBorda: string
  tabelaHeaderFundo: string
  cabecalhoTitulo: string
  cabecalhoContador: string
  colunaTitulo: string
  textoPrimario: string
  textoSecundario: string
  trilhaGaugeCor: string
  headerTitulo: string
  headerSubtitulo: string
  statusTexto: string
  botaoTema: string
}

export const TOKENS: Record<TemaTV, TokensTemaTV> = {
  dark: {
    pagina: 'bg-[#0d1117]',
    card: 'bg-white/[0.03]',
    cardBorda: '',
    gaugeContainer: 'border-white/[0.07] bg-white/[0.03]',
    tabelaFundo: 'bg-white/[0.03]',
    tabelaBorda: 'border-white/[0.07]',
    tabelaLinhaBorda: 'border-white/[0.04]',
    tabelaHeaderFundo: '',
    cabecalhoTitulo: 'text-slate-300',
    cabecalhoContador: 'text-slate-600',
    colunaTitulo: 'text-slate-500',
    textoPrimario: 'text-slate-200',
    textoSecundario: 'text-slate-500',
    trilhaGaugeCor: 'rgba(255,255,255,0.09)',
    headerTitulo: 'text-slate-100',
    headerSubtitulo: 'text-slate-600',
    statusTexto: 'text-slate-500',
    botaoTema: 'border-white/[0.12] bg-white/[0.05] text-slate-400 hover:bg-white/[0.10] hover:text-slate-200',
  },
  light: {
    pagina: 'bg-slate-50',
    card: 'bg-white',
    cardBorda: 'shadow-sm',
    gaugeContainer: 'border-slate-200 bg-white shadow-sm',
    tabelaFundo: 'bg-white',
    tabelaBorda: 'border-slate-200',
    tabelaLinhaBorda: 'border-slate-100',
    tabelaHeaderFundo: 'bg-slate-50',
    cabecalhoTitulo: 'text-slate-700',
    cabecalhoContador: 'text-slate-400',
    colunaTitulo: 'text-slate-400',
    textoPrimario: 'text-slate-800',
    textoSecundario: 'text-slate-500',
    trilhaGaugeCor: 'rgba(0,0,0,0.08)',
    headerTitulo: 'text-slate-900',
    headerSubtitulo: 'text-slate-500',
    statusTexto: 'text-slate-500',
    botaoTema: 'border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700',
  },
}
