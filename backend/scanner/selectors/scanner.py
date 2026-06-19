from typing import Optional, Tuple

from django.db.models import QuerySet, Sum

from accounts.models import Operador
from turnos.models import Turno, TurnoSetor, TurnoSetorDemanda


def buscar_operador_por_qr_token(token: str) -> Optional[Operador]:
    """Retorna operador ativo pelo token QR ou None."""
    return Operador.objects.filter(
        qr_code_token=token,
        status=Operador.Status.ATIVO,
    ).first()


def buscar_turno_setor_por_qr_token(token: str) -> Optional[TurnoSetor]:
    """Retorna turno-setor aberto no turno corrente pelo token QR ou None."""
    return (
        TurnoSetor.objects.filter(
            qr_code_token=token,
            turno__status=Turno.Status.ABERTO,
        )
        .select_related("setor", "turno")
        .first()
    )


def buscar_turno_setor_aberto_por_id(turno_setor_id: str) -> Optional[TurnoSetor]:
    """Retorna turno-setor aberto pelo ID ou None."""
    return (
        TurnoSetor.objects.filter(
            id=turno_setor_id,
            turno__status=Turno.Status.ABERTO,
        )
        .select_related("setor", "turno")
        .first()
    )


def agregar_quantidades_turno_setor(turno_setor: TurnoSetor) -> Tuple[int, int]:
    """Agrega quantidades planejada e realizada das demandas do setor."""
    agregado = TurnoSetorDemanda.objects.filter(turno_setor=turno_setor).aggregate(
        quantidade_planejada=Sum("quantidade_planejada"),
        quantidade_realizada=Sum("quantidade_realizada"),
    )
    return (
        int(agregado["quantidade_planejada"] or 0),
        int(agregado["quantidade_realizada"] or 0),
    )


def listar_demandas_turno_setor(turno_setor_id: str) -> QuerySet[TurnoSetorDemanda]:
    """Lista demandas de um turno-setor com OP e produto."""
    return (
        TurnoSetorDemanda.objects.filter(turno_setor_id=turno_setor_id)
        .select_related("turno_op", "produto", "turno_setor_op_legacy")
        .order_by("created_at")
    )
