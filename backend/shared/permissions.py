from __future__ import annotations

from rest_framework import permissions

from accounts.models import User


def usuario_administrativo_ativo(user: User) -> bool:
    return bool(
        user.is_authenticated
        and user.is_active
        and user.ativo
        and user.papel in (User.Papel.ADMIN, User.Papel.SUPERVISOR)
    )


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            user.is_authenticated
            and user.is_active
            and user.ativo
            and user.papel == User.Papel.ADMIN
        )


class IsSupervisor(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        return usuario_administrativo_ativo(request.user)


class IsQualidadeReviewer(permissions.BasePermission):
    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(
            usuario_administrativo_ativo(user)
            and user.pode_revisar_qualidade
        )
