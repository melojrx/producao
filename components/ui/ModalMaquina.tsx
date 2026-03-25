'use client'

import { useActionState, useEffect } from 'react'
import { X } from 'lucide-react'
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { criarMaquina, editarMaquina } from '@/lib/actions/maquinas'
import type { FormActionState, TipoMaquinaOption } from '@/types'
import type { Tables } from '@/types/supabase'

type Maquina = Tables<'maquinas'>

interface ModalMaquinaProps {
  maquina?: Maquina
  tiposMaquina: TipoMaquinaOption[]
  aoFechar: () => void
}

const estadoInicial: FormActionState = { erro: undefined, sucesso: false }

export function ModalMaquina({ maquina, tiposMaquina, aoFechar }: ModalMaquinaProps) {
  const acao = maquina ? editarMaquina.bind(null, maquina.id) : criarMaquina
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)

  useEffect(() => {
    if (estado.sucesso) {
      aoFechar()
    }
  }, [aoFechar, estado.sucesso])

  const modoEdicao = !!maquina

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicao ? 'Editar máquina' : 'Nova máquina'}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {modoEdicao ? 'Editar Máquina' : 'Nova Máquina'}
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
              <label htmlFor="codigo" className="text-sm font-medium text-gray-700">
                Código <span aria-hidden>*</span>
              </label>
              <input
                id="codigo"
                name="codigo"
                type="text"
                required
                defaultValue={maquina?.codigo ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="tipo_maquina_codigo" className="text-sm font-medium text-gray-700">
                Tipo de máquina <span aria-hidden>*</span>
              </label>
              <select
                id="tipo_maquina_codigo"
                name="tipo_maquina_codigo"
                required
                defaultValue={maquina?.tipo_maquina_codigo ?? ''}
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

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="modelo" className="text-sm font-medium text-gray-700">
                Modelo
              </label>
              <input
                id="modelo"
                name="modelo"
                type="text"
                defaultValue={maquina?.modelo ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="marca" className="text-sm font-medium text-gray-700">
                Marca
              </label>
              <input
                id="marca"
                name="marca"
                type="text"
                defaultValue={maquina?.marca ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="numero_patrimonio" className="text-sm font-medium text-gray-700">
                Patrimônio
              </label>
              <input
                id="numero_patrimonio"
                name="numero_patrimonio"
                type="text"
                defaultValue={maquina?.numero_patrimonio ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="setor" className="text-sm font-medium text-gray-700">
                Setor
              </label>
              <input
                id="setor"
                name="setor"
                type="text"
                defaultValue={maquina?.setor ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {modoEdicao ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="status" className="text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={maquina.status ?? 'ativa'}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ativa">Ativa</option>
                <option value="parada">Parada</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </div>
          ) : null}

          {modoEdicao && maquina.qr_code_token ? (
            <div className="border-t pt-2">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-gray-500">QR Code da etiqueta</p>
                <QRCodeDisplay valor={`maquina:${maquina.qr_code_token}`} titulo={maquina.codigo} />
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
              title={pendente ? 'Salvando máquina' : 'Salvar máquina'}
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
