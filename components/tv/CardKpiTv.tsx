import type { LucideIcon } from 'lucide-react'
import { TOKENS, type TemaTV } from '@/components/tv/tema-tv'

interface CardKpiTvProps {
  readonly label: string
  readonly valor: string
  readonly sublabel?: string
  readonly icone: LucideIcon
  readonly cor: 'indigo' | 'emerald' | 'amber' | 'rose'
  readonly tema: TemaTV
}

const estilosPorCor: Record<CardKpiTvProps['cor'], { borda: string; icone: string; label: string }> = {
  indigo: {
    borda: 'border-indigo-500/20',
    icone: 'text-indigo-500',
    label: 'text-indigo-500',
  },
  emerald: {
    borda: 'border-emerald-500/20',
    icone: 'text-emerald-500',
    label: 'text-emerald-500',
  },
  amber: {
    borda: 'border-amber-500/20',
    icone: 'text-amber-500',
    label: 'text-amber-500',
  },
  rose: {
    borda: 'border-rose-500/20',
    icone: 'text-rose-500',
    label: 'text-rose-500',
  },
}

export function CardKpiTv({ label, valor, sublabel, icone: Icone, cor, tema }: CardKpiTvProps) {
  const estilos = estilosPorCor[cor]
  const tokens = TOKENS[tema]

  return (
    <div
      className={`rounded-2xl border ${estilos.borda} ${tokens.card} ${tokens.cardBorda} p-5 flex flex-col justify-between gap-4`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs font-semibold uppercase tracking-widest ${estilos.label}`}>
          {label}
        </p>
        <Icone size={18} className={estilos.icone} />
      </div>

      <div>
        <p className={`text-4xl font-bold tracking-tight xl:text-5xl ${tokens.textoPrimario}`}>
          {valor}
        </p>
        {sublabel ? (
          <p className={`mt-1.5 text-sm ${tokens.textoSecundario}`}>{sublabel}</p>
        ) : null}
      </div>
    </div>
  )
}
