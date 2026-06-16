from rest_framework import serializers

from accounts.models import Operador


class OperadorSerializer(serializers.ModelSerializer):
    maquina_preferida_codigo = serializers.CharField(
        source="maquina_preferida.codigo",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Operador
        fields = [
            "id",
            "nome",
            "matricula",
            "funcao",
            "status",
            "carga_horaria_min",
            "qr_code_token",
            "foto_url",
            "maquina_preferida",
            "maquina_preferida_codigo",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields