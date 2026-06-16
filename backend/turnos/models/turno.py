from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class Turno(BaseUUIDModel):
    class Status(models.TextChoices):
        ABERTO = "aberto", "Aberto"
        ENCERRADO = "encerrado", "Encerrado"

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ABERTO)
    data_hora_abertura = models.DateTimeField()
    data_hora_encerramento = models.DateTimeField(null=True, blank=True)
    operadores_disponiveis = models.PositiveIntegerField()
    minutos_turno = models.PositiveIntegerField()
    meta_grupo = models.PositiveIntegerField(null=True, blank=True)
    encerrado_por = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="turnos_encerrados",
    )
    observacao = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["status"],
                condition=Q(status="aberto"),
                name="uniq_turno_aberto",
            ),
            models.CheckConstraint(condition=Q(operadores_disponiveis__gt=0), name="turno_operadores_gt0"),
            models.CheckConstraint(condition=Q(minutos_turno__gt=0), name="turno_minutos_gt0"),
        ]
        indexes = [
            models.Index(fields=["status", "data_hora_abertura"]),
            models.Index(fields=["data_hora_encerramento"]),
        ]

    def __str__(self) -> str:
        return f"Turno {self.data_hora_abertura:%Y-%m-%d %H:%M} ({self.status})"
