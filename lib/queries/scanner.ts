import { estaUsandoDjango } from '@/lib/django/flags'

export {
  buscarConfiguracaoTurnoHoje,
  buscarBlocoAtivoHoje,
  buscarTurnoSetorOpScaneadoPorToken,
  buscarOperacoesScaneadasPorSecao,
  buscarOperacoesScaneadasPorDemanda,
} from './scanner-core'

import * as scannerCore from './scanner-core'
import type {
  MaquinaScaneada,
  OperacaoScaneada,
  OperadorScaneado,
  TurnoSetorDemandaScaneada,
  TurnoSetorScaneado,
} from '@/types'

export async function buscarOperadorScaneadoPorToken(
  token: string
): Promise<OperadorScaneado | null> {
  if (estaUsandoDjango('scanner_reads')) {
    const { buscarOperadorScaneadoPorTokenDjango } = await import(
      '@/lib/django/queries/scanner'
    )
    return buscarOperadorScaneadoPorTokenDjango(token)
  }

  return scannerCore.buscarOperadorScaneadoPorToken(token)
}

export async function buscarOperadorScaneadoPorId(
  operadorId: string
): Promise<OperadorScaneado | null> {
  if (estaUsandoDjango('scanner_reads') && estaUsandoDjango('cadastros_reads')) {
    const { buscarOperadorPorIdDjango } = await import('@/lib/django/queries/cadastros')
    const operador = await buscarOperadorPorIdDjango(operadorId)
    if (!operador || operador.status !== 'ativo') {
      return null
    }

    return {
      id: operador.id,
      nome: operador.nome,
      matricula: operador.matricula,
      fotoUrl: operador.foto_url,
    }
  }

  return scannerCore.buscarOperadorScaneadoPorId(operadorId)
}

export async function listarOperadoresAtivosScanner(): Promise<OperadorScaneado[]> {
  if (estaUsandoDjango('scanner_reads') && estaUsandoDjango('cadastros_reads')) {
    const { listarOperadoresDjango } = await import('@/lib/django/queries/cadastros')
    const operadores = await listarOperadoresDjango()
    return operadores
      .filter((operador) => operador.status === 'ativo')
      .map((operador) => ({
        id: operador.id,
        nome: operador.nome,
        matricula: operador.matricula,
        fotoUrl: operador.foto_url,
      }))
  }

  return scannerCore.listarOperadoresAtivosScanner()
}

export async function buscarMaquinaScaneadaPorToken(
  token: string
): Promise<MaquinaScaneada | null> {
  if (estaUsandoDjango('scanner_reads') && estaUsandoDjango('cadastros_reads')) {
    const { buscarMaquinaPorTokenDjango } = await import('@/lib/django/queries/cadastros')
    const maquina = await buscarMaquinaPorTokenDjango(token)
    if (!maquina || !maquina.status) {
      return null
    }

    const descricaoPatrimonial =
      [maquina.marca, maquina.modelo]
        .map((valor) => valor?.trim() ?? '')
        .filter(Boolean)
        .join(' · ') ||
      (maquina.numero_patrimonio ? `Patrimônio ${maquina.numero_patrimonio}` : '')

    return {
      id: maquina.id,
      codigo: maquina.codigo,
      descricaoPatrimonial: descricaoPatrimonial || 'Máquina patrimonial',
      status: maquina.status as MaquinaScaneada['status'],
    }
  }

  return scannerCore.buscarMaquinaScaneadaPorToken(token)
}

export async function buscarOperacaoBasePorToken(
  token: string
): Promise<Omit<OperacaoScaneada, 'metaIndividual'> | null> {
  if (estaUsandoDjango('scanner_reads') && estaUsandoDjango('cadastros_reads')) {
    const { buscarOperacaoPorTokenDjango } = await import('@/lib/django/queries/cadastros')
    const operacao = await buscarOperacaoPorTokenDjango(token)
    if (!operacao || !operacao.ativa) {
      return null
    }

    return {
      id: operacao.id,
      descricao: operacao.descricao,
      metaHora: operacao.meta_hora ?? 0,
      tempoPadraoMin: operacao.tempo_padrao_min,
    }
  }

  return scannerCore.buscarOperacaoBasePorToken(token)
}

export async function buscarTurnoSetorScaneadoPorToken(
  token: string
): Promise<TurnoSetorScaneado | null> {
  if (estaUsandoDjango('scanner_reads')) {
    const { buscarTurnoSetorScaneadoPorTokenDjango } = await import(
      '@/lib/django/queries/scanner'
    )
    return buscarTurnoSetorScaneadoPorTokenDjango(token)
  }

  return scannerCore.buscarTurnoSetorScaneadoPorToken(token)
}

export async function buscarDemandasScaneadasPorTurnoSetor(
  turnoSetorId: string
): Promise<TurnoSetorDemandaScaneada[]> {
  if (estaUsandoDjango('scanner_reads')) {
    const { buscarDemandasScaneadasPorTurnoSetorDjango } = await import(
      '@/lib/django/queries/scanner'
    )
    return buscarDemandasScaneadasPorTurnoSetorDjango(turnoSetorId)
  }

  return scannerCore.buscarDemandasScaneadasPorTurnoSetor(turnoSetorId)
}
