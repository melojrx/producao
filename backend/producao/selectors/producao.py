from typing import Optional

from django.db import models
from django.db.models import QuerySet

from producao.models import RegistroProducao


def list_registros_producao(
    turno_id: Optional[str] = None,
    operador_id: Optional[str] = None,
) -> QuerySet[RegistroProducao]:
    """Lista registros de producao com filtros."""
    qs = RegistroProducao.objects.select_related(
        "operador",
        "operacao",
        "produto",
        "turno",
    )
    if turno_id:
        qs = qs.filter(turno_id=turno_id)
    if operador_id:
        qs = qs.filter(operador_id=operador_id)
    return qs.order_by("-hora_registro")


def get_registro_producao(registro_id: str) -> RegistroProducao:
    """Retorna registro por ID."""
    return RegistroProducao.objects.select_related(
        "operador",
        "operacao",
        "produto",
        "turno",
        "turno_op",
        "turno_setor",
    ).get(id=registro_id)


def get_registros_por_turno(turno_id: str) -> QuerySet[RegistroProducao]:
    """Retorna todos os registros de um turno."""
    return RegistroProducao.objects.filter(turno_id=turno_id).select_related(
        "operador",
        "operacao",
    ).order_by("hora_registro")


def get_total_produzido_por_turno(turno_id: str) -> int:
    """Retorna total de pecas produzidas em um turno."""
    return RegistroProducao.objects.filter(turno_id=turno_id).aggregate(
        total=models.Sum("quantidade")
    )["total"] or 0