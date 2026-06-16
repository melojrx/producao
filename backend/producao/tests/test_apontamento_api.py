from decimal import Decimal

from django.urls import reverse
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.tests.support import criar_usuario_supervisor
from accounts.models import Operador
from cadastros.models import Operacao, Setor
from producao.models import RegistroProducao
from produtos.models import Produto
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOperacao


@override_settings(ALLOWED_HOSTS=["testserver"])
class ApontamentoOperacaoApiTests(APITestCase):
    def setUp(self) -> None:
        self.usuario = criar_usuario_supervisor(email="supervisor-producao@test.com")
        self.client.force_authenticate(user=self.usuario)
        self.setor = Setor.objects.create(codigo="COST", nome="Costura")
        self.operacao = Operacao.objects.create(
            codigo="OP-COST",
            descricao="Costurar lateral",
            setor=self.setor,
            tempo_padrao_min=Decimal("1.0000"),
            qr_code_token="operacao-costura-token",
        )
        self.produto = Produto.objects.create(codigo="PROD-COST", nome="Produto Costura")
        self.operador = Operador.objects.create(
            nome="Maria",
            matricula="001",
            qr_code_token="operador-maria-token",
        )
        self.turno = Turno.objects.create(
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=1,
            minutos_turno=480,
        )
        self.turno_op = TurnoOp.objects.create(
            turno=self.turno,
            numero_op="OP-100",
            produto=self.produto,
            quantidade_planejada=100,
        )
        self.turno_setor_operacao = self._criar_contexto_operacional()

    def test_registra_apontamento_via_api(self) -> None:
        response = self.client.post(
            reverse("producao-apontamentos-create"),
            {
                "turno_setor_operacao": str(self.turno_setor_operacao.id),
                "operador": str(self.operador.id),
                "quantidade": 25,
                "origem_apontamento": RegistroProducao.OrigemApontamento.OPERADOR_QR,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["quantidade"], 25)
        self.assertEqual(RegistroProducao.objects.count(), 1)

    def test_retorna_erro_previsivel_para_saldo_insuficiente(self) -> None:
        RegistroProducao.objects.create(
            operador=self.operador,
            operacao=self.operacao,
            produto=self.produto,
            quantidade=100,
            turno=self.turno,
            turno_op=self.turno_op,
            turno_setor_operacao=self.turno_setor_operacao,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )
        self.turno_setor_operacao.quantidade_realizada = 100
        self.turno_setor_operacao.save(update_fields=["quantidade_realizada"])

        response = self.client.post(
            reverse("producao-apontamentos-create"),
            {
                "turno_setor_operacao": str(self.turno_setor_operacao.id),
                "operador": str(self.operador.id),
                "quantidade": 1,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("saldo fisico", response.json()["detail"])

    def test_mantem_registros_producao_read_only(self) -> None:
        response = self.client.post(reverse("producao-registros-list"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def _criar_contexto_operacional(self) -> TurnoSetorOperacao:
        turno_setor = TurnoSetor.objects.create(
            turno=self.turno,
            setor=self.setor,
            qr_code_token="turno-setor-token",
        )
        demanda = TurnoSetorDemanda.objects.create(
            turno_setor=turno_setor,
            turno=self.turno,
            turno_op=self.turno_op,
            produto=self.produto,
            setor=self.setor,
            quantidade_planejada=100,
        )
        return TurnoSetorOperacao.objects.create(
            turno=self.turno,
            turno_op=self.turno_op,
            turno_setor=turno_setor,
            turno_setor_demanda=demanda,
            operacao=self.operacao,
            setor=self.setor,
            sequencia=1,
            tempo_padrao_min_snapshot=Decimal("1.0000"),
            quantidade_planejada=100,
        )
