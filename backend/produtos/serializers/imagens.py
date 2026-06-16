from rest_framework import serializers

from produtos.models import Produto


class ProdutoImagemUploadSerializer(serializers.Serializer):
    arquivo = serializers.ImageField(required=True)


class ProdutoImagemResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = [
            "id",
            "imagem_frente_url",
            "imagem_costa_url",
        ]
        read_only_fields = fields
