from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class Operacao(BaseUUIDModel):
    class Situacao(models.TextChoices):
        ATIVA = "ativa", "Ativa"
        INATIVA = "inativa", "Inativa"

    codigo = models.CharField(max_length=20, unique=True)
    descricao = models.CharField(max_length=200)
    setor = models.ForeignKey("cadastros.Setor", on_delete=models.PROTECT, related_name="operacoes")
    maquina = models.ForeignKey(
        "cadastros.Maquina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operacoes",
    )
    tipo_maquina = models.ForeignKey(
        "cadastros.TipoMaquina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operacoes",
    )
    tempo_padrao_min = models.DecimalField(max_digits=10, decimal_places=4)
    meta_hora = models.PositiveIntegerField(null=True, blank=True)
    meta_dia = models.PositiveIntegerField(null=True, blank=True)
    situacao = models.CharField(max_length=20, choices=Situacao.choices, default=Situacao.ATIVA)
    imagem_url = models.TextField(blank=True)
    qr_code_token = models.CharField(max_length=64, unique=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(tempo_padrao_min__gt=0),
                name="operacao_tp_positivo",
            ),
        ]
        indexes = [
            models.Index(fields=["setor", "situacao"]),
            models.Index(fields=["qr_code_token"]),
        ]
        ordering = ["codigo"]

    def __str__(self) -> str:
        return f"{self.codigo} - {self.descricao}"
