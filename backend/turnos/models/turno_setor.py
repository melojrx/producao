from django.db import models

from shared.models import BaseUUIDModel


class TurnoSetor(BaseUUIDModel):
    class Status(models.TextChoices):
        ABERTO = "aberto", "Aberto"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        CONCLUIDO = "concluido", "Concluido"
        ENCERRADO = "encerrado", "Encerrado"

    turno = models.ForeignKey("turnos.Turno", on_delete=models.CASCADE, related_name="setores")
    setor = models.ForeignKey("cadastros.Setor", on_delete=models.PROTECT, related_name="turno_setores")
    qr_code_token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ABERTO)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["turno", "setor"], name="uniq_turno_setor"),
        ]
        indexes = [
            models.Index(fields=["turno", "status"]),
            models.Index(fields=["setor"]),
            models.Index(fields=["qr_code_token"]),
        ]

    def __str__(self) -> str:
        return f"{self.turno_id} - {self.setor_id}"
