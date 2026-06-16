from rest_framework import serializers

from cadastros.models import TipoMaquina


class TipoMaquinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoMaquina
        fields = ["codigo", "nome", "descricao"]
        read_only_fields = fields