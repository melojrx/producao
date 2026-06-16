from django.db import models
from django.db.models import Q
from django.utils import timezone

from shared.models import BaseUUIDModel


class QualidadeRegistro(BaseUUIDModel):
    revisor = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="revisoes_qualidade")
    turno = models.ForeignKey("turnos.Turno", on_delete=models.PROTECT, related_name="revisoes_qualidade")
    turno_op = models.ForeignKey("turnos.TurnoOp", on_delete=models.PROTECT, related_name="revisoes_qualidade")
    turno_setor_operacao = models.ForeignKey(
        "turnos.TurnoSetorOperacao",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="revisoes_qualidade",
    )
    quantidade_aprovada = models.PositiveIntegerField(default=0)
    quantidade_reprovada = models.PositiveIntegerField(default=0)
    hora_revisao = models.DateTimeField(default=timezone.now)
    observacao = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(quantidade_aprovada__gte=0) & Q(quantidade_reprovada__gte=0),
                name="qual_reg_qtds_gte0",
            ),
            models.CheckConstraint(
                condition=Q(quantidade_aprovada__gt=0) | Q(quantidade_reprovada__gt=0),
                name="qual_reg_revisao_nao_vazia",
            ),
        ]
        indexes = [
            models.Index(fields=["turno", "hora_revisao"]),
            models.Index(fields=["turno_op"]),
            models.Index(fields=["revisor", "hora_revisao"]),
        ]
