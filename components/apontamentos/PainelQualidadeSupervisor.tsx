'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Minus, Plus, ShieldAlert } from 'lucide-react'
import { registrarRevisaoQualidade } from '@/lib/actions/qualidade'
import { compararSetoresPorOrdem } from '@/lib/utils/setor-ordem'
import { setorUsaRevisaoQualidade } from '@/lib/utils/qualidade'
import type { PlanejamentoTurnoV2, TurnoSetorOperacaoApontamentoV2, TurnoSetorOpV2 } from '@/types'

interface PainelQualidadeSupervisorProps {
  planejamento: PlanejamentoTurnoV2
  operacoesTurno: TurnoSetorOperacaoApontamentoV2[]
  podeRevisarQualidade: boolean
  revisorNome: string | null
}

interface SecaoQualidadeComContexto extends TurnoSetorOpV2 {
  numeroOp: string
  produtoNome: string
  produtoReferencia: string
  quantidadeDisponivelAgora: number
}

interface DefeitoDraft {
  id: string
  turnoSetorOperacaoIdOrigem: string
  quantidadeDefeito: string
}

function criarIdLocal(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `qualidade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function quantidadeNumero(valor: string): number {
  const quantidade = Number.parseInt(valor, 10)
  return Number.isFinite(quantidade) ? quantidade : 0
}

function normalizarQuantidadeNaoNegativa(valor: string): string {
  if (valor.trim() === '') {
    return ''
  }

  const quantidade = Number.parseInt(valor, 10)

  if (!Number.isFinite(quantidade) || quantidade < 0) {
    return '0'
  }

  return String(quantidade)
}

function normalizarQuantidadePositiva(valor: string): string {
  if (valor.trim() === '') {
    return ''
  }

  const quantidade = Number.parseInt(valor, 10)

  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return '1'
  }

  return String(quantidade)
}

function statusTema(status: TurnoSetorOpV2['status']): string {
  if (status === 'concluida') {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (status === 'em_andamento') {
    return 'bg-blue-100 text-blue-700'
  }

  if (status === 'encerrada_manualmente') {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-slate-100 text-slate-700'
}

function montarSecoesQualidade(planejamento: PlanejamentoTurnoV2): SecaoQualidadeComContexto[] {
  const opPorId = new Map(planejamento.ops.map((op) => [op.id, op]))
  const demandaPorSecaoLegacyId = new Map(
    (planejamento.demandasSetor ?? [])
      .filter((demanda) => Boolean(demanda.turnoSetorOpLegacyId))
      .map((demanda) => [demanda.turnoSetorOpLegacyId, demanda] as const)
  )

  return planejamento.secoesSetorOp
    .filter((secao) => setorUsaRevisaoQualidade(secao.setorNome))
    .map((secao) => {
      const op = opPorId.get(secao.turnoOpId)

      if (!op) {
        return null
      }

      const demanda =
        demandaPorSecaoLegacyId.get(secao.id) ??
        (planejamento.demandasSetor ?? []).find(
          (item) => item.turnoOpId === secao.turnoOpId && item.setorId === secao.setorId
        )

      return {
        ...secao,
        numeroOp: op.numeroOp,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
        quantidadeDisponivelAgora:
          demanda?.quantidadeDisponivelApontamento ??
          Math.max(secao.quantidadePlanejada - secao.quantidadeConcluida, 0),
      }
    })
    .filter((secao): secao is SecaoQualidadeComContexto => Boolean(secao))
    .filter(
      (secao) =>
        secao.status !== 'concluida' &&
        secao.status !== 'encerrada_manualmente' &&
        secao.quantidadeDisponivelAgora > 0
    )
    .sort((primeiraSecao, segundaSecao) => {
      const comparacaoOp = primeiraSecao.numeroOp.localeCompare(segundaSecao.numeroOp)
      if (comparacaoOp !== 0) {
        return comparacaoOp
      }

      return compararSetoresPorOrdem(primeiraSecao, segundaSecao)
    })
}

export function PainelQualidadeSupervisor({
  planejamento,
  operacoesTurno,
  podeRevisarQualidade,
  revisorNome,
}: PainelQualidadeSupervisorProps) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  const [secaoSelecionadaId, setSecaoSelecionadaId] = useState('')
  const [quantidadeAprovada, setQuantidadeAprovada] = useState('0')
  const [quantidadeReprovada, setQuantidadeReprovada] = useState('0')
  const [defeitos, setDefeitos] = useState<DefeitoDraft[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  const secoesQualidade = useMemo(() => montarSecoesQualidade(planejamento), [planejamento])
  const secaoSelecionada =
    secoesQualidade.find((secao) => secao.id === secaoSelecionadaId) ?? secoesQualidade[0] ?? null

  const operacaoQualidade = useMemo(
    () =>
      secaoSelecionada
        ? operacoesTurno.find((operacao) => operacao.turnoSetorOpId === secaoSelecionada.id) ?? null
        : null,
    [operacoesTurno, secaoSelecionada]
  )

  const operacoesOrigem = useMemo(
    () =>
      secaoSelecionada
        ? operacoesTurno.filter(
            (operacao) =>
              operacao.turnoOpId === secaoSelecionada.turnoOpId &&
              operacao.turnoSetorOpId !== secaoSelecionada.id &&
              operacao.setorId !== secaoSelecionada.setorId
          )
        : [],
    [operacoesTurno, secaoSelecionada]
  )

  const quantidadeRevisada = quantidadeNumero(quantidadeAprovada) + quantidadeNumero(quantidadeReprovada)

  function resetFormulario() {
    setQuantidadeAprovada('0')
    setQuantidadeReprovada('0')
    setDefeitos([])
  }

  function adicionarDefeito() {
    setDefeitos((estadoAtual) => [
      ...estadoAtual,
      {
        id: criarIdLocal(),
        turnoSetorOperacaoIdOrigem: operacoesOrigem[0]?.id ?? '',
        quantidadeDefeito: '1',
      },
    ])
  }

  function removerDefeito(id: string) {
    setDefeitos((estadoAtual) => estadoAtual.filter((defeito) => defeito.id !== id))
  }

  function atualizarDefeito(id: string, atualizacao: Partial<DefeitoDraft>) {
    setDefeitos((estadoAtual) =>
      estadoAtual.map((defeito) => (defeito.id === id ? { ...defeito, ...atualizacao } : defeito))
    )
  }

  function validarFormulario(): { defeitosNormalizados: Array<{ turnoSetorOperacaoIdOrigem: string; quantidadeDefeito: number }> } | null {
    if (!secaoSelecionada || !operacaoQualidade) {
      setErro('Selecione uma seção de Qualidade válida antes de registrar.')
      return null
    }

    if (quantidadeRevisada <= 0) {
      setErro('Informe ao menos uma peça aprovada ou reprovada.')
      return null
    }

    if (quantidadeRevisada > secaoSelecionada.quantidadeDisponivelAgora) {
      setErro(
        `A revisão ultrapassa o saldo disponível da seção. Disponível agora: ${secaoSelecionada.quantidadeDisponivelAgora}.`
      )
      return null
    }

    if (quantidadeNumero(quantidadeReprovada) > 0 && defeitos.length === 0) {
      setErro('As peças reprovadas exigem ao menos uma operação de origem com defeito.')
      return null
    }

    const ids = new Set<string>()
    const defeitosNormalizados: Array<{ turnoSetorOperacaoIdOrigem: string; quantidadeDefeito: number }> = []

    for (const defeito of defeitos) {
      if (!defeito.turnoSetorOperacaoIdOrigem) {
        setErro('Cada defeito precisa informar a operação de origem.')
        return null
      }

      if (ids.has(defeito.turnoSetorOperacaoIdOrigem)) {
        setErro('Cada operação de origem pode aparecer apenas uma vez por revisão.')
        return null
      }

      const quantidadeDefeito = quantidadeNumero(defeito.quantidadeDefeito)

      if (quantidadeDefeito <= 0) {
        setErro('Cada defeito precisa informar uma quantidade maior que zero.')
        return null
      }

      ids.add(defeito.turnoSetorOperacaoIdOrigem)
      defeitosNormalizados.push({
        turnoSetorOperacaoIdOrigem: defeito.turnoSetorOperacaoIdOrigem,
        quantidadeDefeito,
      })
    }

    return { defeitosNormalizados }
  }

  function handleRegistrar() {
    const formularioValido = validarFormulario()

    if (!formularioValido || !operacaoQualidade) {
      return
    }

    setErro(null)
    setMensagem(null)

    startTransition(async () => {
      const resultado = await registrarRevisaoQualidade({
        turnoSetorOperacaoIdQualidade: operacaoQualidade.id,
        quantidadeAprovada: quantidadeNumero(quantidadeAprovada),
        quantidadeReprovada: quantidadeNumero(quantidadeReprovada),
        origemLancamento: 'manual_qualidade',
        defeitos: formularioValido.defeitosNormalizados,
      })

      if (!resultado.sucesso) {
        setErro(resultado.erro ?? 'Não foi possível registrar a revisão de qualidade.')
        return
      }

      resetFormulario()
      setMensagem(
        `${resultado.quantidadeAprovada ?? 0} aprovada(s) e ${resultado.quantidadeReprovada ?? 0} reprovada(s) registradas com sucesso.`
      )
      router.refresh()
    })
  }

  if (!podeRevisarQualidade) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Qualidade restrita</h2>
            <p className="mt-2 text-sm text-slate-600">
              Sua sessão administrativa não possui permissão de revisor para usar o fluxo de qualidade.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!secaoSelecionada || !operacaoQualidade) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Qualidade sem pendências</h2>
            <p className="mt-2 text-sm text-slate-600">
              Não há seções de Qualidade liberadas para revisão no turno aberto.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">Fluxo de qualidade</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {secaoSelecionada.numeroOp} · {secaoSelecionada.produtoReferencia}
            </h2>
            <p className="text-sm text-slate-600">
              {secaoSelecionada.produtoNome} · revisor {revisorNome ?? 'habilitado'}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTema(secaoSelecionada.status)}`}
          >
            {secaoSelecionada.status}
          </span>
        </div>

        {secoesQualidade.length > 1 ? (
          <div className="mt-4 flex flex-col gap-1">
            <label htmlFor="qualidade-secao" className="text-sm font-medium text-slate-700">
              Seção de qualidade
            </label>
            <select
              id="qualidade-secao"
              value={secaoSelecionada.id}
              onChange={(event) => {
                setSecaoSelecionadaId(event.target.value)
                resetFormulario()
                setErro(null)
                setMensagem(null)
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {secoesQualidade.map((secao) => (
                <option key={secao.id} value={secao.id}>
                  {secao.numeroOp} · {secao.produtoReferencia} · disponível agora {secao.quantidadeDisponivelAgora}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Planejado</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{secaoSelecionada.quantidadePlanejada}</p>
          </article>
          <article className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Revisado</p>
            <p className="mt-2 text-2xl font-semibold text-blue-900">{secaoSelecionada.quantidadeConcluida}</p>
          </article>
          <article className="rounded-2xl bg-cyan-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">Disponível agora</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-900">{secaoSelecionada.quantidadeDisponivelAgora}</p>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="qualidade-aprovada" className="text-sm font-medium text-slate-700">
              Aprovadas
            </label>
            <input
              id="qualidade-aprovada"
              type="number"
              min={0}
              step={1}
              value={quantidadeAprovada}
              onChange={(event) => setQuantidadeAprovada(normalizarQuantidadeNaoNegativa(event.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="qualidade-reprovada" className="text-sm font-medium text-slate-700">
              Reprovadas
            </label>
            <input
              id="qualidade-reprovada"
              type="number"
              min={0}
              step={1}
              value={quantidadeReprovada}
              onChange={(event) => setQuantidadeReprovada(normalizarQuantidadeNaoNegativa(event.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Quantidade revisada agora: <strong>{quantidadeRevisada}</strong>
        </div>

        {quantidadeNumero(quantidadeReprovada) > 0 ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Defeitos por operação de origem</h3>
                <p className="text-sm text-slate-600">
                  Distribua as ocorrências nas operações produtivas da OP revisada.
                </p>
              </div>
              <button
                type="button"
                onClick={adicionarDefeito}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={16} />
                Nova linha
              </button>
            </div>

            {defeitos.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                As peças reprovadas exigem ao menos uma operação de origem com defeito.
              </div>
            ) : null}

            {defeitos.map((defeito, index) => (
              <div key={defeito.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">Origem {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removerDefeito(defeito.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
                  >
                    <Minus size={14} />
                    Remover
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">Operação</label>
                    <select
                      value={defeito.turnoSetorOperacaoIdOrigem}
                      onChange={(event) =>
                        atualizarDefeito(defeito.id, {
                          turnoSetorOperacaoIdOrigem: event.target.value,
                        })
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione</option>
                      {operacoesOrigem.map((operacao) => (
                        <option key={operacao.id} value={operacao.id}>
                          {operacao.operacaoCodigo} · {operacao.operacaoDescricao}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-slate-700">Defeitos</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={defeito.quantidadeDefeito}
                      onChange={(event) =>
                        atualizarDefeito(defeito.id, {
                          quantidadeDefeito: normalizarQuantidadePositiva(event.target.value),
                        })
                      }
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {mensagem ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <p>{mensagem}</p>
            </div>
          </div>
        ) : null}

        {erro ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{erro}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleRegistrar}
            disabled={pendente}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ClipboardCheck size={16} />
            {pendente ? 'Registrando...' : 'Registrar revisão'}
          </button>
        </div>
      </section>
    </section>
  )
}
