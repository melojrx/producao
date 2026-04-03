'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Archive, Trash2, X } from 'lucide-react'
import { desativarProduto, excluirProduto } from '@/lib/actions/produtos'

type AcaoCicloVidaProduto = 'arquivar' | 'excluir'

interface ProdutoLifecycleActionsProps {
  produtoId: string
  referencia: string
  ativo: boolean
  compact?: boolean
  redirectOnDeleteTo?: string
}

export function ProdutoLifecycleActions({
  produtoId,
  referencia,
  ativo,
  compact = false,
  redirectOnDeleteTo,
}: ProdutoLifecycleActionsProps) {
  const router = useRouter()
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [acaoPendente, setAcaoPendente] = useState<AcaoCicloVidaProduto | null>(null)

  function confirmarArquivamento() {
    startTransition(async () => {
      const resultado = await desativarProduto(produtoId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        setAcaoPendente(null)
        return
      }

      setMensagem('Produto arquivado com sucesso.')
      setAcaoPendente(null)
      router.refresh()
    })
  }

  function confirmarExclusao() {
    startTransition(async () => {
      const resultado = await excluirProduto(produtoId)
      if (resultado.erro) {
        setMensagem(resultado.erro)
        setAcaoPendente(null)
        return
      }

      setAcaoPendente(null)

      if (redirectOnDeleteTo) {
        router.push(redirectOnDeleteTo)
      } else {
        setMensagem('Produto excluído permanentemente.')
      }

      router.refresh()
    })
  }

  function abrirConfirmacao(acao: AcaoCicloVidaProduto) {
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
    if (acaoPendente === 'arquivar') {
      confirmarArquivamento()
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
              disabled={isPending || !ativo}
              onClick={() => abrirConfirmacao('arquivar')}
              aria-label={ativo ? `Arquivar ${referencia}` : `${referencia} já arquivado`}
              title={
                ativo
                  ? 'Arquivar produto mantendo o histórico'
                  : 'Produto já arquivado'
              }
              className="inline-flex rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Archive size={16} />
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => abrirConfirmacao('excluir')}
              aria-label={`Excluir permanentemente ${referencia}`}
              title="Excluir permanentemente apenas se o produto nunca tiver sido usado"
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
          <ModalConfirmacaoProduto
            acao={acaoPendente}
            referencia={referencia}
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
          Arquivar preserva o histórico e remove o produto do uso futuro. Excluir permanentemente
          só é permitido para produto sem uso em turno, planejamento ou produção.
        </p>

        {mensagem ? (
          <div className="mt-4 rounded-lg border border-amber-300 bg-white px-4 py-3 text-sm text-amber-900">
            {mensagem}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={isPending || !ativo}
            onClick={() => abrirConfirmacao('arquivar')}
            title="Arquivar este produto sem apagar o histórico"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Archive size={16} />
            {!ativo ? 'Já arquivado' : 'Arquivar produto'}
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
        <ModalConfirmacaoProduto
          acao={acaoPendente}
          referencia={referencia}
          executando={isPending}
          aoCancelar={cancelarConfirmacao}
          aoConfirmar={confirmarAcaoPendente}
        />
      ) : null}
    </>
  )
}

interface ModalConfirmacaoProdutoProps {
  acao: AcaoCicloVidaProduto
  referencia: string
  executando: boolean
  aoCancelar: () => void
  aoConfirmar: () => void
}

function ModalConfirmacaoProduto({
  acao,
  referencia,
  executando,
  aoCancelar,
  aoConfirmar,
}: ModalConfirmacaoProdutoProps) {
  const arquivando = acao === 'arquivar'
  const titulo = arquivando ? 'Arquivar produto' : 'Excluir permanentemente'
  const descricao = arquivando
    ? `O produto "${referencia}" será arquivado e deixará de aparecer como opção ativa, mas todo o histórico será preservado.`
    : `O produto "${referencia}" será removido permanentemente apenas se não houver uso em turno, planejamento ou produção.`
  const aviso = arquivando
    ? 'Use esta ação quando o produto não deve mais ser utilizado, mas seu histórico precisa continuar consultável.'
    : 'Esta ação é excepcional e não deve ser usada para produto com histórico. Quando houver qualquer dependência, o sistema bloqueará a exclusão.'
  const rotuloConfirmacao = arquivando
    ? executando
      ? 'Arquivando produto...'
      : 'Confirmar arquivamento'
    : executando
    ? 'Excluindo produto...'
    : 'Confirmar exclusão'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                arquivando
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <AlertTriangle size={14} />
              Confirmação operacional
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
              <p className="text-sm text-slate-600">{descricao}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={aoCancelar}
            aria-label="Fechar modal de confirmação do produto"
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div
            className={`rounded-2xl px-4 py-3 text-sm ${
              arquivando
                ? 'border border-amber-200 bg-amber-50 text-amber-900'
                : 'border border-red-200 bg-red-50 text-red-900'
            }`}
          >
            {aviso}
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
                arquivando
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {arquivando ? <Archive size={16} /> : <Trash2 size={16} />}
              {rotuloConfirmacao}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
