from rest_framework import serializers

from accounts.models import Operador
from turnos.models import TurnoSetor, TurnoSetorDemanda
from turnos.services.carry_over import _inferir_status_demanda


class OperadorScannerSerializer(serializers.ModelSerializer):
    """Payload publico minimo para scan de operador."""

    class Meta:
        model = Operador
        fields = ["id", "nome", "matricula", "foto_url"]


class TurnoSetorScannerSerializer(serializers.ModelSerializer):
    """Payload publico de turno-setor aberto para scan de setor."""

    turno_id = serializers.UUIDField(source="turno.id", read_only=True)
    turno_iniciado_em = serializers.DateTimeField(
        source="turno.data_hora_abertura",
        read_only=True,
    )
    setor_id = serializers.UUIDField(source="setor.id", read_only=True)
    setor_nome = serializers.CharField(source="setor.nome", read_only=True)
    setor_modo_apontamento = serializers.CharField(
        source="setor.modo_apontamento",
        read_only=True,
    )
    quantidade_planejada = serializers.SerializerMethodField()
    quantidade_realizada = serializers.SerializerMethodField()

    class Meta:
        model = TurnoSetor
        fields = [
            "id",
            "turno_id",
            "turno_iniciado_em",
            "setor_id",
            "setor_nome",
            "setor_modo_apontamento",
            "quantidade_planejada",
            "quantidade_realizada",
            "qr_code_token",
            "status",
        ]

    def get_quantidade_planejada(self, obj: TurnoSetor) -> int:
        return int(self.context.get("quantidade_planejada", 0))

    def get_quantidade_realizada(self, obj: TurnoSetor) -> int:
        return int(self.context.get("quantidade_realizada", 0))


class TurnoSetorDemandaScannerSerializer(serializers.ModelSerializer):
    """Payload publico de demanda setorial para scan."""

    turno_setor_id = serializers.UUIDField(source="turno_setor.id", read_only=True)
    turno_id = serializers.UUIDField(source="turno.id", read_only=True)
    turno_op_id = serializers.UUIDField(source="turno_op.id", read_only=True)
    produto_id = serializers.UUIDField(source="produto.id", read_only=True)
    setor_id = serializers.UUIDField(source="setor.id", read_only=True)
    turno_setor_op_legacy_id = serializers.SerializerMethodField()
    numero_op = serializers.CharField(source="turno_op.numero_op", read_only=True)
    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    produto_referencia = serializers.CharField(source="produto.codigo", read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = TurnoSetorDemanda
        fields = [
            "id",
            "turno_setor_id",
            "turno_id",
            "turno_op_id",
            "produto_id",
            "setor_id",
            "turno_setor_op_legacy_id",
            "quantidade_planejada",
            "quantidade_herdada_setor",
            "quantidade_realizada",
            "quantidade_liberada_setor",
            "status",
            "numero_op",
            "produto_nome",
            "produto_referencia",
        ]

    def get_turno_setor_op_legacy_id(self, obj: TurnoSetorDemanda) -> str | None:
        legacy = obj.turno_setor_op_legacy
        return str(legacy.id) if legacy else None

    def get_status(self, obj: TurnoSetorDemanda) -> str:
        return _inferir_status_demanda(
            quantidade_planejada=obj.quantidade_planejada,
            quantidade_realizada=obj.quantidade_realizada,
            quantidade_herdada=obj.quantidade_herdada_setor,
        )
