from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class ProdutoOperacao(BaseUUIDModel):
    produto = models.ForeignKey("produtos.Produto", on_delete=models.CASCADE, related_name="roteiro")
    operacao = models.ForeignKey("cadastros.Operacao", on_delete=models.PROTECT, related_name="produtos")
    sequencia = models.PositiveIntegerField()
    versao_roteiro = models.PositiveIntegerField(default=1)
    vigente = models.BooleanField(default=True)
    substituido_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["produto", "versao_roteiro", "sequencia"],
                name="uniq_prod_versao_seq",
            ),
            models.UniqueConstraint(
                fields=["produto", "sequencia"],
                condition=Q(vigente=True),
                name="uniq_prod_seq_vigente",
            ),
            models.UniqueConstraint(
                fields=["produto", "operacao"],
                condition=Q(vigente=True),
                name="uniq_prod_operacao_vigente",
            ),
        ]
        indexes = [
            models.Index(fields=["produto", "vigente", "sequencia"]),
            models.Index(fields=["operacao"]),
        ]
        ordering = ["produto", "versao_roteiro", "sequencia"]

    def __str__(self) -> str:
        return f"{self.produto_id} v{self.versao_roteiro} seq {self.sequencia}"
