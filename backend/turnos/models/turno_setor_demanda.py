from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class TurnoSetorDemanda(BaseUUIDModel):
    turno_setor = models.ForeignKey("turnos.TurnoSetor", on_delete=models.CASCADE, related_name="demandas")
    turno = models.ForeignKey("turnos.Turno", on_delete=models.CASCADE, related_name="setor_demandas")
    turno_op = models.ForeignKey("turnos.TurnoOp", on_delete=models.CASCADE, related_name="setor_demandas")
    produto = models.ForeignKey("produtos.Produto", on_delete=models.PROTECT, related_name="setor_demandas")
    setor = models.ForeignKey("cadastros.Setor", on_delete=models.PROTECT, related_name="setor_demandas")
    turno_setor_op_legacy = models.OneToOneField(
        "turnos.TurnoSetorOp",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="demanda_setorial",
    )
    quantidade_herdada_setor = models.PositiveIntegerField(default=0)
    quantidade_liberada_setor = models.PositiveIntegerField(default=0)
    quantidade_planejada = models.PositiveIntegerField()
    quantidade_realizada = models.PositiveIntegerField(default=0)
    quantidade_aceita_turno = models.PositiveIntegerField(default=0)
    quantidade_excedente_turno = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["turno_setor", "turno_op"], name="uniq_demanda_setor_op"),
            models.CheckConstraint(condition=Q(quantidade_planejada__gt=0), name="demanda_qtd_plan_gt0"),
            models.CheckConstraint(condition=Q(quantidade_realizada__gte=0), name="demanda_qtd_real_gte0"),
        ]
        indexes = [
            models.Index(fields=["turno", "setor"]),
            models.Index(fields=["turno_op"]),
            models.Index(fields=["produto"]),
        ]

    def __str__(self) -> str:
        return f"{self.turno_setor_id} - {self.turno_op_id}"
