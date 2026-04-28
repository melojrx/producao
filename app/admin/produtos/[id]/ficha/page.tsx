import { notFound } from 'next/navigation'
import { FichaProdutoActions } from '@/components/produtos/FichaProdutoActions'
import { FichaProdutoDocumento } from '@/components/produtos/FichaProdutoDocumento'
import { buscarProdutoComRoteiro } from '@/lib/queries/produtos'

interface ProdutoFichaPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProdutoFichaPage({
  params,
}: ProdutoFichaPageProps) {
  const { id } = await params
  const produto = await buscarProdutoComRoteiro(id)

  if (!produto) {
    notFound()
  }

  return (
    <main className="-m-4 min-h-screen bg-slate-100 print:m-0 print:min-h-0 print:bg-white lg:-m-6">
      <FichaProdutoActions produtoId={produto.id} />

      <div className="mx-auto max-w-6xl px-4 pb-4 print:max-w-none print:px-0 print:pb-0">
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prévia web da ficha
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {produto.referencia} · {produto.nome}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Esta tela renderiza um documento próprio para impressão/PDF. Use o botão de impressão
            e escolha "Salvar como PDF" no navegador para enviar a ficha ao consultor.
          </p>
        </div>

        <FichaProdutoDocumento geradoEm={new Date()} produto={produto} />
      </div>
    </main>
  )
}
