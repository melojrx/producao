import { ClipboardList } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApontamentosTabs } from '@/components/apontamentos/ApontamentosTabs'
import { ControleTurnoSupervisor } from '@/components/apontamentos/ControleTurnoSupervisor'
import { PainelApontamentosSupervisor } from '@/components/apontamentos/PainelApontamentosSupervisor'
import { PainelQualidadeSupervisor } from '@/components/apontamentos/PainelQualidadeSupervisor'
import { PainelMetaMensalApontamentos } from '@/components/apontamentos/PainelMetaMensalApontamentos'
import { obterPerfilRevisorQualidadeOpcional } from '@/lib/auth/obter-perfil-revisor-qualidade'
import { listarTurnoSetorOperacoesDoTurno } from '@/lib/queries/apontamentos'
import { buscarMetaMensalCompetencia } from '@/lib/queries/metas-mensais'
import { listarOperadores } from '@/lib/queries/operadores'
import { listarProdutos } from '@/lib/queries/produtos'
import { listarCatalogoDefeitosQualidade } from '@/lib/queries/qualidade'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'
import type { ApontamentosTabId } from '@/lib/utils/apontamentos-tabs'
import { normalizarCompetenciaMensal, obterCompetenciaMesAtual } from '@/lib/utils/data'
import type {
  OperadorListItem,
  PlanejamentoTurnoDashboardV2,
  PlanejamentoTurnoV2,
  TurnoOperadorV2,
} from '@/types'

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

function secaoTurnoIndisponivel(tipo: 'operacao' | 'qualidade'): ReactNode {
  const titulo = tipo === 'operacao' ? 'Apontamentos indisponíveis' : 'Qualidade indisponível'
  const descricao =
    tipo === 'operacao'
      ? 'O painel de lançamento fica disponível quando existe um turno aberto. Use os controles acima para abrir o próximo turno e liberar as seções, operações derivadas e o registro incremental do supervisor.'
      : 'O painel de qualidade fica disponível quando existe um turno aberto com fila de pendências de revisão operacional.'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
        <ClipboardList size={14} />
        {titulo}
      </div>
      <h2 className="mt-4 text-xl font-semibold text-slate-900">Nenhum turno aberto</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">{descricao}</p>
    </section>
  )
}

async function enriquecerPlanejamentoComOperadores(planejamento: PlanejamentoTurnoDashboardV2): Promise<{
  planejamentoComOperadores: PlanejamentoTurnoDashboardV2
  precisaFallbackOperadores: boolean
}> {
  const precisaFallbackOperadores = planejamento.operadores.length === 0

  if (!precisaFallbackOperadores) {
    return { planejamentoComOperadores: planejamento, precisaFallbackOperadores: false }
  }

  const operadoresAtivos = await listarOperadores()

  return {
    planejamentoComOperadores: {
      ...planejamento,
      operadores: mapearOperadoresFallback(planejamento, operadoresAtivos),
    },
    precisaFallbackOperadores: true,
  }
}

async function renderConteudoAbaApontamentos(input: {
  aba: ApontamentosTabId
  competenciaSelecionada: string
  turnoOpIdSelecionado: string
}): Promise<ReactNode> {
  const { aba, competenciaSelecionada, turnoOpIdSelecionado } = input

  if (aba === 'gestao_mensal') {
    const contextoMetaMensal = await buscarMetaMensalCompetencia(competenciaSelecionada)

    return (
      <PainelMetaMensalApontamentos
        competencia={contextoMetaMensal.competencia}
        metaMensal={contextoMetaMensal.metaMensal}
      />
    )
  }

  const [planejamentoAtual, produtos] = await Promise.all([
    buscarTurnoAbertoOuUltimoEncerrado(),
    listarProdutos(),
  ])
  const planejamentoAberto =
    planejamentoAtual?.origem === 'aberto'
      ? (planejamentoAtual as PlanejamentoTurnoDashboardV2)
      : null

  if (aba === 'operacao_turno') {
    if (!planejamentoAberto) {
      return (
        <section className="space-y-4" aria-label="Área operacional de apontamentos">
          <ControleTurnoSupervisor initialPlanning={planejamentoAtual} produtos={produtos} />
          {secaoTurnoIndisponivel('operacao')}
        </section>
      )
    }

    const [{ planejamentoComOperadores, precisaFallbackOperadores }, operacoesTurno] =
      await Promise.all([
        enriquecerPlanejamentoComOperadores(planejamentoAberto),
        listarTurnoSetorOperacoesDoTurno(planejamentoAberto.turno.id),
      ])

    return (
      <section className="space-y-4" aria-label="Área operacional de apontamentos">
        <ControleTurnoSupervisor initialPlanning={planejamentoAtual} produtos={produtos} />
        <PainelApontamentosSupervisor
          planejamento={planejamentoComOperadores}
          operacoesTurno={operacoesTurno}
          origemOperadores={precisaFallbackOperadores ? 'fallback_ativos' : 'turno'}
          filtroTurnoOpInicial={turnoOpIdSelecionado}
        />
      </section>
    )
  }

  const perfilRevisor = await obterPerfilRevisorQualidadeOpcional()

  if (!planejamentoAberto) {
    return (
      <section className="space-y-4" aria-label="Área de qualidade nos apontamentos">
        <ControleTurnoSupervisor initialPlanning={planejamentoAtual} produtos={produtos} />
        {secaoTurnoIndisponivel('qualidade')}
      </section>
    )
  }

  const [planejamentoComOperadoresResultado, operacoesTurno, defeitosCatalogo] =
    await Promise.all([
      enriquecerPlanejamentoComOperadores(planejamentoAberto),
      listarTurnoSetorOperacoesDoTurno(planejamentoAberto.turno.id),
      listarCatalogoDefeitosQualidade(),
    ])
  const { planejamentoComOperadores } = planejamentoComOperadoresResultado

  return (
    <section className="space-y-4" aria-label="Área de qualidade nos apontamentos">
      <ControleTurnoSupervisor initialPlanning={planejamentoAtual} produtos={produtos} />
      <PainelQualidadeSupervisor
        planejamento={planejamentoComOperadores}
        operacoesTurno={operacoesTurno}
        defeitosCatalogo={defeitosCatalogo}
        podeRevisarQualidade={perfilRevisor?.podeRevisarQualidade === true}
        revisorNome={perfilRevisor?.nome ?? null}
      />
    </section>
  )
}

export function normalizarAbaApontamentos(valor: string): ApontamentosTabId {
  if (valor === 'operacao_turno' || valor === 'qualidade_turno') {
    return valor
  }

  return 'gestao_mensal'
}

export async function renderPaginaApontamentosAdmin(input: {
  abaInicial: ApontamentosTabId
  competenciaSelecionada: string
  turnoOpIdSelecionado: string
}): Promise<ReactNode> {
  const conteudoAtivo = await renderConteudoAbaApontamentos({
    aba: input.abaInicial,
    competenciaSelecionada: input.competenciaSelecionada,
    turnoOpIdSelecionado: input.turnoOpIdSelecionado,
  })

  return (
    <main className="w-full">
      <ApontamentosTabs abaInicial={input.abaInicial} conteudoAtivo={conteudoAtivo} />
    </main>
  )
}

export function resolverCompetenciaApontamentos(valor: string): string {
  return normalizarCompetenciaMensal(valor) ?? obterCompetenciaMesAtual()
}
