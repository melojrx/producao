from rest_framework import serializers


class DashboardResumoSerializer(serializers.Serializer):
    """Serializer para resumo do dashboard."""

    producao_hoje = serializers.IntegerField()
    revisoes_hoje = serializers.IntegerField()
    turno_aberto = serializers.UUIDField(allow_null=True)
    ultimo_turno_id = serializers.UUIDField(allow_null=True)


class IndicadorTurnoSerializer(serializers.Serializer):
    """Serializer para indicadores de turno."""

    turno_id = serializers.CharField()
    total_produzido = serializers.IntegerField()
    total_registros = serializers.IntegerField()
    total_aprovado = serializers.IntegerField()
    total_reprovado = serializers.IntegerField()
    por_origem = serializers.ListField()


class ProducaoDiariaSerializer(serializers.Serializer):
    """Serializer para producao diaria."""

    data = serializers.DateField()
    total = serializers.IntegerField()
    registros = serializers.IntegerField()


class IndicadoresQualidadeSerializer(serializers.Serializer):
    """Serializer para indicadores de qualidade."""

    total_aprovado = serializers.IntegerField()
    total_reprovado = serializers.IntegerField()
    taxa_aprovacao = serializers.FloatField()
    defeitos_por_classificacao = serializers.ListField()