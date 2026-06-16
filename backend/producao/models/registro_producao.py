from django.db import models
from django.db.models import Q
from django.utils import timezone

from shared.models import BaseUUIDModel


class RegistroProducao(BaseUUIDModel):
    class OrigemApontamento(models.TextChoices):
        OPERADOR_QR = "operador_qr", "Operador QR"
        OPERADOR_MANUAL = "operador_manual", "Operador manual"
        SUPERVISOR_MANUAL = "supervisor_manual", "Supervisor manual"

    operador = models.ForeignKey("accounts.Operador", on_delete=models.PROTECT, related_name="registros_producao")
    maquina = models.ForeignKey(
        "cadastros.Maquina",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_producao",
    )
    operacao = models.ForeignKey("cadastros.Operacao", on_delete=models.PROTECT, related_name="registros_producao")
    produto = models.ForeignKey(
        "produtos.Produto",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_producao",
    )
    quantidade = models.PositiveIntegerField()
    hora_registro = models.DateTimeField(default=timezone.now)
    usuario_sistema = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_lancados",
    )
    origem_apontamento = models.CharField(
        max_length=30,
        choices=OrigemApontamento.choices,
        default=OrigemApontamento.OPERADOR_QR,
    )
    turno = models.ForeignKey(
        "turnos.Turno",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_producao",
    )
    turno_op = models.ForeignKey(
        "turnos.TurnoOp",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_producao",
    )
    turno_setor = models.ForeignKey(
        "turnos.TurnoSetor",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_producao",
    )
    turno_setor_demanda = models.ForeignKey(
        "turnos.TurnoSetorDemanda",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_producao",
    )
    turno_setor_operacao = models.ForeignKey(
        "turnos.TurnoSetorOperacao",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_producao",
    )
    observacao = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantidade__gt=0), name="registro_qtd_gt0"),
        ]
        indexes = [
            models.Index(fields=["turno", "hora_registro"]),
            models.Index(fields=["operador", "hora_registro"]),
            models.Index(fields=["turno_op", "operacao"]),
            models.Index(fields=["turno_setor_operacao"]),
        ]
