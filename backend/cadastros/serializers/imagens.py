from rest_framework import serializers

from cadastros.models import Operacao


class OperacaoImagemUploadSerializer(serializers.Serializer):
    arquivo = serializers.ImageField(required=True)


class OperacaoImagemResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operacao
        fields = ["id", "imagem_url"]
        read_only_fields = fields
