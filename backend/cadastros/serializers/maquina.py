from rest_framework import serializers

from cadastros.models import Maquina


class MaquinaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Maquina
        fields = [
            "id",
            "codigo",
            "modelo",
            "marca",
            "numero_patrimonio",
            "situacao",
            "qr_code_token",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields