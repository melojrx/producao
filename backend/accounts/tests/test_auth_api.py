from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from accounts.services import AuthServiceError, autenticar_usuario_administrativo
from accounts.tests.support import criar_usuario_admin, criar_usuario_supervisor


class AutenticarUsuarioAdministrativoTests(TestCase):
    def test_autentica_supervisor_ativo(self) -> None:
        usuario = criar_usuario_supervisor(email="sup@example.com", senha="senha-123")

        autenticado = autenticar_usuario_administrativo(email="sup@example.com", senha="senha-123")

        self.assertEqual(autenticado.id, usuario.id)

    def test_bloqueia_usuario_inativo(self) -> None:
        usuario = criar_usuario_supervisor(email="inativo@example.com", senha="senha-123")
        usuario.ativo = False
        usuario.save(update_fields=["ativo"])

        with self.assertRaises(AuthServiceError):
            autenticar_usuario_administrativo(email="inativo@example.com", senha="senha-123")


class AuthApiTests(APITestCase):
    def setUp(self) -> None:
        self.usuario = criar_usuario_admin(email="admin-auth@example.com", senha="senha-123")

    def test_login_retorna_tokens_e_perfil(self) -> None:
        response = self.client.post(
            reverse("accounts-login"),
            {"email": "admin-auth@example.com", "senha": "senha-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertIn("access", payload)
        self.assertIn("refresh", payload)
        self.assertEqual(payload["user"]["email"], "admin-auth@example.com")
        self.assertEqual(payload["user"]["papel"], User.Papel.ADMIN)

    def test_me_exige_autenticacao(self) -> None:
        response = self.client.get(reverse("accounts-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.usuario)
        response = self.client.get(reverse("accounts-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["email"], "admin-auth@example.com")

    def test_endpoints_protegidos_exigem_jwt(self) -> None:
        response = self.client.get(reverse("setor-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user=self.usuario)
        response = self.client.get(reverse("setor-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
