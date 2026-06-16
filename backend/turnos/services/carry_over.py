from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Sequence

from cadastros.models import Setor
from produtos.models import ProdutoOperacao
from shared.fluxo_sequencial_turno import (
    DemandaFluxoSequencialBase,
    calcular_progresso_operacional_setor,
    enriquecer_demandas_com_fluxo_sequencial,
)
from shared.turno_dominio import (
    calcular_quantidade_planejada_remanescente,
    normalizar_inteiro_nao_negativo,
    setor_participa_fluxo_produtivo_ativo,
)
from turnos.models import Turno, TurnoOp, TurnoSetorDemanda, TurnoSetorOperacao


class TurnoCarryOverServiceError(ValueError):
    """Erro de regra de negocio no carry-over entre turnos."""


@dataclass(frozen=True)
class SnapshotCarryOverSetorial:
    setor_id: str
    setor_sequencia_fluxo: int
    setor_nome: str
    quantidade_planejada_origem: int
    quantidade_planejada_destino: int
    quantidade_realizada_origem: int
    quantidade_realizada_destino: int
    quantidade_herdada_origem: int
    quantidade_herdada_destino: int
    quantidade_liberada_destino: int
    quantidade_pendente_destino: int
    quantidade_liberada_origem: int
    demanda_concluida_destino: bool


@dataclass(frozen=True)
class DemandaCarryOverConsolidada:
    turno_op_id: str
    setor_id: str
    quantidade_planejada: int
    quantidade_herdada_setor: int
    quantidade_realizada: int


@dataclass(frozen=True)
class SaldoTurnoOpCarryOver:
    turno_op_id: str
    numero_op: str
    produto_id: str
    quantidade_planejada: int
    quantidade_realizada: int
    quantidade_planejada_remanescente: int
    turno_op_origem_id: str | None
    status: str


def _criar_chave_demanda_setor(turno_op_id: str, setor_id: str) -> str:
    return f"{turno_op_id}:{setor_id}"


def consolidar_demandas_carry_over_com_operacoes(
    demandas: Sequence[DemandaCarryOverConsolidada],
    operacoes: Sequence[TurnoSetorOperacao],
) -> list[DemandaCarryOverConsolidada]:
    operacoes_por_demanda: dict[str, list[TurnoSetorOperacao]] = {}
    for operacao in operacoes:
        chaves = [
            str(operacao.turno_setor_demanda_id),
            _criar_chave_demanda_setor(str(operacao.turno_op_id), str(operacao.setor_id)),
        ]
        for chave in chaves:
            operacoes_por_demanda.setdefault(chave, []).append(operacao)

    consolidadas: list[DemandaCarryOverConsolidada] = []
    for demanda in demandas:
        chaves = [
            _criar_chave_demanda_setor(demanda.turno_op_id, demanda.setor_id),
        ]
        operacoes_da_demanda: list[TurnoSetorOperacao] = []
        for chave in chaves:
            operacoes_da_demanda.extend(operacoes_por_demanda.get(chave, []))
        operacoes_unicas = {str(op.id): op for op in operacoes_da_demanda}.values()
        quantidade_realizada_operacoes = (
            min(op.quantidade_realizada for op in operacoes_unicas) if operacoes_unicas else demanda.quantidade_realizada
        )
        consolidadas.append(
            DemandaCarryOverConsolidada(
                turno_op_id=demanda.turno_op_id,
                setor_id=demanda.setor_id,
                quantidade_planejada=demanda.quantidade_planejada,
                quantidade_herdada_setor=demanda.quantidade_herdada_setor,
                quantidade_realizada=max(demanda.quantidade_realizada, quantidade_realizada_operacoes),
            )
        )
    return consolidadas


def calcular_saldos_ops_turno(turno_id: str) -> list[SaldoTurnoOpCarryOver]:
    ops = list(
        TurnoOp.objects.filter(turno_id=turno_id).order_by("created_at").values(
            "id",
            "numero_op",
            "produto_id",
            "quantidade_planejada",
            "quantidade_realizada",
            "turno_op_origem_id",
            "status",
        )
    )
    demandas = list(
        TurnoSetorDemanda.objects.filter(turno_id=turno_id)
        .select_related("setor")
        .values(
            "id",
            "turno_op_id",
            "setor_id",
            "quantidade_planejada",
            "quantidade_herdada_setor",
            "quantidade_realizada",
        )
    )
    setor_ids = {str(demanda["setor_id"]) for demanda in demandas}
    setores_por_id = Setor.objects.in_bulk(setor_ids)

    demandas_produtivas = [
        DemandaCarryOverConsolidada(
            turno_op_id=str(demanda["turno_op_id"]),
            setor_id=str(demanda["setor_id"]),
            quantidade_planejada=demanda["quantidade_planejada"],
            quantidade_herdada_setor=demanda["quantidade_herdada_setor"],
            quantidade_realizada=demanda["quantidade_realizada"],
        )
        for demanda in demandas
        if (setor := setores_por_id.get(demanda["setor_id"])) and setor_participa_fluxo_produtivo_ativo(setor)
    ]
    operacoes = list(
        TurnoSetorOperacao.objects.filter(turno_id=turno_id).select_related("setor")
    )
    operacoes_produtivas = [op for op in operacoes if setor_participa_fluxo_produtivo_ativo(op.setor)]

    demandas_consolidadas = consolidar_demandas_carry_over_com_operacoes(
        demandas_produtivas,
        operacoes_produtivas,
    )
    demandas_por_turno_op: dict[str, list[DemandaCarryOverConsolidada]] = {}
    for demanda in demandas_consolidadas:
        demandas_por_turno_op.setdefault(demanda.turno_op_id, []).append(demanda)

    saldos: list[SaldoTurnoOpCarryOver] = []
    for op in ops:
        turno_op_id = str(op["id"])
        demandas_turno_op = demandas_por_turno_op.get(turno_op_id, [])
        if demandas_turno_op:
            quantidade_realizada_consolidada = min(demanda.quantidade_realizada for demanda in demandas_turno_op)
            quantidade_progresso_operacional = min(
                demanda.quantidade_herdada_setor + demanda.quantidade_realizada for demanda in demandas_turno_op
            )
        else:
            quantidade_realizada_consolidada = op["quantidade_realizada"]
            quantidade_progresso_operacional = op["quantidade_realizada"]

        quantidade_realizada = max(
            0,
            min(op["quantidade_planejada"], quantidade_realizada_consolidada),
        )
        quantidade_remanescente = calcular_quantidade_planejada_remanescente(
            quantidade_planejada_origem=op["quantidade_planejada"],
            demandas_origem=[
                {
                    "quantidade_realizada": demanda.quantidade_realizada,
                    "quantidade_herdada_setor": demanda.quantidade_herdada_setor,
                }
                for demanda in demandas_turno_op
            ],
            quantidade_realizada_fallback=quantidade_progresso_operacional,
        )
        saldos.append(
            SaldoTurnoOpCarryOver(
                turno_op_id=turno_op_id,
                numero_op=op["numero_op"],
                produto_id=str(op["produto_id"]),
                quantidade_planejada=op["quantidade_planejada"],
                quantidade_realizada=quantidade_realizada,
                quantidade_planejada_remanescente=quantidade_remanescente,
                turno_op_origem_id=str(op["turno_op_origem_id"]) if op["turno_op_origem_id"] else None,
                status=op["status"],
            )
        )
    return saldos


def atualizar_saldos_turno_ops(turno_id: str) -> None:
    for saldo in calcular_saldos_ops_turno(turno_id):
        turno_op = TurnoOp.objects.select_for_update().get(id=saldo.turno_op_id)
        turno_op.quantidade_realizada = saldo.quantidade_realizada
        turno_op.quantidade_planejada_remanescente = saldo.quantidade_planejada_remanescente
        if saldo.quantidade_planejada_remanescente == 0:
            turno_op.status = TurnoOp.Status.CONCLUIDA
        turno_op.save(
            update_fields=[
                "quantidade_realizada",
                "quantidade_planejada_remanescente",
                "status",
                "updated_at",
            ]
        )


def calcular_tp_produto_min(produto_id: str) -> Decimal:
    total = Decimal("0")
    for produto_operacao in ProdutoOperacao.objects.filter(produto_id=produto_id, vigente=True).select_related(
        "operacao"
    ):
        total += produto_operacao.operacao.tempo_padrao_min
    return total


def _calcular_quantidade_liberada_destino(
    *,
    quantidade_planejada_destino: int,
    quantidade_progresso_operacional_origem: int,
    quantidade_liberada_persistida_origem: int,
    quantidade_disponivel_fluxo_origem: int,
    usar_liberacao_fluxo: bool,
) -> int:
    quantidade_planejada_destino = normalizar_inteiro_nao_negativo(quantidade_planejada_destino)
    quantidade_progresso_operacional_origem = normalizar_inteiro_nao_negativo(
        quantidade_progresso_operacional_origem
    )
    quantidade_liberada_persistida_origem = normalizar_inteiro_nao_negativo(
        quantidade_liberada_persistida_origem
    )
    quantidade_disponivel_fluxo_origem = normalizar_inteiro_nao_negativo(quantidade_disponivel_fluxo_origem)
    saldo_liberado_persistido_origem = max(quantidade_liberada_persistida_origem, 0)
    quantidade_liberada_operacional = (
        max(quantidade_disponivel_fluxo_origem, saldo_liberado_persistido_origem)
        if usar_liberacao_fluxo
        else saldo_liberado_persistido_origem
    )
    return min(
        max(quantidade_planejada_destino - quantidade_progresso_operacional_origem, 0),
        quantidade_liberada_operacional,
    )


def _mapear_etapa_fluxo_por_nome_setor(setor_nome: str) -> str | None:
    nome = (setor_nome or "").strip().lower()
    etapas = {
        "preparação": "preparacao",
        "preparacao": "preparacao",
        "frente": "frente",
        "costa": "costa",
        "montagem": "montagem",
        "final": "final",
        "acabamento": "final",
    }
    return etapas.get(nome)


def normalizar_demandas_carry_over_entre_turnos(
    *,
    quantidade_planejada_destino: int,
    demandas_origem: Sequence[DemandaFluxoSequencialBase],
) -> list[SnapshotCarryOverSetorial]:
    quantidade_planejada_destino = normalizar_inteiro_nao_negativo(quantidade_planejada_destino)
    demandas_origem_por_id = {demanda.id: demanda for demanda in demandas_origem}
    demandas_enriquecidas = sorted(
        enriquecer_demandas_com_fluxo_sequencial(demandas_origem),
        key=lambda demanda: (demanda.setor_sequencia_fluxo, demanda.setor_id),
    )

    snapshots: list[SnapshotCarryOverSetorial] = []
    for demanda in demandas_enriquecidas:
        demanda_origem = demandas_origem_por_id.get(demanda.id)
        quantidade_realizada_origem = normalizar_inteiro_nao_negativo(demanda.quantidade_realizada)
        quantidade_herdada_origem = normalizar_inteiro_nao_negativo(
            demanda_origem.quantidade_herdada_setor if demanda_origem else 0
        )
        quantidade_progresso_operacional_origem = calcular_progresso_operacional_setor(demanda)
        quantidade_liberada_persistida_origem = normalizar_inteiro_nao_negativo(
            demanda_origem.quantidade_liberada_setor if demanda_origem else 0
        )
        quantidade_herdada_destino = min(
            quantidade_planejada_destino,
            quantidade_progresso_operacional_origem,
        )
        etapa_fluxo = _mapear_etapa_fluxo_por_nome_setor(demanda.setor_nome)
        quantidade_liberada_destino = _calcular_quantidade_liberada_destino(
            quantidade_planejada_destino=quantidade_planejada_destino,
            quantidade_progresso_operacional_origem=quantidade_progresso_operacional_origem,
            quantidade_liberada_persistida_origem=quantidade_liberada_persistida_origem,
            quantidade_disponivel_fluxo_origem=demanda.quantidade_disponivel_apontamento,
            usar_liberacao_fluxo=(
                quantidade_progresso_operacional_origem > 0
                or demanda.setor_anterior_id is not None
                or etapa_fluxo in {"montagem", "final"}
            ),
        )
        snapshots.append(
            SnapshotCarryOverSetorial(
                setor_id=demanda.setor_id,
                setor_sequencia_fluxo=demanda.setor_sequencia_fluxo,
                setor_nome=demanda.setor_nome,
                quantidade_planejada_origem=normalizar_inteiro_nao_negativo(demanda.quantidade_planejada),
                quantidade_planejada_destino=quantidade_planejada_destino,
                quantidade_realizada_origem=quantidade_realizada_origem,
                quantidade_realizada_destino=0,
                quantidade_herdada_origem=quantidade_herdada_origem,
                quantidade_herdada_destino=quantidade_herdada_destino,
                quantidade_liberada_destino=quantidade_liberada_destino,
                quantidade_pendente_destino=max(quantidade_planejada_destino - quantidade_herdada_destino, 0),
                quantidade_liberada_origem=quantidade_liberada_persistida_origem,
                demanda_concluida_destino=(
                    quantidade_planejada_destino > 0 and quantidade_herdada_destino >= quantidade_planejada_destino
                ),
            )
        )
    return snapshots


def selecionar_pendencias_turno_anterior(
    turno_origem_id: str,
    turno_op_ids: Sequence[str] | None = None,
) -> list[SaldoTurnoOpCarryOver]:
    saldos = calcular_saldos_ops_turno(turno_origem_id)
    pendencias = [saldo for saldo in saldos if saldo.quantidade_planejada_remanescente > 0]

    if not pendencias:
        raise TurnoCarryOverServiceError(
            "O turno anterior não possui pendências com saldo remanescente para carry-over."
        )

    if not turno_op_ids:
        return pendencias

    ids_selecionados = {str(turno_op_id) for turno_op_id in turno_op_ids if turno_op_id}
    pendencias_selecionadas = [pendencia for pendencia in pendencias if pendencia.turno_op_id in ids_selecionados]

    if len(pendencias_selecionadas) != len(ids_selecionados):
        raise TurnoCarryOverServiceError(
            "Uma ou mais OPs selecionadas para carry-over não pertencem às pendências do turno de origem."
        )
    return pendencias_selecionadas


def _inferir_status_demanda(*, quantidade_planejada: int, quantidade_realizada: int, quantidade_herdada: int) -> str:
    progresso = quantidade_realizada + quantidade_herdada
    if progresso >= quantidade_planejada > 0:
        return "concluida"
    if progresso > 0:
        return "em_andamento"
    return "planejada"


def hidratar_progresso_carry_over_da_op(
    *,
    turno_op_origem_id: str,
    turno_op_destino_id: str,
    quantidade_planejada_destino: int,
) -> None:
    demandas_origem = list(
        TurnoSetorDemanda.objects.filter(turno_op_id=turno_op_origem_id)
        .select_related("setor")
        .order_by("created_at")
    )
    if not demandas_origem:
        return

    operacoes_origem = list(
        TurnoSetorOperacao.objects.filter(turno_op_id=turno_op_origem_id).select_related("setor")
    )
    demandas_produtivas = [
        DemandaCarryOverConsolidada(
            turno_op_id=str(demanda.turno_op_id),
            setor_id=str(demanda.setor_id),
            quantidade_planejada=demanda.quantidade_planejada,
            quantidade_herdada_setor=demanda.quantidade_herdada_setor,
            quantidade_realizada=demanda.quantidade_realizada,
        )
        for demanda in demandas_origem
        if setor_participa_fluxo_produtivo_ativo(demanda.setor)
    ]
    operacoes_produtivas = [
        operacao
        for operacao in operacoes_origem
        if setor_participa_fluxo_produtivo_ativo(operacao.setor)
    ]
    demandas_consolidadas = consolidar_demandas_carry_over_com_operacoes(
        demandas_produtivas,
        operacoes_produtivas,
    )
    demandas_por_setor = {demanda.setor_id: demanda for demanda in demandas_consolidadas}

    demandas_para_normalizacao = [
        DemandaFluxoSequencialBase(
            id=str(demanda.id),
            turno_op_id=str(demanda.turno_op_id),
            setor_id=str(demanda.setor_id),
            setor_sequencia_fluxo=demanda.setor.sequencia_fluxo,
            setor_nome=demanda.setor.nome,
            quantidade_planejada=demandas_por_setor[str(demanda.setor_id)].quantidade_planejada,
            quantidade_realizada=demandas_por_setor[str(demanda.setor_id)].quantidade_realizada,
            quantidade_herdada_setor=demandas_por_setor[str(demanda.setor_id)].quantidade_herdada_setor,
            quantidade_liberada_setor=demanda.quantidade_liberada_setor,
            status=_inferir_status_demanda(
                quantidade_planejada=demandas_por_setor[str(demanda.setor_id)].quantidade_planejada,
                quantidade_realizada=demandas_por_setor[str(demanda.setor_id)].quantidade_realizada,
                quantidade_herdada=demandas_por_setor[str(demanda.setor_id)].quantidade_herdada_setor,
            ),
            iniciado_em=None,
            encerrado_em=None,
        )
        for demanda in demandas_origem
        if setor_participa_fluxo_produtivo_ativo(demanda.setor)
    ]

    snapshots_por_setor = {
        snapshot.setor_id: snapshot
        for snapshot in normalizar_demandas_carry_over_entre_turnos(
            quantidade_planejada_destino=quantidade_planejada_destino,
            demandas_origem=demandas_para_normalizacao,
        )
    }
    setores_com_carry_over = [
        (setor_id, snapshot)
        for setor_id, snapshot in snapshots_por_setor.items()
        if snapshot.quantidade_herdada_destino > 0
        or snapshot.quantidade_liberada_destino > 0
        or snapshot.demanda_concluida_destino
    ]
    if not setores_com_carry_over:
        return

    for setor_id, snapshot in setores_com_carry_over:
        demanda_destino = TurnoSetorDemanda.objects.filter(
            turno_op_id=turno_op_destino_id,
            setor_id=setor_id,
        ).first()
        if not demanda_destino:
            continue
        demanda_destino.quantidade_herdada_setor = snapshot.quantidade_herdada_destino
        demanda_destino.quantidade_liberada_setor = snapshot.quantidade_liberada_destino
        demanda_destino.save(
            update_fields=[
                "quantidade_herdada_setor",
                "quantidade_liberada_setor",
                "updated_at",
            ]
        )


def carregar_pendencias_turno_anterior(
    *,
    turno_origem_id: str,
    turno_destino_id: str,
    turno_op_ids: Sequence[str] | None = None,
    inserir_turno_op_fn,
) -> None:
    pendencias = selecionar_pendencias_turno_anterior(turno_origem_id, turno_op_ids)

    for pendencia in pendencias:
        turno_op_origem_id = pendencia.turno_op_origem_id or pendencia.turno_op_id
        turno_op = inserir_turno_op_fn(
            turno_id=turno_destino_id,
            numero_op=pendencia.numero_op,
            produto_id=pendencia.produto_id,
            quantidade_planejada=pendencia.quantidade_planejada_remanescente,
            turno_op_origem_id=turno_op_origem_id,
            quantidade_planejada_remanescente=pendencia.quantidade_planejada_remanescente,
        )
        hidratar_progresso_carry_over_da_op(
            turno_op_origem_id=pendencia.turno_op_id,
            turno_op_destino_id=str(turno_op.id),
            quantidade_planejada_destino=turno_op.quantidade_planejada,
        )


def buscar_ultimo_turno_encerrado() -> Turno | None:
    return (
        Turno.objects.filter(status=Turno.Status.ENCERRADO)
        .order_by("-data_hora_encerramento", "-created_at")
        .first()
    )
