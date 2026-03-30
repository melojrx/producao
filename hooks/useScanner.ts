'use client'

import { useReducer, useState } from 'react'
import {
  buscarOperacoesScaneadasPorSecao,
  buscarOperadorScaneadoPorToken,
  buscarTurnoSetorOpScaneadoPorToken,
} from '@/lib/queries/scanner'
import type {
  OrigemApontamentoProducaoV2,
  OperadorScaneado,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorOpScaneado,
} from '@/types'

export type EstadoScanner =
  | { etapa: 'scan_secao' }
  | { etapa: 'scan_operador'; secao: TurnoSetorOpScaneado }
  | {
      etapa: 'selecionar_operacao'
      operador: OperadorScaneado
      operacoes: TurnoSetorOperacaoApontamentoV2[]
      secao: TurnoSetorOpScaneado
    }
  | {
      etapa: 'informar_quantidade'
      operacaoSelecionada: TurnoSetorOperacaoApontamentoV2
      operador: OperadorScaneado
      operacoes: TurnoSetorOperacaoApontamentoV2[]
      secao: TurnoSetorOpScaneado
    }
  | {
      etapa: 'registrar'
      operacaoSelecionada: TurnoSetorOperacaoApontamentoV2
      operador: OperadorScaneado
      operacoes: TurnoSetorOperacaoApontamentoV2[]
      secao: TurnoSetorOpScaneado
    }

export interface RegistroProducaoInput {
  operadorId: string
  turnoSetorOperacaoId: string
  quantidade: number
  origemApontamento?: OrigemApontamentoProducaoV2
  maquinaId?: string | null
  observacao?: string | null
  usuarioSistemaId?: string | null
}

export interface ResultadoScannerAction {
  sucesso: boolean
  erro?: string
  quantidadeRealizadaOperacao?: number
  saldoRestanteOperacao?: number
  statusTurnoSetorOperacao?: string
  quantidadeRealizadaSecao?: number
  saldoRestanteSecao?: number
  statusTurnoSetorOp?: string
}

interface UseScannerOptions {
  onRegistrar?: (input: RegistroProducaoInput) => Promise<ResultadoScannerAction>
}

type ScannerAction =
  | { type: 'SECAO_IDENTIFICADA'; secao: TurnoSetorOpScaneado }
  | {
      type: 'OPERADOR_IDENTIFICADO'
      operador: OperadorScaneado
      operacoes: TurnoSetorOperacaoApontamentoV2[]
    }
  | { type: 'SELECIONAR_OPERACAO'; operacaoId: string }
  | { type: 'INICIAR_REGISTRO' }
  | { type: 'FALHA_REGISTRO' }
  | {
      type: 'SUCESSO_REGISTRO'
      operacaoAtualizada: TurnoSetorOperacaoApontamentoV2
      operacoesAtualizadas: TurnoSetorOperacaoApontamentoV2[]
      secaoAtualizada: TurnoSetorOpScaneado
    }
  | { type: 'TROCAR_OPERACAO' }
  | { type: 'TROCAR_OPERADOR' }
  | { type: 'REINICIAR_TOTAL' }

const ESTADO_INICIAL: EstadoScanner = { etapa: 'scan_secao' }

function scannerReducer(estado: EstadoScanner, action: ScannerAction): EstadoScanner {
  switch (action.type) {
    case 'SECAO_IDENTIFICADA':
      return {
        etapa: 'scan_operador',
        secao: action.secao,
      }
    case 'OPERADOR_IDENTIFICADO':
      if (estado.etapa !== 'scan_operador') {
        return estado
      }

      return {
        etapa: 'selecionar_operacao',
        operador: action.operador,
        operacoes: action.operacoes,
        secao: estado.secao,
      }
    case 'SELECIONAR_OPERACAO':
      if (estado.etapa !== 'selecionar_operacao') {
        return estado
      }

      const operacaoSelecionada =
        estado.operacoes.find((operacao) => operacao.id === action.operacaoId) ?? null

      if (!operacaoSelecionada) {
        return estado
      }

      return {
        etapa: 'informar_quantidade',
        operacaoSelecionada,
        operador: estado.operador,
        operacoes: estado.operacoes,
        secao: estado.secao,
      }
    case 'INICIAR_REGISTRO':
      if (estado.etapa !== 'informar_quantidade') {
        return estado
      }

      return {
        etapa: 'registrar',
        operacaoSelecionada: estado.operacaoSelecionada,
        operador: estado.operador,
        operacoes: estado.operacoes,
        secao: estado.secao,
      }
    case 'FALHA_REGISTRO':
      if (estado.etapa !== 'registrar') {
        return estado
      }

      return {
        etapa: 'informar_quantidade',
        operacaoSelecionada: estado.operacaoSelecionada,
        operador: estado.operador,
        operacoes: estado.operacoes,
        secao: estado.secao,
      }
    case 'SUCESSO_REGISTRO':
      if (estado.etapa !== 'registrar') {
        return estado
      }

      return {
        etapa: 'informar_quantidade',
        operacaoSelecionada: action.operacaoAtualizada,
        operador: estado.operador,
        operacoes: action.operacoesAtualizadas,
        secao: action.secaoAtualizada,
      }
    case 'TROCAR_OPERADOR':
      if (
        estado.etapa === 'selecionar_operacao' ||
        estado.etapa === 'informar_quantidade' ||
        estado.etapa === 'registrar'
      ) {
        return {
          etapa: 'scan_operador',
          secao: estado.secao,
        }
      }

      return estado
    case 'TROCAR_OPERACAO':
      if (estado.etapa !== 'informar_quantidade' && estado.etapa !== 'registrar') {
        return estado
      }

      return {
        etapa: 'selecionar_operacao',
        operador: estado.operador,
        operacoes: estado.operacoes,
        secao: estado.secao,
      }
    case 'REINICIAR_TOTAL':
      return ESTADO_INICIAL
    default:
      return estado
  }
}

export function useScanner(options: UseScannerOptions = {}) {
  const [estado, dispatch] = useReducer(scannerReducer, ESTADO_INICIAL)
  const [erro, setErro] = useState<string | null>(null)
  const [estaCarregando, setEstaCarregando] = useState(false)

  async function scanSecao(token: string): Promise<ResultadoScannerAction> {
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

      dispatch({ type: 'SECAO_IDENTIFICADA', secao })
      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  async function scanOperador(token: string): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'scan_operador') {
      const mensagem = 'Escaneie uma seção antes de identificar o operador.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    setEstaCarregando(true)
    setErro(null)

    try {
      const operador = await buscarOperadorScaneadoPorToken(token)

      if (!operador) {
        const mensagem = 'Operador não encontrado ou inativo.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      const operacoes = await buscarOperacoesScaneadasPorSecao(estado.secao.id)

      if (operacoes.length === 0) {
        const mensagem = 'A seção aberta não possui operações derivadas para apontamento.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      dispatch({ type: 'OPERADOR_IDENTIFICADO', operador, operacoes })
      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  function selecionarOperacao(operacaoId: string): void {
    setErro(null)
    dispatch({ type: 'SELECIONAR_OPERACAO', operacaoId })
  }

  async function registrar(quantidade: number): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'informar_quantidade') {
      const mensagem = 'Selecione o contexto operacional antes de registrar a produção.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    if (!Number.isInteger(quantidade) || quantidade < 1) {
      const mensagem = 'A quantidade deve ser um número inteiro maior ou igual a 1.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    const saldoOperacao = Math.max(
      estado.operacaoSelecionada.quantidadePlanejada - estado.operacaoSelecionada.quantidadeRealizada,
      0
    )

    if (quantidade > saldoOperacao) {
      const mensagem = `A quantidade informada ultrapassa o saldo da operação. Saldo disponível: ${saldoOperacao}.`
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    if (!options.onRegistrar) {
      const mensagem =
        'A sessão V2 já está pronta. O lançamento transacional atômico ainda não foi conectado.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    dispatch({ type: 'INICIAR_REGISTRO' })
    setEstaCarregando(true)
    setErro(null)

    try {
      const resultado = await options.onRegistrar({
        operadorId: estado.operador.id,
        turnoSetorOperacaoId: estado.operacaoSelecionada.id,
        quantidade,
        origemApontamento: 'operador_qr',
      })

      if (!resultado.sucesso) {
        dispatch({ type: 'FALHA_REGISTRO' })
        setErro(resultado.erro ?? 'Não foi possível registrar a produção.')
        return resultado
      }

      const quantidadeRealizadaSecao =
        resultado.quantidadeRealizadaSecao ?? estado.secao.quantidadeRealizada
      const saldoRestanteSecao =
        resultado.saldoRestanteSecao ??
        Math.max(estado.secao.quantidadePlanejada - quantidadeRealizadaSecao, 0)

      const secaoAtualizada: TurnoSetorOpScaneado = {
        ...estado.secao,
        quantidadeRealizada: quantidadeRealizadaSecao,
        saldoRestante: saldoRestanteSecao,
        status:
          (resultado.statusTurnoSetorOp as TurnoSetorOpScaneado['status'] | undefined) ??
          estado.secao.status,
      }

      const quantidadeRealizadaOperacao =
        resultado.quantidadeRealizadaOperacao ?? estado.operacaoSelecionada.quantidadeRealizada
      const saldoRestanteOperacao =
        resultado.saldoRestanteOperacao ??
        Math.max(estado.operacaoSelecionada.quantidadePlanejada - quantidadeRealizadaOperacao, 0)

      const operacaoAtualizada: TurnoSetorOperacaoApontamentoV2 = {
        ...estado.operacaoSelecionada,
        quantidadeRealizada: quantidadeRealizadaOperacao,
        status:
          (resultado.statusTurnoSetorOperacao as
            | TurnoSetorOperacaoApontamentoV2['status']
            | undefined) ?? estado.operacaoSelecionada.status,
      }

      const operacoesAtualizadas = estado.operacoes.map((operacao) =>
        operacao.id === operacaoAtualizada.id ? operacaoAtualizada : operacao
      )

      dispatch({
        type: 'SUCESSO_REGISTRO',
        operacaoAtualizada,
        operacoesAtualizadas,
        secaoAtualizada,
      })
      return {
        sucesso: true,
        quantidadeRealizadaOperacao: quantidadeRealizadaOperacao,
        saldoRestanteOperacao: saldoRestanteOperacao,
        statusTurnoSetorOperacao: operacaoAtualizada.status,
        quantidadeRealizadaSecao: quantidadeRealizadaSecao,
        saldoRestanteSecao: saldoRestanteSecao,
        statusTurnoSetorOp: secaoAtualizada.status,
      }
    } finally {
      setEstaCarregando(false)
    }
  }

  function trocarOperador() {
    setErro(null)
    dispatch({ type: 'TROCAR_OPERADOR' })
  }

  function trocarOperacao() {
    setErro(null)
    dispatch({ type: 'TROCAR_OPERACAO' })
  }

  function reiniciarTotal() {
    setErro(null)
    dispatch({ type: 'REINICIAR_TOTAL' })
  }

  return {
    estado,
    erro,
    estaCarregando,
    scanSecao,
    scanOperador,
    selecionarOperacao,
    registrar,
    trocarOperacao,
    trocarOperador,
    reiniciarTotal,
  }
}
