'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Minus, Plus, ShieldAlert } from 'lucide-react'
import { registrarRevisaoLoteQualidade, registrarRevisaoQualidade } from '@/lib/actions/qualidade'
import { compararSetoresPorOrdem } from '@/lib/utils/setor-ordem'
import { setorUsaRevisaoQualidade } from '@/lib/utils/qualidade'
import type { PlanejamentoTurnoV2, TurnoSetorOperacaoApontamentoV2, TurnoSetorOpV2 } from '@/types'
import type {
  QualidadeDefeitoCatalogoItem,
  QualidadeLoteFilaItem,
} from '@/lib/queries/qualidade'

interface PainelQualidadeSupervisorProps {
  planejamento: PlanejamentoTurnoV2
  operacoesTurno: TurnoSetorOperacaoApontamentoV2[]
  lotesQualidade: QualidadeLoteFilaItem[]
  defeitosCatalogo: QualidadeDefeitoCatalogoItem[]
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

interface DefeitoLoteDraft {
  id: string
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
    .filter((secao) => secao.status !== 'encerrada_manualmente')
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
  lotesQualidade,
  defeitosCatalogo,
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
  const [loteSelecionadoId, setLoteSelecionadoId] = useState('')
  const [defeitosLote, setDefeitosLote] = useState<DefeitoLoteDraft[]>([])

  const secoesQualidade = useMemo(() => montarSecoesQualidade(planejamento), [planejamento])
  const loteSelecionado =
    lotesQualidade.find((lote) => lote.id === loteSelecionadoId) ?? lotesQualidade[0] ?? null
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

  function adicionarDefeitoLote() {
    setDefeitosLote((estadoAtual) => [
      ...estadoAtual,
      {
        id: criarIdLocal(),
        qualidadeDefeitoId: defeitosCatalogo[0]?.id ?? '',
        quantidadeDefeito: '1',
        observacao: '',
      },
    ])
  }

  function removerDefeito(id: string) {
    setDefeitos((estadoAtual) => estadoAtual.filter((defeito) => defeito.id !== id))
  }

  function removerDefeitoLote(id: string) {
    setDefeitosLote((estadoAtual) => estadoAtual.filter((defeito) => defeito.id !== id))
  }

  function atualizarDefeito(id: string, atualizacao: Partial<DefeitoDraft>) {
    setDefeitos((estadoAtual) =>
      estadoAtual.map((defeito) => (defeito.id === id ? { ...defeito, ...atualizacao } : defeito))
    )
  }

  function atualizarDefeitoLote(id: string, atualizacao: Partial<DefeitoLoteDraft>) {
    setDefeitosLote((estadoAtual) =>
      estadoAtual.map((defeito) => (defeito.id === id ? { ...defeito, ...atualizacao } : defeito))
    )
  }

  function validarFormularioLote(): {
    defeitosNormalizados: Array<{
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

    const defeitoIds = new Set<string>()
    const defeitosNormalizados: Array<{
      qualidadeDefeitoId: string
      quantidadeDefeito: number
      observacao?: string
    }> = []

    for (const defeito of defeitosLote) {
      if (!defeito.qualidadeDefeitoId) {
        setErro('Cada defeito precisa estar vinculado ao catálogo.')
        return null
      }

      if (defeitoIds.has(defeito.qualidadeDefeitoId)) {
        setErro('Cada defeito do catálogo pode aparecer apenas uma vez por revisão de lote.')
        return null
      }

      const quantidadeDefeito = quantidadeNumero(defeito.quantidadeDefeito)

      if (quantidadeDefeito <= 0) {
        setErro('Cada defeito precisa informar uma quantidade maior que zero.')
        return null
      }

      defeitoIds.add(defeito.qualidadeDefeitoId)
      defeitosNormalizados.push({
        qualidadeDefeitoId: defeito.qualidadeDefeitoId,
        quantidadeDefeito,
        observacao: defeito.observacao.trim() || undefined,
      })
    }

    const totalDefeitos = defeitosNormalizados.reduce(
      (soma, defeito) => soma + defeito.quantidadeDefeito,
      0
    )

    if (totalDefeitos !== quantidadeNumero(quantidadeReprovada)) {
      setErro('A soma dos defeitos precisa fechar exatamente a quantidade reprovada.')
      return null
    }

    return { defeitosNormalizados }
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
                      A soma dos defeitos deve fechar a quantidade reprovada.
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

                    <div className="grid gap-3 md:grid-cols-[1fr_120px]">
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
                  {secao.numeroOp} · {secao.produtoReferencia} · disponível {secao.quantidadeDisponivelAgora}
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
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">Disponível</p>
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
