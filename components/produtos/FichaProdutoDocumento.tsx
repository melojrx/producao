import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { agruparRoteiroProdutoParaFicha } from '@/lib/utils/ficha-produto'
import type { ProdutoListItem } from '@/types'

interface FichaProdutoDocumentoProps {
  geradoEm: Date
  produto: ProdutoListItem
}

interface FichaImagemProduto {
  titulo: string
  imagemUrl: string | null
}

function formatarDataHora(valor: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(valor)
}

function formatarTempoPadrao(valor: number | null | undefined): string {
  return (valor ?? 0).toFixed(2)
}

function obterStatusProduto(produto: ProdutoListItem): string {
  return produto.ativo ?? true ? 'Ativo' : 'Inativo'
}

export function FichaProdutoDocumento({
  geradoEm,
  produto,
}: FichaProdutoDocumentoProps) {
  const gruposRoteiro = agruparRoteiroProdutoParaFicha(produto.roteiro)
  const imagens: FichaImagemProduto[] = [
    {
      titulo: 'Frente',
      imagemUrl: produto.imagem_frente_url ?? produto.imagem_url ?? null,
    },
    {
      titulo: 'Costa',
      imagemUrl: produto.imagem_costa_url ?? null,
    },
  ]

  return (
    <article className="mx-auto mb-8 w-[210mm] max-w-full bg-white px-[12mm] py-[10mm] text-slate-950 shadow-sm print:mb-0 print:w-auto print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <header className="border-b border-slate-300 pb-[6mm]">
        <div className="flex flex-col gap-[4mm] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Ficha do produto
            </p>
            <h1 className="mt-[1.5mm] text-[25px] font-bold leading-tight text-slate-950">
              {produto.nome}
            </h1>
            <p className="mt-[1mm] font-mono text-[13px] font-semibold text-slate-600">
              Referência {produto.referencia}
            </p>
          </div>

          <div className="grid min-w-[54mm] grid-cols-2 gap-[2mm] text-[10px]">
            <div className="rounded-[2mm] border border-slate-200 px-[2.5mm] py-[2mm]">
              <p className="font-semibold uppercase tracking-[0.08em] text-slate-500">Status</p>
              <p className="mt-[0.8mm] text-[12px] font-semibold text-slate-900">
                {obterStatusProduto(produto)}
              </p>
            </div>
            <div className="rounded-[2mm] border border-slate-200 px-[2.5mm] py-[2mm]">
              <p className="font-semibold uppercase tracking-[0.08em] text-slate-500">T.P total</p>
              <p className="mt-[0.8mm] font-mono text-[12px] font-semibold text-slate-900">
                {formatarTempoPadrao(produto.tp_produto_min)} min
              </p>
            </div>
            <div className="col-span-2 rounded-[2mm] border border-slate-200 px-[2.5mm] py-[2mm]">
              <p className="font-semibold uppercase tracking-[0.08em] text-slate-500">
                Gerado em
              </p>
              <p className="mt-[0.8mm] text-[12px] font-semibold text-slate-900">
                {formatarDataHora(geradoEm)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-[5mm] grid gap-[3mm] sm:grid-cols-[1.1fr,0.9fr]">
          <section className="rounded-[3mm] border border-slate-200 bg-slate-50 px-[4mm] py-[3mm]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Descrição
            </p>
            <p className="mt-[1.5mm] min-h-[18mm] text-[12px] leading-relaxed text-slate-700">
              {produto.descricao?.trim()
                ? produto.descricao
                : 'Produto sem descrição administrativa cadastrada.'}
            </p>
          </section>

          <section className="rounded-[3mm] border border-slate-200 bg-white px-[4mm] py-[3mm]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Setores envolvidos
            </p>
            <p className="mt-[1.5mm] text-[12px] leading-relaxed text-slate-700">
              {produto.setoresEnvolvidos.length > 0
                ? produto.setoresEnvolvidos.join(', ')
                : 'Nenhum setor derivado no roteiro.'}
            </p>
            <div className="mt-[3mm] grid grid-cols-2 gap-[2mm]">
              <div>
                <p className="text-[10px] text-slate-500">Operações</p>
                <p className="font-mono text-[15px] font-semibold">{produto.roteiro.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Grupos de setor</p>
                <p className="font-mono text-[15px] font-semibold">{gruposRoteiro.length}</p>
              </div>
            </div>
          </section>
        </div>
      </header>

      <section className="mt-[6mm]">
        <div className="mb-[3mm] flex items-center justify-between border-b border-slate-200 pb-[2mm]">
          <h2 className="text-[15px] font-bold text-slate-950">Imagens do produto</h2>
          <p className="text-[10px] text-slate-500">Frente e Costa cadastradas no produto</p>
        </div>

        <div className="grid gap-[4mm] sm:grid-cols-2">
          {imagens.map((imagem) => (
            <figure
              key={imagem.titulo}
              className="break-inside-avoid rounded-[3mm] border border-slate-200 bg-slate-50 p-[3mm]"
            >
              <figcaption className="mb-[2mm] text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                {imagem.titulo}
              </figcaption>
              <div className="relative flex h-[68mm] items-center justify-center overflow-hidden rounded-[2.5mm] border border-slate-200 bg-white">
                {imagem.imagemUrl ? (
                  <Image
                    src={imagem.imagemUrl}
                    alt={`${imagem.titulo} do produto ${produto.nome}`}
                    fill
                    sizes="420px"
                    className="object-contain p-[3mm]"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-[2mm] px-[5mm] text-center text-slate-400">
                    <ImageOff size={24} />
                    <p className="text-[11px] font-medium">
                      Imagem de {imagem.titulo.toLowerCase()} não cadastrada
                    </p>
                  </div>
                )}
              </div>
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-[7mm]">
        <div className="mb-[3mm] flex items-center justify-between border-b border-slate-200 pb-[2mm]">
          <h2 className="text-[15px] font-bold text-slate-950">Roteiro por setor</h2>
          <p className="text-[10px] text-slate-500">Sequência, operação, máquina e T.P</p>
        </div>

        {gruposRoteiro.length === 0 ? (
          <div className="rounded-[3mm] border border-dashed border-slate-300 px-[5mm] py-[8mm] text-center text-[12px] text-slate-500">
            Produto sem roteiro cadastrado.
          </div>
        ) : (
          <div className="space-y-[5mm]">
            {gruposRoteiro.map((grupo) => (
              <section key={grupo.setorId ?? 'sem-setor'} className="break-inside-avoid">
                <div className="mb-[2mm] flex items-end justify-between gap-[3mm] rounded-t-[2.5mm] border border-slate-300 bg-slate-100 px-[3mm] py-[2mm]">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Setor {grupo.setorCodigo ?? '-'}
                    </p>
                    <h3 className="text-[13px] font-bold text-slate-950">{grupo.setorNome}</h3>
                  </div>
                  <div className="text-right text-[10px] text-slate-600">
                    <p>{grupo.totalOperacoes} operação(ões)</p>
                    <p className="font-mono font-semibold">
                      Subtotal T.P {formatarTempoPadrao(grupo.tempoPadraoTotalMin)} min
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-b-[2.5mm] border-x border-b border-slate-300">
                  <table className="w-full border-collapse text-[10.5px]">
                    <thead className="bg-white text-slate-500">
                      <tr>
                        <th className="w-[11mm] border-b border-slate-200 px-[2mm] py-[1.8mm] text-left font-semibold">
                          Seq.
                        </th>
                        <th className="w-[21mm] border-b border-slate-200 px-[2mm] py-[1.8mm] text-left font-semibold">
                          Código
                        </th>
                        <th className="border-b border-slate-200 px-[2mm] py-[1.8mm] text-left font-semibold">
                          Descrição
                        </th>
                        <th className="w-[34mm] border-b border-slate-200 px-[2mm] py-[1.8mm] text-left font-semibold">
                          Máquina
                        </th>
                        <th className="w-[18mm] border-b border-slate-200 px-[2mm] py-[1.8mm] text-right font-semibold">
                          T.P
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.operacoes.map((operacao) => (
                        <tr key={operacao.produtoOperacaoId} className="odd:bg-slate-50/70">
                          <td className="border-b border-slate-100 px-[2mm] py-[1.8mm] font-mono font-semibold text-slate-800">
                            {operacao.sequencia}
                          </td>
                          <td className="border-b border-slate-100 px-[2mm] py-[1.8mm] font-mono text-slate-800">
                            {operacao.codigo}
                          </td>
                          <td className="border-b border-slate-100 px-[2mm] py-[1.8mm] text-slate-700">
                            {operacao.descricao}
                          </td>
                          <td className="border-b border-slate-100 px-[2mm] py-[1.8mm] text-slate-700">
                            {operacao.maquinaModelo
                              ? `${operacao.maquinaModelo}${operacao.maquinaCodigo ? ` · ${operacao.maquinaCodigo}` : ''}`
                              : 'Sem máquina vinculada'}
                          </td>
                          <td className="border-b border-slate-100 px-[2mm] py-[1.8mm] text-right font-mono font-semibold text-slate-800">
                            {formatarTempoPadrao(operacao.tempoPadraoMin)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-[8mm] border-t border-slate-200 pt-[3mm] text-[10px] leading-relaxed text-slate-500">
        Documento gerado pelo Sistema de Controle de Produção. Esta ficha é uma leitura cadastral
        do produto e não altera roteiro, planejamento, apontamentos ou indicadores operacionais.
      </footer>
    </article>
  )
}
