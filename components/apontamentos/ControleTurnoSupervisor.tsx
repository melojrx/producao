'use client'

import { useState, useTransition } from 'react'
import { OctagonX, PencilLine, RefreshCw } from 'lucide-react'
import { ModalEditarTurnoAbertoV2 } from '@/components/dashboard/ModalEditarTurnoAbertoV2'
import { ModalEncerrarTurno } from '@/components/dashboard/ModalEncerrarTurno'
import { ModalNovoTurnoV2 } from '@/components/dashboard/ModalNovoTurnoV2'
import { encerrarTurno } from '@/lib/actions/turnos'
import { contarOperadoresEnvolvidosNoTurno } from '@/lib/utils/turno-operadores'
import { mapearSetoresTurnoParaDashboard } from '@/lib/utils/turno-setores'
import { useRealtimePlanejamentoTurnoV2 } from '@/hooks/useRealtimePlanejamentoTurnoV2'
import type { PlanejamentoTurnoDashboardV2, ProdutoListItem } from '@/types'

interface ControleTurnoSupervisorProps {
  initialPlanning: PlanejamentoTurnoDashboardV2 | null
  produtos: ProdutoListItem[]
}

function classeBotaoAcaoPainel(
  variante: 'primario' | 'secundario' | 'alerta' | 'neutro'
): string {
  const base =
    'inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-70'

  if (variante === 'primario') {
    return `${base} bg-blue-600 text-white shadow-sm shadow-blue-200 hover:bg-blue-700`
  }

  if (variante === 'secundario') {
    return `${base} border border-cyan-200 bg-white text-cyan-950 shadow-sm hover:border-cyan-300 hover:bg-cyan-50`
  }

  if (variante === 'alerta') {
    return `${base} border border-amber-300 bg-white text-amber-900 shadow-sm hover:border-amber-400 hover:bg-amber-50`
  }

  return `${base} border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50`
}

export function ControleTurnoSupervisor({
  initialPlanning,
  produtos,
}: ControleTurnoSupervisorProps) {
  const [modalAberto, setModalAberto] = useState(initialPlanning === null)
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false)
  const [modalEncerramentoAberto, setModalEncerramentoAberto] = useState(false)
  const [encerrandoTurno, iniciarEncerramentoTurno] = useTransition()
  const [retornoEncerramento, setRetornoEncerramento] = useState<string | null>(null)
  const { planejamento, statusConexao, estaCarregando, erro, recarregar } =
    useRealtimePlanejamentoTurnoV2(initialPlanning)

  const podeEncerrarTurno =
    planejamento?.origem === 'aberto' && planejamento.turno.status === 'aberto'
  const descricaoTurno = planejamento
    ? `${planejamento.turno.operadoresDisponiveis} operadores disponíveis e ${planejamento.turno.minutosTurno} minutos produtivos configurados para o turno atual.`
    : 'Abra o primeiro turno para liberar as OPs, setores ativos e o lançamento incremental do supervisor.'
  const setoresAtivos = planejamento ? mapearSetoresTurnoParaDashboard(planejamento) : []
  const operadoresEnvolvidos = contarOperadoresEnvolvidosNoTurno(planejamento)
  const indicadorConexao =
    statusConexao === 'ativo'
      ? 'bg-emerald-500'
      : statusConexao === 'erro'
        ? 'bg-red-500'
        : 'bg-amber-400'

  function executarEncerramentoTurno(): void {
    if (!planejamento || !podeEncerrarTurno) {
      return
    }

    setRetornoEncerramento(null)
    iniciarEncerramentoTurno(async () => {
      const resultado = await encerrarTurno(planejamento.turno.id)

      if (!resultado.sucesso) {
        setRetornoEncerramento(resultado.erro ?? 'Não foi possível encerrar o turno atual.')
        return
      }

      setModalEncerramentoAberto(false)
      await recarregar()
      setRetornoEncerramento('Turno encerrado com sucesso.')
    })
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-full ${indicadorConexao}`} aria-hidden />
            Supervisor{' '}
            {statusConexao === 'ativo'
              ? 'em tempo real'
              : statusConexao === 'erro'
                ? 'com erro de conexão'
                : 'conectando'}
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Apontamentos do Supervisor</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            O supervisor abre, ajusta e encerra o turno a partir deste contexto operacional. Os
            lançamentos incrementais feitos aqui alimentam a leitura consolidada da fábrica.
          </p>
          <p className="text-sm font-medium text-slate-700">{descricaoTurno}</p>
          <p className="max-w-3xl text-sm text-slate-600">
            Use este espaço para governar o turno em andamento e registrar a produção no momento
            em que ela acontece, sem depender da dashboard para ações operacionais.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-white/80 bg-white/80 p-2.5 shadow-sm backdrop-blur-sm sm:max-w-xs lg:w-72 lg:flex-none">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              title="Abrir novo turno"
              className={classeBotaoAcaoPainel('primario')}
            >
              <PencilLine size={16} />
              {planejamento ? 'Novo Turno' : 'Abrir primeiro turno'}
            </button>

            {podeEncerrarTurno ? (
              <button
                type="button"
                onClick={() => setModalEdicaoAberto(true)}
                className={classeBotaoAcaoPainel('secundario')}
              >
                <PencilLine size={16} />
                Editar turno
              </button>
            ) : null}

            {podeEncerrarTurno ? (
              <button
                type="button"
                onClick={() => setModalEncerramentoAberto(true)}
                disabled={encerrandoTurno}
                className={classeBotaoAcaoPainel('alerta')}
              >
                <OctagonX size={16} />
                {encerrandoTurno ? 'Encerrando turno...' : 'Encerrar Turno'}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                void recarregar()
              }}
              disabled={estaCarregando}
              className={classeBotaoAcaoPainel('neutro')}
            >
              <RefreshCw size={16} className={estaCarregando ? 'animate-spin' : undefined} />
              {estaCarregando ? 'Atualizando...' : 'Atualizar agora'}
            </button>
          </div>
        </div>
      </div>

      {retornoEncerramento ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            retornoEncerramento === 'Turno encerrado com sucesso.'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {retornoEncerramento}
        </div>
      ) : null}

      {!planejamento ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Nenhum turno disponível para operação neste momento. Abra o primeiro turno para destravar
          os apontamentos do supervisor.
        </div>
      ) : null}

      {erro ? (
        <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </section>
      ) : null}

      {modalAberto ? (
        <ModalNovoTurnoV2
          planejamentoAtual={planejamento}
          produtos={produtos}
          bloqueante={planejamento === null}
          aoFechar={() => setModalAberto(false)}
        />
      ) : null}

      {modalEdicaoAberto && planejamento && podeEncerrarTurno ? (
        <ModalEditarTurnoAbertoV2
          planejamento={planejamento}
          produtos={produtos}
          aoAtualizarPlanejamento={recarregar}
          aoFechar={() => setModalEdicaoAberto(false)}
        />
      ) : null}

      {modalEncerramentoAberto && planejamento ? (
        <ModalEncerrarTurno
          encerrando={encerrandoTurno}
          observacao={planejamento.turno.observacao}
          operadoresAlocados={operadoresEnvolvidos}
          opsPlanejadas={planejamento.ops.length}
          setoresAtivos={setoresAtivos.length}
          aoCancelar={() => setModalEncerramentoAberto(false)}
          aoConfirmar={executarEncerramentoTurno}
        />
      ) : null}
    </section>
  )
}
