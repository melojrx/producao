from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class QualidadeDefeito(BaseUUIDModel):
    class Classificacao(models.TextChoices):
        MAQUINA = "maquina", "Maquina"
        OPERADOR = "operador", "Operador"
        PROCESSO = "processo", "Processo"
        MATERIA_PRIMA = "materia_prima", "Materia-prima"

    nome = models.CharField(max_length=120)
    classificacao = models.CharField(max_length=30, choices=Classificacao.choices)
    ativo = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["nome"],
                condition=Q(ativo=True),
                name="uniq_defeito_ativo_nome",
            ),
        ]
        indexes = [
            models.Index(fields=["ativo", "nome"]),
            models.Index(fields=["classificacao"]),
        ]
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome
