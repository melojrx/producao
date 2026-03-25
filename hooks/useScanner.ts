'use client'

import { useState } from 'react'
import { calcularMetaIndividual } from '@/lib/utils/producao'
import {
  buscarConfiguracaoTurnoHoje,
  buscarMaquinaScaneadaPorToken,
  buscarOperacaoBasePorToken,
  buscarOperadorScaneadoPorToken,
} from '@/lib/queries/scanner'
import type {
  ConfiguracaoTurno,
  MaquinaScaneada,
  OperacaoScaneada,
  OperadorScaneado,
} from '@/types'

export type EstadoScanner =
  | { etapa: 'scan_operador' }
  | { etapa: 'scan_maquina'; operador: OperadorScaneado }
  | {
      etapa: 'scan_operacao'
      operador: OperadorScaneado
      maquina: MaquinaScaneada
    }
  | {
      etapa: 'confirmar'
      operador: OperadorScaneado
      maquina: MaquinaScaneada
      operacao: OperacaoScaneada
    }

export interface RegistroProducaoInput {
  operadorId: string
  maquinaId: string
  operacaoId: string
  quantidade: number
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
  const [configuracaoTurnoAtual, setConfiguracaoTurnoAtual] =
    useState<ConfiguracaoTurno | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [estaCarregando, setEstaCarregando] = useState(false)

  async function scanOperador(token: string): Promise<ResultadoScannerAction> {
    setEstaCarregando(true)
    setErro(null)
    setConfiguracaoTurnoAtual(null)

    try {
      const operador = await buscarOperadorScaneadoPorToken(token)

      if (!operador) {
        const mensagem = 'Operador não encontrado ou inativo.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      setEstado({ etapa: 'scan_maquina', operador })
      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  async function scanMaquina(token: string): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'scan_maquina') {
      const mensagem = 'Escaneie um operador antes de escanear a máquina.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    setEstaCarregando(true)
    setErro(null)

    try {
      const maquina = await buscarMaquinaScaneadaPorToken(token)

      if (!maquina) {
        const mensagem = 'Máquina não encontrada.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      if (maquina.status === 'manutencao') {
        const mensagem = 'Máquina em manutenção. Solicite outra máquina ao supervisor.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      setEstado({
        etapa: 'scan_operacao',
        operador: estado.operador,
        maquina,
      })

      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  async function scanOperacao(token: string): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'scan_operacao') {
      const mensagem = 'Escaneie operador e máquina antes da operação.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    setEstaCarregando(true)
    setErro(null)
    setConfiguracaoTurnoAtual(null)

    try {
      const [operacaoBase, configuracaoTurno] = await Promise.all([
        buscarOperacaoBasePorToken(token),
        buscarConfiguracaoTurnoHoje(),
      ])

      if (!operacaoBase) {
        const mensagem = 'Operação não encontrada ou inativa.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      if (!configuracaoTurno) {
        const mensagem =
          'Configuração do turno de hoje não encontrada. Solicite o preenchimento ao supervisor.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      const operacao: OperacaoScaneada = {
        ...operacaoBase,
        metaIndividual: calcularMetaIndividual(
          configuracaoTurno.minutosTurno,
          operacaoBase.tempoPadraoMin
        ),
      }

      setConfiguracaoTurnoAtual(configuracaoTurno)
      setEstado({
        etapa: 'confirmar',
        operador: estado.operador,
        maquina: estado.maquina,
        operacao,
      })

      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  async function registrar(quantidade: number): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'confirmar') {
      const mensagem = 'Escaneie uma operação antes de registrar a produção.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    if (quantidade < 1) {
      const mensagem = 'A quantidade deve ser maior ou igual a 1.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    setEstaCarregando(true)
    setErro(null)

    try {
      if (options.onRegistrar) {
        const resultado = await options.onRegistrar({
          operadorId: estado.operador.id,
          maquinaId: estado.maquina.id,
          operacaoId: estado.operacao.id,
          quantidade,
        })

        if (!resultado.sucesso) {
          setErro(resultado.erro ?? 'Não foi possível registrar a produção.')
          return resultado
        }
      }

      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  function resetarOperacao() {
    setErro(null)
    setConfiguracaoTurnoAtual(null)

    if (estado.etapa === 'confirmar' || estado.etapa === 'scan_operacao') {
      setEstado({
        etapa: 'scan_operacao',
        operador: estado.operador,
        maquina: estado.maquina,
      })
      return
    }

    if (estado.etapa === 'scan_maquina') {
      setEstado(estado)
      return
    }

    setEstado(ESTADO_INICIAL)
  }

  function resetarTudo() {
    setErro(null)
    setConfiguracaoTurnoAtual(null)
    setEstado(ESTADO_INICIAL)
  }

  return {
    estado,
    configuracaoTurnoAtual,
    erro,
    estaCarregando,
    scanOperador,
    scanMaquina,
    scanOperacao,
    registrar,
    resetarOperacao,
    resetarTudo,
  }
}
