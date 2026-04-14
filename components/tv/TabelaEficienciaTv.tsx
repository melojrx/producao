'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TOKENS, type TemaTV } from '@/components/tv/tema-tv'

export interface ColunaTabelaTv {
  chave: string
  titulo: string
  largura?: string
  alinhar?: 'left' | 'right' | 'center'
  renderizar?: (valor: unknown, linha: Record<string, unknown>) => React.ReactNode
}

interface TabelaEficienciaTvProps {
  readonly titulo: string
  readonly colunas: ColunaTabelaTv[]
  readonly linhas: Record<string, unknown>[]
  readonly tema: TemaTV
  readonly itensPorPagina?: number
  readonly intervaloRotacaoMs?: number
  readonly semDados?: string
}

function badgeEficiencia(pct: number): React.ReactNode {
  let classe = ''

  if (pct >= 100) {
    classe = 'bg-emerald-500/20 text-emerald-600'
  } else if (pct >= 70) {
    classe = 'bg-blue-500/20 text-blue-600'
  } else if (pct >= 50) {
    classe = 'bg-amber-500/20 text-amber-600'
  } else {
    classe = 'bg-rose-500/20 text-rose-600'
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${classe}`}>
      {pct.toFixed(1)}%
    </span>
  )
}

export { badgeEficiencia }

function alinhamentoClasse(alinhar: ColunaTabelaTv['alinhar']): string {
  if (alinhar === 'right') return 'text-right'
  if (alinhar === 'center') return 'text-center'
  return 'text-left'
}

function valorParaTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '—'
  if (typeof valor === 'string') return valor
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor)
  return '—'
}

const ITENS_POR_PAGINA_PADRAO = 8
const INTERVALO_ROTACAO_MS_PADRAO = 8000

export function TabelaEficienciaTv({
  titulo,
  colunas,
  linhas,
  tema,
  itensPorPagina = ITENS_POR_PAGINA_PADRAO,
  intervaloRotacaoMs = INTERVALO_ROTACAO_MS_PADRAO,
  semDados = 'Ainda não há dados para exibir.',
}: TabelaEficienciaTvProps) {
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [pausado, setPausado] = useState(false)
  const pausadoRef = useRef(false)
  const t = TOKENS[tema]

  useEffect(() => {
    pausadoRef.current = pausado
  }, [pausado])

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(linhas.length / itensPorPagina)),
    [linhas.length, itensPorPagina]
  )

  const linhasPagina = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return linhas.slice(inicio, inicio + itensPorPagina)
  }, [linhas, paginaAtual, itensPorPagina])

  useEffect(() => {
    setPaginaAtual(1)
  }, [linhas])

  useEffect(() => {
    setPaginaAtual((p) => Math.min(p, totalPaginas))
  }, [totalPaginas])

  useEffect(() => {
    if (totalPaginas <= 1) return

    const id = globalThis.setInterval(() => {
      if (pausadoRef.current) return
      setPaginaAtual((p) => (p >= totalPaginas ? 1 : p + 1))
    }, intervaloRotacaoMs)

    return () => globalThis.clearInterval(id)
  }, [totalPaginas, intervaloRotacaoMs])

  const exibirBarra = totalPaginas > 1

  return (
    <section
      aria-label={titulo}
      className={`flex flex-col rounded-2xl border ${t.tabelaBorda} ${t.tabelaFundo} overflow-hidden`}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {/* Cabeçalho */}
      <div className={`flex items-center justify-between gap-3 border-b ${t.tabelaBorda} px-5 py-3 ${t.tabelaHeaderFundo}`}>
        <h3 className={`text-base font-semibold ${t.cabecalhoTitulo}`}>{titulo}</h3>
        {exibirBarra && (
          <span className={`text-sm ${t.cabecalhoContador}`}>
            {paginaAtual} / {totalPaginas}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      {linhas.length === 0 ? (
        <div className={`flex flex-1 items-center justify-center px-5 py-10 text-base ${t.textoSecundario}`}>
          {semDados}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-base">
            <thead>
              <tr className={`border-b ${t.tabelaLinhaBorda} ${t.tabelaHeaderFundo}`}>
                {colunas.map((col) => (
                  <th
                    key={col.chave}
                    style={{ width: col.largura }}
                    className={`px-4 py-3 text-sm font-semibold uppercase tracking-wider whitespace-nowrap ${t.colunaTitulo} ${alinhamentoClasse(col.alinhar)}`}
                  >
                    {col.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhasPagina.map((linha, indice) => {
                const chaveUnica = colunas
                  .map((c) => valorParaTexto(linha[c.chave]))
                  .join('|')
                  .concat(`|${indice}`)

                return (
                  <tr
                    key={chaveUnica}
                    className={`border-b ${t.tabelaLinhaBorda} last:border-0`}
                  >
                    {colunas.map((col) => {
                      const valor = linha[col.chave]
                      const textoFallback = valorParaTexto(valor)

                      return (
                        <td
                          key={col.chave}
                          className={`px-4 py-3.5 ${alinhamentoClasse(col.alinhar)}`}
                        >
                          {col.renderizar ? (
                            col.renderizar(valor, linha)
                          ) : (
                            <span className={t.textoPrimario}>{textoFallback}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Barra de progresso estilo aeroporto */}
      {exibirBarra && (
        <div className={`h-[3px] w-full ${tema === 'dark' ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
          <div
            key={`${paginaAtual}-${totalPaginas}`}
            className="bg-indigo-500/70"
            style={{
              height: '100%',
              transformOrigin: 'left',
              animation: `tv-progress-bar ${intervaloRotacaoMs}ms linear forwards`,
              animationPlayState: pausado ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </section>
  )
}
