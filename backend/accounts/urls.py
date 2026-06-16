from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.viewsets.auth import LoginViewSet, UsuarioAtualViewSet

urlpatterns = [
    path("accounts/login/", LoginViewSet.as_view({"post": "create"}), name="accounts-login"),
    path("accounts/refresh/", TokenRefreshView.as_view(), name="accounts-refresh"),
    path("accounts/me/", UsuarioAtualViewSet.as_view({"get": "retrieve"}), name="accounts-me"),
]
