from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class MetaMensal(BaseUUIDModel):
    competencia = models.DateField(unique=True)
    meta_pecas = models.PositiveIntegerField()
    dias_produtivos = models.PositiveIntegerField()
    observacao = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(meta_pecas__gt=0), name="meta_mensal_pecas_gt0"),
            models.CheckConstraint(
                condition=Q(dias_produtivos__gte=1) & Q(dias_produtivos__lte=31),
                name="meta_mensal_dias_validos",
            ),
        ]
        indexes = [
            models.Index(fields=["competencia"]),
        ]
        ordering = ["-competencia"]
