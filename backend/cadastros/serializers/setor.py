from rest_framework import serializers

from cadastros.models import Setor


class SetorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Setor
        fields = [
            "id",
            "codigo",
            "nome",
            "situacao",
            "modo_apontamento",
            "sequencia_fluxo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields