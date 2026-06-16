from django.db import models

from shared.models import BaseUUIDModel


class Operador(BaseUUIDModel):
    class Status(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        INATIVO = "inativo", "Inativo"
        AFASTADO = "afastado", "Afastado"

    nome = models.CharField(max_length=100)
    matricula = models.CharField(max_length=20, unique=True)
    funcao = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ATIVO)
    carga_horaria_min = models.PositiveIntegerField(default=540)
    qr_code_token = models.CharField(max_length=64, unique=True)
    foto_url = models.TextField(blank=True)
    maquina_preferida = models.ForeignKey(
        "cadastros.Maquina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operadores_preferenciais",
    )

    class Meta:
        indexes = [
            models.Index(fields=["status", "nome"]),
            models.Index(fields=["qr_code_token"]),
        ]

    def __str__(self) -> str:
        return f"{self.matricula} - {self.nome}"
