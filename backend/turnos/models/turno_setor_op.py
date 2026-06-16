from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class TurnoSetorOp(BaseUUIDModel):
    class Status(models.TextChoices):
        ABERTA = "aberta", "Aberta"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        CONCLUIDA = "concluida", "Concluida"
        ENCERRADA_MANUALMENTE = "encerrada_manualmente", "Encerrada manualmente"

    turno = models.ForeignKey("turnos.Turno", on_delete=models.CASCADE, related_name="setor_ops_legado")
    turno_op = models.ForeignKey("turnos.TurnoOp", on_delete=models.CASCADE, related_name="setor_ops_legado")
    setor = models.ForeignKey("cadastros.Setor", on_delete=models.PROTECT, related_name="setor_ops_legado")
    quantidade_planejada = models.PositiveIntegerField()
    quantidade_realizada = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ABERTA)
    qr_code_token = models.CharField(max_length=64, unique=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["turno_op", "setor"], name="uniq_turno_op_setor_leg"),
            models.CheckConstraint(condition=Q(quantidade_planejada__gt=0), name="tso_qtd_plan_gt0"),
            models.CheckConstraint(condition=Q(quantidade_realizada__gte=0), name="tso_qtd_real_gte0"),
        ]
        indexes = [
            models.Index(fields=["turno", "status"]),
            models.Index(fields=["setor"]),
            models.Index(fields=["qr_code_token"]),
        ]
