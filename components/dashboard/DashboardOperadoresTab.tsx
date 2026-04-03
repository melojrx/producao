'use client'

import { EficienciaOperacionalTurnoV2 } from '@/components/dashboard/EficienciaOperacionalTurnoV2'
import type { ResumoEficienciaOperacionalTurnoV2 } from '@/types'

interface DashboardOperadoresTabProps {
  resumo: ResumoEficienciaOperacionalTurnoV2 | undefined
}

export function DashboardOperadoresTab({ resumo }: DashboardOperadoresTabProps) {
  return <EficienciaOperacionalTurnoV2 resumo={resumo} />
}
