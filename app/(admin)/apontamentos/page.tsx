import { ClipboardList } from 'lucide-react'
import { ApontamentosTabs } from '@/components/apontamentos/ApontamentosTabs'
import { ControleTurnoSupervisor } from '@/components/apontamentos/ControleTurnoSupervisor'
import { PainelApontamentosSupervisor } from '@/components/apontamentos/PainelApontamentosSupervisor'
import { PainelMetaMensalApontamentos } from '@/components/apontamentos/PainelMetaMensalApontamentos'
import { listarTurnoSetorOperacoesDoTurno } from '@/lib/queries/apontamentos'
import { buscarMetaMensalCompetencia } from '@/lib/queries/metas-mensais'
import { listarOperadores } from '@/lib/queries/operadores'
import { listarProdutos } from '@/lib/queries/produtos'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'
import { normalizarCompetenciaMensal, obterCompetenciaMesAtual } from '@/lib/utils/data'
import type {
  OperadorListItem,
  PlanejamentoTurnoDashboardV2,
  PlanejamentoTurnoV2,
  TurnoOperadorV2,
} from '@/types'

type SearchParams = Promise<Record<string, string | string[] | undefined>>
type ApontamentosTabId = 'gestao_mensal' | 'operacao_turno'

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

function normalizarAbaInicial(valor: string): ApontamentosTabId {
  return valor === 'operacao_turno' ? 'operacao_turno' : 'gestao_mensal'
}

function mapearOperadoresFallback(
  planejamento: PlanejamentoTurnoV2,
  operadoresAtivos: OperadorListItem[]
): TurnoOperadorV2[] {
  return operadoresAtivos
    .filter((operador) => operador.status === 'ativo')
    .map((operador) => ({
      id: operador.id,
      turnoId: planejamento.turno.id,
      operadorId: operador.id,
      setorId: null,
      operadorNome: operador.nome,
      matricula: operador.matricula,
      funcao: operador.funcao,
      cargaHorariaMin: operador.carga_horaria_min ?? 0,
    }))
}

export default async function AdminApontamentosPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const turnoOpIdSelecionado = valorString(resolvedSearchParams.turnoOpId)
  const abaInicial = normalizarAbaInicial(valorString(resolvedSearchParams.aba))
  const competenciaSelecionada =
    normalizarCompetenciaMensal(valorString(resolvedSearchParams.competencia)) ??
    obterCompetenciaMesAtual()

  const [planejamentoAtual, produtos, contextoMetaMensal] = await Promise.all([
    buscarTurnoAbertoOuUltimoEncerrado(),
    listarProdutos(),
    buscarMetaMensalCompetencia(competenciaSelecionada),
  ])
  const planejamento =
    planejamentoAtual?.origem === 'aberto'
      ? (planejamentoAtual as PlanejamentoTurnoDashboardV2)
      : null

  if (!planejamento) {
    return (
      <main className="w-full">
        <ApontamentosTabs
          abaInicial={abaInicial}
          gestaoMensal={
            <PainelMetaMensalApontamentos
              competencia={contextoMetaMensal.competencia}
              metaMensal={contextoMetaMensal.metaMensal}
            />
          }
          operacaoTurno={
            <section className="space-y-4" aria-label="Área operacional de apontamentos">
              <ControleTurnoSupervisor initialPlanning={planejamentoAtual} produtos={produtos} />
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  <ClipboardList size={14} />
                  Apontamentos indisponíveis
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">Nenhum turno aberto</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  O painel de lançamento fica disponível quando existe um turno aberto. Use os
                  controles acima para abrir o próximo turno e liberar as seções, operações
                  derivadas e o registro incremental do supervisor.
                </p>
              </section>
            </section>
          }
        />
      </main>
    )
  }

  const operacoesTurno = await listarTurnoSetorOperacoesDoTurno(planejamento.turno.id)
  const precisaFallbackOperadores = planejamento.operadores.length === 0
  const operadoresAtivos = precisaFallbackOperadores ? await listarOperadores() : []
  const planejamentoComOperadores = precisaFallbackOperadores
    ? {
        ...planejamento,
        operadores: mapearOperadoresFallback(planejamento, operadoresAtivos),
      }
    : planejamento

  return (
    <main className="w-full">
      <ApontamentosTabs
        abaInicial={abaInicial}
        gestaoMensal={
          <PainelMetaMensalApontamentos
            competencia={contextoMetaMensal.competencia}
            metaMensal={contextoMetaMensal.metaMensal}
          />
        }
        operacaoTurno={
          <section className="space-y-4" aria-label="Área operacional de apontamentos">
            <ControleTurnoSupervisor initialPlanning={planejamentoAtual} produtos={produtos} />
            <PainelApontamentosSupervisor
              planejamento={planejamentoComOperadores}
              operacoesTurno={operacoesTurno}
              origemOperadores={precisaFallbackOperadores ? 'fallback_ativos' : 'turno'}
              filtroTurnoOpInicial={turnoOpIdSelecionado}
            />
          </section>
        }
      />
    </main>
  )
}
