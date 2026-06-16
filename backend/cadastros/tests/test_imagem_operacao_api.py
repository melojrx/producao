from decimal import Decimal

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.tests.support import criar_usuario_supervisor
from cadastros.models import Operacao, Setor
from shared.tests.support import criar_arquivo_imagem_teste


@override_settings(MEDIA_ROOT="/tmp/mdj14-operacao-api-media-test")
class OperacaoImagemApiTests(APITestCase):
    def setUp(self) -> None:
        self.setor = Setor.objects.create(codigo="COST-API", nome="Costura API")
        self.operacao = Operacao.objects.create(
            codigo="OP-IMG-API",
            descricao="Operacao imagem API",
            setor=self.setor,
            tempo_padrao_min=Decimal("1.5000"),
            qr_code_token="operacao-img-api-token",
        )
        self.usuario = criar_usuario_supervisor(email="supervisor-operacao-img@test.com")
        self.client.force_authenticate(user=self.usuario)

    def test_upload_imagem_operacao_via_api(self) -> None:
        response = self.client.post(
            reverse("operacao-imagem", kwargs={"pk": self.operacao.id}),
            {"arquivo": criar_arquivo_imagem_teste()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["imagem_url"])
        self.operacao.refresh_from_db()
        self.assertTrue(self.operacao.imagem_url)

    def test_remove_imagem_operacao_via_api(self) -> None:
        self.client.post(
            reverse("operacao-imagem", kwargs={"pk": self.operacao.id}),
            {"arquivo": criar_arquivo_imagem_teste()},
            format="multipart",
        )

        response = self.client.delete(reverse("operacao-imagem", kwargs={"pk": self.operacao.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["imagem_url"], "")

    def test_bloqueia_upload_sem_autenticacao(self) -> None:
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("operacao-imagem", kwargs={"pk": self.operacao.id}),
            {"arquivo": criar_arquivo_imagem_teste()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
