'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { criarOperacao, editarOperacao } from '@/lib/actions/operacoes'
import { OPERACAO_IMAGENS_MAX_BYTES } from '@/lib/constants'
import { calcularMetaDia, calcularMetaHora } from '@/lib/utils/producao'
import type { FormActionState, MaquinaOption, OperacaoListItem, SetorOption } from '@/types'

interface ModalOperacaoProps {
  operacao?: OperacaoListItem
  maquinas: MaquinaOption[]
  setores: SetorOption[]
  aoFechar: () => void
}

const estadoInicial: FormActionState = { erro: undefined, sucesso: false }
const TAMANHO_MAXIMO_IMAGEM_MB = Math.floor(OPERACAO_IMAGENS_MAX_BYTES / (1024 * 1024))

interface OperacaoImagemDraft {
  arquivo: File | null
  objectUrl: string | null
  previewUrl: string | null
  removida: boolean
  urlInicial: string | null
}

function criarImagemDraftInicial(operacao?: OperacaoListItem): OperacaoImagemDraft {
  const urlInicial = operacao?.imagem_url ?? null

  return {
    arquivo: null,
    objectUrl: null,
    previewUrl: urlInicial,
    removida: false,
    urlInicial,
  }
}

function obterStatusImagem(draft: OperacaoImagemDraft): string {
  if (draft.arquivo) {
    return 'Nova imagem pronta'
  }

  if (draft.previewUrl) {
    return 'Imagem atual'
  }

  if (draft.removida) {
    return 'Remocao pendente'
  }

  return 'Sem imagem'
}

function obterClasseStatusImagem(draft: OperacaoImagemDraft): string {
  if (draft.arquivo) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (draft.previewUrl) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  if (draft.removida) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-gray-200 bg-gray-100 text-gray-600'
}

export function ModalOperacao({ operacao, maquinas, setores, aoFechar }: ModalOperacaoProps) {
  const acao = operacao ? editarOperacao.bind(null, operacao.id) : criarOperacao
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)
  const prefixoIds = useId()
  const inputImagemRef = useRef<HTMLInputElement | null>(null)
  const [tempoPadraoMin, setTempoPadraoMin] = useState(
    operacao?.tempo_padrao_min ? String(operacao.tempo_padrao_min) : ''
  )
  const [imagem, setImagem] = useState<OperacaoImagemDraft>(() => criarImagemDraftInicial(operacao))

  useEffect(() => {
    if (estado.sucesso) {
      aoFechar()
    }
  }, [aoFechar, estado.sucesso])

  useEffect(() => {
    return () => {
      if (imagem.objectUrl) {
        URL.revokeObjectURL(imagem.objectUrl)
      }
    }
  }, [imagem.objectUrl])

  const tempoPadraoNumero = Number.parseFloat(tempoPadraoMin)
  const metaHora = Number.isFinite(tempoPadraoNumero)
    ? calcularMetaHora(tempoPadraoNumero)
    : 0
  const metaDia = Number.isFinite(tempoPadraoNumero)
    ? calcularMetaDia(tempoPadraoNumero)
    : 0
  const modoEdicao = !!operacao
  const inputImagemId = `${prefixoIds}-imagem-operacao`
  const statusImagem = obterStatusImagem(imagem)

  function atualizarDraftImagem(
    atualizar: (draftAtual: OperacaoImagemDraft) => OperacaoImagemDraft
  ) {
    setImagem((draftAtual) => {
      const proximoDraft = atualizar(draftAtual)

      if (draftAtual.objectUrl && draftAtual.objectUrl !== proximoDraft.objectUrl) {
        URL.revokeObjectURL(draftAtual.objectUrl)
      }

      return proximoDraft
    })
  }

  function abrirSeletorImagem() {
    inputImagemRef.current?.click()
  }

  function selecionarArquivoImagem(arquivo: File | null) {
    if (!arquivo) {
      return
    }

    const objectUrl = URL.createObjectURL(arquivo)

    atualizarDraftImagem((draftAtual) => ({
      ...draftAtual,
      arquivo,
      objectUrl,
      previewUrl: objectUrl,
      removida: false,
    }))
  }

  function limparImagem() {
    atualizarDraftImagem((draftAtual) => ({
      ...draftAtual,
      arquivo: null,
      objectUrl: null,
      previewUrl: null,
      removida: Boolean(draftAtual.urlInicial),
    }))

    if (inputImagemRef.current) {
      inputImagemRef.current.value = ''
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicao ? 'Editar operação' : 'Nova operação'}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {modoEdicao ? 'Editar Operação' : 'Nova Operação'}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar modal"
            title="Fechar formulário"
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form action={executar} className="flex flex-col gap-4 p-5">
          {estado.erro ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {estado.erro}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="codigo" className="text-sm font-medium text-gray-700">
                    Código <span aria-hidden>*</span>
                  </label>
                  <input
                    id="codigo"
                    name="codigo"
                    type="text"
                    required
                    defaultValue={operacao?.codigo ?? ''}
                    placeholder="Informe o código real da operação"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="setor_id" className="text-sm font-medium text-gray-700">
                    Setor <span aria-hidden>*</span>
                  </label>
                  <select
                    id="setor_id"
                    name="setor_id"
                    required
                    defaultValue={operacao?.setor_id ?? ''}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="" disabled>
                      Selecione um setor
                    </option>
                    {setores.map((setor) => (
                      <option key={setor.id} value={setor.id}>
                        {setor.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="maquina_id" className="text-sm font-medium text-gray-700">
                  Máquina <span aria-hidden>*</span>
                </label>
                <select
                  id="maquina_id"
                  name="maquina_id"
                  required
                  defaultValue={operacao?.maquina_id ?? ''}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Selecione uma máquina
                  </option>
                  {maquinas.map((maquina) => (
                    <option key={maquina.id} value={maquina.id}>
                      {maquina.modelo}
                      {maquina.codigo ? ` • ${maquina.codigo}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Use a codificação oficial da operação. O sistema não gera mais esse campo automaticamente.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="descricao" className="text-sm font-medium text-gray-700">
                  Descrição <span aria-hidden>*</span>
                </label>
                <input
                  id="descricao"
                  name="descricao"
                  type="text"
                  required
                  defaultValue={operacao?.descricao ?? ''}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr,auto]">
                <div className="flex flex-col gap-1">
                  <label htmlFor="tempo_padrao_min" className="text-sm font-medium text-gray-700">
                    Tempo padrão (min) <span aria-hidden>*</span>
                  </label>
                  <input
                    id="tempo_padrao_min"
                    name="tempo_padrao_min"
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    required
                    value={tempoPadraoMin}
                    onChange={(event) => setTempoPadraoMin(event.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {modoEdicao ? (
                  <div className="flex flex-col gap-1">
                    <label htmlFor="ativa" className="text-sm font-medium text-gray-700">
                      Situação
                    </label>
                    <select
                      id="ativa"
                      name="ativa"
                      defaultValue={String(operacao.ativa ?? true)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="true">Ativa</option>
                      <option value="false">Inativa</option>
                    </select>
                  </div>
                ) : (
                  <input type="hidden" name="ativa" value="true" />
                )}
              </div>

              <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-700">Meta / hora</p>
                  <p className="text-2xl font-semibold text-blue-900">{metaHora}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-700">Meta / dia</p>
                  <p className="text-2xl font-semibold text-blue-900">{metaDia}</p>
                </div>
              </div>

              {modoEdicao && operacao.qr_code_token ? (
                <div className="border-t pt-2">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-gray-500">QR Code da operação</p>
                    <QRCodeDisplay
                      valor={`operacao:${operacao.qr_code_token}`}
                      titulo={operacao.codigo}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">Imagem da operação</h3>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${obterClasseStatusImagem(imagem)}`}
                    >
                      {statusImagem}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Use uma referência visual para apoiar o cadastro administrativo da operação.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_42%),linear-gradient(135deg,_rgba(248,250,252,1),_rgba(226,232,240,0.7))]">
                  <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/70 to-transparent" />
                  <div className="relative flex aspect-[4/5] items-center justify-center p-4">
                    {imagem.previewUrl ? (
                      <img
                        src={imagem.previewUrl}
                        alt="Preview da imagem da operação"
                        className="h-full w-full rounded-[18px] border border-slate-200 bg-white object-contain shadow-sm"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-white/70 px-6 text-center">
                        <div className="rounded-full bg-slate-900 p-3 text-white shadow-sm">
                          <ImagePlus size={20} />
                        </div>
                        <p className="mt-4 text-sm font-medium text-slate-800">
                          Nenhuma imagem cadastrada
                        </p>
                        <p className="mt-1 max-w-xs text-sm text-slate-500">
                          Envie uma referência visual clara para facilitar conferência administrativa.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <input
                    ref={inputImagemRef}
                    id={inputImagemId}
                    name="imagem_arquivo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => selecionarArquivoImagem(event.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={abrirSeletorImagem}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                  >
                    {imagem.previewUrl ? <RefreshCw size={15} /> : <Upload size={15} />}
                    {imagem.previewUrl ? 'Trocar imagem' : 'Enviar imagem'}
                  </button>
                  <button
                    type="button"
                    onClick={limparImagem}
                    disabled={!imagem.previewUrl && !imagem.arquivo && !imagem.urlInicial}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                    Remover
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>JPG, PNG ou WEBP ate {TAMANHO_MAXIMO_IMAGEM_MB} MB.</span>
                  <span>Sem imagem obrigatória.</span>
                </div>

                <input type="hidden" name="remover_imagem" value={imagem.removida ? 'true' : 'false'} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              title="Cancelar edição"
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendente}
              title={pendente ? 'Salvando operação' : 'Salvar operação'}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {pendente ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
