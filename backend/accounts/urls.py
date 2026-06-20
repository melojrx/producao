from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.viewsets.auth import LoginViewSet, UsuarioAtualViewSet
from accounts.viewsets.users import UsuarioSistemaViewSet

urlpatterns = [
    path("accounts/login/", LoginViewSet.as_view({"post": "create"}), name="accounts-login"),
    path("accounts/refresh/", TokenRefreshView.as_view(), name="accounts-refresh"),
    path("accounts/me/", UsuarioAtualViewSet.as_view({"get": "retrieve"}), name="accounts-me"),
    path("accounts/usuarios/", UsuarioSistemaViewSet.as_view({"get": "list"}), name="accounts-usuarios-list"),
    path(
        "accounts/usuarios/<uuid:pk>/",
        UsuarioSistemaViewSet.as_view({"get": "retrieve"}),
        name="accounts-usuarios-detail",
    ),
]
