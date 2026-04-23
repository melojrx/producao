import { createClient } from '@/lib/supabase/client'
import {
  listarTurnoSetorOperacoesDoTurnoComClient,
  listarTurnoSetorOperacoesPorDemandaComClient,
  listarTurnoSetorOperacoesPorSecaoComClient,
} from '@/lib/queries/turno-setor-operacoes-base'
import {
  consolidarDemandasPorOperacoes,
  consolidarSetorScaneadoPorDemandas,
} from '@/lib/utils/consolidacao-turno'
import { enriquecerDemandasComFluxoParalelo } from '@/lib/utils/fluxo-paralelo-turno'
import {
  aplicarCapacidadeOperacionalDemandas,
  limitarOperacoesTurnoAoAceiteDemandas,
} from '@/lib/utils/hidratacao-capacidade-setor-turno'
import { calcularMetaGrupoTurnoV2 } from '@/lib/utils/meta-grupo-turno'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type {
  ConfiguracaoTurnoBloco,
  ConfiguracaoTurno,
  MaquinaScaneada,
  OperacaoScaneada,
  OperadorScaneado,
  TurnoOpV2,
  TurnoSetorDemandaV2,
  TurnoSetorDemandaScaneada,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorScaneado,
  TurnoSetorOpScaneado,
} from '@/types'

export async function buscarOperadorScaneadoPorToken(
  token: string
): Promise<OperadorScaneado | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('id, nome, matricula, foto_url, status')
    .eq('qr_code_token', token)
    .single()

  if (error || !data || data.status !== 'ativo') {
    return null
  }

  return mapearOperadorScaneado(data)
}

function mapearOperadorScaneado(data: {
  id: string
  nome: string
  matricula: string
  foto_url: string | null
}): OperadorScaneado {
  return {
    id: data.id,
    nome: data.nome,
    matricula: data.matricula,
    fotoUrl: data.foto_url,
  }
}

export async function buscarOperadorScaneadoPorId(
  operadorId: string
): Promise<OperadorScaneado | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('id, nome, matricula, foto_url, status')
    .eq('id', operadorId)
    .single()

  if (error || !data || data.status !== 'ativo') {
    return null
  }

  return mapearOperadorScaneado(data)
}

export async function listarOperadoresAtivosScanner(): Promise<OperadorScaneado[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('operadores')
    .select('id, nome, matricula, foto_url, status')
    .eq('status', 'ativo')
    .order('nome', { ascending: true })

  if (error || !data) {
    return []
  }

  return data.map(mapearOperadorScaneado)
}

export async function buscarMaquinaScaneadaPorToken(
  token: string
): Promise<MaquinaScaneada | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('maquinas')
    .select('id, codigo, modelo, marca, numero_patrimonio, status')
    .eq('qr_code_token', token)
    .single()

  if (error || !data || !data.status) {
    return null
  }

  const descricaoPatrimonial =
    [data.marca, data.modelo]
      .map((valor) => valor?.trim() ?? '')
      .filter(Boolean)
      .join(' · ') || (data.numero_patrimonio ? `Patrimônio ${data.numero_patrimonio}` : '')

  return {
    id: data.id,
    codigo: data.codigo,
    descricaoPatrimonial: descricaoPatrimonial || 'Máquina patrimonial',
    status: data.status as MaquinaScaneada['status'],
  }
}

export async function buscarOperacaoBasePorToken(
  token: string
): Promise<Omit<OperacaoScaneada, 'metaIndividual'> | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('operacoes')
    .select('id, descricao, meta_hora, tempo_padrao_min, ativa')
    .eq('qr_code_token', token)
    .single()

  if (error || !data || data.ativa !== true) {
    return null
  }

  return {
    id: data.id,
    descricao: data.descricao,
    metaHora: data.meta_hora ?? 0,
    tempoPadraoMin: data.tempo_padrao_min,
  }
}

export async function buscarConfiguracaoTurnoHoje(): Promise<ConfiguracaoTurno | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('configuracao_turno')
    .select(
      'id, data, funcionarios_ativos, minutos_turno, produto_id, tp_produto_min, meta_grupo'
    )
    .eq('data', obterDataHojeLocal())
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    data: data.data,
    funcionariosAtivos: data.funcionarios_ativos,
    minutosTurno: data.minutos_turno,
    produtoId: data.produto_id,
    tpProdutoMin: data.tp_produto_min,
    metaGrupo: data.meta_grupo,
  }
}

export async function buscarBlocoAtivoHoje(): Promise<ConfiguracaoTurnoBloco | null> {
  const supabase = createClient()

  const { data: configuracao, error: configuracaoError } = await supabase
    .from('configuracao_turno')
    .select('id')
    .eq('data', obterDataHojeLocal())
    .maybeSingle()

  if (configuracaoError || !configuracao) {
    return null
  }

  const { data, error } = await supabase
    .from('configuracao_turno_blocos')
    .select(
      'id, configuracao_turno_id, produto_id, descricao_bloco, sequencia, funcionarios_ativos, minutos_planejados, tp_produto_min, origem_tp, meta_grupo, status, iniciado_em, encerrado_em'
    )
    .eq('configuracao_turno_id', configuracao.id)
    .eq('status', 'ativo')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    configuracaoTurnoId: data.configuracao_turno_id,
    produtoId: data.produto_id,
    descricaoBloco: data.descricao_bloco,
    sequencia: data.sequencia,
    funcionariosAtivos: data.funcionarios_ativos,
    minutosPlanejados: data.minutos_planejados,
    tpProdutoMin: data.tp_produto_min,
    origemTp: data.origem_tp as ConfiguracaoTurnoBloco['origemTp'],
    metaGrupo: data.meta_grupo,
    status: data.status as ConfiguracaoTurnoBloco['status'],
    iniciadoEm: data.iniciado_em,
    encerradoEm: data.encerrado_em,
  }
}

export async function buscarTurnoSetorOpScaneadoPorToken(
  token: string
): Promise<TurnoSetorOpScaneado | null> {
  const supabase = createClient()

  const { data: secao, error: secaoError } = await supabase
    .rpc('buscar_turno_setor_op_scanner', { p_qr_code_token: token })
    .maybeSingle()

  if (secaoError || !secao) {
    return null
  }

  return {
    id: secao.id,
    turnoId: secao.turno_id,
    turnoIniciadoEm: secao.turno_iniciado_em,
    turnoOpId: secao.turno_op_id,
    setorId: secao.setor_id,
    setorNome: secao.setor_nome,
    numeroOp: secao.numero_op,
    produtoId: secao.produto_id,
    produtoNome: secao.produto_nome,
    produtoReferencia: secao.produto_referencia,
    quantidadePlanejada: secao.quantidade_planejada,
    quantidadeRealizada: secao.quantidade_realizada,
    quantidadeConcluida: secao.quantidade_realizada,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    saldoRestante: Math.max(secao.quantidade_planejada - secao.quantidade_realizada, 0),
    qrCodeToken: secao.qr_code_token,
    status: secao.status as TurnoSetorOpScaneado['status'],
  }
}

interface TurnoSetorScannerRow {
  id: string
  turno_id: string
  turno_iniciado_em: string
  setor_id: string
  setor_nome: string
  quantidade_planejada: number
  quantidade_realizada: number
  qr_code_token: string
  status: string
}

export async function buscarTurnoSetorScaneadoPorToken(
  token: string
): Promise<TurnoSetorScaneado | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('turno_setores')
    .select(
      `
        id,
        turno_id,
        setor_id,
        quantidade_planejada,
        quantidade_realizada,
        qr_code_token,
        status,
        turnos!inner (
          iniciado_em,
          status
        ),
        setores!inner (
          nome
        )
      `
    )
    .eq('qr_code_token', token)
    .eq('turnos.status', 'aberto')
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const turno = Array.isArray(data.turnos) ? data.turnos[0] : data.turnos
  const setor = Array.isArray(data.setores) ? data.setores[0] : data.setores

  if (!turno?.iniciado_em || !setor?.nome) {
    return null
  }

  const turnoSetor = {
    id: data.id,
    turno_id: data.turno_id,
    turno_iniciado_em: turno.iniciado_em,
    setor_id: data.setor_id,
    setor_nome: setor.nome,
    quantidade_planejada: data.quantidade_planejada,
    quantidade_realizada: data.quantidade_realizada,
    qr_code_token: data.qr_code_token,
    status: data.status,
  } satisfies TurnoSetorScannerRow

  const setorBase: TurnoSetorScaneado = {
    id: turnoSetor.id,
    turnoId: turnoSetor.turno_id,
    turnoIniciadoEm: turnoSetor.turno_iniciado_em,
    setorId: turnoSetor.setor_id,
    setorNome: turnoSetor.setor_nome,
    quantidadePlanejada: turnoSetor.quantidade_planejada,
    quantidadeRealizada: turnoSetor.quantidade_realizada,
    quantidadeConcluida: turnoSetor.quantidade_realizada,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    saldoRestante: Math.max(
      turnoSetor.quantidade_planejada - turnoSetor.quantidade_realizada,
      0
    ),
    qrCodeToken: turnoSetor.qr_code_token,
    status: turnoSetor.status as TurnoSetorScaneado['status'],
  }

  const demandasNormalizadas = await buscarDemandasScaneadasPorTurnoSetor(setorBase.id)

  return consolidarSetorScaneadoPorDemandas(setorBase, demandasNormalizadas)
}

interface TurnoSetorDemandaScannerRow {
  id: string
  turno_setor_id: string
  turno_id: string
  turno_op_id: string
  produto_id: string
  setor_id: string
  turno_setor_op_legacy_id: string | null
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
  turno_ops?: {
    numero_op: string
  } | {
    numero_op: string
  }[] | null
  produtos?: {
    nome: string
    referencia: string
  } | {
    nome: string
    referencia: string
  }[] | null
}

interface TurnoSetorDemandaFluxoScannerRow {
  turno_id: string
  id: string
  turno_op_id: string
  produto_id: string
  turno_setor_id: string
  turno_setor_op_legacy_id: string | null
  setor_id: string
  quantidade_planejada: number
  quantidade_realizada: number
  status: string
  iniciado_em: string | null
  encerrado_em: string | null
  setores:
    | {
        codigo: number
        nome: string
      }
    | {
        codigo: number
        nome: string
      }[]
    | null
}

interface TurnoScannerResumoRow {
  id: string
  operadores_disponiveis: number
  minutos_turno: number
}

interface TurnoOpScannerResumoRow {
  id: string
  turno_id: string
  numero_op: string
  produto_id: string
  quantidade_planejada: number
  quantidade_realizada: number
  quantidade_planejada_original?: number | null
  quantidade_planejada_remanescente?: number | null
  turno_op_origem_id?: string | null
  status: TurnoOpV2['status']
  iniciado_em: string | null
  encerrado_em: string | null
}

interface ProdutoScannerResumoRow {
  id: string
  nome: string
  referencia: string
  tp_produto_min: number | null
}

function extrairRegistroUnico<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) {
    return null
  }

  return Array.isArray(valor) ? valor[0] ?? null : valor
}

function mapearOpsTurnoScanner(
  ops: TurnoOpScannerResumoRow[],
  produtos: ProdutoScannerResumoRow[]
): TurnoOpV2[] {
  const produtosPorId = new Map(produtos.map((produto) => [produto.id, produto]))

  return ops
    .map((op) => {
      const produto = produtosPorId.get(op.produto_id)

      if (!produto) {
        return null
      }

      return {
        id: op.id,
        turnoId: op.turno_id,
        numeroOp: op.numero_op,
        produtoId: op.produto_id,
        produtoReferencia: produto.referencia,
        produtoNome: produto.nome,
        tpProdutoMin: produto.tp_produto_min ?? 0,
        quantidadePlanejada: op.quantidade_planejada,
        quantidadeRealizada: op.quantidade_realizada,
        quantidadeConcluida: op.quantidade_realizada,
        progressoOperacionalPct: 0,
        cargaPlanejadaTp: 0,
        cargaRealizadaTp: 0,
        quantidadePlanejadaOriginal: op.quantidade_planejada_original ?? op.quantidade_planejada,
        quantidadePlanejadaRemanescente:
          op.quantidade_planejada_remanescente ??
          Math.max(op.quantidade_planejada - op.quantidade_realizada, 0),
        turnoOpOrigemId: op.turno_op_origem_id ?? null,
        status: op.status,
        iniciadoEm: op.iniciado_em,
        encerradoEm: op.encerrado_em,
      }
    })
    .filter((op): op is TurnoOpV2 => Boolean(op))
}

export async function buscarDemandasScaneadasPorTurnoSetor(
  turnoSetorId: string
): Promise<TurnoSetorDemandaScaneada[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('turno_setor_demandas')
    .select(
      `
        id,
        turno_setor_id,
        turno_id,
        turno_op_id,
        produto_id,
        setor_id,
        turno_setor_op_legacy_id,
        quantidade_planejada,
        quantidade_realizada,
        status,
        turno_ops!inner (
          numero_op
        ),
        produtos!inner (
          nome,
          referencia
        )
      `
    )
    .eq('turno_setor_id', turnoSetorId)
    .order('created_at', { ascending: true })
    .returns<TurnoSetorDemandaScannerRow[]>()

  if (error || !data) {
    return []
  }

  const demandasBase = data.map((demanda) => {
    const turnoOp = extrairRegistroUnico(demanda.turno_ops)
    const produto = extrairRegistroUnico(demanda.produtos)

    return {
      id: demanda.id,
      turnoSetorId: demanda.turno_setor_id,
      turnoId: demanda.turno_id,
      turnoOpId: demanda.turno_op_id,
      setorId: demanda.setor_id,
      numeroOp: turnoOp?.numero_op ?? 'OP sem número',
      produtoId: demanda.produto_id,
      produtoNome: produto?.nome ?? 'Produto sem nome',
      produtoReferencia: produto?.referencia ?? 'Sem referência',
      quantidadePlanejada: demanda.quantidade_planejada,
      quantidadeRealizada: demanda.quantidade_realizada,
      quantidadeConcluida: demanda.quantidade_realizada,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      saldoRestante: Math.max(
        demanda.quantidade_planejada - demanda.quantidade_realizada,
        0
      ),
      status: demanda.status as TurnoSetorDemandaScaneada['status'],
      turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
    }
  })

  const turnoId = demandasBase[0]?.turnoId ?? null
  const turnoOpIds = Array.from(new Set(demandasBase.map((demanda) => demanda.turnoOpId).filter(Boolean)))

  let demandasComFluxo = demandasBase

  if (turnoId && turnoOpIds.length > 0) {
    const [{ data: turnoResumo, error: turnoResumoError }, { data: opsTurno, error: opsTurnoError }] =
      await Promise.all([
        supabase
          .from('turnos')
          .select('id, operadores_disponiveis, minutos_turno')
          .eq('id', turnoId)
          .maybeSingle<TurnoScannerResumoRow>(),
        supabase
          .from('turno_ops')
          .select(
            'id, turno_id, numero_op, produto_id, quantidade_planejada, quantidade_realizada, quantidade_planejada_original, quantidade_planejada_remanescente, turno_op_origem_id, status, iniciado_em, encerrado_em'
          )
          .eq('turno_id', turnoId)
          .in('id', turnoOpIds)
          .order('created_at', { ascending: true })
          .returns<TurnoOpScannerResumoRow[]>(),
      ])

    const { data: demandasRelacionadas, error: demandasRelacionadasError } = await supabase
      .from('turno_setor_demandas')
      .select(
        `
          turno_id,
          id,
          turno_setor_id,
          turno_op_id,
          produto_id,
          turno_setor_op_legacy_id,
          setor_id,
          quantidade_planejada,
          quantidade_realizada,
          status,
          iniciado_em,
          encerrado_em,
          setores!inner (
            codigo,
            nome
          )
        `
      )
      .eq('turno_id', turnoId)
      .in('turno_op_id', turnoOpIds)
      .order('created_at', { ascending: true })
      .returns<TurnoSetorDemandaFluxoScannerRow[]>()

    const podeAplicarCapacidade =
      !turnoResumoError &&
      Boolean(turnoResumo) &&
      !opsTurnoError &&
      Array.isArray(opsTurno) &&
      opsTurno.length > 0 &&
      !demandasRelacionadasError &&
      Boolean(demandasRelacionadas)

    if (podeAplicarCapacidade) {
      const produtoIds = Array.from(
        new Set((opsTurno ?? []).map((op) => op.produto_id).filter(Boolean))
      )
      const { data: produtos, error: produtosError } = produtoIds.length
        ? await supabase
            .from('produtos')
            .select('id, nome, referencia, tp_produto_min')
            .in('id', produtoIds)
            .returns<ProdutoScannerResumoRow[]>()
        : { data: [], error: null }

      const operacoesTurno = await listarTurnoSetorOperacoesDoTurnoComClient(supabase, turnoId)

      if (!produtosError) {
        const turnoResumoAtual = turnoResumo

        if (turnoResumoAtual) {
          const opsPlanejamento = mapearOpsTurnoScanner(opsTurno ?? [], produtos ?? [])
          const demandasPlanejamentoBase = (demandasRelacionadas ?? [])
            .map((demanda) => {
              const setor = extrairRegistroUnico(demanda.setores)
              const op = opsPlanejamento.find((item) => item.id === demanda.turno_op_id)

              if (!setor || !op) {
                return null
              }

              return {
                id: demanda.id,
                turnoSetorId: demanda.turno_setor_id,
                turnoId: demanda.turno_id,
                turnoOpId: demanda.turno_op_id,
                setorId: demanda.setor_id,
                setorCodigo: setor.codigo,
                setorNome: setor.nome,
                produtoId: demanda.produto_id,
                numeroOp: op.numeroOp,
                produtoReferencia: op.produtoReferencia,
                produtoNome: op.produtoNome,
                quantidadePlanejada: demanda.quantidade_planejada,
                quantidadeRealizada: demanda.quantidade_realizada,
                quantidadeConcluida: demanda.quantidade_realizada,
                progressoOperacionalPct: 0,
                cargaPlanejadaTp: 0,
                cargaRealizadaTp: 0,
                status: demanda.status as TurnoSetorDemandaV2['status'],
                iniciadoEm: demanda.iniciado_em,
                encerradoEm: demanda.encerrado_em,
                turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
              }
            })
            .filter((demanda): demanda is TurnoSetorDemandaV2 => Boolean(demanda))
          const demandasEnriquecidas = enriquecerDemandasComFluxoParalelo(
            consolidarDemandasPorOperacoes(demandasPlanejamentoBase, operacoesTurno)
          )
          const demandasComCapacidade = aplicarCapacidadeOperacionalDemandas({
            turno: {
              operadoresDisponiveis: turnoResumoAtual.operadores_disponiveis,
              minutosTurno: turnoResumoAtual.minutos_turno,
              capacidadeGlobalTurnoPecas: calcularMetaGrupoTurnoV2(
                {
                  operadoresDisponiveis: turnoResumoAtual.operadores_disponiveis,
                  minutosTurno: turnoResumoAtual.minutos_turno,
                },
                opsPlanejamento
              ).capacidadeGlobalTurnoPecas,
            },
            demandasSetor: demandasEnriquecidas,
            operacoesSecao: operacoesTurno,
            ops: opsPlanejamento,
          })
          const diagnosticosPorDemandaId = new Map(
            demandasComCapacidade.map((demanda) => [demanda.id, demanda] as const)
          )

          demandasComFluxo = demandasBase.map((demanda) => {
            const diagnostico = diagnosticosPorDemandaId.get(demanda.id)

            if (!diagnostico) {
              return demanda
            }

            return {
              ...demanda,
              posicaoFila: diagnostico.posicaoFila,
              statusFila: diagnostico.statusFila,
              quantidadeBacklogSetor: diagnostico.quantidadeBacklogSetor,
              quantidadeAceitaTurno: diagnostico.quantidadeAceitaTurno,
              quantidadeExcedenteTurno: diagnostico.quantidadeExcedenteTurno,
              quantidadePendenteSetor: diagnostico.quantidadePendenteSetor,
              quantidadeLiberadaSetor: diagnostico.quantidadeLiberadaSetor,
              quantidadeDisponivelApontamento: diagnostico.quantidadeDisponivelApontamento,
              quantidadeBloqueadaAnterior: diagnostico.quantidadeBloqueadaAnterior,
              quantidadeSincronizadaMontagem:
                diagnostico.quantidadeSincronizadaMontagem,
              quantidadeBloqueadaSincronizacao:
                diagnostico.quantidadeBloqueadaSincronizacao,
              setorAnteriorId: diagnostico.setorAnteriorId,
              setorAnteriorCodigo: diagnostico.setorAnteriorCodigo,
              setorAnteriorNome: diagnostico.setorAnteriorNome,
              etapaFluxoChave: diagnostico.etapaFluxoChave,
            }
          })
        }
      }
    } else if (!demandasRelacionadasError && demandasRelacionadas) {
      const demandasFluxoBase = demandasRelacionadas
        .map((demanda) => {
          const setor = extrairRegistroUnico(demanda.setores)

          if (!setor) {
            return null
          }

          return {
            id: demanda.id,
            turnoOpId: demanda.turno_op_id,
            setorId: demanda.setor_id,
            setorCodigo: setor.codigo,
            setorNome: setor.nome,
            quantidadePlanejada: demanda.quantidade_planejada,
            quantidadeRealizada: demanda.quantidade_realizada,
            status: demanda.status as TurnoSetorDemandaScaneada['status'],
            iniciadoEm: demanda.iniciado_em,
            encerradoEm: demanda.encerrado_em,
          }
        })
        .filter(
          (
            demanda
          ): demanda is {
            id: string
            turnoOpId: string
            setorId: string
            setorCodigo: number
            setorNome: string
            quantidadePlanejada: number
            quantidadeRealizada: number
            status: TurnoSetorDemandaScaneada['status']
            iniciadoEm: string | null
            encerradoEm: string | null
          } => Boolean(demanda)
        )
      const diagnosticosPorDemandaId = new Map(
        enriquecerDemandasComFluxoParalelo(demandasFluxoBase).map((demanda) => [
          demanda.id,
          demanda,
        ] as const)
      )

      demandasComFluxo = demandasBase.map((demanda) => {
        const diagnostico = diagnosticosPorDemandaId.get(demanda.id)

        if (!diagnostico) {
          return demanda
        }

        return {
          ...demanda,
          posicaoFila: diagnostico.posicaoFila,
          statusFila: diagnostico.statusFila,
          quantidadeBacklogSetor: diagnostico.quantidadeBacklogSetor,
          quantidadeAceitaTurno: diagnostico.quantidadeAceitaTurno,
          quantidadeExcedenteTurno: diagnostico.quantidadeExcedenteTurno,
          quantidadePendenteSetor: diagnostico.quantidadePendenteSetor,
          quantidadeLiberadaSetor: diagnostico.quantidadeLiberadaSetor,
          quantidadeDisponivelApontamento: diagnostico.quantidadeDisponivelApontamento,
          quantidadeBloqueadaAnterior: diagnostico.quantidadeBloqueadaAnterior,
          quantidadeSincronizadaMontagem:
            diagnostico.quantidadeSincronizadaMontagem,
          quantidadeBloqueadaSincronizacao:
            diagnostico.quantidadeBloqueadaSincronizacao,
          setorAnteriorId: diagnostico.setorAnteriorId,
          setorAnteriorCodigo: diagnostico.setorAnteriorCodigo,
          setorAnteriorNome: diagnostico.setorAnteriorNome,
          etapaFluxoChave: diagnostico.etapaFluxoChave,
        }
      })
    }
  }

  const operacoesPorDemanda = await Promise.all(
    demandasComFluxo.map((demanda) => buscarOperacoesScaneadasPorDemanda(demanda))
  )

  return consolidarDemandasPorOperacoes(demandasComFluxo, operacoesPorDemanda.flat())
}

export async function buscarOperacoesScaneadasPorSecao(
  turnoSetorOpId: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  const supabase = createClient()
  return listarTurnoSetorOperacoesPorSecaoComClient(supabase, turnoSetorOpId)
}

export async function buscarOperacoesScaneadasPorDemanda(
  turnoSetorDemanda: Pick<
    TurnoSetorDemandaScaneada,
    'id' | 'turnoSetorOpLegacyId' | 'quantidadeAceitaTurno'
  >
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  const supabase = createClient()
  const operacoesPorDemanda = await listarTurnoSetorOperacoesPorDemandaComClient(
    supabase,
    turnoSetorDemanda.id
  )

  const operacoesBase =
    operacoesPorDemanda.length > 0 || !turnoSetorDemanda.turnoSetorOpLegacyId
      ? operacoesPorDemanda
      : await listarTurnoSetorOperacoesPorSecaoComClient(
          supabase,
          turnoSetorDemanda.turnoSetorOpLegacyId
        )

  return limitarOperacoesTurnoAoAceiteDemandas({
    operacoesSecao: operacoesBase,
    demandasSetor: [
      {
        id: turnoSetorDemanda.id,
        turnoSetorOpLegacyId: turnoSetorDemanda.turnoSetorOpLegacyId,
        quantidadeAceitaTurno: turnoSetorDemanda.quantidadeAceitaTurno,
      },
    ],
  })
}
