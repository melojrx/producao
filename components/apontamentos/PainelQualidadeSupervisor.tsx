'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Minus, Plus, ShieldAlert } from 'lucide-react'
import { registrarRevisaoLoteQualidade } from '@/lib/actions/qualidade'
import type { TurnoSetorOperacaoApontamentoV2 } from '@/types'
import type {
  QualidadeDefeitoCatalogoItem,
  QualidadeLoteFilaItem,
} from '@/lib/queries/qualidade'

interface PainelQualidadeSupervisorProps {
  operacoesTurno: TurnoSetorOperacaoApontamentoV2[]
  lotesQualidade: QualidadeLoteFilaItem[]
  defeitosCatalogo: QualidadeDefeitoCatalogoItem[]
  podeRevisarQualidade: boolean
  revisorNome: string | null
}

interface DefeitoLoteDraft {
  id: string
  turnoSetorOperacaoIdOrigem: string
  qualidadeDefeitoId: string
  quantidadeDefeito: string
  observacao: string
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

function statusLoteTema(status: QualidadeLoteFilaItem['status']): string {
  return status === 'em_revisao'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-amber-100 text-amber-700'
}

function formatarHorario(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor))
}

export function PainelQualidadeSupervisor({
  operacoesTurno,
  lotesQualidade,
  defeitosCatalogo,
  podeRevisarQualidade,
  revisorNome,
}: PainelQualidadeSupervisorProps) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()
  const [quantidadeAprovada, setQuantidadeAprovada] = useState('0')
  const [quantidadeReprovada, setQuantidadeReprovada] = useState('0')
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [loteSelecionadoId, setLoteSelecionadoId] = useState('')
  const [defeitosLote, setDefeitosLote] = useState<DefeitoLoteDraft[]>([])

  const loteSelecionado =
    lotesQualidade.find((lote) => lote.id === loteSelecionadoId) ?? lotesQualidade[0] ?? null
  const operacoesOrigemLote = useMemo(
    () =>
      loteSelecionado
        ? operacoesTurno
            .filter(
              (operacao) =>
                operacao.turnoOpId === loteSelecionado.turnoOpId
            )
            .sort((operacaoA, operacaoB) => operacaoA.sequencia - operacaoB.sequencia)
        : [],
    [loteSelecionado, operacoesTurno]
  )

  const quantidadeRevisada = quantidadeNumero(quantidadeAprovada) + quantidadeNumero(quantidadeReprovada)

  function resetFormulario() {
    setQuantidadeAprovada('0')
    setQuantidadeReprovada('0')
  }

  function adicionarDefeitoLote() {
    setDefeitosLote((estadoAtual) => [
      ...estadoAtual,
      {
        id: criarIdLocal(),
        turnoSetorOperacaoIdOrigem:
          loteSelecionado?.turnoSetorOperacaoIdOrigem ?? operacoesOrigemLote[0]?.id ?? '',
        qualidadeDefeitoId: defeitosCatalogo[0]?.id ?? '',
        quantidadeDefeito: '1',
        observacao: '',
      },
    ])
  }

  function removerDefeitoLote(id: string) {
    setDefeitosLote((estadoAtual) => estadoAtual.filter((defeito) => defeito.id !== id))
  }

  function atualizarDefeitoLote(id: string, atualizacao: Partial<DefeitoLoteDraft>) {
    setDefeitosLote((estadoAtual) =>
      estadoAtual.map((defeito) => (defeito.id === id ? { ...defeito, ...atualizacao } : defeito))
    )
  }

  function validarFormularioLote(): {
    defeitosNormalizados: Array<{
      turnoSetorOperacaoIdOrigem: string
      qualidadeDefeitoId: string
      quantidadeDefeito: number
      observacao?: string
    }>
  } | null {
    if (!loteSelecionado) {
      setErro('Selecione um lote de qualidade pendente antes de registrar.')
      return null
    }

    if (quantidadeRevisada !== loteSelecionado.quantidadeLote) {
      setErro('A soma de aprovadas e reprovadas precisa fechar exatamente a quantidade do lote.')
      return null
    }

    if (quantidadeNumero(quantidadeReprovada) > 0 && defeitosLote.length === 0) {
      setErro('As peças reprovadas exigem ao menos um defeito do catálogo.')
      return null
    }

    if (quantidadeNumero(quantidadeReprovada) === 0 && defeitosLote.length > 0) {
      setErro('Não informe defeitos quando o lote não possuir peças reprovadas.')
      return null
    }

    const operacoesOrigemValidas = new Set(operacoesOrigemLote.map((operacao) => operacao.id))
    const defeitoChaves = new Set<string>()
    const defeitosNormalizados: Array<{
      turnoSetorOperacaoIdOrigem: string
      qualidadeDefeitoId: string
      quantidadeDefeito: number
      observacao?: string
    }> = []

    for (const defeito of defeitosLote) {
      if (!defeito.turnoSetorOperacaoIdOrigem) {
        setErro('Cada defeito precisa informar a operação produtiva analisada.')
        return null
      }

      if (!operacoesOrigemValidas.has(defeito.turnoSetorOperacaoIdOrigem)) {
        setErro('A operação do defeito precisa pertencer à OP do lote e ser produtiva.')
        return null
      }

      if (!defeito.qualidadeDefeitoId) {
        setErro('Cada defeito precisa estar vinculado ao catálogo.')
        return null
      }

      const chaveDefeito = `${defeito.turnoSetorOperacaoIdOrigem}:${defeito.qualidadeDefeitoId}`

      if (defeitoChaves.has(chaveDefeito)) {
        setErro('Cada combinação de operação e tipo de defeito pode aparecer apenas uma vez por revisão de lote.')
        return null
      }

      const quantidadeDefeito = quantidadeNumero(defeito.quantidadeDefeito)

      if (quantidadeDefeito <= 0) {
        setErro('Cada defeito precisa informar uma quantidade maior que zero.')
        return null
      }

      defeitoChaves.add(chaveDefeito)
      defeitosNormalizados.push({
        turnoSetorOperacaoIdOrigem: defeito.turnoSetorOperacaoIdOrigem,
        qualidadeDefeitoId: defeito.qualidadeDefeitoId,
        quantidadeDefeito,
        observacao: defeito.observacao.trim() || undefined,
      })
    }

    return { defeitosNormalizados }
  }

  function handleRegistrarLote() {
    const formularioValido = validarFormularioLote()

    if (!formularioValido || !loteSelecionado) {
      return
    }

    setErro(null)
    setMensagem(null)

    startTransition(async () => {
      const resultado = await registrarRevisaoLoteQualidade({
        qualidadeLoteId: loteSelecionado.id,
        quantidadeAprovada: quantidadeNumero(quantidadeAprovada),
        quantidadeReprovada: quantidadeNumero(quantidadeReprovada),
        origemLancamento: 'manual_qualidade',
        defeitos: formularioValido.defeitosNormalizados,
      })

      if (!resultado.sucesso) {
        setErro(resultado.erro ?? 'Não foi possível registrar a revisão do lote de qualidade.')
        return
      }

      resetFormulario()
      setDefeitosLote([])
      setMensagem(
        `Lote revisado: ${resultado.quantidadeAprovada ?? 0} aprovada(s) e ${resultado.quantidadeReprovada ?? 0} reprovada(s).`
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

  if (loteSelecionado) {
    return (
      <section className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">Fila contínua de qualidade</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {lotesQualidade.length} lote(s) pendente(s) para revisão
              </h2>
              <p className="text-sm text-slate-600">
                Revisor {revisorNome ?? 'habilitado'} · aprovação libera o fluxo, reprovação exige
                defeito catalogado.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lotes</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{lotesQualidade.length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Peças</p>
                <p className="mt-1 text-2xl font-semibold text-amber-900">
                  {lotesQualidade.reduce((soma, lote) => soma + lote.quantidadeLote, 0)}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Catálogo</p>
                <p className="mt-1 text-2xl font-semibold text-blue-900">{defeitosCatalogo.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
          <div className="space-y-3">
            {lotesQualidade.map((lote) => {
              const ativo = lote.id === loteSelecionado.id

              return (
                <button
                  key={lote.id}
                  type="button"
                  onClick={() => {
                    setLoteSelecionadoId(lote.id)
                    resetFormulario()
                    setDefeitosLote([])
                    setErro(null)
                    setMensagem(null)
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    ativo
                      ? 'border-blue-200 bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{lote.numeroOp}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {lote.produtoReferencia} · {lote.produtoNome}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusLoteTema(lote.status)}`}
                    >
                      {lote.status === 'em_revisao' ? 'em revisão' : 'pendente'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-xs text-slate-500">Lote</p>
                      <p className="font-semibold text-slate-900">{lote.quantidadeLote}</p>
                    </div>
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-xs text-slate-500">Horário</p>
                      <p className="font-semibold text-slate-900">{formatarHorario(lote.criadoEm)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    {lote.setorNomeOrigem} · {lote.operacaoCodigoOrigem} ·{' '}
                    {lote.operacaoDescricaoOrigem}
                  </p>
                </button>
              )
            })}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">Revisão do lote</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {loteSelecionado.numeroOp} · {loteSelecionado.operacaoCodigoOrigem}
                </h3>
                <p className="text-sm text-slate-600">
                  {loteSelecionado.setorNomeOrigem} · criado às{' '}
                  {formatarHorario(loteSelecionado.criadoEm)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Lote</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {loteSelecionado.quantidadeLote}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="qualidade-lote-aprovada" className="text-sm font-medium text-slate-700">
                  Aprovadas
                </label>
                <input
                  id="qualidade-lote-aprovada"
                  type="number"
                  min={0}
                  step={1}
                  value={quantidadeAprovada}
                  onChange={(event) =>
                    setQuantidadeAprovada(normalizarQuantidadeNaoNegativa(event.target.value))
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="qualidade-lote-reprovada" className="text-sm font-medium text-slate-700">
                  Reprovadas
                </label>
                <input
                  id="qualidade-lote-reprovada"
                  type="number"
                  min={0}
                  step={1}
                  value={quantidadeReprovada}
                  onChange={(event) =>
                    setQuantidadeReprovada(normalizarQuantidadeNaoNegativa(event.target.value))
                  }
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Quantidade revisada agora: <strong>{quantidadeRevisada}</strong> de{' '}
              <strong>{loteSelecionado.quantidadeLote}</strong>
            </div>

            {quantidadeNumero(quantidadeReprovada) > 0 ? (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Defeitos catalogados</h3>
                    <p className="text-sm text-slate-600">
                      Registre as ocorrências encontradas; uma peça pode concentrar mais de um defeito.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={adicionarDefeitoLote}
                    disabled={defeitosCatalogo.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus size={16} />
                    Nova linha
                  </button>
                </div>

                {defeitosLote.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    As peças reprovadas exigem ao menos um defeito do catálogo.
                  </div>
                ) : null}

                {defeitosLote.map((defeito, index) => (
                  <div key={defeito.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Defeito {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removerDefeitoLote(defeito.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
                      >
                        <Minus size={14} />
                        Remover
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_120px]">
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">Operação</label>
                        <select
                          value={defeito.turnoSetorOperacaoIdOrigem}
                          onChange={(event) =>
                            atualizarDefeitoLote(defeito.id, {
                              turnoSetorOperacaoIdOrigem: event.target.value,
                            })
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione</option>
                          {operacoesOrigemLote.map((operacao) => (
                            <option key={operacao.id} value={operacao.id}>
                              {operacao.operacaoCodigo} · {operacao.operacaoDescricao}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">Tipo de defeito</label>
                        <select
                          value={defeito.qualidadeDefeitoId}
                          onChange={(event) =>
                            atualizarDefeitoLote(defeito.id, {
                              qualidadeDefeitoId: event.target.value,
                            })
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione</option>
                          {defeitosCatalogo.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-700">Qtd.</label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={defeito.quantidadeDefeito}
                          onChange={(event) =>
                            atualizarDefeitoLote(defeito.id, {
                              quantidadeDefeito: normalizarQuantidadePositiva(event.target.value),
                            })
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">
                        Observação opcional
                      </label>
                      <input
                        type="text"
                        value={defeito.observacao}
                        onChange={(event) =>
                          atualizarDefeitoLote(defeito.id, {
                            observacao: event.target.value,
                          })
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
                onClick={handleRegistrarLote}
                disabled={pendente}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ClipboardCheck size={16} />
                {pendente ? 'Registrando...' : 'Registrar revisão do lote'}
              </button>
            </div>
          </section>
        </section>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
          <ClipboardCheck size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Qualidade sem lotes pendentes</h2>
          <p className="mt-2 text-sm text-slate-600">
            Não há lotes na fila contínua de qualidade para revisão neste turno.
          </p>
        </div>
      </div>
    </section>
  )
}
