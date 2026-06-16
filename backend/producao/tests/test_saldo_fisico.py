from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import Operador
from cadastros.models import Operacao, Setor
from producao.models import RegistroProducao
from producao.selectors import (
    SaldoFisicoInsuficienteError,
    calcular_saldo_fisico_operacao_op,
    get_linhagem_turno_op_ids,
    validar_quantidade_dentro_saldo_fisico,
)
from produtos.models import Produto
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOperacao


class SaldoFisicoTests(TestCase):
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
        self.turno_1 = Turno.objects.create(
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=1,
            minutos_turno=480,
        )
        self.turno_op_raiz = TurnoOp.objects.create(
            turno=self.turno_1,
            numero_op="OP-100",
            produto=self.produto,
            quantidade_planejada=100,
        )

    def test_calcula_saldo_basico_por_producao_acumulada(self) -> None:
        RegistroProducao.objects.create(
            operador=self.operador,
            operacao=self.operacao,
            produto=self.produto,
            quantidade=35,
            turno=self.turno_1,
            turno_op=self.turno_op_raiz,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )

        saldo = calcular_saldo_fisico_operacao_op(
            turno_op_id=self.turno_op_raiz.id,
            operacao_id=self.operacao.id,
        )

        self.assertEqual(saldo.quantidade_planejada_op, 100)
        self.assertEqual(saldo.producao_acumulada_operacao, 35)
        self.assertEqual(saldo.saldo_restante, 65)

    def test_saldo_considera_linhagem_de_carry_over(self) -> None:
        turno_2 = Turno.objects.create(
            status=Turno.Status.ENCERRADO,
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=1,
            minutos_turno=480,
        )
        turno_op_filha = TurnoOp.objects.create(
            turno=turno_2,
            numero_op="OP-100",
            produto=self.produto,
            quantidade_planejada=100,
            turno_op_origem=self.turno_op_raiz,
        )
        RegistroProducao.objects.create(
            operador=self.operador,
            operacao=self.operacao,
            produto=self.produto,
            quantidade=40,
            turno=self.turno_1,
            turno_op=self.turno_op_raiz,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )
        RegistroProducao.objects.create(
            operador=self.operador,
            operacao=self.operacao,
            produto=self.produto,
            quantidade=15,
            turno=turno_2,
            turno_op=turno_op_filha,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )

        linhagem = get_linhagem_turno_op_ids(turno_op_filha.id)
        saldo = calcular_saldo_fisico_operacao_op(
            turno_op_id=turno_op_filha.id,
            operacao_id=self.operacao.id,
        )

        self.assertEqual(linhagem, (self.turno_op_raiz.id, turno_op_filha.id))
        self.assertEqual(saldo.producao_acumulada_operacao, 55)
        self.assertEqual(saldo.saldo_restante, 45)

    def test_saldo_considera_progresso_herdado_quando_maior_que_registros(self) -> None:
        turno_setor_operacao = self._criar_contexto_operacional(quantidade_herdada=70, quantidade_realizada=10)
        RegistroProducao.objects.create(
            operador=self.operador,
            operacao=self.operacao,
            produto=self.produto,
            quantidade=40,
            turno=self.turno_1,
            turno_op=self.turno_op_raiz,
            turno_setor_operacao=turno_setor_operacao,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )

        saldo = calcular_saldo_fisico_operacao_op(
            turno_op_id=self.turno_op_raiz.id,
            operacao_id=self.operacao.id,
            turno_setor_operacao_id=turno_setor_operacao.id,
        )

        self.assertEqual(saldo.producao_acumulada_operacao, 40)
        self.assertEqual(saldo.progresso_contexto_operacional, 80)
        self.assertEqual(saldo.quantidade_consumida_representativa, 80)
        self.assertEqual(saldo.saldo_restante, 20)

    def test_valida_quantidade_dentro_do_saldo(self) -> None:
        RegistroProducao.objects.create(
            operador=self.operador,
            operacao=self.operacao,
            produto=self.produto,
            quantidade=90,
            turno=self.turno_1,
            turno_op=self.turno_op_raiz,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )

        saldo = validar_quantidade_dentro_saldo_fisico(
            turno_op_id=self.turno_op_raiz.id,
            operacao_id=self.operacao.id,
            quantidade_solicitada=10,
        )

        self.assertEqual(saldo.saldo_restante, 10)

    def test_bloqueia_quantidade_acima_do_saldo(self) -> None:
        RegistroProducao.objects.create(
            operador=self.operador,
            operacao=self.operacao,
            produto=self.produto,
            quantidade=95,
            turno=self.turno_1,
            turno_op=self.turno_op_raiz,
            origem_apontamento=RegistroProducao.OrigemApontamento.OPERADOR_QR,
        )

        with self.assertRaises(SaldoFisicoInsuficienteError):
            validar_quantidade_dentro_saldo_fisico(
                turno_op_id=self.turno_op_raiz.id,
                operacao_id=self.operacao.id,
                quantidade_solicitada=6,
            )

    def _criar_contexto_operacional(
        self,
        *,
        quantidade_herdada: int,
        quantidade_realizada: int,
    ) -> TurnoSetorOperacao:
        turno_setor = TurnoSetor.objects.create(
            turno=self.turno_1,
            setor=self.setor,
            qr_code_token="turno-setor-token",
        )
        demanda = TurnoSetorDemanda.objects.create(
            turno_setor=turno_setor,
            turno=self.turno_1,
            turno_op=self.turno_op_raiz,
            produto=self.produto,
            setor=self.setor,
            quantidade_herdada_setor=quantidade_herdada,
            quantidade_planejada=100,
        )
        return TurnoSetorOperacao.objects.create(
            turno=self.turno_1,
            turno_op=self.turno_op_raiz,
            turno_setor=turno_setor,
            turno_setor_demanda=demanda,
            operacao=self.operacao,
            setor=self.setor,
            sequencia=1,
            tempo_padrao_min_snapshot=Decimal("1.0000"),
            quantidade_planejada=100,
            quantidade_realizada=quantidade_realizada,
        )
