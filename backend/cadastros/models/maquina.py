from django.db import models

from shared.models import BaseUUIDModel


class Maquina(BaseUUIDModel):
    class Situacao(models.TextChoices):
        ATIVA = "ativa", "Ativa"
        PARADA = "parada", "Parada"
        MANUTENCAO = "manutencao", "Manutencao"
        INATIVA = "inativa", "Inativa"

    codigo = models.CharField(max_length=20, unique=True)
    modelo = models.CharField(max_length=100, blank=True)
    marca = models.CharField(max_length=50, blank=True)
    numero_patrimonio = models.CharField(max_length=50, blank=True)
    situacao = models.CharField(max_length=20, choices=Situacao.choices, default=Situacao.ATIVA)
    qr_code_token = models.CharField(max_length=64, unique=True)

    class Meta:
        indexes = [
            models.Index(fields=["situacao", "codigo"]),
            models.Index(fields=["qr_code_token"]),
        ]
        ordering = ["codigo"]

    def __str__(self) -> str:
        return self.codigo
