'use client'

import { useReducer, useState } from 'react'
import {
  buscarDemandasScaneadasPorTurnoSetor,
  buscarOperadorScaneadoPorId,
  buscarOperacoesScaneadasPorDemanda,
  buscarOperadorScaneadoPorToken,
  buscarTurnoSetorScaneadoPorToken,
} from '@/lib/queries/scanner'
import type {
  OrigemApontamentoProducaoV2,
  OperadorScaneado,
  TurnoSetorDemandaScaneada,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorScaneado,
} from '@/types'

export type EstadoScanner =
  | { etapa: 'scan_setor' }
  | { etapa: 'scan_operador'; setor: TurnoSetorScaneado }
  | {
      etapa: 'selecionar_demanda'
      origemApontamento: OrigemApontamentoProducaoV2
      operador: OperadorScaneado
      setor: TurnoSetorScaneado
      demandas: TurnoSetorDemandaScaneada[]
    }
  | {
      etapa: 'selecionar_operacao'
      demandaSelecionada: TurnoSetorDemandaScaneada
      demandas: TurnoSetorDemandaScaneada[]
      origemApontamento: OrigemApontamentoProducaoV2
      operador: OperadorScaneado
      operacoes: TurnoSetorOperacaoApontamentoV2[]
      setor: TurnoSetorScaneado
    }
  | {
      etapa: 'informar_quantidade'
      demandaSelecionada: TurnoSetorDemandaScaneada
      demandas: TurnoSetorDemandaScaneada[]
      origemApontamento: OrigemApontamentoProducaoV2
      operacaoSelecionada: TurnoSetorOperacaoApontamentoV2
      operador: OperadorScaneado
      operacoes: TurnoSetorOperacaoApontamentoV2[]
      setor: TurnoSetorScaneado
    }
  | {
      etapa: 'registrar'
      demandaSelecionada: TurnoSetorDemandaScaneada
      demandas: TurnoSetorDemandaScaneada[]
      origemApontamento: OrigemApontamentoProducaoV2
      operacaoSelecionada: TurnoSetorOperacaoApontamentoV2
      operador: OperadorScaneado
      operacoes: TurnoSetorOperacaoApontamentoV2[]
      setor: TurnoSetorScaneado
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
  quantidadeRealizadaDemanda?: number
  saldoRestanteDemanda?: number
  statusTurnoSetorDemanda?: string
  quantidadeRealizadaSetor?: number
  saldoRestanteSetor?: number
  statusTurnoSetor?: string
}

interface UseScannerOptions {
  onRegistrar?: (input: RegistroProducaoInput) => Promise<ResultadoScannerAction>
}

type ScannerAction =
  | { type: 'SETOR_IDENTIFICADO'; setor: TurnoSetorScaneado }
  | {
      type: 'OPERADOR_IDENTIFICADO'
      origemApontamento: OrigemApontamentoProducaoV2
      operador: OperadorScaneado
      demandas: TurnoSetorDemandaScaneada[]
    }
  | {
      type: 'DEMANDA_SELECIONADA'
      demandaSelecionada: TurnoSetorDemandaScaneada
      operacoes: TurnoSetorOperacaoApontamentoV2[]
    }
  | { type: 'SELECIONAR_OPERACAO'; operacaoId: string }
  | { type: 'INICIAR_REGISTRO' }
  | { type: 'FALHA_REGISTRO' }
  | {
      type: 'SUCESSO_REGISTRO'
      demandaAtualizada: TurnoSetorDemandaScaneada
      demandasAtualizadas: TurnoSetorDemandaScaneada[]
      operacaoAtualizada: TurnoSetorOperacaoApontamentoV2
      operacoesAtualizadas: TurnoSetorOperacaoApontamentoV2[]
      setorAtualizado: TurnoSetorScaneado
    }
  | { type: 'TROCAR_OPERADOR' }
  | { type: 'TROCAR_DEMANDA' }
  | { type: 'TROCAR_OPERACAO' }
  | { type: 'REINICIAR_TOTAL' }

const ESTADO_INICIAL: EstadoScanner = { etapa: 'scan_setor' }

function calcularSaldoRestante(quantidadePlanejada: number, quantidadeRealizada: number): number {
  return Math.max(quantidadePlanejada - quantidadeRealizada, 0)
}

function calcularSaldoAceitoDemanda(
  demanda: Pick<
    TurnoSetorDemandaScaneada,
    | 'quantidadeAceitaTurno'
    | 'quantidadeDisponivelApontamento'
    | 'quantidadeLiberadaSetor'
    | 'quantidadePlanejada'
    | 'quantidadeRealizada'
  >
): number {
  if (typeof demanda.quantidadeAceitaTurno === 'number') {
    return demanda.quantidadeAceitaTurno
  }

  if (typeof demanda.quantidadeDisponivelApontamento === 'number') {
    return demanda.quantidadeRealizada + demanda.quantidadeDisponivelApontamento
  }

  if (typeof demanda.quantidadeLiberadaSetor === 'number') {
    return demanda.quantidadeLiberadaSetor
  }

  return demanda.quantidadePlanejada
}

function calcularQuantidadeExpostaDemanda(
  demanda: Pick<
    TurnoSetorDemandaScaneada,
    | 'quantidadeAceitaTurno'
    | 'quantidadeDisponivelApontamento'
    | 'quantidadeLiberadaSetor'
    | 'quantidadePlanejada'
    | 'quantidadeRealizada'
  >
): number {
  return demanda.quantidadeRealizada + calcularSaldoAceitoDemanda(demanda)
}

function calcularSaldoDisponivelSequencialDemanda(demanda: TurnoSetorDemandaScaneada): number {
  return demanda.quantidadeDisponivelApontamento ?? demanda.saldoRestante
}

function calcularSaldoDisponivelSequencialOperacao(
  demanda: TurnoSetorDemandaScaneada,
  operacao: TurnoSetorOperacaoApontamentoV2
): number {
  const quantidadeExpostaDemanda = calcularQuantidadeExpostaDemanda(demanda)

  return Math.max(
    Math.min(operacao.quantidadePlanejada, quantidadeExpostaDemanda) - operacao.quantidadeRealizada,
    0
  )
}

function derivarStatusDemanda(
  statusAtual: TurnoSetorDemandaScaneada['status'],
  quantidadePlanejada: number,
  quantidadeRealizada: number
): TurnoSetorDemandaScaneada['status'] {
  if (statusAtual === 'encerrada_manualmente') {
    return statusAtual
  }

  if (quantidadePlanejada > 0 && quantidadeRealizada >= quantidadePlanejada) {
    return 'concluida'
  }

  if (quantidadeRealizada > 0) {
    return 'em_andamento'
  }

  return statusAtual === 'planejada' ? 'planejada' : 'aberta'
}

function derivarStatusSetor(
  demandas: TurnoSetorDemandaScaneada[],
  statusAtual: TurnoSetorScaneado['status']
): TurnoSetorScaneado['status'] {
  if (demandas.length === 0) {
    return statusAtual
  }

  if (demandas.every((demanda) => demanda.status === 'concluida')) {
    return 'concluida'
  }

  if (demandas.every((demanda) => demanda.status === 'encerrada_manualmente')) {
    return 'encerrada_manualmente'
  }

  if (
    demandas.some(
      (demanda) => demanda.status === 'em_andamento' || demanda.quantidadeRealizada > 0
    )
  ) {
    return 'em_andamento'
  }

  if (demandas.some((demanda) => demanda.status === 'aberta')) {
    return 'aberta'
  }

  return statusAtual === 'planejada' ? 'planejada' : 'aberta'
}

function scannerReducer(estado: EstadoScanner, action: ScannerAction): EstadoScanner {
  switch (action.type) {
    case 'SETOR_IDENTIFICADO':
      return {
        etapa: 'scan_operador',
        setor: action.setor,
      }
    case 'OPERADOR_IDENTIFICADO':
      if (estado.etapa !== 'scan_operador') {
        return estado
      }

      return {
        etapa: 'selecionar_demanda',
        origemApontamento: action.origemApontamento,
        operador: action.operador,
        setor: estado.setor,
        demandas: action.demandas,
      }
    case 'DEMANDA_SELECIONADA':
      if (estado.etapa !== 'selecionar_demanda') {
        return estado
      }

      return {
        etapa: 'selecionar_operacao',
        demandaSelecionada: action.demandaSelecionada,
        demandas: estado.demandas,
        origemApontamento: estado.origemApontamento,
        operador: estado.operador,
        operacoes: action.operacoes,
        setor: estado.setor,
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
        demandaSelecionada: estado.demandaSelecionada,
        demandas: estado.demandas,
        origemApontamento: estado.origemApontamento,
        operacaoSelecionada,
        operador: estado.operador,
        operacoes: estado.operacoes,
        setor: estado.setor,
      }
    case 'INICIAR_REGISTRO':
      if (estado.etapa !== 'informar_quantidade') {
        return estado
      }

      return {
        etapa: 'registrar',
        demandaSelecionada: estado.demandaSelecionada,
        demandas: estado.demandas,
        origemApontamento: estado.origemApontamento,
        operacaoSelecionada: estado.operacaoSelecionada,
        operador: estado.operador,
        operacoes: estado.operacoes,
        setor: estado.setor,
      }
    case 'FALHA_REGISTRO':
      if (estado.etapa !== 'registrar') {
        return estado
      }

      return {
        etapa: 'informar_quantidade',
        demandaSelecionada: estado.demandaSelecionada,
        demandas: estado.demandas,
        origemApontamento: estado.origemApontamento,
        operacaoSelecionada: estado.operacaoSelecionada,
        operador: estado.operador,
        operacoes: estado.operacoes,
        setor: estado.setor,
      }
    case 'SUCESSO_REGISTRO':
      if (estado.etapa !== 'registrar') {
        return estado
      }

      return {
        etapa: 'informar_quantidade',
        demandaSelecionada: action.demandaAtualizada,
        demandas: action.demandasAtualizadas,
        origemApontamento: estado.origemApontamento,
        operacaoSelecionada: action.operacaoAtualizada,
        operador: estado.operador,
        operacoes: action.operacoesAtualizadas,
        setor: action.setorAtualizado,
      }
    case 'TROCAR_OPERADOR':
      if (
        estado.etapa === 'selecionar_demanda' ||
        estado.etapa === 'selecionar_operacao' ||
        estado.etapa === 'informar_quantidade' ||
        estado.etapa === 'registrar'
      ) {
        return {
          etapa: 'scan_operador',
          setor: estado.setor,
        }
      }

      return estado
    case 'TROCAR_DEMANDA':
      if (
        estado.etapa !== 'selecionar_operacao' &&
        estado.etapa !== 'informar_quantidade' &&
        estado.etapa !== 'registrar'
      ) {
        return estado
      }

        return {
          etapa: 'selecionar_demanda',
          origemApontamento: estado.origemApontamento,
          operador: estado.operador,
          setor: estado.setor,
          demandas: estado.demandas,
      }
    case 'TROCAR_OPERACAO':
      if (estado.etapa !== 'informar_quantidade' && estado.etapa !== 'registrar') {
        return estado
      }

      return {
        etapa: 'selecionar_operacao',
        demandaSelecionada: estado.demandaSelecionada,
        demandas: estado.demandas,
        origemApontamento: estado.origemApontamento,
        operador: estado.operador,
        operacoes: estado.operacoes,
        setor: estado.setor,
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

  async function identificarOperador(
    operador: OperadorScaneado,
    origemApontamento: OrigemApontamentoProducaoV2
  ): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'scan_operador') {
      const mensagem = 'Escaneie um setor antes de identificar o operador.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    const demandas = await buscarDemandasScaneadasPorTurnoSetor(estado.setor.id)
    const demandasAtivas = demandas.filter(
      (demanda) =>
        demanda.status !== 'concluida' &&
        demanda.status !== 'encerrada_manualmente' &&
        demanda.saldoRestante > 0 &&
        calcularSaldoDisponivelSequencialDemanda(demanda) > 0
    )

    if (demandasAtivas.length === 0) {
      const mensagem =
        'O setor aberto não possui OPs/produtos liberados pelo fluxo anterior para apontamento.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    dispatch({ type: 'OPERADOR_IDENTIFICADO', operador, origemApontamento, demandas: demandasAtivas })
    return { sucesso: true }
  }

  async function scanSetor(token: string): Promise<ResultadoScannerAction> {
    setEstaCarregando(true)
    setErro(null)

    try {
      const setor = await buscarTurnoSetorScaneadoPorToken(token)

      if (!setor) {
        const mensagem = 'QR operacional do setor não encontrado ou sem turno aberto.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      if (setor.status === 'concluida' || setor.status === 'encerrada_manualmente') {
        const mensagem = 'Este setor já está encerrado e não aceita novos apontamentos.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      if (setor.saldoRestante <= 0) {
        const mensagem = 'Este setor não possui saldo restante para lançamento.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      dispatch({ type: 'SETOR_IDENTIFICADO', setor })
      return { sucesso: true }
    } finally {
      setEstaCarregando(false)
    }
  }

  async function scanOperador(token: string): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'scan_operador') {
      const mensagem = 'Escaneie um setor antes de identificar o operador.'
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

      return await identificarOperador(operador, 'operador_qr')
    } finally {
      setEstaCarregando(false)
    }
  }

  async function selecionarOperadorManual(operadorId: string): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'scan_operador') {
      const mensagem = 'Escaneie um setor antes de selecionar o operador manualmente.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    setEstaCarregando(true)
    setErro(null)

    try {
      const operador = await buscarOperadorScaneadoPorId(operadorId)

      if (!operador) {
        const mensagem = 'Operador manual não encontrado ou inativo.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      return await identificarOperador(operador, 'operador_manual')
    } finally {
      setEstaCarregando(false)
    }
  }

  async function selecionarDemanda(demandaId: string): Promise<ResultadoScannerAction> {
    if (estado.etapa !== 'selecionar_demanda') {
      const mensagem = 'Escaneie o operador antes de selecionar a OP/produto.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    const demandaSelecionada =
      estado.demandas.find((demanda) => demanda.id === demandaId) ?? null

    if (!demandaSelecionada) {
      const mensagem = 'A demanda escolhida não foi encontrada no setor aberto.'
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    setEstaCarregando(true)
    setErro(null)

    try {
      const operacoes = await buscarOperacoesScaneadasPorDemanda(demandaSelecionada)
      const operacoesDisponiveis = operacoes.filter(
        (operacao) =>
          operacao.status !== 'concluida' &&
          operacao.status !== 'encerrada_manualmente' &&
          calcularSaldoDisponivelSequencialOperacao(demandaSelecionada, operacao) > 0
      )

      if (operacoesDisponiveis.length === 0) {
        const mensagem =
          'A OP/produto escolhida ainda não possui lote liberado pelo setor anterior para esta operação.'
        setErro(mensagem)
        return { sucesso: false, erro: mensagem }
      }

      dispatch({
        type: 'DEMANDA_SELECIONADA',
        demandaSelecionada,
        operacoes: operacoesDisponiveis,
      })
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

    const saldoOperacao = calcularSaldoRestante(
      estado.operacaoSelecionada.quantidadePlanejada,
      estado.operacaoSelecionada.quantidadeRealizada
    )
    const saldoSequencialOperacao = calcularSaldoDisponivelSequencialOperacao(
      estado.demandaSelecionada,
      estado.operacaoSelecionada
    )

    if (quantidade > saldoOperacao) {
      const mensagem = `A quantidade informada ultrapassa o saldo da operação. Saldo disponível: ${saldoOperacao}.`
      setErro(mensagem)
      return { sucesso: false, erro: mensagem }
    }

    if (quantidade > saldoSequencialOperacao) {
      const mensagem =
        estado.demandaSelecionada.setorAnteriorNome && saldoSequencialOperacao === 0
          ? `Esta operação ainda não recebeu peças liberadas de ${estado.demandaSelecionada.setorAnteriorNome}.`
          : `A quantidade informada ultrapassa o lote liberado pelo fluxo anterior. Disponível agora: ${saldoSequencialOperacao}.`
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
        origemApontamento: estado.origemApontamento,
      })

      if (!resultado.sucesso) {
        dispatch({ type: 'FALHA_REGISTRO' })
        setErro(resultado.erro ?? 'Não foi possível registrar a produção.')
        return resultado
      }

      const quantidadeRealizadaOperacao =
        resultado.quantidadeRealizadaOperacao ?? estado.operacaoSelecionada.quantidadeRealizada

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

      const quantidadeRealizadaDemanda =
        resultado.quantidadeRealizadaDemanda ??
        resultado.quantidadeRealizadaSecao ??
        estado.demandaSelecionada.quantidadeRealizada
      const saldoRestanteDemanda =
        resultado.saldoRestanteDemanda ??
        resultado.saldoRestanteSecao ??
        calcularSaldoRestante(estado.demandaSelecionada.quantidadePlanejada, quantidadeRealizadaDemanda)
      const quantidadeExpostaDemanda = calcularQuantidadeExpostaDemanda(estado.demandaSelecionada)
      const quantidadeBacklogSetor = calcularSaldoRestante(
        estado.demandaSelecionada.quantidadePlanejada,
        quantidadeRealizadaDemanda
      )
      const quantidadeDisponivelApontamento = Math.max(
        quantidadeExpostaDemanda - quantidadeRealizadaDemanda,
        0
      )
      const demandaAtualizada: TurnoSetorDemandaScaneada = {
        ...estado.demandaSelecionada,
        quantidadeRealizada: quantidadeRealizadaDemanda,
        saldoRestante: saldoRestanteDemanda,
        quantidadeBacklogSetor,
        quantidadeAceitaTurno: quantidadeDisponivelApontamento,
        quantidadeExcedenteTurno: Math.max(
          quantidadeBacklogSetor - quantidadeDisponivelApontamento,
          0
        ),
        quantidadeDisponivelApontamento,
        status:
          (resultado.statusTurnoSetorDemanda as TurnoSetorDemandaScaneada['status'] | undefined) ??
          (resultado.statusTurnoSetorOp as TurnoSetorDemandaScaneada['status'] | undefined) ??
          derivarStatusDemanda(
            estado.demandaSelecionada.status,
            estado.demandaSelecionada.quantidadePlanejada,
            quantidadeRealizadaDemanda
          ),
      }

      const demandasAtualizadas = estado.demandas.map((demanda) =>
        demanda.id === demandaAtualizada.id ? demandaAtualizada : demanda
      )
      const quantidadeRealizadaSetor =
        resultado.quantidadeRealizadaSetor ??
        demandasAtualizadas.reduce((soma, demanda) => soma + demanda.quantidadeRealizada, 0)
      const saldoRestanteSetor =
        resultado.saldoRestanteSetor ??
        calcularSaldoRestante(estado.setor.quantidadePlanejada, quantidadeRealizadaSetor)
      const setorAtualizado: TurnoSetorScaneado = {
        ...estado.setor,
        quantidadeRealizada: quantidadeRealizadaSetor,
        saldoRestante: saldoRestanteSetor,
        status:
          (resultado.statusTurnoSetor as TurnoSetorScaneado['status'] | undefined) ??
          derivarStatusSetor(demandasAtualizadas, estado.setor.status),
      }

      dispatch({
        type: 'SUCESSO_REGISTRO',
        demandaAtualizada,
        demandasAtualizadas,
        operacaoAtualizada,
        operacoesAtualizadas,
        setorAtualizado,
      })

      return {
        sucesso: true,
        quantidadeRealizadaOperacao,
        saldoRestanteOperacao: calcularSaldoRestante(
          estado.operacaoSelecionada.quantidadePlanejada,
          quantidadeRealizadaOperacao
        ),
        statusTurnoSetorOperacao: operacaoAtualizada.status,
        quantidadeRealizadaDemanda,
        saldoRestanteDemanda,
        statusTurnoSetorDemanda: demandaAtualizada.status,
        quantidadeRealizadaSetor,
        saldoRestanteSetor,
        statusTurnoSetor: setorAtualizado.status,
        quantidadeRealizadaSecao: quantidadeRealizadaDemanda,
        saldoRestanteSecao: saldoRestanteDemanda,
        statusTurnoSetorOp: demandaAtualizada.status,
      }
    } finally {
      setEstaCarregando(false)
    }
  }

  function trocarOperador(): void {
    setErro(null)
    dispatch({ type: 'TROCAR_OPERADOR' })
  }

  function trocarDemanda(): void {
    setErro(null)
    dispatch({ type: 'TROCAR_DEMANDA' })
  }

  function trocarOperacao(): void {
    setErro(null)
    dispatch({ type: 'TROCAR_OPERACAO' })
  }

  function reiniciarTotal(): void {
    setErro(null)
    dispatch({ type: 'REINICIAR_TOTAL' })
  }

  return {
    estado,
    erro,
    estaCarregando,
    scanSetor,
    scanOperador,
    selecionarOperadorManual,
    selecionarDemanda,
    selecionarOperacao,
    registrar,
    trocarDemanda,
    trocarOperacao,
    trocarOperador,
    reiniciarTotal,
  }
}
