'use client'

import Link from 'next/link'
import { ArrowLeft, ExternalLink, Printer } from 'lucide-react'

interface FichaProdutoActionsProps {
  produtoId: string
}

export function FichaProdutoActions({ produtoId }: FichaProdutoActionsProps) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/admin/produtos"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <ArrowLeft size={16} />
        Voltar para produtos
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/admin/produtos/${produtoId}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ExternalLink size={16} />
          Abrir produto
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Printer size={16} />
          Imprimir / salvar PDF
        </button>
      </div>
    </div>
  )
}
