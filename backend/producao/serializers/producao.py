from rest_framework import serializers

from producao.models import RegistroProducao


class RegistroProducaoSerializer(serializers.ModelSerializer):
    """Serializer para RegistroProducao - apontamentos."""

    operador_nome = serializers.CharField(source="operador.nome", read_only=True, allow_null=True)
    operacao_nome = serializers.CharField(source="operacao.descricao", read_only=True, allow_null=True)
    produto_nome = serializers.CharField(source="produto.nome", read_only=True, allow_null=True)
    turno_status = serializers.CharField(source="turno.status", read_only=True, allow_null=True)

    class Meta:
        model = RegistroProducao
        fields = [
            "id",
            "operador",
            "operador_nome",
            "maquina",
            "operacao",
            "operacao_nome",
            "produto",
            "produto_nome",
            "quantidade",
            "hora_registro",
            "usuario_sistema",
            "origem_apontamento",
            "turno",
            "turno_status",
            "turno_op",
            "turno_setor",
            "turno_setor_demanda",
            "turno_setor_operacao",
            "observacao",
            "created_at",
            "updated_at",
        ]


class ApontamentoOperacaoInputSerializer(serializers.Serializer):
    turno_setor_operacao = serializers.UUIDField()
    operador = serializers.UUIDField()
    quantidade = serializers.IntegerField(min_value=1)
    origem_apontamento = serializers.ChoiceField(
        choices=RegistroProducao.OrigemApontamento.choices,
        default=RegistroProducao.OrigemApontamento.OPERADOR_QR,
    )
    maquina = serializers.UUIDField(required=False, allow_null=True)
    usuario_sistema = serializers.UUIDField(required=False, allow_null=True)
    observacao = serializers.CharField(required=False, allow_blank=True)
