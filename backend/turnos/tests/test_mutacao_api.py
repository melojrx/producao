from decimal import Decimal
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.tests.support import criar_usuario_supervisor
from cadastros.models import Operacao, Setor
from produtos.models import Produto, ProdutoOperacao
from turnos.models import Turno


class TurnoMutacaoApiTests(APITestCase):
    def setUp(self) -> None:
        self.setor = Setor.objects.create(codigo="MONT", nome="Montagem")
        self.operacao = Operacao.objects.create(
            codigo="OP-MONT",
            descricao="Montar produto",
            setor=self.setor,
            tempo_padrao_min=Decimal("2.0000"),
            qr_code_token="operacao-montagem-token",
        )
        self.produto = Produto.objects.create(codigo="PROD-API", nome="Produto API")
        ProdutoOperacao.objects.create(
            produto=self.produto,
            operacao=self.operacao,
            sequencia=1,
            versao_roteiro=1,
            vigente=True,
        )
        self.turno_aberto = Turno.objects.create(
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=2,
            minutos_turno=480,
        )
        self.usuario = criar_usuario_supervisor(email="supervisor-turnos@test.com")
        self.client.force_authenticate(user=self.usuario)

    @patch("turnos.viewsets.mutacao.abrir_turno")
    def test_abre_turno_via_api(self, abrir_turno_mock) -> None:
        abrir_turno_mock.return_value = self.turno_aberto

        response = self.client.post(
            reverse("turno-abrir"),
            {
                "operadores_disponiveis": 2,
                "minutos_turno": 480,
                "ops": [
                    {
                        "numero_op": "OP-API-1",
                        "produto_id": str(self.produto.id),
                        "quantidade_planejada": 80,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        abrir_turno_mock.assert_called_once()

    def test_abre_turno_com_service_real(self) -> None:
        numero_op = f"OP-API-REAL-{self.produto.id.hex[:8]}"
        response = self.client.post(
            reverse("turno-abrir"),
            {
                "operadores_disponiveis": 2,
                "minutos_turno": 480,
                "encerrar_turno_aberto_anterior": True,
                "ops": [
                    {
                        "numero_op": numero_op,
                        "produto_id": str(self.produto.id),
                        "quantidade_planejada": 80,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content.decode())
        self.assertEqual(Turno.objects.filter(status=Turno.Status.ABERTO).count(), 1)

    @patch("turnos.viewsets.mutacao.encerrar_turno")
    def test_encerra_turno_via_api(self, encerrar_turno_mock) -> None:
        turno_encerrado = Turno.objects.get(id=self.turno_aberto.id)
        turno_encerrado.status = Turno.Status.ENCERRADO
        encerrar_turno_mock.return_value = turno_encerrado

        response = self.client.post(
            reverse("turno-encerrar", kwargs={"turno_id": str(self.turno_aberto.id)}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        encerrar_turno_mock.assert_called_once_with(
            turno_id=str(self.turno_aberto.id),
            encerrado_por_id=None,
        )

    def test_mantem_listagem_turnos_read_only(self) -> None:
        response = self.client.post(reverse("turno-list"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
