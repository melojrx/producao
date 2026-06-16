from django.db import models
from django.db.models import Q

from shared.models import BaseUUIDModel


class TurnoSetorOperacao(BaseUUIDModel):
    class Status(models.TextChoices):
        ABERTA = "aberta", "Aberta"
        EM_ANDAMENTO = "em_andamento", "Em andamento"
        CONCLUIDA = "concluida", "Concluida"
        ENCERRADA_MANUALMENTE = "encerrada_manualmente", "Encerrada manualmente"

    turno = models.ForeignKey("turnos.Turno", on_delete=models.CASCADE, related_name="setor_operacoes")
    turno_op = models.ForeignKey("turnos.TurnoOp", on_delete=models.CASCADE, related_name="setor_operacoes")
    turno_setor = models.ForeignKey("turnos.TurnoSetor", on_delete=models.CASCADE, related_name="operacoes")
    turno_setor_demanda = models.ForeignKey(
        "turnos.TurnoSetorDemanda",
        on_delete=models.CASCADE,
        related_name="operacoes",
    )
    turno_setor_op = models.ForeignKey(
        "turnos.TurnoSetorOp",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operacoes",
    )
    produto_operacao = models.ForeignKey(
        "produtos.ProdutoOperacao",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="turno_operacoes",
    )
    operacao = models.ForeignKey("cadastros.Operacao", on_delete=models.PROTECT, related_name="turno_operacoes")
    setor = models.ForeignKey("cadastros.Setor", on_delete=models.PROTECT, related_name="turno_operacoes")
    sequencia = models.PositiveIntegerField()
    produto_operacao_id_snapshot = models.UUIDField(null=True, blank=True)
    versao_roteiro_snapshot = models.PositiveIntegerField(null=True, blank=True)
    tempo_padrao_min_snapshot = models.DecimalField(max_digits=10, decimal_places=4)
    quantidade_planejada = models.PositiveIntegerField()
    quantidade_realizada = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ABERTA)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["turno_setor_demanda", "operacao"],
                name="uniq_demanda_operacao",
            ),
            models.UniqueConstraint(
                fields=["turno_setor_demanda", "sequencia"],
                name="uniq_demanda_sequencia",
            ),
            models.CheckConstraint(condition=Q(tempo_padrao_min_snapshot__gt=0), name="tsope_tp_gt0"),
            models.CheckConstraint(condition=Q(quantidade_planejada__gt=0), name="tsope_qtd_plan_gt0"),
            models.CheckConstraint(condition=Q(quantidade_realizada__gte=0), name="tsope_qtd_real_gte0"),
        ]
        indexes = [
            models.Index(fields=["turno", "status"]),
            models.Index(fields=["turno_op", "operacao"]),
            models.Index(fields=["turno_setor", "status"]),
            models.Index(fields=["setor", "operacao"]),
        ]
        ordering = ["turno_setor_demanda", "sequencia"]
