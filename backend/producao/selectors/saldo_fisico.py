from dataclasses import dataclass
from uuid import UUID

from django.db.models import Sum

from producao.models import RegistroProducao
from turnos.models import TurnoOp, TurnoSetorOperacao


class SaldoFisicoInsuficienteError(ValueError):
    """Erro de dominio para consumo acima do saldo fisico da OP."""


@dataclass(frozen=True)
class SaldoFisicoOperacao:
    turno_op_id: UUID
    operacao_id: UUID
    linhagem_turno_op_ids: tuple[UUID, ...]
    quantidade_planejada_op: int
    producao_acumulada_operacao: int
    progresso_contexto_operacional: int
    quantidade_consumida_representativa: int
    saldo_restante: int


def get_linhagem_turno_op_ids(turno_op_id: str | UUID) -> tuple[UUID, ...]:
    turno_op = TurnoOp.objects.select_related("turno_op_origem").get(id=turno_op_id)
    raiz = _get_raiz_turno_op(turno_op)
    ids = list(
        TurnoOp.objects.filter(turno_op_origem_id=raiz.id)
        .order_by("created_at", "id")
        .values_list("id", flat=True)
    )
    return tuple([raiz.id, *ids])


def calcular_saldo_fisico_operacao_op(
    *,
    turno_op_id: str | UUID,
    operacao_id: str | UUID,
    turno_setor_operacao_id: str | UUID | None = None,
) -> SaldoFisicoOperacao:
    turno_op = TurnoOp.objects.get(id=turno_op_id)
    linhagem_ids = get_linhagem_turno_op_ids(turno_op.id)
    producao_acumulada = _sum_producao_operacao_linhagem(
        linhagem_turno_op_ids=linhagem_ids,
        operacao_id=operacao_id,
    )
    progresso_contexto = _get_progresso_contexto_operacional(turno_setor_operacao_id)
    consumo_representativo = max(producao_acumulada, progresso_contexto)
    saldo_restante = max(turno_op.quantidade_planejada - consumo_representativo, 0)

    return SaldoFisicoOperacao(
        turno_op_id=turno_op.id,
        operacao_id=UUID(str(operacao_id)),
        linhagem_turno_op_ids=linhagem_ids,
        quantidade_planejada_op=turno_op.quantidade_planejada,
        producao_acumulada_operacao=producao_acumulada,
        progresso_contexto_operacional=progresso_contexto,
        quantidade_consumida_representativa=consumo_representativo,
        saldo_restante=saldo_restante,
    )


def validar_quantidade_dentro_saldo_fisico(
    *,
    turno_op_id: str | UUID,
    operacao_id: str | UUID,
    quantidade_solicitada: int,
    turno_setor_operacao_id: str | UUID | None = None,
) -> SaldoFisicoOperacao:
    if quantidade_solicitada <= 0:
        raise SaldoFisicoInsuficienteError("Quantidade apontada deve ser maior que zero.")

    saldo = calcular_saldo_fisico_operacao_op(
        turno_op_id=turno_op_id,
        operacao_id=operacao_id,
        turno_setor_operacao_id=turno_setor_operacao_id,
    )
    if quantidade_solicitada > saldo.saldo_restante:
        raise SaldoFisicoInsuficienteError(
            f"A OP possui apenas {saldo.saldo_restante} peca(s) com saldo fisico nesta operacao."
        )
    return saldo


def _get_raiz_turno_op(turno_op: TurnoOp) -> TurnoOp:
    raiz = turno_op
    while raiz.turno_op_origem_id is not None:
        raiz = TurnoOp.objects.select_related("turno_op_origem").get(id=raiz.turno_op_origem_id)
    return raiz


def _sum_producao_operacao_linhagem(
    *,
    linhagem_turno_op_ids: tuple[UUID, ...],
    operacao_id: str | UUID,
) -> int:
    total = RegistroProducao.objects.filter(
        turno_op_id__in=linhagem_turno_op_ids,
        operacao_id=operacao_id,
    ).aggregate(total=Sum("quantidade"))["total"]
    return int(total or 0)


def _get_progresso_contexto_operacional(turno_setor_operacao_id: str | UUID | None) -> int:
    if turno_setor_operacao_id is None:
        return 0

    turno_setor_operacao = TurnoSetorOperacao.objects.select_related("turno_setor_demanda").get(
        id=turno_setor_operacao_id
    )
    return (
        turno_setor_operacao.turno_setor_demanda.quantidade_herdada_setor
        + turno_setor_operacao.quantidade_realizada
    )
