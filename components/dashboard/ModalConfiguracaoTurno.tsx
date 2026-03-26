'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  HandMetal,
  PackagePlus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { salvarPlanejamentoTurnoFormulario } from '@/lib/actions/turno-blocos'
import { calcularMetaGrupo } from '@/lib/utils/producao'
import type {
  ConfiguracaoTurnoComBlocos,
  FormActionState,
  OrigemTpBloco,
  ProdutoTurnoOption,
} from '@/types'

interface ModalConfiguracaoTurnoProps {
  produtos: ProdutoTurnoOption[]
  configuracaoAtual: ConfiguracaoTurnoComBlocos | null
  bloqueante?: boolean
  aoFechar?: () => void
}

interface BlocoPlanejamentoDraft {
  id: string
  descricaoBloco: string
  funcionariosAtivos: string
  minutosPlanejados: string
  origemTp: OrigemTpBloco
  produtoId: string
  tpProdutoManual: string
}

const estadoInicial: FormActionState = {
  erro: undefined,
  sucesso: false,
}

function criarIdLocal(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `bloco-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatarDescricaoProduto(produto: ProdutoTurnoOption): string {
  return `${produto.nome} (${produto.referencia})`
}

function criarBlocoProdutoDraft(
  produto: ProdutoTurnoOption,
  funcionariosAtivos: string,
  minutosPlanejados: string
): BlocoPlanejamentoDraft {
  return {
    id: criarIdLocal(),
    descricaoBloco: formatarDescricaoProduto(produto),
    funcionariosAtivos,
    minutosPlanejados,
    origemTp: 'produto',
    produtoId: produto.id,
    tpProdutoManual: '',
  }
}

function criarBlocoManualDraft(
  funcionariosAtivos: string,
  minutosPlanejados: string
): BlocoPlanejamentoDraft {
  return {
    id: criarIdLocal(),
    descricaoBloco: 'Bloco manual',
    funcionariosAtivos,
    minutosPlanejados,
    origemTp: 'manual',
    produtoId: '',
    tpProdutoManual: '',
  }
}

function criarBlocosIniciais(
  configuracaoAtual: ConfiguracaoTurnoComBlocos | null,
  produtos: ProdutoTurnoOption[]
): BlocoPlanejamentoDraft[] {
  if (configuracaoAtual?.blocos.length) {
    return configuracaoAtual.blocos.map((bloco) => ({
      id: bloco.id,
      descricaoBloco: bloco.descricaoBloco,
      funcionariosAtivos: String(bloco.funcionariosAtivos),
      minutosPlanejados: String(bloco.minutosPlanejados),
      origemTp: bloco.origemTp,
      produtoId: bloco.produtoId ?? '',
      tpProdutoManual: bloco.origemTp === 'manual' ? String(bloco.tpProdutoMin) : '',
    }))
  }

  if (configuracaoAtual?.produtoId) {
    const produtoAtual = produtos.find((produto) => produto.id === configuracaoAtual.produtoId)
    if (produtoAtual) {
      return [
        criarBlocoProdutoDraft(
          produtoAtual,
          String(configuracaoAtual.funcionariosAtivos),
          String(configuracaoAtual.minutosTurno)
        ),
      ]
    }
  }

  return []
}

function calcularTpProdutoPreview(
  bloco: BlocoPlanejamentoDraft,
  produtos: ProdutoTurnoOption[]
): number {
  if (bloco.origemTp === 'produto') {
    return produtos.find((produto) => produto.id === bloco.produtoId)?.tpProdutoMin ?? 0
  }

  const tpManual = Number.parseFloat(bloco.tpProdutoManual)
  return Number.isFinite(tpManual) ? tpManual : 0
}

function calcularMetaBlocoPreview(
  bloco: BlocoPlanejamentoDraft,
  produtos: ProdutoTurnoOption[]
): number {
  const funcionariosAtivos = Number.parseInt(bloco.funcionariosAtivos, 10)
  const minutosPlanejados = Number.parseInt(bloco.minutosPlanejados, 10)
  const tpProduto = calcularTpProdutoPreview(bloco, produtos)

  if (!Number.isInteger(funcionariosAtivos) || !Number.isInteger(minutosPlanejados)) {
    return 0
  }

  return calcularMetaGrupo(funcionariosAtivos, minutosPlanejados, tpProduto)
}

export function ModalConfiguracaoTurno({
  produtos,
  configuracaoAtual,
  bloqueante = false,
  aoFechar,
}: ModalConfiguracaoTurnoProps) {
  const router = useRouter()
  const [estado, executar, pendente] = useActionState(
    salvarPlanejamentoTurnoFormulario,
    estadoInicial
  )
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [funcionariosAtivos, setFuncionariosAtivos] = useState(
    configuracaoAtual ? String(configuracaoAtual.funcionariosAtivos) : '20'
  )
  const [minutosTurno, setMinutosTurno] = useState(
    configuracaoAtual ? String(configuracaoAtual.minutosTurno) : '540'
  )
  const [blocos, setBlocos] = useState<BlocoPlanejamentoDraft[]>(
    criarBlocosIniciais(configuracaoAtual, produtos)
  )
  const [produtoIdsSelecionados, setProdutoIdsSelecionados] = useState<string[]>([])
  const [blocoAtivoId, setBlocoAtivoId] = useState<string | null>(
    configuracaoAtual?.blocoAtivo?.id ?? null
  )
  const totalFuncionariosAtivos = blocos.reduce((soma, bloco) => {
    const funcionariosBloco = Number.parseInt(bloco.funcionariosAtivos, 10)
    return soma + (Number.isInteger(funcionariosBloco) ? funcionariosBloco : 0)
  }, 0)

  useEffect(() => {
    if (!estado.sucesso) {
      return
    }

    if (aoFechar) {
      aoFechar()
    }

    router.refresh()
  }, [aoFechar, estado.sucesso, router])

  useEffect(() => {
    if (!blocoAtivoId && blocos.length > 0) {
      setBlocoAtivoId(blocos[0].id)
    }
  }, [blocoAtivoId, blocos])

  const metaGrupoTotalPreview = blocos.reduce(
    (soma, bloco) => soma + calcularMetaBlocoPreview(bloco, produtos),
    0
  )
  const sequenciaBlocoAtivo =
    blocoAtivoId === null ? 1 : Math.max(blocos.findIndex((bloco) => bloco.id === blocoAtivoId) + 1, 1)

  function atualizarBloco(
    blocoId: string,
    atualizacao: Partial<BlocoPlanejamentoDraft>
  ): void {
    setBlocos((estadoAtual) =>
      estadoAtual.map((bloco) => {
        if (bloco.id !== blocoId) {
          return bloco
        }

        const proximoBloco = {
          ...bloco,
          ...atualizacao,
        }

        if (atualizacao.origemTp === 'manual') {
          return {
            ...proximoBloco,
            produtoId: '',
          }
        }

        if (atualizacao.origemTp === 'produto') {
          return {
            ...proximoBloco,
            tpProdutoManual: '',
          }
        }

        return proximoBloco
      })
    )
  }

  function adicionarProdutosSelecionados(): void {
    if (produtoIdsSelecionados.length === 0) {
      setErroLocal('Selecione pelo menos um produto para adicionar ao planejamento.')
      return
    }

    const produtosSelecionados = produtoIdsSelecionados
      .map((produtoId) => produtos.find((produto) => produto.id === produtoId))
      .filter((produto): produto is ProdutoTurnoOption => Boolean(produto))

    if (produtosSelecionados.length === 0) {
      setErroLocal('Os produtos selecionados não foram encontrados.')
      return
    }

    setBlocos((estadoAtual) => [
      ...estadoAtual,
      ...produtosSelecionados.map((produto) =>
        criarBlocoProdutoDraft(produto, funcionariosAtivos, minutosTurno)
      ),
    ])
    setProdutoIdsSelecionados([])
    setErroLocal(null)
  }

  function adicionarBlocoManual(): void {
    setBlocos((estadoAtual) => [
      ...estadoAtual,
      criarBlocoManualDraft(funcionariosAtivos, minutosTurno),
    ])
    setErroLocal(null)
  }

  function removerBloco(blocoId: string): void {
    setBlocos((estadoAtual) => estadoAtual.filter((bloco) => bloco.id !== blocoId))
    if (blocoAtivoId === blocoId) {
      setBlocoAtivoId(null)
    }
  }

  function moverBloco(blocoId: string, direcao: 'subir' | 'descer'): void {
    setBlocos((estadoAtual) => {
      const indiceAtual = estadoAtual.findIndex((bloco) => bloco.id === blocoId)
      if (indiceAtual === -1) {
        return estadoAtual
      }

      const indiceDestino = direcao === 'subir' ? indiceAtual - 1 : indiceAtual + 1
      if (indiceDestino < 0 || indiceDestino >= estadoAtual.length) {
        return estadoAtual
      }

      const copia = estadoAtual.slice()
      const [blocoMovido] = copia.splice(indiceAtual, 1)
      copia.splice(indiceDestino, 0, blocoMovido)
      return copia
    })
  }

  const titulo = configuracaoAtual ? 'Editar Configuração do Turno' : 'Configurar Turno de Hoje'
  const payloadPlanejamento = JSON.stringify(
    blocos.map((bloco, index) => ({
      descricaoBloco: bloco.descricaoBloco.trim(),
      funcionariosAtivos: Number.parseInt(bloco.funcionariosAtivos, 10) || 0,
      minutosPlanejados: Number.parseInt(bloco.minutosPlanejados, 10) || 0,
      origemTp: bloco.origemTp,
      produtoId: bloco.produtoId || null,
      sequencia: index + 1,
      tpProdutoManual:
        bloco.origemTp === 'manual'
          ? Number.parseFloat(bloco.tpProdutoManual) || 0
          : null,
    }))
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
              <p className="text-sm text-slate-500">
                Planeje o dia com um produto, vários produtos ou blocos com T.P manual.
              </p>
            </div>
          </div>

          {!bloqueante && aoFechar ? (
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar configuração do turno"
              title="Fechar"
              className="text-slate-400 transition-colors hover:text-slate-600"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>

        <form action={executar} className="flex flex-col gap-6 p-6">
          <input type="hidden" name="planejamento_blocos" value={payloadPlanejamento} />
          <input
            type="hidden"
            name="bloco_ativo_sequencia"
            value={String(sequenciaBlocoAtivo)}
          />

          {estado.erro ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {estado.erro}
            </div>
          ) : null}

          {erroLocal ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              {erroLocal}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="funcionarios_ativos" className="text-sm font-medium text-slate-700">
                Funcionários ativos
              </label>
              <input
                id="funcionarios_ativos"
                name="funcionarios_ativos"
                type="number"
                readOnly
                value={String(totalFuncionariosAtivos)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
              />
              <p className="text-xs text-slate-500">
                Total calculado automaticamente pela soma de funcionários informados em cada bloco.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="minutos_turno" className="text-sm font-medium text-slate-700">
                Minutos do turno <span aria-hidden>*</span>
              </label>
              <input
                id="minutos_turno"
                name="minutos_turno"
                type="number"
                min="1"
                step="1"
                required
                value={minutosTurno}
                onChange={(event) => setMinutosTurno(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">Sugestão: 480 ou 540 minutos.</p>
            </div>
          </div>

          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[1.4fr_auto]">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Adicionar produtos ao dia</h3>
                <p className="text-sm text-slate-600">
                  Selecione um ou mais produtos para criar blocos automaticamente.
                </p>
              </div>

              <select
                multiple
                value={produtoIdsSelecionados}
                onChange={(event) => {
                  const selecionados = Array.from(event.target.selectedOptions, (option) => option.value)
                  setProdutoIdsSelecionados(selecionados)
                }}
                className="min-h-36 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Selecionar um ou mais produtos para o planejamento"
              >
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} ({produto.referencia}) • T.P {produto.tpProdutoMin.toFixed(2)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Você pode selecionar um produto, vários produtos ou não selecionar nenhum e usar
                blocos manuais.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:justify-end">
              <button
                type="button"
                onClick={adicionarProdutosSelecionados}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <PackagePlus size={16} />
                Adicionar selecionados
              </button>
              <button
                type="button"
                onClick={adicionarBlocoManual}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <HandMetal size={16} />
                Adicionar bloco manual
              </button>
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 to-cyan-50 p-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                Blocos planejados
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{blocos.length}</p>
              <p className="mt-1 text-sm text-slate-600">
                Combine produtos cadastrados e blocos com T.P manual.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                Meta total do dia
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{metaGrupoTotalPreview}</p>
              <p className="mt-1 text-sm text-slate-600">
                Soma das metas dos blocos planejados no turno.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                Bloco ativo
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {blocos.length > 0 ? sequenciaBlocoAtivo : '—'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Apenas um bloco fica ativo por vez na configuração do dia.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Blocos do planejamento</h3>
                <p className="text-sm text-slate-600">
                  Ajuste minutos, operadores e defina qual bloco começa ativo.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <Boxes size={14} />
                Ordem persistida na sequência dos blocos
              </div>
            </div>

            {blocos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">
                Nenhum bloco adicionado ainda. Use a seleção múltipla de produtos ou crie um bloco
                manual para começar o planejamento do dia.
              </div>
            ) : null}

            {blocos.map((bloco, index) => {
              const tpProdutoPreview = calcularTpProdutoPreview(bloco, produtos)
              const metaBlocoPreview = calcularMetaBlocoPreview(bloco, produtos)
              const produtoSelecionado =
                bloco.origemTp === 'produto'
                  ? produtos.find((produto) => produto.id === bloco.produtoId) ?? null
                  : null
              const ehBlocoAtivo = bloco.id === blocoAtivoId

              return (
                <div
                  key={bloco.id}
                  className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Bloco {index + 1}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          ehBlocoAtivo
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {ehBlocoAtivo ? 'Ativo' : 'Planejado'}
                      </span>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {bloco.origemTp === 'produto' ? 'Produto' : 'Manual'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBlocoAtivoId(bloco.id)}
                        className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                          ehBlocoAtivo
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {ehBlocoAtivo ? 'Bloco ativo' : 'Definir como ativo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => moverBloco(bloco.id, 'subir')}
                        disabled={index === 0}
                        className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Mover bloco ${index + 1} para cima`}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverBloco(bloco.id, 'descer')}
                        disabled={index === blocos.length - 1}
                        className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Mover bloco ${index + 1} para baixo`}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerBloco(bloco.id)}
                        className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                        aria-label={`Remover bloco ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">Origem do T.P</label>
                      <select
                        value={bloco.origemTp}
                        onChange={(event) =>
                          atualizarBloco(bloco.id, {
                            origemTp: event.target.value as OrigemTpBloco,
                          })
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="produto">Produto cadastrado</option>
                        <option value="manual">T.P manual</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">Descrição do bloco</label>
                      <input
                        type="text"
                        value={bloco.descricaoBloco}
                        onChange={(event) =>
                          atualizarBloco(bloco.id, { descricaoBloco: event.target.value })
                        }
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {bloco.origemTp === 'produto' ? (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">Produto do bloco</label>
                      <select
                        value={bloco.produtoId}
                        onChange={(event) => {
                          const proximoProduto = produtos.find(
                            (produto) => produto.id === event.target.value
                          )

                          atualizarBloco(bloco.id, {
                            produtoId: event.target.value,
                            descricaoBloco: proximoProduto
                              ? formatarDescricaoProduto(proximoProduto)
                              : bloco.descricaoBloco,
                          })
                        }}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione um produto</option>
                        {produtos.map((produto) => (
                          <option key={produto.id} value={produto.id}>
                            {produto.nome} ({produto.referencia}) • T.P {produto.tpProdutoMin.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">T.P manual</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={bloco.tpProdutoManual}
                        onChange={(event) =>
                          atualizarBloco(bloco.id, { tpProdutoManual: event.target.value })
                        }
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">
                        Funcionários ativos no bloco
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={bloco.funcionariosAtivos}
                        onChange={(event) =>
                          atualizarBloco(bloco.id, { funcionariosAtivos: event.target.value })
                        }
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-slate-700">
                        Minutos planejados
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={bloco.minutosPlanejados}
                        onChange={(event) =>
                          atualizarBloco(bloco.id, { minutosPlanejados: event.target.value })
                        }
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                        T.P Produto
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {tpProdutoPreview.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Meta Grupo
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {metaBlocoPreview}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Referência rápida
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {produtoSelecionado
                          ? `${produtoSelecionado.nome} (${produtoSelecionado.referencia})`
                          : 'Bloco manual sem produto cadastrado'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </section>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            {!bloqueante && aoFechar ? (
              <button
                type="button"
                onClick={aoFechar}
                title="Cancelar edição"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
            ) : null}

            <button
              type="submit"
              disabled={pendente}
              title={pendente ? 'Salvando planejamento do turno' : 'Salvar planejamento do turno'}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendente ? 'Salvando...' : 'Salvar planejamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
