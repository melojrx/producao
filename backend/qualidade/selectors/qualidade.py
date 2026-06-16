from typing import Optional

from django.db.models import QuerySet

from qualidade.models import QualidadeDefeito, QualidadeDetalhe, QualidadeRegistro


def list_qualidade_registros(
    turno_id: Optional[str] = None,
    revisor_id: Optional[str] = None,
) -> QuerySet[QualidadeRegistro]:
    """Lista registros de qualidade com filtros."""
    qs = QualidadeRegistro.objects.select_related(
        "revisor",
        "turno",
        "turno_op",
        "turno_setor_operacao__operacao",
    )
    if turno_id:
        qs = qs.filter(turno_id=turno_id)
    if revisor_id:
        qs = qs.filter(revisor_id=revisor_id)
    return qs.order_by("-hora_revisao")


def get_qualidade_registro(registro_id: str) -> QualidadeRegistro:
    """Retorna registro de qualidade por ID."""
    return QualidadeRegistro.objects.select_related(
        "revisor",
        "turno",
        "turno_op",
    ).prefetch_related("detalhes__defeito").get(id=registro_id)


def list_qualidade_detalhes(registro_id: Optional[str] = None) -> QuerySet[QualidadeDetalhe]:
    """Lista detalhes de defeitos de um registro."""
    qs = QualidadeDetalhe.objects.select_related(
        "registro",
        "defeito",
        "operacao",
        "setor",
    )
    if registro_id:
        qs = qs.filter(registro_id=registro_id)
    return qs.order_by("created_at")


def list_qualidade_defeitos(ativo: bool = True) -> QuerySet[QualidadeDefeito]:
    """Lista defeitos, opicionalmente filtrados por ativo."""
    return QualidadeDefeito.objects.filter(ativo=ativo).order_by("nome")


def get_qualidade_defeito(defeito_id: str) -> QualidadeDefeito:
    """Retorna defeito por ID."""
    return QualidadeDefeito.objects.get(id=defeito_id)