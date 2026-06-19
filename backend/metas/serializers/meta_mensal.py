from rest_framework import serializers

from metas.models import MetaMensal


class MetaMensalSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetaMensal
        fields = [
            "id",
            "competencia",
            "meta_pecas",
            "dias_produtivos",
            "observacao",
            "created_at",
            "updated_at",
        ]


class MetaMensalEvolucaoDiariaSerializer(serializers.Serializer):
    data = serializers.DateField()
    dia_label = serializers.CharField()
    meta_diaria_media = serializers.FloatField()
    meta_acumulada_referencia = serializers.FloatField()
    realizado_dia = serializers.IntegerField()
    realizado_acumulado = serializers.IntegerField()
    atingimento_acumulado_pct = serializers.FloatField()


class MetaMensalResumoSemanalSerializer(serializers.Serializer):
    semana = serializers.CharField()
    periodo = serializers.CharField()
    meta_referencia_semana = serializers.FloatField()
    realizado_semana = serializers.IntegerField()
    realizado_acumulado = serializers.IntegerField()
    atingimento_acumulado_pct = serializers.FloatField()


class MetaMensalResumoDashboardSerializer(serializers.Serializer):
    competencia = serializers.DateField()
    meta_mensal = MetaMensalSerializer(allow_null=True)
    meta_pecas = serializers.IntegerField()
    dias_produtivos = serializers.IntegerField()
    meta_diaria_media = serializers.FloatField()
    alcancado_mes = serializers.IntegerField()
    saldo_mes = serializers.IntegerField()
    atingimento_pct = serializers.FloatField()
    evolucao_diaria = MetaMensalEvolucaoDiariaSerializer(many=True)
    resumo_semanal = MetaMensalResumoSemanalSerializer(many=True)
