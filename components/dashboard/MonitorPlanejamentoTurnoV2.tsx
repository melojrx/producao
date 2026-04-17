'use client'

import { useMemo, useState } from 'react'
import {
  DashboardTabs,
  type DashboardTabId,
} from '@/components/dashboard/DashboardTabs'
import { DashboardOperadoresTab } from '@/components/dashboard/DashboardOperadoresTab'
import { ModalDetalhesSetorTurno } from '@/components/dashboard/ModalDetalhesSetorTurno'
import { DashboardVisaoGeralTab } from '@/components/dashboard/DashboardVisaoGeralTab'
import { DashboardVisaoOperacionalTab } from '@/components/dashboard/DashboardVisaoOperacionalTab'
import { ModalDetalhesOpTurno } from '@/components/dashboard/ModalDetalhesOpTurno'
import { ResumoPlanejamentoTurnoV2 } from '@/components/dashboard/ResumoPlanejamentoTurnoV2'
import { useMetaGrupoTurnoV2 } from '@/hooks/useMetaGrupoTurnoV2'
import { compararSetoresPorOrdem } from '@/lib/utils/setor-ordem'
import { contarOperadoresEnvolvidosNoTurno } from '@/lib/utils/turno-operadores'
import {
  mapearOpsTurnoParaDashboard,
  mapearSetoresTurnoParaDashboard,
  type TurnoOpResumoDashboardItem,
} from '@/lib/utils/turno-setores'
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
  quantidadeBacklogTotal: number
  quantidadeAceitaTurno: number
  quantidadeExcedenteTurno: number
  quantidadeDisponivelApontamento: number
}

function mapearSecoesComContexto(
  secoes: TurnoSetorOpV2[],
  ops: TurnoOpV2[],
  demandas = [] as PlanejamentoTurnoDashboardV2['demandasSetor']
): SecaoComContexto[] {
  const opPorId = new Map(ops.map((op) => [op.id, op]))
  const demandaPorSecaoLegacyId = new Map(
    (demandas ?? [])
      .filter((demanda) => Boolean(demanda.turnoSetorOpLegacyId))
      .map((demanda) => [demanda.turnoSetorOpLegacyId, demanda] as const)
  )

  return secoes
    .map((secao) => {
      const op = opPorId.get(secao.turnoOpId)
      if (!op) {
        return null
      }

      const demanda =
        demandaPorSecaoLegacyId.get(secao.id) ??
        (demandas ?? []).find(
          (item) => item.turnoOpId === secao.turnoOpId && item.setorId === secao.setorId
        )

      return {
        ...secao,
        numeroOp: op.numeroOp,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
        quantidadeBacklogTotal:
          demanda?.quantidadeBacklogSetor ?? Math.max(secao.quantidadePlanejada - secao.quantidadeConcluida, 0),
        quantidadeAceitaTurno: demanda?.quantidadeAceitaTurno ?? secao.quantidadePlanejada,
        quantidadeExcedenteTurno: demanda?.quantidadeExcedenteTurno ?? 0,
        quantidadeDisponivelApontamento:
          demanda?.quantidadeDisponivelApontamento ??
          Math.max(secao.quantidadePlanejada - secao.quantidadeRealizada, 0),
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
  const [setorSelecionadoId, setSetorSelecionadoId] = useState<string | null>(null)
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
        quantidadeBacklogTotal: 0,
        quantidadeAceitaTurno: 0,
        quantidadeExcedenteTurno: 0,
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
        opsAbertasLista: [],
        setoresCardsLista: [],
        setoresPendentesLista: [],
        setoresConcluidosLista: [],
        setoresAtivos: [],
      }
    }

    const setoresAtivos = mapearSetoresTurnoParaDashboard(planejamento)
    const opsResumoLista = mapearOpsTurnoParaDashboard(planejamento)
    const setoresPendentesLista = setoresAtivos.filter((setor) => setor.status !== 'concluida')
    const setoresConcluidosLista = setoresAtivos.filter((setor) => setor.status === 'concluida')
    const opsAbertasLista = opsResumoLista.filter((op) => op.status !== 'concluida')

    return {
      opsEmAndamento: planejamento.ops.filter((op) => op.status === 'em_andamento').length,
      quantidadeBacklogTotal: opsResumoLista.reduce(
        (soma, op) => soma + op.quantidadeBacklogTotal,
        0
      ),
      quantidadeAceitaTurno: opsResumoLista.reduce(
        (soma, op) => soma + op.quantidadeAceitaTurno,
        0
      ),
      quantidadeExcedenteTurno: opsResumoLista.reduce(
        (soma, op) => soma + op.quantidadeExcedenteTurno,
        0
      ),
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
      opsAbertasLista,
      setoresCardsLista: setoresAtivos,
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
      mapearSecoesComContexto(
        planejamento.secoesSetorOp,
        planejamento.ops,
        planejamento.demandasSetor
      ).filter(
        (secao) => secao.turnoOpId === turnoOpSelecionadaId
      )
    )
    const opResumo =
      mapearOpsTurnoParaDashboard(planejamento).find((item) => item.id === turnoOpSelecionadaId) ??
      null

    return { op, opResumo, secoes }
  }, [planejamento, turnoOpSelecionadaId])

  const turnoAberto = planejamento?.origem === 'aberto'
  const setorSelecionado = useMemo(
    () => resumo.setoresCardsLista.find((setor) => setor.setorId === setorSelecionadoId) ?? null,
    [resumo.setoresCardsLista, setorSelecionadoId]
  )

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
          planejamento={planejamento}
          turnoAberto={turnoAberto}
          metaGrupo={metaGrupo}
          mediaTpProduto={mediaTpProduto}
          resumo={resumo}
          erroMetaGrupo={erroMetaGrupo}
          comparativoPorHora={comparativoPorHora}
          estaCarregandoGrafico={turnoAberto && (estaCarregando || estaCarregandoMetaGrupo)}
          onSelecionarOp={setTurnoOpSelecionadaId}
          onSelecionarSetor={setSetorSelecionadoId}
        />
      ) : abaAtiva === 'operadores' && planejamento ? (
        <DashboardOperadoresTab
          resumo={planejamento.eficienciaOperacional}
          operadoresDisponiveis={planejamento.turno.operadoresDisponiveis}
        />
      ) : !estaCarregando ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Nenhum turno disponível para monitoramento neste momento.
        </section>
      ) : null}

      {opSelecionada && planejamento ? (
        <ModalDetalhesOpTurno
          op={opSelecionada.op}
          opResumo={opSelecionada.opResumo}
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

      {setorSelecionado ? (
        <ModalDetalhesSetorTurno
          setor={setorSelecionado}
          aoFechar={() => setSetorSelecionadoId(null)}
        />
      ) : null}
    </section>
  )
}
