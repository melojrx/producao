from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class TurnoOp(BaseUUIDModel):
    class Status(models.TextChoices):
        PLANEJADA = "planejada", "Planejada"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        CONCLUIDA = "concluida", "Concluida"
        ENCERRADA = "encerrada", "Encerrada"

    turno = models.ForeignKey("turnos.Turno", on_delete=models.CASCADE, related_name="ops")
    numero_op = models.CharField(max_length=50)
    produto = models.ForeignKey("produtos.Produto", on_delete=models.PROTECT, related_name="turno_ops")
    quantidade_planejada = models.PositiveIntegerField()
    quantidade_planejada_remanescente = models.PositiveIntegerField(null=True, blank=True)
    quantidade_realizada = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PLANEJADA)
    turno_op_origem = models.ForeignKey(
        "turnos.TurnoOp",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="turnos_herdeiros",
    )
    tp_produto_min_snapshot = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["turno", "numero_op"], name="uniq_turno_numero_op"),
            models.CheckConstraint(condition=Q(quantidade_planejada__gt=0), name="turno_op_qtd_plan_gt0"),
            models.CheckConstraint(condition=Q(quantidade_realizada__gte=0), name="turno_op_qtd_real_gte0"),
        ]
        indexes = [
            models.Index(fields=["turno", "status"]),
            models.Index(fields=["numero_op"]),
            models.Index(fields=["produto"]),
        ]

    def __str__(self) -> str:
        return self.numero_op
