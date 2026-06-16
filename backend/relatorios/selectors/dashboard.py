from datetime import datetime, timedelta
from typing import Optional

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate

from producao.models import RegistroProducao
from qualidade.models import QualidadeRegistro
from turnos.models import Turno


def get_dashboard_resumo() -> dict:
    """Retorna resumo geral do dashboard operacional."""
    hoje = datetime.now().date()
    inicio_dia = datetime.combine(hoje, datetime.min.time())
    fim_dia = datetime.combine(hoje, datetime.max.time())

    # Total produzido hoje
    producao_hoje = RegistroProducao.objects.filter(
        hora_registro__range=(inicio_dia, fim_dia)
    ).aggregate(total=Sum("quantidade"))["total"] or 0

    # Total revisoes hoje
    revisoes_hoje = QualidadeRegistro.objects.filter(
        hora_revisao__range=(inicio_dia, fim_dia)
    ).count()

    # Turno aberto
    turno_aberto = Turno.objects.filter(status=Turno.Status.ABERTO).first()

    # Ultimo turno encerrado
    ultimo_turno = Turno.objects.filter(
        status=Turno.Status.ENCERRADO
    ).order_by("-data_hora_encerramento").first()

    return {
        "producao_hoje": producao_hoje,
        "revisoes_hoje": revisoes_hoje,
        "turno_aberto": turno_aberto.id if turno_aberto else None,
        "ultimo_turno_id": ultimo_turno.id if ultimo_turno else None,
    }


def get_indicadores_turno(turno_id: str) -> dict:
    """Retorna indicadores de producao e qualidade de um turno."""
    registros = RegistroProducao.objects.filter(turno_id=turno_id)

    total_produzido = registros.aggregate(total=Sum("quantidade"))["total"] or 0
    total_registros = registros.count()

    # Por origem
    por_origem = registros.values("origem_apontamento").annotate(
        count=Count("id"),
        total=Sum("quantidade")
    )

    # Revisoes de qualidade do turno
    revisoes = QualidadeRegistro.objects.filter(turno_id=turno_id)
    total_aprovado = revisoes.aggregate(total=Sum("quantidade_aprovada"))["total"] or 0
    total_reprovado = revisoes.aggregate(total=Sum("quantidade_reprovada"))["total"] or 0

    return {
        "turno_id": str(turno_id),
        "total_produzido": total_produzido,
        "total_registros": total_registros,
        "total_aprovado": total_aprovado,
        "total_reprovado": total_reprovado,
        "por_origem": list(por_origem),
    }


def get_producao_diaria(dias: int = 30) -> list:
    """Retorna producao diaria dos ultimos N dias."""
    inicio = datetime.now() - timedelta(days=dias)

    return (
        RegistroProducao.objects.filter(hora_registro__gte=inicio)
        .annotate(data=TruncDate("hora_registro"))
        .values("data")
        .annotate(total=Sum("quantidade"), registros=Count("id"))
        .order_by("data")
    )


def get_indicadores_qualidade(dias: int = 30) -> dict:
    """Retorna indicadores de qualidade dos ultimos N dias."""
    inicio = datetime.now() - timedelta(days=dias)

    revisoes = QualidadeRegistro.objects.filter(hora_revisao__gte=inicio)

    total_aprovado = revisoes.aggregate(total=Sum("quantidade_aprovada"))["total"] or 0
    total_reprovado = revisoes.aggregate(total=Sum("quantidade_reprovada"))["total"] or 0

    # Por classificacao de defeito
    from qualidade.models import QualidadeDetalhe
    defeitos = (
        QualidadeDetalhe.objects.filter(registro__hora_revisao__gte=inicio)
        .values("defeito__classificacao")
        .annotate(
            count=Count("id"),
            total=Sum("quantidade_defeito")
        )
    )

    return {
        "total_aprovado": total_aprovado,
        "total_reprovado": total_reprovado,
        "taxa_aprovacao": round((total_aprovado / (total_aprovado + total_reprovado) * 100), 2) if (total_aprovado + total_reprovado) > 0 else 0,
        "defeitos_por_classificacao": list(defeitos),
    }