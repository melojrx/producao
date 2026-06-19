from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.tests.support import criar_usuario_supervisor
from turnos.models import Turno


@override_settings(ALLOWED_HOSTS=["testserver"])
class TurnoReadApiTests(APITestCase):
    def setUp(self) -> None:
        self.usuario = criar_usuario_supervisor(email="sup-turno-read@test.com")
        self.client.force_authenticate(user=self.usuario)

        self.turno_aberto = Turno.objects.create(
            status=Turno.Status.ABERTO,
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=8,
            minutos_turno=480,
        )
        self.turno_encerrado = Turno.objects.create(
            status=Turno.Status.ENCERRADO,
            data_hora_abertura=timezone.now() - timedelta(days=1),
            data_hora_encerramento=timezone.now() - timedelta(hours=2),
            operadores_disponiveis=8,
            minutos_turno=480,
        )

    def test_retorna_turno_aberto(self) -> None:
        response = self.client.get(reverse("turno-aberto"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], str(self.turno_aberto.id))

    def test_retorna_ultimo_turno_encerrado(self) -> None:
        response = self.client.get(reverse("turno-ultimo-encerrado"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], str(self.turno_encerrado.id))

    def test_lista_demandas_por_turno(self) -> None:
        from cadastros.models import Setor
        from produtos.models import Produto
        from turnos.models import TurnoOp, TurnoSetor, TurnoSetorDemanda

        setor = Setor.objects.create(codigo="20", nome="Montagem", modo_apontamento="producao_padrao")
        produto = Produto.objects.create(codigo="REF-200", nome="Calca")
        turno_setor = TurnoSetor.objects.create(
            turno=self.turno_aberto,
            setor=setor,
            qr_code_token="setor-demanda-token",
        )
        turno_op = TurnoOp.objects.create(
            turno=self.turno_aberto,
            numero_op="OP-200",
            produto=produto,
            quantidade_planejada=50,
        )
        TurnoSetorDemanda.objects.create(
            turno_setor=turno_setor,
            turno=self.turno_aberto,
            turno_op=turno_op,
            produto=produto,
            setor=setor,
            quantidade_planejada=50,
        )

        response = self.client.get(
            reverse("turno-demanda-list"),
            {"turno": str(self.turno_aberto.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
