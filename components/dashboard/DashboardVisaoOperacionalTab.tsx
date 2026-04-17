'use client'

import { Boxes, ClipboardList, PackageCheck, Target } from 'lucide-react'
import { CardKPI } from '@/components/dashboard/CardKPI'
import { GraficoMetaGrupoTurnoV2 } from '@/components/dashboard/GraficoMetaGrupoTurnoV2'
import { KanbanOperacionalTurno } from '@/components/dashboard/KanbanOperacionalTurno'
import { ResumoOpTurnoCard } from '@/components/dashboard/ResumoOpTurnoCard'
import { ResumoSetorTurnoCard } from '@/components/dashboard/ResumoSetorTurnoCard'
import type {
  ComparativoMetaGrupoHoraItem,
  PlanejamentoTurnoDashboardV2,
  TurnoOpV2,
} from '@/types'
import type {
  TurnoOpResumoDashboardItem,
  TurnoSetorDashboardItem,
} from '@/lib/utils/turno-setores'

interface ResumoVisaoOperacionalDashboard {
  opsEmAndamento: number
  quantidadeBacklogTotal: number
  quantidadeAceitaTurno: number
  quantidadeExcedenteTurno: number
  totalPlanejado: number
  totalRealizado: number
  progressoOperacionalTurnoPct: number
  operadoresDisponiveis: number
  operadoresAlocados: number
  totalOps: number
  opsConcluidas: number
  progressoOpsPct: number
  setoresAtivosCount: number
  setoresConcluidosCount: number
  progressoSetoresPct: number
  ops: TurnoOpV2[]
  opsAbertasLista: TurnoOpResumoDashboardItem[]
  setoresCardsLista: TurnoSetorDashboardItem[]
  setoresPendentesLista: TurnoSetorDashboardItem[]
  setoresConcluidosLista: TurnoSetorDashboardItem[]
}

interface DashboardVisaoOperacionalTabProps {
  planejamento: PlanejamentoTurnoDashboardV2
  turnoAberto: boolean
  metaGrupo: number
  mediaTpProduto: number
  resumo: ResumoVisaoOperacionalDashboard
  erroMetaGrupo?: string | null
  comparativoPorHora: ComparativoMetaGrupoHoraItem[]
  estaCarregandoGrafico: boolean
  onSelecionarOp: (turnoOpId: string) => void
  onSelecionarSetor: (setorId: string) => void
}

export function DashboardVisaoOperacionalTab({
  planejamento,
  turnoAberto,
  metaGrupo,
  mediaTpProduto,
  resumo,
  erroMetaGrupo,
  comparativoPorHora,
  estaCarregandoGrafico,
  onSelecionarOp,
  onSelecionarSetor,
}: DashboardVisaoOperacionalTabProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <CardKPI
          titulo="Capacidade Produtiva"
          valor={metaGrupo}
          desabilitado={!turnoAberto}
          motivoDesabilitado="Indisponível sem turno aberto. Este KPI é recalculado na abertura do próximo turno."
          descricao={
            mediaTpProduto > 0
              ? `Meta coletiva do turno pela média simples dos T.Ps dos produtos planejados. T.P médio ${mediaTpProduto.toFixed(2)} min.`
              : 'Meta coletiva do turno baseada na média simples dos T.Ps dos produtos planejados.'
          }
          icone={Target}
          destaque="blue"
        />
        <CardKPI
          titulo="Backlog total"
          valor={resumo.quantidadeBacklogTotal}
          descricao="Fila real ainda pendente nos setores do turno, já sem inflar setores futuros que ainda nao receberam transferencia."
          icone={ClipboardList}
          destaque="slate"
        />
        <CardKPI
          titulo="Aceito no turno"
          valor={resumo.quantidadeAceitaTurno}
          descricao="Parcela do backlog que a capacidade diaria realmente absorveu neste turno e ficou liberada para trabalho."
          icone={PackageCheck}
          destaque="blue"
        />
        <CardKPI
          titulo="Peças completas"
          valor={resumo.totalRealizado}
          descricao="Quantidade concluida do turno na leitura administrativa de produtos completos, separada do backlog setorial."
          icone={Boxes}
          destaque="emerald"
        />
        <CardKPI
          titulo="Excedente"
          valor={resumo.quantidadeExcedenteTurno}
          descricao="Saldo que nao coube na capacidade do dia e precisa seguir como backlog real para os proximos turnos."
          icone={Boxes}
          destaque="amber"
        />
      </div>

      {turnoAberto ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Operadores disponíveis
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresDisponiveis}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Operadores alocados
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.operadoresAlocados}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OPs</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{resumo.totalOps}</p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              OPs em andamento
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">{resumo.opsEmAndamento}</p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              OPs concluídas
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-900">{resumo.opsConcluidas}</p>
            <p className="mt-1 text-xs font-medium text-emerald-800">
              {resumo.progressoOpsPct}% do turno
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Setores ativos
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {resumo.setoresAtivosCount}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Setores concluídos
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-900">
              {resumo.setoresConcluidosCount}
            </p>
            <p className="mt-1 text-xs font-medium text-blue-800">
              {resumo.progressoSetoresPct}% do turno
            </p>
          </div>
        </section>
      ) : null}

      {erroMetaGrupo ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erroMetaGrupo}
        </section>
      ) : null}

      <GraficoMetaGrupoTurnoV2
        dados={comparativoPorHora}
        estaCarregando={estaCarregandoGrafico}
        desabilitado={!turnoAberto}
        motivoDesabilitado="O gráfico horário de capacidade é dinâmico e volta a ser recalculado quando um novo turno for aberto."
      />

      <KanbanOperacionalTurno
        planejamento={planejamento}
        onSelecionarOp={onSelecionarOp}
        onSelecionarSetor={onSelecionarSetor}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Progresso por OP</h2>
            <p className="text-sm text-slate-600">
              Cards de OPs abertas com progresso operacional e uma linha do tempo dos setores
              percorridos até a finalização do produto.
            </p>
          </div>

          <div className="mt-5 grid gap-4">
            {resumo.opsAbertasLista.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Nenhuma OP aberta no turno carregado.
              </div>
            ) : (
              resumo.opsAbertasLista.map((op) => (
                <ResumoOpTurnoCard key={op.id} op={op} onClick={onSelecionarOp} />
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Progresso por setor</h2>
            <p className="text-sm text-slate-600">
              Cards consolidados por setor do turno. Clique para abrir as OPs e seus progressos
              individuais dentro da estrutura física selecionada.
            </p>
          </div>

          <div className="mt-5 grid gap-4">
            {resumo.setoresCardsLista.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Ainda não há setores ativos neste turno.
              </div>
            ) : (
              resumo.setoresCardsLista.map((setor) => (
                <ResumoSetorTurnoCard
                  key={setor.id}
                  setor={setor}
                  onClick={onSelecionarSetor}
                />
              ))
            )}
          </div>
        </section>
      </section>

    </>
  )
}
