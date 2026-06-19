from datetime import date

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.tests.support import criar_usuario_supervisor
from metas.models import MetaMensal
from produtos.models import Produto
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda


@override_settings(ALLOWED_HOSTS=["testserver"])
class MetaMensalApiTests(APITestCase):
    def setUp(self) -> None:
        self.usuario = criar_usuario_supervisor(email="sup-metas@test.com")
        self.client.force_authenticate(user=self.usuario)
        self.competencia = date(2026, 6, 1)
        self.meta = MetaMensal.objects.create(
            competencia=self.competencia,
            meta_pecas=3000,
            dias_produtivos=22,
            observacao="Meta teste",
        )

        produto = Produto.objects.create(codigo="REF-100", nome="Camisa Polo", tp_produto_min="10.0000")
        turno = Turno.objects.create(
            status=Turno.Status.ABERTO,
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=10,
            minutos_turno=480,
        )
        setor = self._criar_setor()
        setor_turno = TurnoSetor.objects.create(
            turno=turno,
            setor=setor,
            qr_code_token="setor-meta-token",
        )
        turno_op = TurnoOp.objects.create(
            turno=turno,
            numero_op="OP-100",
            produto=produto,
            quantidade_planejada=100,
            quantidade_realizada=60,
        )
        TurnoSetorDemanda.objects.create(
            turno_setor=setor_turno,
            turno=turno,
            turno_op=turno_op,
            produto=produto,
            setor=setor,
            quantidade_planejada=100,
            quantidade_realizada=60,
        )

    def _criar_setor(self):
        from cadastros.models import Setor

        return Setor.objects.create(codigo="10", nome="Costura", modo_apontamento="producao_padrao")

    def test_lista_metas_mensais(self) -> None:
        response = self.client.get(reverse("meta-mensal-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["meta_pecas"], 3000)

    def test_busca_meta_por_competencia(self) -> None:
        response = self.client.get(reverse("meta-mensal-competencia", args=["2026-06-01"]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], str(self.meta.id))

    def test_resumo_dashboard_agrega_realizado_mes(self) -> None:
        response = self.client.get(reverse("meta-mensal-resumo"), {"competencia": "2026-06-01"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["meta_pecas"], 3000)
        self.assertGreaterEqual(payload["alcancado_mes"], 60)
        self.assertEqual(len(payload["evolucao_diaria"]), 30)
