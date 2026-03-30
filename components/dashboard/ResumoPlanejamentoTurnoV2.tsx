import type { PlanejamentoTurnoDashboardV2 } from '@/types'

interface ResumoPlanejamentoTurnoV2Props {
  planejamento: PlanejamentoTurnoDashboardV2 | null
}

function formatarDataHora(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(valor))
}

export function ResumoPlanejamentoTurnoV2({
  planejamento,
}: ResumoPlanejamentoTurnoV2Props) {
  if (!planejamento) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Planejamento do Turno</h2>
          <p className="text-sm text-slate-600">
            Nenhum turno foi encontrado. Quando um turno for aberto, a dashboard passará a usar o
            turno em aberto ou, na ausência dele, o último turno encerrado.
          </p>
        </div>
      </section>
    )
  }

  const tituloOrigem =
    planejamento.origem === 'aberto' ? 'Turno aberto atual' : 'Último turno encerrado'
  const opsConcluidas = planejamento.ops.filter((op) => op.status === 'concluida').length
  const secoesConcluidas = planejamento.secoesSetorOp.filter(
    (secao) => secao.status === 'concluida'
  ).length
  const progressoOps =
    planejamento.ops.length > 0 ? Math.round((opsConcluidas / planejamento.ops.length) * 100) : 0
  const progressoSecoes =
    planejamento.secoesSetorOp.length > 0
      ? Math.round((secoesConcluidas / planejamento.secoesSetorOp.length) * 100)
      : 0

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Planejamento do Turno</h2>
          <p className="text-sm text-slate-600">
            A dashboard carrega automaticamente o turno aberto atual ou, se não houver um aberto, o
            último turno encerrado.
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
            planejamento.origem === 'aberto'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {tituloOrigem}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{planejamento.turno.status}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Iniciado em</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatarDataHora(planejamento.turno.iniciadoEm)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Encerrado em
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {formatarDataHora(planejamento.turno.encerradoEm)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Observação</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {planejamento.turno.observacao || 'Sem observações'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Operadores disponíveis
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {planejamento.turno.operadoresDisponiveis}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Operadores alocados
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {planejamento.operadores.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">OPs</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{planejamento.ops.length}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            OPs concluídas
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{opsConcluidas}</p>
          <p className="mt-1 text-xs font-medium text-emerald-800">{progressoOps}% do turno</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Seções por setor
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {planejamento.secoesSetorOp.length}
          </p>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            Seções concluídas
          </p>
          <p className="mt-2 text-3xl font-semibold text-blue-900">{secoesConcluidas}</p>
          <p className="mt-1 text-xs font-medium text-blue-800">{progressoSecoes}% do turno</p>
        </div>
      </div>
    </section>
  )
}
