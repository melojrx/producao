'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Minus, Plus, ShieldAlert } from 'lucide-react'
import { registrarRevisaoQualidade } from '@/lib/actions/qualidade'
import {
  calcularResumoPendenciaAprovacaoQualidade,
  montarFilaQualidadeOperacional,
  validarRevisaoParcialQualidade,
} from '@/lib/utils/qualidade-operacional'
import type {
  PlanejamentoTurnoDashboardV2,
  TurnoSetorOperacaoApontamentoV2,
} from '@/types'
import type {
  QualidadeDefeitoCatalogoItem,
} from '@/lib/queries/qualidade'

interface PainelQualidadeSupervisorProps {
  planejamento: PlanejamentoTurnoDashboardV2
  operacoesTurno: TurnoSetorOperacaoApontamentoV2[]
  defeitosCatalogo: QualidadeDefeitoCatalogoItem[]
  podeRevisarQualidade: boolean
  revisorNome: string | null
}

interface QualidadePendenciaRevisaoItem {
  id: string
  turnoId: string
  turnoOpId: string
  numeroOp: string
  produtoNome: string
  produtoReferencia: string
  turnoSetorOperacaoIdOrigem: string
  operacaoCodigoOrigem: string
  operacaoDescricaoOrigem: string
  setorNomeOrigem: string
  quantidadePendente: number
  quantidadeRecebida: number
  quantidadeAprovadaAcumulada: number
  quantidadeReprovadaAcumulada: number
  quantidadeRevisadaAcumulada: number
  criadoEm: string
}

interface DefeitoRevisaoDraft {
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

function formatarHorario(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor))
}

export function PainelQualidadeSupervisor({
  planejamento,
  operacoesTurno,
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
  const [pendenciaSelecionadaId, setPendenciaSelecionadaId] = useState('')
  const [defeitosRevisao, setDefeitosRevisao] = useState<DefeitoRevisaoDraft[]>([])

  const itensQualidadeOperacional = useMemo(
    () =>
      montarFilaQualidadeOperacional({
        ops: planejamento.ops,
        demandasSetor: planejamento.demandasSetor ?? [],
        operacoesTurno,
      }),
    [operacoesTurno, planejamento.demandasSetor, planejamento.ops]
  )
  const resumosQualidadePorTurnoOpId = useMemo(
    () =>
      new Map(
        (planejamento.qualidadeResumoOps ?? []).map((resumo) => [resumo.turnoOpId, resumo])
      ),
    [planejamento.qualidadeResumoOps]
  )
  const itensRevisao = useMemo<QualidadePendenciaRevisaoItem[]>(
    () =>
      itensQualidadeOperacional.map((item) => {
        const resumoQualidade = resumosQualidadePorTurnoOpId.get(item.turnoOpId)
        const quantidadeAprovadaAcumulada =
          resumoQualidade?.quantidadeAprovada ?? item.operacaoQualidade.quantidadeRealizada
        const quantidadeReprovadaAcumulada = resumoQualidade?.quantidadeReprovada ?? 0
        const quantidadeRevisadaAcumulada =
          resumoQualidade?.quantidadeRevisada ??
          quantidadeAprovadaAcumulada + quantidadeReprovadaAcumulada

        return {
          id: `operacional:${item.operacaoQualidade.id}`,
          turnoId: item.demandaQualidade.turnoId,
          turnoOpId: item.turnoOpId,
          numeroOp: item.numeroOp,
          produtoNome: item.produtoNome,
          produtoReferencia: item.produtoReferencia,
          turnoSetorOperacaoIdOrigem: item.operacaoQualidade.id,
          operacaoCodigoOrigem: item.operacaoQualidade.operacaoCodigo,
          operacaoDescricaoOrigem: item.operacaoQualidade.operacaoDescricao,
          setorNomeOrigem: item.demandaQualidade.setorNome,
          quantidadePendente: item.quantidadeDisponivelRevisao,
          quantidadeRecebida: item.quantidadeDisponivelRevisao + quantidadeAprovadaAcumulada,
          quantidadeAprovadaAcumulada,
          quantidadeReprovadaAcumulada,
          quantidadeRevisadaAcumulada,
          criadoEm:
            item.operacaoQualidade.iniciadoEm ??
            item.demandaQualidade.iniciadoEm ??
            planejamento.turno.iniciadoEm,
        }
      }),
    [itensQualidadeOperacional, planejamento.turno.iniciadoEm, resumosQualidadePorTurnoOpId]
  )
  const pendenciaSelecionada =
    itensRevisao.find((pendencia) => pendencia.id === pendenciaSelecionadaId) ??
    itensRevisao[0] ??
    null
  const itemOperacionalSelecionado = pendenciaSelecionada
    ? itensQualidadeOperacional.find(
        (item) => `operacional:${item.operacaoQualidade.id}` === pendenciaSelecionada.id
      ) ?? null
    : null
  const operacoesOrigemRevisao = useMemo(
    () =>
      itemOperacionalSelecionado
        ? itemOperacionalSelecionado.operacoesOrigem
        : pendenciaSelecionada
        ? operacoesTurno
            .filter(
              (operacao) =>
                operacao.turnoOpId === pendenciaSelecionada.turnoOpId
            )
            .sort((operacaoA, operacaoB) => operacaoA.sequencia - operacaoB.sequencia)
        : [],
    [itemOperacionalSelecionado, pendenciaSelecionada, operacoesTurno]
  )

  const quantidadeRevisada = quantidadeNumero(quantidadeAprovada) + quantidadeNumero(quantidadeReprovada)
  const resumoPendenciaSelecionada = pendenciaSelecionada
    ? calcularResumoPendenciaAprovacaoQualidade({
        quantidadeRecebida: pendenciaSelecionada.quantidadeRecebida,
        quantidadeAprovada: pendenciaSelecionada.quantidadeAprovadaAcumulada,
        quantidadeReprovada: pendenciaSelecionada.quantidadeReprovadaAcumulada,
      })
    : null

  function resetFormulario() {
    setQuantidadeAprovada('0')
    setQuantidadeReprovada('0')
  }

  function adicionarDefeitoRevisao() {
    setDefeitosRevisao((estadoAtual) => [
      ...estadoAtual,
      {
        id: criarIdLocal(),
        turnoSetorOperacaoIdOrigem:
          pendenciaSelecionada?.turnoSetorOperacaoIdOrigem ??
          operacoesOrigemRevisao[0]?.id ??
          '',
        qualidadeDefeitoId: defeitosCatalogo[0]?.id ?? '',
        quantidadeDefeito: '1',
        observacao: '',
      },
    ])
  }

  function removerDefeitoRevisao(id: string) {
    setDefeitosRevisao((estadoAtual) => estadoAtual.filter((defeito) => defeito.id !== id))
  }

  function atualizarDefeitoRevisao(id: string, atualizacao: Partial<DefeitoRevisaoDraft>) {
    setDefeitosRevisao((estadoAtual) =>
      estadoAtual.map((defeito) => (defeito.id === id ? { ...defeito, ...atualizacao } : defeito))
    )
  }

  function validarFormularioRevisao(): {
    defeitosNormalizados: Array<{
      turnoSetorOperacaoIdOrigem: string
      qualidadeDefeitoId: string
      quantidadeDefeito: number
      observacao?: string
    }>
  } | null {
    if (!pendenciaSelecionada) {
      setErro('Selecione uma pendência da etapa Qualidade antes de registrar.')
      return null
    }

    const validacaoParcial = validarRevisaoParcialQualidade({
      quantidadePendente: pendenciaSelecionada.quantidadePendente,
      quantidadeAprovada: quantidadeNumero(quantidadeAprovada),
      quantidadeReprovada: quantidadeNumero(quantidadeReprovada),
    })

    if (validacaoParcial.erro) {
      setErro(validacaoParcial.erro)
      return null
    }

    if (quantidadeNumero(quantidadeReprovada) > 0 && defeitosRevisao.length === 0) {
      setErro('As peças reprovadas exigem ao menos um defeito do catálogo.')
      return null
    }

    if (quantidadeNumero(quantidadeReprovada) === 0 && defeitosRevisao.length > 0) {
      setErro('Não informe defeitos quando a revisão não possuir peças reprovadas.')
      return null
    }

    const operacoesOrigemValidas = new Set(operacoesOrigemRevisao.map((operacao) => operacao.id))
    const defeitoChaves = new Set<string>()
    const defeitosNormalizados: Array<{
      turnoSetorOperacaoIdOrigem: string
      qualidadeDefeitoId: string
      quantidadeDefeito: number
      observacao?: string
    }> = []

    for (const defeito of defeitosRevisao) {
      if (!defeito.turnoSetorOperacaoIdOrigem) {
        setErro('Cada defeito precisa informar a operação produtiva analisada.')
        return null
      }

      if (!operacoesOrigemValidas.has(defeito.turnoSetorOperacaoIdOrigem)) {
        setErro('A operação do defeito precisa pertencer à OP em revisão e ser produtiva.')
        return null
      }

      if (!defeito.qualidadeDefeitoId) {
        setErro('Cada defeito precisa estar vinculado ao catálogo.')
        return null
      }

      const chaveDefeito = `${defeito.turnoSetorOperacaoIdOrigem}:${defeito.qualidadeDefeitoId}`

      if (defeitoChaves.has(chaveDefeito)) {
        setErro('Cada combinação de operação e tipo de defeito pode aparecer apenas uma vez por revisão.')
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

  function handleRegistrarRevisao() {
    const formularioValido = validarFormularioRevisao()

    if (!formularioValido || !pendenciaSelecionada) {
      return
    }

    setErro(null)
    setMensagem(null)

    startTransition(async () => {
      const resultado = await registrarRevisaoQualidade({
        turnoSetorOperacaoIdQualidade: pendenciaSelecionada.turnoSetorOperacaoIdOrigem,
        quantidadeAprovada: quantidadeNumero(quantidadeAprovada),
        quantidadeReprovada: quantidadeNumero(quantidadeReprovada),
        origemLancamento: 'manual_qualidade',
        defeitos: formularioValido.defeitosNormalizados,
      })

      if (!resultado.sucesso) {
        setErro(resultado.erro ?? 'Não foi possível registrar a revisão da etapa Qualidade.')
        return
      }

      resetFormulario()
      setDefeitosRevisao([])
      setMensagem(
        `Revisão registrada: ${resultado.quantidadeAprovada ?? 0} aprovada(s) e ${resultado.quantidadeReprovada ?? 0} reprovada(s).`
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

  if (pendenciaSelecionada) {
    return (
      <section className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-700">Fila contínua de qualidade</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {itensRevisao.length} item(ns) pendente(s) para revisão
              </h2>
              <p className="text-sm text-slate-600">
                Revisor {revisorNome ?? 'habilitado'} · aprovação libera o fluxo, reprovação exige
                defeito catalogado.
              </p>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Reprovadas permanecem pendentes até retornarem corrigidas.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Pendências
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{itensRevisao.length}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Pendência de aprovação
                </p>
                <p className="mt-1 text-2xl font-semibold text-amber-900">
                  {itensRevisao.reduce(
                    (soma, pendencia) => soma + pendencia.quantidadePendente,
                    0
                  )}
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
            {itensRevisao.map((pendencia) => {
              const ativo = pendencia.id === pendenciaSelecionada.id

              return (
                <button
                  key={pendencia.id}
                  type="button"
                  onClick={() => {
                    setPendenciaSelecionadaId(pendencia.id)
                    resetFormulario()
                    setDefeitosRevisao([])
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
                      <p className="text-sm font-semibold text-slate-900">{pendencia.numeroOp}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {pendencia.produtoReferencia} · {pendencia.produtoNome}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700"
                    >
                      pendente
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-xs text-slate-500">Pendência de aprovação</p>
                      <p className="font-semibold text-slate-900">
                        {pendencia.quantidadePendente}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/70 px-3 py-2">
                      <p className="text-xs text-slate-500">Horário</p>
                      <p className="font-semibold text-slate-900">
                        {formatarHorario(pendencia.criadoEm)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-600">
                    Etapa Qualidade · {pendencia.operacaoCodigoOrigem} ·{' '}
                    {pendencia.operacaoDescricaoOrigem}
                  </p>
                </button>
              )
            })}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  Revisão da etapa Qualidade
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {pendenciaSelecionada.numeroOp} · {pendenciaSelecionada.operacaoCodigoOrigem}
                </h3>
                <p className="text-sm text-slate-600">
                  {pendenciaSelecionada.setorNomeOrigem} · criado às{' '}
                  {formatarHorario(pendenciaSelecionada.criadoEm)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Pendência de aprovação
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {pendenciaSelecionada.quantidadePendente}
                </p>
              </div>
            </div>

            {resumoPendenciaSelecionada ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Recebidas
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {resumoPendenciaSelecionada.quantidadeRecebida}
                  </p>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                    Revisadas
                  </p>
                  <p className="mt-1 text-lg font-semibold text-blue-900">
                    {pendenciaSelecionada.quantidadeRevisadaAcumulada}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Aprovadas
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-900">
                    {resumoPendenciaSelecionada.quantidadeAprovada}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
                    Reprovadas
                  </p>
                  <p className="mt-1 text-lg font-semibold text-rose-900">
                    {resumoPendenciaSelecionada.quantidadeReprovada}
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                    Pendentes
                  </p>
                  <p className="mt-1 text-lg font-semibold text-amber-900">
                    {resumoPendenciaSelecionada.quantidadePendenteAprovacao}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Reprovadas permanecem pendentes até retornarem corrigidas.
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="qualidade-revisao-aprovada" className="text-sm font-medium text-slate-700">
                  Aprovadas
                </label>
                <input
                  id="qualidade-revisao-aprovada"
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
                <label htmlFor="qualidade-revisao-reprovada" className="text-sm font-medium text-slate-700">
                  Reprovadas
                </label>
                <input
                  id="qualidade-revisao-reprovada"
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
              <strong>{pendenciaSelecionada.quantidadePendente}</strong>
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
                    onClick={adicionarDefeitoRevisao}
                    disabled={defeitosCatalogo.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus size={16} />
                    Nova linha
                  </button>
                </div>

                {defeitosRevisao.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    As peças reprovadas exigem ao menos um defeito do catálogo.
                  </div>
                ) : null}

                {defeitosRevisao.map((defeito, index) => (
                  <div key={defeito.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Defeito {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removerDefeitoRevisao(defeito.id)}
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
                            atualizarDefeitoRevisao(defeito.id, {
                              turnoSetorOperacaoIdOrigem: event.target.value,
                            })
                          }
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Selecione</option>
                          {operacoesOrigemRevisao.map((operacao) => (
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
                            atualizarDefeitoRevisao(defeito.id, {
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
                            atualizarDefeitoRevisao(defeito.id, {
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
                          atualizarDefeitoRevisao(defeito.id, {
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
                onClick={handleRegistrarRevisao}
                disabled={pendente}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ClipboardCheck size={16} />
                {pendente ? 'Registrando...' : 'Registrar revisão'}
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
          <h2 className="text-lg font-semibold text-slate-900">Qualidade sem itens pendentes</h2>
          <p className="mt-2 text-sm text-slate-600">
            Não há peças disponíveis na etapa Qualidade para revisão neste turno.
          </p>
        </div>
      </div>
    </section>
  )
}
