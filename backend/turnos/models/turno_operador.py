from django.db import models

from shared.models import BaseUUIDModel


class TurnoOperador(BaseUUIDModel):
    turno = models.ForeignKey("turnos.Turno", on_delete=models.CASCADE, related_name="operadores")
    operador = models.ForeignKey("accounts.Operador", on_delete=models.PROTECT, related_name="turnos")
    setor = models.ForeignKey(
        "cadastros.Setor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operadores_alocados",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["turno", "operador"], name="uniq_turno_operador"),
        ]
        indexes = [
            models.Index(fields=["turno", "setor"]),
        ]

    def __str__(self) -> str:
        return f"{self.turno_id} - {self.operador_id}"
