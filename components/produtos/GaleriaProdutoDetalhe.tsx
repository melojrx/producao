'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Expand, ImageOff, Shirt, X } from 'lucide-react'

interface GaleriaProdutoDetalheProps {
  produtoNome: string
  imagemFrenteUrl: string | null
  imagemCostaUrl: string | null
}

interface VistaProduto {
  id: 'frente' | 'costa'
  titulo: string
  descricao: string
  imagemUrl: string | null
}

const VISTAS_BASE: Omit<VistaProduto, 'imagemUrl'>[] = [
  {
    id: 'frente',
    titulo: 'Frente',
    descricao: 'Vista principal usada para reconhecimento rapido da peca.',
  },
  {
    id: 'costa',
    titulo: 'Costa',
    descricao: 'Vista complementar para conferencia visual completa do produto.',
  },
]

export function GaleriaProdutoDetalhe({
  produtoNome,
  imagemFrenteUrl,
  imagemCostaUrl,
}: GaleriaProdutoDetalheProps) {
  const vistas = useMemo<VistaProduto[]>(
    () =>
      VISTAS_BASE.map((vista) => ({
        ...vista,
        imagemUrl: vista.id === 'frente' ? imagemFrenteUrl : imagemCostaUrl,
      })),
    [imagemCostaUrl, imagemFrenteUrl]
  )
  const primeiraVistaDisponivel = vistas.find((vista) => vista.imagemUrl)?.id ?? 'frente'
  const [vistaAtivaId, setVistaAtivaId] = useState<'frente' | 'costa'>(primeiraVistaDisponivel)
  const [lightboxAberto, setLightboxAberto] = useState(false)
  const vistaAtiva = vistas.find((vista) => vista.id === vistaAtivaId) ?? vistas[0]
  const totalImagensDisponiveis = vistas.filter((vista) => Boolean(vista.imagemUrl)).length

  return (
    <>
      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,0.96),_rgba(241,245,249,0.86))] shadow-[0_35px_90px_-55px_rgba(15,23,42,0.45)]">
        <div className="grid gap-0 xl:grid-cols-[1.45fr,0.9fr]">
          <div className="border-b border-slate-200/80 p-4 sm:p-5 xl:border-r xl:border-b-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Galeria do produto
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {vistaAtiva?.titulo ?? 'Imagens'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {vistaAtiva?.descricao ?? 'Conferencia visual detalhada do produto cadastrado.'}
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {totalImagensDisponiveis} / 2 vistas
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-[26px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_35%),linear-gradient(160deg,_rgba(255,255,255,1),_rgba(226,232,240,0.85))] px-4 py-5 sm:px-6 sm:py-6">
              <div className="relative mx-auto flex h-[320px] w-full max-w-3xl items-center justify-center rounded-[24px] border border-slate-200 bg-white shadow-sm sm:h-[380px] lg:h-[440px]">
                {vistaAtiva?.imagemUrl ? (
                  <>
                    <Image
                      src={vistaAtiva.imagemUrl}
                      alt={`${vistaAtiva.titulo} do produto ${produtoNome}`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 960px"
                      className="object-contain p-4 sm:p-6"
                      priority
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxAberto(true)}
                      className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-slate-800"
                    >
                      <Expand size={16} />
                      Ampliar
                    </button>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-white/70 px-6 text-center">
                    <div className="rounded-full bg-slate-900 p-3 text-white">
                      <ImageOff size={22} />
                    </div>
                    <p className="mt-4 text-base font-semibold text-slate-900">
                      Nenhuma imagem de {vistaAtiva?.titulo.toLowerCase()} cadastrada
                    </p>
                    <p className="mt-1 max-w-md text-sm text-slate-500">
                      Esta vista ainda nao foi enviada. O cadastro continua valido, mas a galeria
                      mostra o estado vazio de forma explicita.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Vistas disponiveis
              </p>
              <div className="mt-4 space-y-3">
                {vistas.map((vista) => {
                  const ativa = vista.id === vistaAtivaId

                  return (
                    <button
                      key={vista.id}
                      type="button"
                      onClick={() => setVistaAtivaId(vista.id)}
                      className={`flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition-all ${
                        ativa
                          ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/15'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`relative h-20 w-16 overflow-hidden rounded-2xl border ${
                          ativa ? 'border-white/15 bg-white/10' : 'border-slate-200 bg-slate-100'
                        }`}
                      >
                        {vista.imagemUrl ? (
                          <Image
                            src={vista.imagemUrl}
                            alt={`${vista.titulo} do produto ${produtoNome}`}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Shirt size={18} className={ativa ? 'text-white/70' : 'text-slate-400'} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{vista.titulo}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              ativa
                                ? 'bg-white/12 text-white'
                                : vista.imagemUrl
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {vista.imagemUrl ? 'Disponivel' : 'Pendente'}
                          </span>
                        </div>
                        <p className={`mt-1 text-sm ${ativa ? 'text-white/80' : 'text-slate-500'}`}>
                          {vista.descricao}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {totalImagensDisponiveis === 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Nenhuma vista foi cadastrada ainda. Use o modal de produto para enviar Frente e Costa.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                  Clique em uma vista para alternar a imagem principal e use "Ampliar" para inspecao detalhada.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {lightboxAberto && vistaAtiva?.imagemUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/86 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Imagem ampliada de ${vistaAtiva.titulo}`}
          onClick={() => setLightboxAberto(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxAberto(false)}
            aria-label="Fechar imagem ampliada"
            className="absolute top-4 right-4 inline-flex rounded-full border border-white/15 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X size={18} />
          </button>

          <div
            className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
                  Visualizacao ampliada
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {vistaAtiva.titulo} • {produtoNome}
                </h3>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
                Clique fora ou use fechar
              </span>
            </div>

            <div className="relative h-[72vh] min-h-[420px] w-full bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))]">
              <Image
                src={vistaAtiva.imagemUrl}
                alt={`${vistaAtiva.titulo} ampliada do produto ${produtoNome}`}
                fill
                sizes="100vw"
                className="object-contain p-6"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
