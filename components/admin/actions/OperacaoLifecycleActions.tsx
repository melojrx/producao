'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Ban, Trash2, X } from 'lucide-react'
import { desativarOperacao, excluirOperacao } from '@/lib/actions/operacoes'
import {
  obterConteudoConfirmacaoOperacao,
  type AcaoCicloVidaOperacao,
} from '@/lib/utils/operacao-lifecycle-copy'

interface OperacaoLifecycleActionsProps {
  operacaoId: string
  codigo: string
  ativa: boolean
  compact?: boolean
}

export function OperacaoLifecycleActions({
  operacaoId,
  codigo,
  ativa,
  compact = false,
}: OperacaoLifecycleActionsProps) {
  const router = useRouter()
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [acaoPendente, setAcaoPendente] = useState<AcaoCicloVidaOperacao | null>(null)

  function confirmarDesativacao() {
    if (!ativa) {
      setAcaoPendente(null)
      return
    }

    startTransition(async () => {
      const resultado = await desativarOperacao(operacaoId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        setAcaoPendente(null)
        return
      }

      setMensagem('Operação desativada com sucesso.')
      setAcaoPendente(null)
      router.refresh()
    })
  }

  function confirmarExclusao() {
    startTransition(async () => {
      const resultado = await excluirOperacao(operacaoId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        setAcaoPendente(null)
        return
      }

      setAcaoPendente(null)
      router.push('/admin/operacoes')
      router.refresh()
    })
  }

  function abrirConfirmacao(acao: AcaoCicloVidaOperacao) {
    if (acao === 'desativar' && !ativa) {
      return
    }

    setMensagem(null)
    setAcaoPendente(acao)
  }

  function cancelarConfirmacao() {
    if (isPending) {
      return
    }

    setAcaoPendente(null)
  }

  function confirmarAcaoPendente() {
    if (acaoPendente === 'desativar') {
      confirmarDesativacao()
      return
    }

    if (acaoPendente === 'excluir') {
      confirmarExclusao()
    }
  }

  if (compact) {
    return (
      <>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={isPending || !ativa}
              onClick={() => abrirConfirmacao('desativar')}
              aria-label={ativa ? `Desativar ${codigo}` : `${codigo} já desativada`}
              title={ativa ? 'Desativar operação sem apagar o histórico' : 'Operação já desativada'}
              className="inline-flex rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Ban size={16} />
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => abrirConfirmacao('excluir')}
              aria-label={`Excluir permanentemente ${codigo}`}
              title="Excluir permanentemente apenas se a operação nunca tiver sido usada"
              className="inline-flex rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {mensagem ? (
            <p className="max-w-xs text-right text-xs text-gray-500">{mensagem}</p>
          ) : null}
        </div>

        {acaoPendente ? (
          <ModalConfirmacaoOperacao
            acao={acaoPendente}
            codigo={codigo}
            executando={isPending}
            aoCancelar={cancelarConfirmacao}
            aoConfirmar={confirmarAcaoPendente}
          />
        ) : null}
      </>
    )
  }

  return (
    <>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">Ações de ciclo de vida</h2>
        <p className="mt-1 text-sm text-amber-800">
          Em produção, prefira desativar a operação. Excluir só quando ela não estiver em roteiros nem histórico.
        </p>

        {mensagem ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm text-amber-900">
            {mensagem}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isPending || !ativa}
            onClick={() => abrirConfirmacao('desativar')}
            title="Desativar esta operação sem apagar o histórico"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Ban size={16} />
            {!ativa ? 'Já desativada' : 'Desativar operação'}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => abrirConfirmacao('excluir')}
            title="Excluir permanentemente se não houver dependências"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} />
            Excluir permanentemente
          </button>
        </div>
      </div>
      {acaoPendente ? (
        <ModalConfirmacaoOperacao
          acao={acaoPendente}
          codigo={codigo}
          executando={isPending}
          aoCancelar={cancelarConfirmacao}
          aoConfirmar={confirmarAcaoPendente}
        />
      ) : null}
    </>
  )
}

interface ModalConfirmacaoOperacaoProps {
  acao: AcaoCicloVidaOperacao
  codigo: string
  executando: boolean
  aoCancelar: () => void
  aoConfirmar: () => void
}

function ModalConfirmacaoOperacao({
  acao,
  codigo,
  executando,
  aoCancelar,
  aoConfirmar,
}: ModalConfirmacaoOperacaoProps) {
  const excluindo = acao === 'excluir'
  const conteudo = obterConteudoConfirmacaoOperacao({
    acao,
    codigo,
    executando,
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={conteudo.titulo}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                excluindo ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}
            >
              <AlertTriangle size={14} />
              Confirmação operacional
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{conteudo.titulo}</h2>
              <p className="text-sm text-slate-600">{conteudo.descricao}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoCancelar}
            disabled={executando}
            aria-label="Fechar modal de confirmação da operação"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              excluindo
                ? 'border border-red-200 bg-red-50 text-red-900'
                : 'border border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {conteudo.aviso}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={aoCancelar}
              disabled={executando}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={aoConfirmar}
              disabled={executando}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                excluindo ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <AlertTriangle size={16} />
              {conteudo.rotuloConfirmacao}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
