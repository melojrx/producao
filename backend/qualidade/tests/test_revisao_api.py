from decimal import Decimal
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from cadastros.models import Operacao, Setor
from produtos.models import Produto
from qualidade.models import QualidadeDefeito, QualidadeDetalhe, QualidadeRegistro
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOperacao


class QualidadeRevisaoServiceError(Exception):
    pass


class RevisaoQualidadeOperacionalApiTests(APITestCase):
    def setUp(self) -> None:
        self.setor_finalizacao = Setor.objects.create(codigo="FIN", nome="Finalizacao")
        self.setor_qualidade = Setor.objects.create(codigo="QUAL", nome="Qualidade")
        self.operacao_finalizacao = Operacao.objects.create(
            codigo="OP-FIN",
            descricao="Finalizar produto",
            setor=self.setor_finalizacao,
            tempo_padrao_min=Decimal("1.0000"),
            qr_code_token="operacao-finalizacao-token",
        )
        self.operacao_qualidade = Operacao.objects.create(
            codigo="OP-QUAL",
            descricao="Revisar qualidade",
            setor=self.setor_qualidade,
            tempo_padrao_min=Decimal("1.0000"),
            qr_code_token="operacao-qualidade-token",
        )
        self.produto = Produto.objects.create(codigo="PROD-QUAL", nome="Produto Qualidade")
        self.revisor = User.objects.create_user(
            username="revisor",
            email="revisor@test.com",
            password="senha-teste",
            papel=User.Papel.SUPERVISOR,
            ativo=True,
            pode_revisar_qualidade=True,
        )
        self.outro_revisor = User.objects.create_user(
            username="outro-revisor",
            email="outro-revisor@test.com",
            password="senha-teste",
            papel=User.Papel.SUPERVISOR,
            ativo=True,
            pode_revisar_qualidade=True,
        )
        self.client.force_authenticate(user=self.revisor)
        self.turno = Turno.objects.create(
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=1,
            minutos_turno=480,
        )
        self.turno_op = TurnoOp.objects.create(
            turno=self.turno,
            numero_op="OP-QUAL-100",
            produto=self.produto,
            quantidade_planejada=100,
        )
        self.turno_setor_operacao_origem = self._criar_contexto_operacional(
            setor=self.setor_finalizacao,
            operacao=self.operacao_finalizacao,
            qr_code_token="turno-finalizacao-token",
            sequencia=1,
        )
        self.turno_setor_operacao_qualidade = self._criar_contexto_operacional(
            setor=self.setor_qualidade,
            operacao=self.operacao_qualidade,
            qr_code_token="turno-qualidade-token",
            sequencia=2,
        )
        self.defeito = QualidadeDefeito.objects.create(
            nome="Costura aberta",
            classificacao=QualidadeDefeito.Classificacao.PROCESSO,
        )

    @patch("qualidade.viewsets.revisao.registrar_revisao_qualidade_operacional")
    def test_registra_revisao_operacional_via_api(self, registrar_revisao_mock) -> None:
        registrar_revisao_mock.return_value = self._criar_registro_qualidade()

        response = self.client.post(
            reverse("qualidade-revisoes-create"),
            self._payload_revisao(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["quantidade_aprovada"], 8)
        self.assertEqual(response.json()["quantidade_reprovada"], 2)
        registrar_revisao_mock.assert_called_once_with(
            turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
            revisor_usuario_id=str(self.revisor.id),
            quantidade_aprovada=8,
            quantidade_reprovada=2,
            origem_lancamento="scanner_qualidade",
            defeitos=[
                {
                    "turno_setor_operacao_id_origem": str(self.turno_setor_operacao_origem.id),
                    "qualidade_defeito_id": str(self.defeito.id),
                    "quantidade_defeito": 3,
                    "observacao": "Costura abriu na lateral",
                }
            ],
        )

    @patch("qualidade.viewsets.revisao.registrar_revisao_qualidade_operacional")
    def test_usa_usuario_autenticado_como_revisor_mesmo_com_payload_divergente(
        self,
        registrar_revisao_mock,
    ) -> None:
        registrar_revisao_mock.return_value = self._criar_registro_qualidade()
        payload = self._payload_revisao()
        payload["revisor_usuario_id"] = str(self.outro_revisor.id)

        response = self.client.post(
            reverse("qualidade-revisoes-create"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registrar_revisao_mock.assert_called_once()
        self.assertEqual(
            registrar_revisao_mock.call_args.kwargs["revisor_usuario_id"],
            str(self.revisor.id),
        )

    @patch("qualidade.viewsets.revisao.registrar_revisao_qualidade_operacional")
    def test_registra_revisao_sem_revisor_no_payload(
        self,
        registrar_revisao_mock,
    ) -> None:
        registrar_revisao_mock.return_value = self._criar_registro_qualidade()
        payload = self._payload_revisao()
        payload.pop("revisor_usuario_id")

        response = self.client.post(
            reverse("qualidade-revisoes-create"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        registrar_revisao_mock.assert_called_once()
        self.assertEqual(
            registrar_revisao_mock.call_args.kwargs["revisor_usuario_id"],
            str(self.revisor.id),
        )

    def test_bloqueia_supervisor_sem_permissao_de_revisar_qualidade(self) -> None:
        supervisor_sem_permissao = User.objects.create_user(
            username="supervisor-sem-qualidade",
            email="supervisor-sem-qualidade@test.com",
            password="senha-teste",
            papel=User.Papel.SUPERVISOR,
            ativo=True,
            pode_revisar_qualidade=False,
        )
        self.client.force_authenticate(user=supervisor_sem_permissao)

        response = self.client.post(
            reverse("qualidade-revisoes-create"),
            self._payload_revisao(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_registra_revisao_com_service_real_disponivel(self) -> None:
        response = self.client.post(
            reverse("qualidade-revisoes-create"),
            self._payload_revisao(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(QualidadeRegistro.objects.count(), 1)
        self.assertEqual(QualidadeDetalhe.objects.count(), 1)
        self.turno_setor_operacao_qualidade.refresh_from_db()
        self.assertEqual(self.turno_setor_operacao_qualidade.quantidade_realizada, 8)

    @patch("qualidade.viewsets.revisao.registrar_revisao_qualidade_operacional")
    def test_retorna_400_previsivel_para_erro_de_dominio(self, registrar_revisao_mock) -> None:
        registrar_revisao_mock.side_effect = QualidadeRevisaoServiceError("saldo fisico insuficiente")

        response = self.client.post(
            reverse("qualidade-revisoes-create"),
            self._payload_revisao(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["detail"], "saldo fisico insuficiente")

    def test_exige_defeito_quando_ha_pecas_reprovadas(self) -> None:
        payload = self._payload_revisao()
        payload["defeitos"] = []

        response = self.client.post(reverse("qualidade-revisoes-create"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Informe ao menos uma operacao de origem", response.json()["detail"][0])

    def test_bloqueia_defeito_duplicado_por_operacao_e_tipo(self) -> None:
        payload = self._payload_revisao()
        payload["defeitos"].append(dict(payload["defeitos"][0]))

        response = self.client.post(reverse("qualidade-revisoes-create"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cada combinacao de operacao", response.json()["detail"][0])

    def test_mantem_registros_e_detalhes_read_only(self) -> None:
        response_registros = self.client.post(reverse("qualidade-registros-list"), {}, format="json")
        response_detalhes = self.client.post(reverse("qualidade-detalhes-list"), {}, format="json")

        self.assertEqual(response_registros.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(response_detalhes.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def _payload_revisao(self) -> dict:
        return {
            "turno_setor_operacao_id_qualidade": str(self.turno_setor_operacao_qualidade.id),
            "revisor_usuario_id": str(self.revisor.id),
            "quantidade_aprovada": 8,
            "quantidade_reprovada": 2,
            "origem_lancamento": "scanner_qualidade",
            "defeitos": [
                {
                    "turno_setor_operacao_id_origem": str(self.turno_setor_operacao_origem.id),
                    "qualidade_defeito_id": str(self.defeito.id),
                    "quantidade_defeito": 3,
                    "observacao": "Costura abriu na lateral",
                }
            ],
        }

    def _criar_registro_qualidade(self) -> QualidadeRegistro:
        return QualidadeRegistro.objects.create(
            revisor=self.revisor,
            turno=self.turno,
            turno_op=self.turno_op,
            turno_setor_operacao=self.turno_setor_operacao_qualidade,
            quantidade_aprovada=8,
            quantidade_reprovada=2,
        )

    def _criar_contexto_operacional(
        self,
        *,
        setor: Setor,
        operacao: Operacao,
        qr_code_token: str,
        sequencia: int,
    ) -> TurnoSetorOperacao:
        turno_setor = TurnoSetor.objects.create(
            turno=self.turno,
            setor=setor,
            qr_code_token=qr_code_token,
        )
        demanda = TurnoSetorDemanda.objects.create(
            turno_setor=turno_setor,
            turno=self.turno,
            turno_op=self.turno_op,
            produto=self.produto,
            setor=setor,
            quantidade_planejada=100,
        )
        return TurnoSetorOperacao.objects.create(
            turno=self.turno,
            turno_op=self.turno_op,
            turno_setor=turno_setor,
            turno_setor_demanda=demanda,
            operacao=operacao,
            setor=setor,
            sequencia=sequencia,
            tempo_padrao_min_snapshot=Decimal("1.0000"),
            quantidade_planejada=100,
        )
