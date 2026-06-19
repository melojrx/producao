from django.urls import reverse
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Operador
from cadastros.models import Setor
from produtos.models import Produto
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda


@override_settings(ALLOWED_HOSTS=["testserver"])
class ScannerApiTests(APITestCase):
    def setUp(self) -> None:
        self.setor = Setor.objects.create(
            codigo="10",
            nome="Costura Frente",
            modo_apontamento="producao_padrao",
        )
        self.produto = Produto.objects.create(codigo="REF-100", nome="Camisa Polo")
        self.operador_ativo = Operador.objects.create(
            nome="Maria Ativa",
            matricula="001",
            status=Operador.Status.ATIVO,
            qr_code_token="operador-ativo-token",
            foto_url="https://example.com/maria.jpg",
        )
        Operador.objects.create(
            nome="Joao Inativo",
            matricula="002",
            status=Operador.Status.INATIVO,
            qr_code_token="operador-inativo-token",
        )
        self.turno_aberto = Turno.objects.create(
            status=Turno.Status.ABERTO,
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=5,
            minutos_turno=480,
        )
        self.turno_setor = TurnoSetor.objects.create(
            turno=self.turno_aberto,
            setor=self.setor,
            qr_code_token="setor-aberto-token",
            status=TurnoSetor.Status.ABERTO,
        )
        self.turno_op = TurnoOp.objects.create(
            turno=self.turno_aberto,
            numero_op="OP-500",
            produto=self.produto,
            quantidade_planejada=120,
        )
        self.demanda = TurnoSetorDemanda.objects.create(
            turno_setor=self.turno_setor,
            turno=self.turno_aberto,
            turno_op=self.turno_op,
            produto=self.produto,
            setor=self.setor,
            quantidade_planejada=120,
            quantidade_realizada=30,
            quantidade_herdada_setor=10,
            quantidade_liberada_setor=20,
        )

        turno_encerrado = Turno.objects.create(
            status=Turno.Status.ENCERRADO,
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=3,
            minutos_turno=480,
        )
        TurnoSetor.objects.create(
            turno=turno_encerrado,
            setor=Setor.objects.create(codigo="20", nome="Acabamento"),
            qr_code_token="setor-turno-encerrado-token",
        )

    def test_retorna_operador_ativo_por_token(self) -> None:
        response = self.client.get(reverse("scanner-operador", args=["operador-ativo-token"]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["id"], str(self.operador_ativo.id))
        self.assertEqual(payload["nome"], "Maria Ativa")
        self.assertEqual(payload["matricula"], "001")
        self.assertEqual(payload["foto_url"], "https://example.com/maria.jpg")

    def test_operador_inativo_retorna_404(self) -> None:
        response = self.client.get(reverse("scanner-operador", args=["operador-inativo-token"]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_operador_inexistente_retorna_404(self) -> None:
        response = self.client.get(reverse("scanner-operador", args=["token-inexistente"]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retorna_setor_aberto_por_token(self) -> None:
        response = self.client.get(reverse("scanner-setor", args=["setor-aberto-token"]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(payload["id"], str(self.turno_setor.id))
        self.assertEqual(payload["turno_id"], str(self.turno_aberto.id))
        self.assertEqual(payload["setor_id"], str(self.setor.id))
        self.assertEqual(payload["setor_nome"], "Costura Frente")
        self.assertEqual(payload["setor_modo_apontamento"], "producao_padrao")
        self.assertEqual(payload["quantidade_planejada"], 120)
        self.assertEqual(payload["quantidade_realizada"], 30)
        self.assertEqual(payload["qr_code_token"], "setor-aberto-token")

    def test_setor_de_turno_encerrado_retorna_404(self) -> None:
        response = self.client.get(reverse("scanner-setor", args=["setor-turno-encerrado-token"]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_lista_demandas_do_setor_escaneado(self) -> None:
        response = self.client.get(reverse("scanner-setor-demandas", args=["setor-aberto-token"]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        demanda = payload[0]
        self.assertEqual(demanda["id"], str(self.demanda.id))
        self.assertEqual(demanda["turno_setor_id"], str(self.turno_setor.id))
        self.assertEqual(demanda["turno_op_id"], str(self.turno_op.id))
        self.assertEqual(demanda["produto_id"], str(self.produto.id))
        self.assertEqual(demanda["numero_op"], "OP-500")
        self.assertEqual(demanda["produto_nome"], "Camisa Polo")
        self.assertEqual(demanda["produto_referencia"], "REF-100")
        self.assertEqual(demanda["quantidade_planejada"], 120)
        self.assertEqual(demanda["quantidade_realizada"], 30)
        self.assertEqual(demanda["quantidade_herdada_setor"], 10)
        self.assertEqual(demanda["quantidade_liberada_setor"], 20)
        self.assertEqual(demanda["status"], "em_andamento")

    def test_demandas_de_setor_inexistente_retorna_404(self) -> None:
        response = self.client.get(reverse("scanner-setor-demandas", args=["token-inexistente"]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_lista_demandas_por_id_do_turno_setor(self) -> None:
        response = self.client.get(
            reverse("scanner-turno-setor-demandas", args=[str(self.turno_setor.id)])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.json()
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], str(self.demanda.id))

    def test_demandas_por_id_de_turno_encerrado_retorna_404(self) -> None:
        turno_encerrado = Turno.objects.create(
            status=Turno.Status.ENCERRADO,
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=2,
            minutos_turno=480,
        )
        setor_encerrado = Setor.objects.create(codigo="99", nome="Setor Encerrado")
        turno_setor_encerrado = TurnoSetor.objects.create(
            turno=turno_encerrado,
            setor=setor_encerrado,
            qr_code_token="setor-id-encerrado-token",
        )

        response = self.client.get(
            reverse("scanner-turno-setor-demandas", args=[str(turno_setor_encerrado.id)])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_endpoints_sao_publicos_sem_autenticacao(self) -> None:
        endpoints = [
            reverse("scanner-operador", args=["operador-ativo-token"]),
            reverse("scanner-setor", args=["setor-aberto-token"]),
            reverse("scanner-setor-demandas", args=["setor-aberto-token"]),
        ]

        for url in endpoints:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
