'use client'

import { useActionState, useEffect } from 'react'
import { X } from 'lucide-react'
import { criarOperador, editarOperador } from '@/lib/actions/operadores'
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { Tables } from '@/types/supabase'

type Operador = Tables<'operadores'>

interface ModalOperadorProps {
  operador?: Operador
  aoFechar: () => void
}

const estadoInicial = { erro: undefined as string | undefined, sucesso: false }

export function ModalOperador({ operador, aoFechar }: ModalOperadorProps) {
  const acao = operador
    ? editarOperador.bind(null, operador.id)
    : criarOperador

  const [estado, executar, pendente] = useActionState(acao, estadoInicial)

  useEffect(() => {
    if (estado.sucesso) aoFechar()
  }, [estado.sucesso, aoFechar])

  const modoEdicao = !!operador

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicao ? 'Editar operador' : 'Novo operador'}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {modoEdicao ? 'Editar Operador' : 'Novo Operador'}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar modal"
            title="Fechar formulário"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form action={executar} className="p-5 flex flex-col gap-4">
          {estado.erro && (
            <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {estado.erro}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome completo <span aria-hidden>*</span>
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              defaultValue={operador?.nome ?? ''}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="matricula" className="text-sm font-medium text-gray-700">
              Matrícula <span aria-hidden>*</span>
            </label>
            <input
              id="matricula"
              name="matricula"
              type="text"
              required
              defaultValue={operador?.matricula ?? ''}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="setor" className="text-sm font-medium text-gray-700">Setor</label>
              <input
                id="setor"
                name="setor"
                type="text"
                defaultValue={operador?.setor ?? ''}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="funcao" className="text-sm font-medium text-gray-700">Função</label>
              <input
                id="funcao"
                name="funcao"
                type="text"
                defaultValue={operador?.funcao ?? ''}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {modoEdicao && (
            <div className="flex flex-col gap-1">
              <label htmlFor="status" className="text-sm font-medium text-gray-700">Status</label>
              <select
                id="status"
                name="status"
                defaultValue={operador.status ?? 'ativo'}
                className="border border-gray-300 rounded-lg bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="afastado">Afastado</option>
              </select>
            </div>
          )}

          {modoEdicao && operador.qr_code_token && (
            <div className="flex flex-col items-center gap-2 pt-2 border-t">
              <p className="text-sm text-gray-500">QR Code do crachá</p>
              <QRCodeDisplay
                valor={`operador:${operador.qr_code_token}`}
                titulo={operador.nome}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              title="Cancelar edição"
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendente}
              title={pendente ? 'Salvando operador' : 'Salvar operador'}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {pendente ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
