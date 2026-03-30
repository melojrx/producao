'use client'

import { useState } from 'react'
import {
  buscarOperadorScaneadoPorToken,
  buscarTurnoSetorOpScaneadoPorToken,
} from '@/lib/queries/scanner'
import type { OperadorScaneado, TurnoSetorOpScaneado } from '@/types'

export type EstadoScanner =
  | { etapa: 'scan_operador' }
  | { etapa: 'scan_setor_op'; operador: OperadorScaneado }
  | {
      etapa: 'confirmar'
      operador: OperadorScaneado
      secao: TurnoSetorOpScaneado
    }

export interface RegistroProducaoInput {
  operadorId: string
  turnoSetorOpId: string
  quantidade: number
  maquinaId?: string | null
}

export interface ResultadoScannerAction {
  sucesso: boolean
  erro?: string
}

interface UseScannerOptions {
  onRegistrar?: (input: RegistroProducaoInput) => Promise<ResultadoScannerAction>
}

const ESTADO_INICIAL: EstadoScanner = { etapa: 'scan_operador' }

export function useScanner(options: UseScannerOptions = {}) {
  const [estado, setEstado] = useState<EstadoScanner>(ESTADO_INICIAL)
  const [erro, setErro] = useState<string | null>(null)
  const [estaCarregando, setEstaCarregando] = useState(false)

  async function scanOperador(token: string): Promise<ResultadoScannerAction> {
    setEstaCarregando(true)
    setErro(null)

    try {
      const operador = await buscarOperadorScaneadoPorToken(token)

      if (!operador) {
        const mensagem = 'Operador não encontrado ou inativo.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      setEstado({ etapa: 'scan_setor_op', operador })
      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  async function scanSetorOp(token: string): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'scan_setor_op') {
      const mensagem = 'Escaneie um operador antes de abrir a seção do turno.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    setEstaCarregando(true)
    setErro(null)

    try {
      const secao = await buscarTurnoSetorOpScaneadoPorToken(token)

      if (!secao) {
        const mensagem = 'QR operacional não encontrado ou sem turno aberto.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      if (secao.status === 'concluida' || secao.status === 'encerrada_manualmente') {
        const mensagem = 'Esta seção já está encerrada e não aceita novos apontamentos.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      if (secao.saldoRestante <= 0) {
        const mensagem = 'Esta seção não possui saldo restante para lançamento.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      setEstado({
        etapa: 'confirmar',
        operador: estado.operador,
        secao,
      })

      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  async function registrar(quantidade: number): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'confirmar') {
      const mensagem = 'Escaneie uma seção do turno antes de registrar a produção.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    if (!Number.isInteger(quantidade) || quantidade < 1) {
      const mensagem = 'A quantidade deve ser um número inteiro maior ou igual a 1.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    if (!options.onRegistrar) {
      const mensagem =
        'A sessão V2 já está pronta. O lançamento transacional será concluído na task 8.3.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    setEstaCarregando(true)
    setErro(null)

    try {
      const resultado = await options.onRegistrar({
        operadorId: estado.operador.id,
        turnoSetorOpId: estado.secao.id,
        quantidade,
      })

      if (!resultado.sucesso) {
        setErro(resultado.erro ?? 'Não foi possível registrar a produção.')
        return resultado
      }

      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  function resetarOperacao() {
    setErro(null)

    if (estado.etapa === 'confirmar') {
      setEstado({
        etapa: 'scan_setor_op',
        operador: estado.operador,
      })
      return
    }

    if (estado.etapa === 'scan_setor_op') {
      setEstado(estado)
      return
    }

    setEstado(ESTADO_INICIAL)
  }

  function resetarTudo() {
    setErro(null)
    setEstado(ESTADO_INICIAL)
  }

  return {
    estado,
    erro,
    estaCarregando,
    scanOperador,
    scanSetorOp,
    registrar,
    resetarOperacao,
    resetarTudo,
  }
}
