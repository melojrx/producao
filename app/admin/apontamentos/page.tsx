import { ClipboardList } from 'lucide-react'
import { PainelApontamentosSupervisor } from '@/components/apontamentos/PainelApontamentosSupervisor'
import { listarTurnoSetorOperacoesDoTurno } from '@/lib/queries/apontamentos'
import { listarOperadores } from '@/lib/queries/operadores'
import { buscarTurnoAberto } from '@/lib/queries/turnos'
import type { OperadorListItem, PlanejamentoTurnoV2, TurnoOperadorV2 } from '@/types'

function mapearOperadoresFallback(
  planejamento: PlanejamentoTurnoV2,
  operadoresAtivos: OperadorListItem[]
): TurnoOperadorV2[] {
  return operadoresAtivos
    .filter((operador) => operador.status === 'ativo')
    .map((operador) => ({
      id: operador.id,
      turnoId: planejamento.turno.id,
      operadorId: operador.id,
      setorId: null,
      operadorNome: operador.nome,
      matricula: operador.matricula,
      funcao: operador.funcao,
      cargaHorariaMin: operador.carga_horaria_min ?? 0,
    }))
}

export default async function AdminApontamentosPage() {
  const planejamento = await buscarTurnoAberto()

  if (!planejamento) {
    return (
      <main className="w-full space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            <ClipboardList size={14} />
            Apontamentos do supervisor
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Nenhum turno aberto</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Abra um novo turno na dashboard para liberar as seções, operações derivadas e o
            registro incremental do supervisor em <code>/admin/apontamentos</code>.
          </p>
        </section>
      </main>
    )
  }

  const operacoesTurno = await listarTurnoSetorOperacoesDoTurno(planejamento.turno.id)
  const precisaFallbackOperadores = planejamento.operadores.length === 0
  const operadoresAtivos = precisaFallbackOperadores ? await listarOperadores() : []
  const planejamentoComOperadores = precisaFallbackOperadores
    ? {
        ...planejamento,
        operadores: mapearOperadoresFallback(planejamento, operadoresAtivos),
      }
    : planejamento

  return (
    <main className="w-full space-y-6">
      <PainelApontamentosSupervisor
        planejamento={planejamentoComOperadores}
        operacoesTurno={operacoesTurno}
        origemOperadores={precisaFallbackOperadores ? 'fallback_ativos' : 'turno'}
      />
    </main>
  )
}
