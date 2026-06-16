from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from accounts.models import User
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorOp, TurnoSetorOperacao
from turnos.services.carry_over import atualizar_saldos_turno_ops


class TurnoEncerramentoServiceError(ValueError):
    """Erro de regra de negocio ao encerrar turno."""


def encerrar_turno(*, turno_id: str, encerrado_por_id: str | None = None) -> Turno:
    with transaction.atomic():
        turno = Turno.objects.select_for_update().get(id=turno_id)
        _validar_turno_aberto(turno)

        encerrado_por = _get_encerrado_por(encerrado_por_id)
        atualizar_saldos_turno_ops(str(turno.id))

        agora = timezone.now()
        _encerrar_contextos_operacionais(turno_id=str(turno.id), encerrado_em=agora)

        turno.status = Turno.Status.ENCERRADO
        turno.data_hora_encerramento = agora
        turno.encerrado_por = encerrado_por
        turno.save(
            update_fields=[
                "status",
                "data_hora_encerramento",
                "encerrado_por",
                "updated_at",
            ]
        )
        return turno


def _validar_turno_aberto(turno: Turno) -> None:
    if turno.status != Turno.Status.ABERTO:
        raise TurnoEncerramentoServiceError("Somente turnos abertos podem ser encerrados.")


def _get_encerrado_por(encerrado_por_id: str | None) -> User | None:
    if not encerrado_por_id:
        return None
    try:
        return User.objects.get(id=encerrado_por_id)
    except User.DoesNotExist as exc:
        raise TurnoEncerramentoServiceError("Usuario de encerramento nao encontrado.") from exc


def _encerrar_contextos_operacionais(*, turno_id: str, encerrado_em) -> None:
    TurnoSetorOperacao.objects.select_for_update().filter(
        turno_id=turno_id,
        status__in=[
            TurnoSetorOperacao.Status.ABERTA,
            TurnoSetorOperacao.Status.EM_ANDAMENTO,
        ],
    ).update(status=TurnoSetorOperacao.Status.ENCERRADA_MANUALMENTE, updated_at=encerrado_em)

    TurnoSetorOp.objects.select_for_update().filter(
        turno_id=turno_id,
        status__in=[
            TurnoSetorOp.Status.ABERTA,
            TurnoSetorOp.Status.EM_ANDAMENTO,
        ],
    ).update(status=TurnoSetorOp.Status.ENCERRADA_MANUALMENTE, updated_at=encerrado_em)

    TurnoSetor.objects.select_for_update().filter(
        turno_id=turno_id,
        status__in=[
            TurnoSetor.Status.ABERTO,
            TurnoSetor.Status.EM_ANDAMENTO,
        ],
    ).update(status=TurnoSetor.Status.ENCERRADO, updated_at=encerrado_em)

    TurnoOp.objects.select_for_update().filter(
        turno_id=turno_id,
        status__in=[
            TurnoOp.Status.PLANEJADA,
            TurnoOp.Status.EM_ANDAMENTO,
        ],
    ).update(status=TurnoOp.Status.ENCERRADA, updated_at=encerrado_em)
