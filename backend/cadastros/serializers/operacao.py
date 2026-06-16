from rest_framework import serializers

from cadastros.models import Operacao


class OperacaoSerializer(serializers.ModelSerializer):
    setor_nome = serializers.CharField(source="setor.nome", read_only=True)
    maquina_codigo = serializers.CharField(source="maquina.codigo", read_only=True, allow_null=True)
    tipo_maquina_nome = serializers.CharField(source="tipo_maquina.nome", read_only=True, allow_null=True)

    class Meta:
        model = Operacao
        fields = [
            "id",
            "codigo",
            "descricao",
            "setor",
            "setor_nome",
            "maquina",
            "maquina_codigo",
            "tipo_maquina",
            "tipo_maquina_nome",
            "tempo_padrao_min",
            "meta_hora",
            "meta_dia",
            "situacao",
            "imagem_url",
            "qr_code_token",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields