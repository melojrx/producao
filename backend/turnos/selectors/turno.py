from typing import Optional

from django.db.models import QuerySet

from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOperacao, TurnoSetorOp


def list_turnos(status: Optional[str] = None) -> QuerySet[Turno]:
    """Lista turnos com filtros opcionais."""
    qs = Turno.objects.all()
    if status:
        qs = qs.filter(status=status)
    return qs.order_by("-data_hora_abertura")


def get_turno(turno_id: str) -> Turno:
    """Retorna turno por ID."""
    return Turno.objects.get(id=turno_id)


def get_turno_aberto() -> Optional[Turno]:
    """Retorna turno aberto ou None."""
    return Turno.objects.filter(status=Turno.Status.ABERTO).first()


def get_turno_ultimo_encerrado() -> Optional[Turno]:
    """Retorna o ultimo turno encerrado ou None."""
    return (
        Turno.objects.filter(status=Turno.Status.ENCERRADO)
        .order_by("-data_hora_encerramento", "-data_hora_abertura")
        .first()
    )


def get_turno_completo(turno_id: str) -> Turno:
    """Retorna turno com todos os recursos otimizados."""
    return (
        Turno.objects.select_related("encerrado_por")
        .prefetch_related(
            "turno_ops__produto",
            "turno_ops__turno_setor_operacoes__operacao",
            "setores_turno__setor",
            "setores_turno__demandas__turno_op",
            "turno_operadores__operador",
        )
        .get(id=turno_id)
    )


def list_turno_ops(turno_id: str) -> QuerySet[TurnoOp]:
    """Lista OPs de um turno."""
    return TurnoOp.objects.filter(turno_id=turno_id).select_related("produto", "turno_op_origem")


def list_turno_setores(turno_id: str) -> QuerySet[TurnoSetor]:
    """Lista setores de um turno."""
    return TurnoSetor.objects.filter(turno_id=turno_id).select_related("setor")


def list_turno_setor_demandas(
    turno_setor_id: str | None = None,
    turno_id: str | None = None,
) -> QuerySet[TurnoSetorDemanda]:
    """Lista demandas de um setor de turno ou de um turno inteiro."""
    qs = TurnoSetorDemanda.objects.select_related(
        "turno_op__produto",
        "setor",
        "turno_setor_op_legacy",
    )
    if turno_setor_id:
        qs = qs.filter(turno_setor_id=turno_setor_id)
    elif turno_id:
        qs = qs.filter(turno_id=turno_id)
    else:
        return TurnoSetorDemanda.objects.none()
    return qs.order_by("created_at")


def list_turno_setor_operacoes(
    turno_setor_demanda_id: str | None = None,
    turno_id: str | None = None,
) -> QuerySet[TurnoSetorOperacao]:
    """Lista operacoes de uma demanda de setor ou de um turno inteiro."""
    qs = TurnoSetorOperacao.objects.select_related("operacao", "operacao__maquina", "setor")
    if turno_setor_demanda_id:
        qs = qs.filter(turno_setor_demanda_id=turno_setor_demanda_id)
    elif turno_id:
        qs = qs.filter(turno_id=turno_id)
    else:
        return TurnoSetorOperacao.objects.none()
    return qs.order_by("turno_setor_demanda", "sequencia")


def list_turno_setor_ops(turno_id: str) -> QuerySet[TurnoSetorOp]:
    """Lista secoes legadas (turno_setor_ops) de um turno."""
    return (
        TurnoSetorOp.objects.filter(turno_id=turno_id)
        .select_related("setor", "turno_op")
        .order_by("created_at")
    )