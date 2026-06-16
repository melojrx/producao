from decimal import Decimal

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.tests.support import criar_usuario_supervisor
from produtos.models import Produto
from shared.tests.support import criar_arquivo_imagem_teste


@override_settings(MEDIA_ROOT="/tmp/mdj14-produto-api-media-test")
class ProdutoImagemApiTests(APITestCase):
    def setUp(self) -> None:
        self.produto = Produto.objects.create(codigo="PROD-IMG-API", nome="Produto Imagem API")
        self.usuario = criar_usuario_supervisor(email="supervisor-produto-img@test.com")
        self.client.force_authenticate(user=self.usuario)

    def test_upload_imagem_frente_via_api(self) -> None:
        response = self.client.post(
            reverse("produto-imagem", kwargs={"pk": self.produto.id, "tipo": "frente"}),
            {"arquivo": criar_arquivo_imagem_teste()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["imagem_frente_url"])
        self.produto.refresh_from_db()
        self.assertTrue(self.produto.imagem_frente_url)

    def test_remove_imagem_frente_via_api(self) -> None:
        self.client.post(
            reverse("produto-imagem", kwargs={"pk": self.produto.id, "tipo": "frente"}),
            {"arquivo": criar_arquivo_imagem_teste()},
            format="multipart",
        )

        response = self.client.delete(
            reverse("produto-imagem", kwargs={"pk": self.produto.id, "tipo": "frente"}),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["imagem_frente_url"], "")

    def test_bloqueia_upload_sem_autenticacao(self) -> None:
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("produto-imagem", kwargs={"pk": self.produto.id, "tipo": "frente"}),
            {"arquivo": criar_arquivo_imagem_teste()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rejeita_tipo_invalido_via_api(self) -> None:
        response = self.client.post(
            reverse("produto-imagem", kwargs={"pk": self.produto.id, "tipo": "lateral"}),
            {"arquivo": criar_arquivo_imagem_teste()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
