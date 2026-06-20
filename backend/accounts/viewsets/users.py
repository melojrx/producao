from rest_framework import viewsets

from accounts.models import User
from accounts.serializers.auth import UsuarioSistemaListSerializer
from shared.permissions import IsAdmin


class UsuarioSistemaViewSet(viewsets.ReadOnlyModelViewSet):
    """Listagem read-only de usuarios administrativos (admin/supervisor)."""

    permission_classes = [IsAdmin]
    serializer_class = UsuarioSistemaListSerializer

    def get_queryset(self):
        return User.objects.filter(
            papel__in=[User.Papel.ADMIN, User.Papel.SUPERVISOR]
        ).order_by("nome", "email")
