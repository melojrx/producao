from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import Operador
from cadastros.models import Operacao, Setor
from producao.models import RegistroProducao
from producao.services import ProducaoServiceError, registrar_apontamento_operacao
from produtos.models import Produto
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOperacao


class ApontamentoOperacaoServiceTests(TestCase):
    def setUp(self) -> None:
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

    def test_registra_apontamento_atomico_e_consolida_progresso(self) -> None:
        registro = registrar_apontamento_operacao(
            turno_setor_operacao_id=str(self.turno_setor_operacao.id),
            operador_id=str(self.operador.id),
            quantidade=30,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )

        self.assertEqual(registro.quantidade, 30)
        self.assertEqual(registro.operacao_id, self.operacao.id)
        self.assertEqual(registro.turno_op_id, self.turno_op.id)
        self.assertEqual(registro.saldo_fisico_antes_apontamento, 100)

        self.turno_setor_operacao.refresh_from_db()
        self.turno_setor_operacao.turno_setor_demanda.refresh_from_db()
        self.turno_op.refresh_from_db()

        self.assertEqual(self.turno_setor_operacao.quantidade_realizada, 30)
        self.assertEqual(self.turno_setor_operacao.status, TurnoSetorOperacao.Status.EM_ANDAMENTO)
        self.assertEqual(self.turno_setor_operacao.turno_setor_demanda.quantidade_realizada, 30)
        self.assertEqual(self.turno_op.quantidade_realizada, 30)
        self.assertEqual(self.turno_op.status, TurnoOp.Status.EM_ANDAMENTO)

    def test_bloqueia_quantidade_invalida(self) -> None:
        with self.assertRaises(ProducaoServiceError):
            registrar_apontamento_operacao(
                turno_setor_operacao_id=str(self.turno_setor_operacao.id),
                operador_id=str(self.operador.id),
                quantidade=0,
            )

    def test_bloqueia_operador_inativo(self) -> None:
        self.operador.status = Operador.Status.INATIVO
        self.operador.save(update_fields=["status"])

        with self.assertRaises(ProducaoServiceError):
            registrar_apontamento_operacao(
                turno_setor_operacao_id=str(self.turno_setor_operacao.id),
                operador_id=str(self.operador.id),
                quantidade=1,
            )

    def test_bloqueia_turno_fechado(self) -> None:
        self.turno.status = Turno.Status.ENCERRADO
        self.turno.save(update_fields=["status"])

        with self.assertRaises(ProducaoServiceError):
            registrar_apontamento_operacao(
                turno_setor_operacao_id=str(self.turno_setor_operacao.id),
                operador_id=str(self.operador.id),
                quantidade=1,
            )

    def test_bloqueia_contexto_encerrado(self) -> None:
        self.turno_setor_operacao.status = TurnoSetorOperacao.Status.ENCERRADA_MANUALMENTE
        self.turno_setor_operacao.save(update_fields=["status"])

        with self.assertRaises(ProducaoServiceError):
            registrar_apontamento_operacao(
                turno_setor_operacao_id=str(self.turno_setor_operacao.id),
                operador_id=str(self.operador.id),
                quantidade=1,
            )

    def test_bloqueia_apontamento_acima_do_saldo_fisico(self) -> None:
        RegistroProducao.objects.create(
            operador=self.operador,
            operacao=self.operacao,
            produto=self.produto,
            quantidade=95,
            turno=self.turno,
            turno_op=self.turno_op,
            turno_setor_operacao=self.turno_setor_operacao,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )
        self.turno_setor_operacao.quantidade_realizada = 95
        self.turno_setor_operacao.save(update_fields=["quantidade_realizada"])

        with self.assertRaises(ProducaoServiceError):
            registrar_apontamento_operacao(
                turno_setor_operacao_id=str(self.turno_setor_operacao.id),
                operador_id=str(self.operador.id),
                quantidade=6,
            )

    def test_conclui_operacao_quando_realizado_alcanca_planejado(self) -> None:
        registrar_apontamento_operacao(
            turno_setor_operacao_id=str(self.turno_setor_operacao.id),
            operador_id=str(self.operador.id),
            quantidade=100,
        )

        self.turno_setor_operacao.refresh_from_db()
        self.turno_op.refresh_from_db()

        self.assertEqual(self.turno_setor_operacao.status, TurnoSetorOperacao.Status.CONCLUIDA)
        self.assertEqual(self.turno_op.status, TurnoOp.Status.CONCLUIDA)

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
