from django.db import models

from shared.models import BaseUUIDModel


class Produto(BaseUUIDModel):
    codigo = models.CharField(max_length=30, unique=True)
    nome = models.CharField(max_length=200)
    ativo = models.BooleanField(default=True)
    imagem_frente_url = models.TextField(blank=True)
    imagem_costa_url = models.TextField(blank=True)
    tp_produto_min = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["ativo", "nome"]),
            models.Index(fields=["codigo"]),
        ]
        ordering = ["codigo"]

    def __str__(self) -> str:
        return f"{self.codigo} - {self.nome}"
