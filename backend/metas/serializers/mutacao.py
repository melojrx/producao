from rest_framework import serializers


class MetaMensalInputSerializer(serializers.Serializer):
    competencia = serializers.DateField()
    meta_pecas = serializers.IntegerField(min_value=1)
    dias_produtivos = serializers.IntegerField(min_value=1, max_value=31)
    observacao = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
