from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class QualidadeDetalhe(BaseUUIDModel):
    registro = models.ForeignKey("qualidade.QualidadeRegistro", on_delete=models.CASCADE, related_name="detalhes")
    turno_setor_operacao_origem = models.ForeignKey(
        "turnos.TurnoSetorOperacao",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="defeitos_origem",
    )
    operacao = models.ForeignKey("cadastros.Operacao", on_delete=models.PROTECT, related_name="defeitos_qualidade")
    setor = models.ForeignKey("cadastros.Setor", on_delete=models.PROTECT, related_name="defeitos_qualidade")
    defeito = models.ForeignKey("qualidade.QualidadeDefeito", on_delete=models.PROTECT, related_name="detalhes")
    quantidade_defeito = models.PositiveIntegerField()
    observacao = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantidade_defeito__gt=0), name="qual_det_qtd_defeito_gt0"),
        ]
        indexes = [
            models.Index(fields=["registro"]),
            models.Index(fields=["defeito"]),
            models.Index(fields=["operacao"]),
            models.Index(fields=["setor"]),
        ]
