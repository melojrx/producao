'use client'

import { useMemo, useState } from 'react'
import {
  DashboardTabs,
  type DashboardTabId,
} from '@/components/dashboard/DashboardTabs'
import { DashboardOperadoresTab } from '@/components/dashboard/DashboardOperadoresTab'
import { DashboardVisaoGeralTab } from '@/components/dashboard/DashboardVisaoGeralTab'
import { DashboardVisaoOperacionalTab } from '@/components/dashboard/DashboardVisaoOperacionalTab'
import { ModalDetalhesOpTurno } from '@/components/dashboard/ModalDetalhesOpTurno'
import { ResumoPlanejamentoTurnoV2 } from '@/components/dashboard/ResumoPlanejamentoTurnoV2'
import { useMetaGrupoTurnoV2 } from '@/hooks/useMetaGrupoTurnoV2'
import { compararSetoresPorOrdem } from '@/lib/utils/setor-ordem'
import { contarOperadoresEnvolvidosNoTurno } from '@/lib/utils/turno-operadores'
import { mapearSetoresTurnoParaDashboard } from '@/lib/utils/turno-setores'
import { useRealtimePlanejamentoTurnoV2 } from '@/hooks/useRealtimePlanejamentoTurnoV2'
import type {
  MetaMensalResumoDashboard,
  PlanejamentoTurnoDashboardV2,
  ProdutoListItem,
  TurnoOpV2,
  TurnoSetorOpV2,
} from '@/types'

interface MonitorPlanejamentoTurnoV2Props {
  initialPlanning: PlanejamentoTurnoDashboardV2 | null
  resumoMetaMensal: MetaMensalResumoDashboard
  produtosCatalogo: ProdutoListItem[]
}

interface SecaoComContexto extends TurnoSetorOpV2 {
  numeroOp: string
  produtoNome: string
  produtoReferencia: string
}

function mapearSecoesComContexto(
  secoes: TurnoSetorOpV2[],
  ops: TurnoOpV2[]
): SecaoComContexto[] {
  const opPorId = new Map(ops.map((op) => [op.id, op]))

  return secoes
    .map((secao) => {
      const op = opPorId.get(secao.turnoOpId)
      if (!op) {
        return null
      }

      return {
        ...secao,
        numeroOp: op.numeroOp,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
      }
    })
    .filter((secao): secao is SecaoComContexto => Boolean(secao))
}

function ordenarSecoes(secoes: SecaoComContexto[]): SecaoComContexto[] {
  return [...secoes].sort((primeiraSecao, segundaSecao) => {
    const comparacaoNumeroOp = primeiraSecao.numeroOp.localeCompare(segundaSecao.numeroOp)

    if (comparacaoNumeroOp !== 0) {
      return comparacaoNumeroOp
    }

    return compararSetoresPorOrdem(primeiraSecao, segundaSecao)
  })
}

export function MonitorPlanejamentoTurnoV2({
  initialPlanning,
  resumoMetaMensal,
  produtosCatalogo,
}: MonitorPlanejamentoTurnoV2Props) {
  const [abaAtiva, setAbaAtiva] = useState<DashboardTabId>('visao_geral')
  const [turnoOpSelecionadaId, setTurnoOpSelecionadaId] = useState<string | null>(null)
  const { planejamento, ultimaAtualizacao, statusConexao, estaCarregando, erro } =
    useRealtimePlanejamentoTurnoV2(initialPlanning)
  const {
    comparativoPorHora,
    erro: erroMetaGrupo,
    estaCarregando: estaCarregandoMetaGrupo,
    mediaTpProduto,
    metaGrupo,
  } = useMetaGrupoTurnoV2(planejamento, ultimaAtualizacao?.getTime() ?? 0)

  const resumo = useMemo(() => {
    if (!planejamento) {
      return {
        opsEmAndamento: 0,
        totalPlanejado: 0,
        totalRealizado: 0,
        progressoOperacionalTurnoPct: 0,
        operadoresDisponiveis: 0,
        operadoresAlocados: 0,
        totalOps: 0,
        opsConcluidas: 0,
        progressoOpsPct: 0,
        setoresAtivosCount: 0,
        setoresConcluidosCount: 0,
        progressoSetoresPct: 0,
        setoresPendentes: 0,
        ops: [] as TurnoOpV2[],
        setoresPendentesLista: [],
        setoresConcluidosLista: [],
        setoresAtivos: [],
      }
    }

    const setoresAtivos = mapearSetoresTurnoParaDashboard(planejamento)
    const setoresPendentesLista = setoresAtivos.filter((setor) => setor.status !== 'concluida')
    const setoresConcluidosLista = setoresAtivos.filter((setor) => setor.status === 'concluida')

    return {
      opsEmAndamento: planejamento.ops.filter((op) => op.status === 'em_andamento').length,
      totalPlanejado: planejamento.ops.reduce((soma, op) => soma + op.quantidadePlanejada, 0),
      totalRealizado: planejamento.ops.reduce((soma, op) => soma + op.quantidadeConcluida, 0),
      progressoOperacionalTurnoPct:
        planejamento.ops.reduce((soma, op) => soma + op.cargaPlanejadaTp, 0) > 0
          ? Math.min(
              (planejamento.ops.reduce((soma, op) => soma + op.cargaRealizadaTp, 0) /
                planejamento.ops.reduce((soma, op) => soma + op.cargaPlanejadaTp, 0)) *
                100,
              100
            )
          : 0,
      operadoresDisponiveis: planejamento.turno.operadoresDisponiveis,
      operadoresAlocados: contarOperadoresEnvolvidosNoTurno(planejamento),
      totalOps: planejamento.ops.length,
      opsConcluidas: planejamento.ops.filter((op) => op.status === 'concluida').length,
      progressoOpsPct:
        planejamento.ops.length > 0
          ? Math.round(
              (planejamento.ops.filter((op) => op.status === 'concluida').length /
                planejamento.ops.length) *
                100
            )
          : 0,
      setoresAtivosCount: setoresAtivos.length,
      setoresConcluidosCount: setoresConcluidosLista.length,
      progressoSetoresPct:
        setoresAtivos.length > 0
          ? Math.round((setoresConcluidosLista.length / setoresAtivos.length) * 100)
          : 0,
      setoresPendentes: setoresPendentesLista.length,
      ops: planejamento.ops,
      setoresPendentesLista,
      setoresConcluidosLista,
      setoresAtivos,
    }
  }, [planejamento])

  const opSelecionada = useMemo(() => {
    if (!planejamento || !turnoOpSelecionadaId) {
      return null
    }

    const op = planejamento.ops.find((item) => item.id === turnoOpSelecionadaId)
    if (!op) {
      return null
    }

    const secoes = ordenarSecoes(
      mapearSecoesComContexto(planejamento.secoesSetorOp, planejamento.ops).filter(
        (secao) => secao.turnoOpId === turnoOpSelecionadaId
      )
    )

    return { op, secoes }
  }, [planejamento, turnoOpSelecionadaId])

  const turnoAberto = planejamento?.origem === 'aberto'

  return (
    <section className="space-y-6">
      {erro ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </section>
      ) : null}

      {planejamento ? (
        <ResumoPlanejamentoTurnoV2
          planejamento={planejamento}
          statusConexao={statusConexao}
          ultimaAtualizacao={ultimaAtualizacao}
        />
      ) : null}

      <DashboardTabs abaAtiva={abaAtiva} onChange={setAbaAtiva} />

      {abaAtiva === 'visao_geral' ? (
        <DashboardVisaoGeralTab resumoMetaMensal={resumoMetaMensal} />
      ) : abaAtiva === 'visao_operacional' && planejamento ? (
        <DashboardVisaoOperacionalTab
          turnoAberto={turnoAberto}
          metaGrupo={metaGrupo}
          mediaTpProduto={mediaTpProduto}
          resumo={resumo}
          erroMetaGrupo={erroMetaGrupo}
          comparativoPorHora={comparativoPorHora}
          estaCarregandoGrafico={turnoAberto && (estaCarregando || estaCarregandoMetaGrupo)}
          onSelecionarOp={setTurnoOpSelecionadaId}
        />
      ) : abaAtiva === 'operadores' && planejamento ? (
        <DashboardOperadoresTab resumo={planejamento.eficienciaOperacional} />
      ) : !estaCarregando ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Nenhum turno disponível para monitoramento neste momento.
        </section>
      ) : null}

      {opSelecionada && planejamento ? (
        <ModalDetalhesOpTurno
          op={opSelecionada.op}
          secoes={opSelecionada.secoes}
          iniciadoEmTurno={planejamento.turno.iniciadoEm}
          produtosCatalogo={produtosCatalogo}
          operadoresTurno={planejamento.operadores}
          operadoresAtividadeSetor={planejamento.operadoresAtividadeSetor ?? []}
          operacoesSecao={planejamento.operacoesSecao.filter(
            (operacao) => operacao.turnoOpId === opSelecionada.op.id
          )}
          aoFechar={() => setTurnoOpSelecionadaId(null)}
        />
      ) : null}
    </section>
  )
}
