from rest_framework import serializers

from accounts.models import User


class LoginInputSerializer(serializers.Serializer):
    email = serializers.EmailField()
    senha = serializers.CharField(trim_whitespace=False)


class UsuarioAutenticadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "nome",
            "papel",
            "pode_revisar_qualidade",
            "ativo",
        ]


class UsuarioSistemaListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "nome",
            "papel",
            "pode_revisar_qualidade",
            "ativo",
            "supabase_auth_uid",
            "created_at",
            "updated_at",
        ]


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UsuarioAutenticadoSerializer()
