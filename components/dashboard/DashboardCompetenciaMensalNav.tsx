'use client'

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { obterCompetenciaMesAtual } from '@/lib/utils/data'

interface DashboardCompetenciaMensalNavProps {
  competencia: string
}

function deslocarCompetencia(competencia: string, deslocamentoMeses: number): string {
  const [anoTexto, mesTexto] = competencia.split('-')
  const ano = Number.parseInt(anoTexto ?? '', 10)
  const mes = Number.parseInt(mesTexto ?? '', 10)

  if (!Number.isInteger(ano) || !Number.isInteger(mes)) {
    return competencia
  }

  const dataBase = new Date(Date.UTC(ano, mes - 1 + deslocamentoMeses, 1))
  const anoAjustado = dataBase.getUTCFullYear()
  const mesAjustado = `${dataBase.getUTCMonth() + 1}`.padStart(2, '0')

  return `${anoAjustado}-${mesAjustado}-01`
}

export function DashboardCompetenciaMensalNav({
  competencia,
}: DashboardCompetenciaMensalNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const competenciaAtual = obterCompetenciaMesAtual()

  const atualizarCompetencia = (novaCompetencia: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('competencia', novaCompetencia)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const voltarMes = () => {
    atualizarCompetencia(deslocarCompetencia(competencia, -1))
  }

  const avancarMes = () => {
    atualizarCompetencia(deslocarCompetencia(competencia, 1))
  }

  const irParaMesAtual = () => {
    atualizarCompetencia(competenciaAtual)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={voltarMes}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        aria-label="Voltar para a competência anterior"
      >
        <ChevronLeft size={16} />
        Mês anterior
      </button>

      <button
        type="button"
        onClick={avancarMes}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        aria-label="Avançar para a próxima competência"
      >
        Próximo mês
        <ChevronRight size={16} />
      </button>

      <button
        type="button"
        onClick={irParaMesAtual}
        disabled={competencia === competenciaAtual}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Voltar para a competência do mês atual"
      >
        <RotateCcw size={16} />
        Mês atual
      </button>
    </div>
  )
}
