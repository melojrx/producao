'use client'

import { useActionState, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { criarOperacao, editarOperacao } from '@/lib/actions/operacoes'
import { calcularMetaDia, calcularMetaHora } from '@/lib/utils/producao'
import type { FormActionState, OperacaoListItem, SetorOption, TipoMaquinaOption } from '@/types'

interface ModalOperacaoProps {
  operacao?: OperacaoListItem
  tiposMaquina: TipoMaquinaOption[]
  setores: SetorOption[]
  aoFechar: () => void
}

const estadoInicial: FormActionState = { erro: undefined, sucesso: false }

export function ModalOperacao({ operacao, tiposMaquina, setores, aoFechar }: ModalOperacaoProps) {
  const acao = operacao ? editarOperacao.bind(null, operacao.id) : criarOperacao
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)
  const [tempoPadraoMin, setTempoPadraoMin] = useState(
    operacao?.tempo_padrao_min ? String(operacao.tempo_padrao_min) : ''
  )

  useEffect(() => {
    if (estado.sucesso) {
      aoFechar()
    }
  }, [aoFechar, estado.sucesso])

  const tempoPadraoNumero = Number.parseFloat(tempoPadraoMin)
  const metaHora = Number.isFinite(tempoPadraoNumero)
    ? calcularMetaHora(tempoPadraoNumero)
    : 0
  const metaDia = Number.isFinite(tempoPadraoNumero)
    ? calcularMetaDia(tempoPadraoNumero)
    : 0
  const modoEdicao = !!operacao

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicao ? 'Editar operação' : 'Nova operação'}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
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

          <div className="grid gap-3 md:grid-cols-2">
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

            <div className="flex flex-col gap-1">
              <label htmlFor="tipo_maquina_codigo" className="text-sm font-medium text-gray-700">
                Tipo de máquina <span aria-hidden>*</span>
              </label>
              <select
                id="tipo_maquina_codigo"
                name="tipo_maquina_codigo"
                required
                defaultValue={operacao?.tipo_maquina_codigo ?? ''}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="" disabled>
                  Selecione um tipo
                </option>
                {tiposMaquina.map((tipo) => (
                  <option key={tipo.codigo} value={tipo.codigo}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-500">Código</p>
            <p className="text-lg font-semibold text-gray-900">
              {operacao?.codigo ?? 'Será gerado automaticamente ao salvar'}
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
