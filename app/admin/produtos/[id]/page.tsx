import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Copy, Pencil } from 'lucide-react'
import { ProdutoLifecycleActions } from '@/components/admin/actions/ProdutoLifecycleActions'
import { DetailField } from '@/components/admin/DetailField'
import { GaleriaProdutoDetalhe } from '@/components/produtos/GaleriaProdutoDetalhe'
import { buscarProdutoComRoteiro } from '@/lib/queries/produtos'

interface ProdutoDetalhePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ProdutoDetalhePage({
  params,
}: ProdutoDetalhePageProps) {
  const { id } = await params
  const produto = await buscarProdutoComRoteiro(id)

  if (!produto) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/produtos"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft size={16} />
            Voltar para produtos
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{produto.nome}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dados do produto e roteiro usado para cálculo do T.P total.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/admin/produtos?duplicar=${produto.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-violet-300 px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
          >
            <Copy size={16} />
            Duplicar na listagem
          </Link>
          <Link
            href="/admin/produtos"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pencil size={16} />
            Editar na listagem
          </Link>
        </div>
      </div>

      <GaleriaProdutoDetalhe
        produtoNome={produto.nome}
        imagemFrenteUrl={produto.imagem_frente_url ?? produto.imagem_url ?? null}
        imagemCostaUrl={produto.imagem_costa_url ?? null}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="Referência" value={produto.referencia} />
        <DetailField label="T.P Produto" value={produto.tp_produto_min?.toFixed(2) ?? '0.00'} />
        <DetailField
          label="Setores Envolvidos"
          value={produto.setoresEnvolvidos.length > 0 ? produto.setoresEnvolvidos.join(', ') : 'Não derivados'}
        />
        <DetailField label="Status" value={produto.ativo ?? true ? 'ativo' : 'inativo'} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Roteiro do produto</h2>
          <p className="mt-1 text-sm text-gray-500">
            Sequência de operações cadastradas para compor o T.P total e derivar os setores envolvidos.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Seq.</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Código</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Descrição</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">Setor</th>
                <th className="px-6 py-3 text-left font-medium text-gray-600">T.P</th>
              </tr>
            </thead>
            <tbody>
              {produto.roteiro.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Nenhuma operação associada a este produto.
                  </td>
                </tr>
              ) : (
                produto.roteiro.map((item) => (
                  <tr key={item.produtoOperacaoId} className="border-t border-gray-100">
                    <td className="px-6 py-3 font-medium text-gray-900">{item.sequencia}</td>
                    <td className="px-6 py-3 text-gray-700">{item.codigo}</td>
                    <td className="px-6 py-3 text-gray-700">{item.descricao}</td>
                    <td className="px-6 py-3 text-gray-700">{item.setorNome ?? 'Não definido'}</td>
                    <td className="px-6 py-3 text-gray-700">{item.tempoPadraoMin}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProdutoLifecycleActions
        produtoId={produto.id}
        referencia={produto.referencia}
        ativo={produto.ativo ?? true}
        redirectOnDeleteTo="/admin/produtos"
      />
    </div>
  )
}
