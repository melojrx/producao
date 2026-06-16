from rest_framework import serializers

from produtos.models import ProdutoOperacao
from produtos.serializers.produto import ProdutoSerializer


class ProdutoOperacaoSerializer(serializers.ModelSerializer):
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True)
    operacao_codigo = serializers.CharField(source="operacao.codigo", read_only=True)
    operacao_descricao = serializers.CharField(source="operacao.descricao", read_only=True)
    operacao_setor_nome = serializers.CharField(source="operacao.setor.nome", read_only=True)
    operacao_tempo_padrao = serializers.DecimalField(
        source="operacao.tempo_padrao_min",
        max_digits=10,
        decimal_places=4,
        read_only=True,
    )

    class Meta:
        model = ProdutoOperacao
        fields = [
            "id",
            "produto",
            "produto_codigo",
            "operacao",
            "operacao_codigo",
            "operacao_descricao",
            "operacao_setor_nome",
            "operacao_tempo_padrao",
            "sequencia",
            "versao_roteiro",
            "vigente",
            "substituido_em",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ProdutoDetailSerializer(ProdutoSerializer):
    roteiro = ProdutoOperacaoSerializer(many=True, read_only=True)

    class Meta(ProdutoSerializer.Meta):
        pass