from rest_framework import serializers


class TurnoOpPlanejadaInputSerializer(serializers.Serializer):
    numero_op = serializers.CharField()
    produto_id = serializers.UUIDField()
    quantidade_planejada = serializers.IntegerField(min_value=1)


class AbrirTurnoInputSerializer(serializers.Serializer):
    operadores_disponiveis = serializers.IntegerField(min_value=1)
    minutos_turno = serializers.IntegerField(min_value=1)
    observacao = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    operador_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    ops = TurnoOpPlanejadaInputSerializer(many=True, required=False, allow_empty=True, default=list)
    encerrar_turno_aberto_anterior = serializers.BooleanField(required=False, default=True)
    carregar_pendencias_turno_anterior = serializers.BooleanField(required=False, default=False)
    turno_origem_pendencias_id = serializers.UUIDField(required=False, allow_null=True)
    turno_op_ids_pendentes = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        default=list,
    )

    def validate(self, attrs):
        ops = attrs.get("ops") or []
        carregar_pendencias = attrs.get("carregar_pendencias_turno_anterior", False)
        if not ops and not carregar_pendencias:
            raise serializers.ValidationError(
                "Informe pelo menos uma OP ou habilite o carry-over do turno anterior."
            )
        return attrs


class EncerrarTurnoInputSerializer(serializers.Serializer):
    encerrado_por_id = serializers.UUIDField(required=False, allow_null=True)
