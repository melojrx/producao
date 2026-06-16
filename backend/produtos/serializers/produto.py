from rest_framework import serializers

from produtos.models import Produto


class ProdutoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = [
            "id",
            "codigo",
            "nome",
            "ativo",
            "imagem_frente_url",
            "imagem_costa_url",
            "tp_produto_min",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields