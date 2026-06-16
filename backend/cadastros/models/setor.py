from django.db import models

from shared.models import BaseUUIDModel


class Setor(BaseUUIDModel):
    class Situacao(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        INATIVO = "inativo", "Inativo"

    class ModoApontamento(models.TextChoices):
        PRODUCAO_PADRAO = "producao_padrao", "Producao padrao"
        REVISAO_QUALIDADE = "revisao_qualidade", "Revisao qualidade"

    codigo = models.CharField(max_length=20, unique=True)
    nome = models.CharField(max_length=80, unique=True)
    situacao = models.CharField(max_length=20, choices=Situacao.choices, default=Situacao.ATIVO)
    modo_apontamento = models.CharField(
        max_length=30,
        choices=ModoApontamento.choices,
        default=ModoApontamento.PRODUCAO_PADRAO,
    )
    sequencia_fluxo = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=["situacao", "sequencia_fluxo"]),
            models.Index(fields=["modo_apontamento"]),
        ]
        ordering = ["sequencia_fluxo", "nome"]

    def __str__(self) -> str:
        return self.nome
