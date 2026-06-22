import { calcularPercentualOperacional } from '../../utils/progresso-operacional.ts'
import { mapearCodigoSetorParaNumero } from './mappers.ts'
import type {
  TurnoOpV2,
  TurnoOperadorV2,
  TurnoSetorDemandaV2,
  TurnoSetorOpV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorV2,
  TurnoV2,
} from '@/types'

export interface DjangoTurnoJson {
  id: string
  status: string
  data_hora_abertura: string
  data_hora_encerramento: string | null
  operadores_disponiveis: number
  minutos_turno: number
  meta_grupo: number | null
  observacao: string
  created_at: string
  updated_at: string
}

export interface DjangoTurnoOpJson {
  id: string
  turno: string
  numero_op: string
  produto: string
  produto_nome: string
  produto_codigo: string
  quantidade_planejada: number
  quantidade_planejada_remanescente: number | null
  quantidade_realizada: number
  status: string
  turno_op_origem: string | null
  tp_produto_min_snapshot: string | null
  created_at: string
  updated_at: string
}

export interface DjangoTurnoSetorJson {
  id: string
  turno: string
  setor: string
  setor_nome: string
  setor_codigo: string
  qr_code_token: string
  status: string
  created_at: string
  updated_at: string
}

export interface DjangoTurnoSetorOpJson {
  id: string
  turno: string
  turno_op: string
  setor: string
  setor_nome: string
  setor_codigo: string
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
  qr_code_token: string
  created_at: string
  updated_at: string
}

export interface DjangoTurnoSetorDemandaJson {
  id: string
  turno_setor: string
  turno: string
  turno_op: string
  produto: string
  setor: string
  setor_nome: string
  setor_codigo: string
  turno_setor_op_legacy_id: string | null
  quantidade_herdada_setor: number
  quantidade_liberada_setor: number
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
}

export interface DjangoTurnoSetorOperacaoJson {
  id: string
  turno: string
  turno_op: string
  turno_setor: string
  turno_setor_demanda: string
  turno_setor_op: string | null
  operacao: string
  operacao_nome: string
  operacao_codigo: string
  maquina_codigo: string | null
  maquina_modelo: string | null
  setor: string
  sequencia: number
  produto_operacao_id_snapshot: string | null
  tempo_padrao_min_snapshot: string
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
}

export interface DjangoTurnoOperadorJson {
  id: string
  turno: string
  operador: string
  operador_nome: string
  operador_matricula: string
  operador_funcao: string
  operador_carga_horaria_min: number
  setor: string | null
}

function parseNumeroDecimal(valor: string | null | undefined): number {
  if (!valor) {
    return 0
  }

  const numero = Number.parseFloat(valor)
  return Number.isFinite(numero) ? numero : 0
}

export function mapearTurnoDjango(turno: DjangoTurnoJson): TurnoV2 {
  return {
    id: turno.id,
    iniciadoEm: turno.data_hora_abertura,
    encerradoEm: turno.data_hora_encerramento,
    status: turno.status as TurnoV2['status'],
    operadoresDisponiveis: turno.operadores_disponiveis,
    minutosTurno: turno.minutos_turno,
    observacao: turno.observacao,
  }
}

export function mapearTurnoOpsDjango(ops: DjangoTurnoOpJson[]): TurnoOpV2[] {
  return ops.map((op) => {
    const tpProdutoMin = parseNumeroDecimal(op.tp_produto_min_snapshot)

    return {
      id: op.id,
      turnoId: op.turno,
      numeroOp: op.numero_op,
      produtoId: op.produto,
      produtoReferencia: op.produto_codigo,
      produtoNome: op.produto_nome,
      tpProdutoMin,
      quantidadePlanejada: op.quantidade_planejada,
      quantidadeRealizada: op.quantidade_realizada,
      quantidadeConcluida: op.quantidade_realizada,
      progressoOperacionalPct: calcularPercentualOperacional(
        Math.min(op.quantidade_realizada, op.quantidade_planejada) * tpProdutoMin,
        op.quantidade_planejada * tpProdutoMin
      ),
      cargaPlanejadaTp: op.quantidade_planejada * tpProdutoMin,
      cargaRealizadaTp: Math.min(op.quantidade_realizada, op.quantidade_planejada) * tpProdutoMin,
      quantidadePlanejadaOriginal: op.quantidade_planejada,
      quantidadePlanejadaRemanescente:
        op.quantidade_planejada_remanescente ??
        Math.max(op.quantidade_planejada - op.quantidade_realizada, 0),
      turnoOpOrigemId: op.turno_op_origem,
      status: op.status as TurnoOpV2['status'],
      iniciadoEm: null,
      encerradoEm: null,
    }
  })
}

export function mapearTurnoSetoresAtivosDjango(setores: DjangoTurnoSetorJson[]): TurnoSetorV2[] {
  return setores.map((setorTurno) => ({
    id: setorTurno.id,
    turnoId: setorTurno.turno,
    setorId: setorTurno.setor,
    setorCodigo: mapearCodigoSetorParaNumero(setorTurno.setor_codigo),
    setorNome: setorTurno.setor_nome,
    quantidadePlanejada: 0,
    quantidadeRealizada: 0,
    quantidadeConcluida: 0,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    qrCodeToken: setorTurno.qr_code_token,
    status: setorTurno.status as TurnoSetorV2['status'],
    iniciadoEm: null,
    encerradoEm: null,
  }))
}

export function mapearTurnoSetorOpsDjango(secoes: DjangoTurnoSetorOpJson[]): TurnoSetorOpV2[] {
  return secoes.map((secao) => ({
    id: secao.id,
    turnoId: secao.turno,
    turnoOpId: secao.turno_op,
    setorId: secao.setor,
    setorCodigo: mapearCodigoSetorParaNumero(secao.setor_codigo),
    setorNome: secao.setor_nome,
    quantidadePlanejada: secao.quantidade_planejada,
    quantidadeRealizada: secao.quantidade_realizada,
    quantidadeConcluida: secao.quantidade_realizada,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    qrCodeToken: secao.qr_code_token,
    status: secao.status as TurnoSetorOpV2['status'],
    iniciadoEm: null,
    encerradoEm: null,
  }))
}

export function mapearTurnoOperadoresDjango(
  alocacoes: DjangoTurnoOperadorJson[]
): TurnoOperadorV2[] {
  return alocacoes.map((alocacao) => ({
    id: alocacao.id,
    turnoId: alocacao.turno,
    operadorId: alocacao.operador,
    setorId: alocacao.setor,
    operadorNome: alocacao.operador_nome,
    matricula: alocacao.operador_matricula,
    funcao: alocacao.operador_funcao,
    cargaHorariaMin: alocacao.operador_carga_horaria_min ?? 0,
  }))
}

export function mapearTurnoSetorDemandasDjango(
  demandas: DjangoTurnoSetorDemandaJson[],
  ops: TurnoOpV2[]
): TurnoSetorDemandaV2[] {
  const opsPorId = new Map(ops.map((op) => [op.id, op]))
  const mapeadas: Array<TurnoSetorDemandaV2 & { indiceOriginal: number }> = []

  demandas.forEach((demanda, indiceOriginal) => {
    const op = opsPorId.get(demanda.turno_op)
    if (!op) {
      return
    }

    mapeadas.push({
      id: demanda.id,
      turnoSetorId: demanda.turno_setor,
      turnoId: demanda.turno,
      turnoOpId: demanda.turno_op,
      setorId: demanda.setor,
      setorCodigo: mapearCodigoSetorParaNumero(demanda.setor_codigo),
      setorNome: demanda.setor_nome,
      produtoId: demanda.produto,
      numeroOp: op.numeroOp,
      produtoReferencia: op.produtoReferencia,
      produtoNome: op.produtoNome,
      quantidadePlanejada: demanda.quantidade_planejada,
      quantidadeRealizada: demanda.quantidade_realizada,
      quantidadeHerdadaSetor: demanda.quantidade_herdada_setor,
      quantidadeConcluida: demanda.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      status: demanda.status as TurnoSetorDemandaV2['status'],
      iniciadoEm: null,
      encerradoEm: null,
      turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
      indiceOriginal,
    })
  })

  return mapeadas
    .sort((primeira, segunda) => primeira.indiceOriginal - segunda.indiceOriginal)
    .map(({ indiceOriginal: _indice, ...demanda }) => demanda)
}

export function mapearTurnoSetorOperacoesDjango(
  operacoes: DjangoTurnoSetorOperacaoJson[]
): TurnoSetorOperacaoApontamentoV2[] {
  return operacoes.map((operacao) => ({
    id: operacao.id,
    turnoId: operacao.turno,
    turnoOpId: operacao.turno_op,
    turnoSetorOpId: operacao.turno_setor_op ?? '',
    turnoSetorId: operacao.turno_setor,
    turnoSetorDemandaId: operacao.turno_setor_demanda,
    produtoOperacaoId: operacao.produto_operacao_id_snapshot ?? '',
    operacaoId: operacao.operacao,
    setorId: operacao.setor,
    sequencia: operacao.sequencia,
    tempoPadraoMinSnapshot: parseNumeroDecimal(operacao.tempo_padrao_min_snapshot),
    quantidadePlanejada: operacao.quantidade_planejada,
    quantidadeRealizada: operacao.quantidade_realizada,
    status: operacao.status as TurnoSetorOperacaoApontamentoV2['status'],
    iniciadoEm: null,
    encerradoEm: null,
    operacaoCodigo: operacao.operacao_codigo ?? '',
    operacaoDescricao: operacao.operacao_nome ?? '',
    maquinaCodigo: operacao.maquina_codigo ?? null,
    maquinaModelo: operacao.maquina_modelo ?? null,
  }))
}
