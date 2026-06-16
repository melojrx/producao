from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from cadastros.models import Operacao, Setor
from produtos.models import Produto, ProdutoOperacao
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOperacao
from turnos.services import (
    TurnoAberturaServiceError,
    TurnoEncerramentoServiceError,
    TurnoOpPlanejadaInput,
    abrir_turno,
    encerrar_turno,
)


class EncerrarTurnoServiceTests(TestCase):
    def setUp(self) -> None:
        self.turno = Turno.objects.create(
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=2,
            minutos_turno=480,
        )
        self.produto = Produto.objects.create(codigo="PROD-ENC", nome="Produto Encerramento")
        TurnoOp.objects.create(
            turno=self.turno,
            numero_op="OP-ENC-1",
            produto=self.produto,
            quantidade_planejada=100,
            quantidade_planejada_remanescente=100,
            status=TurnoOp.Status.PLANEJADA,
        )

    def test_encerra_turno_aberto_e_atualiza_saldos(self) -> None:
        turno = encerrar_turno(turno_id=str(self.turno.id))

        self.assertEqual(turno.status, Turno.Status.ENCERRADO)
        self.assertIsNotNone(turno.data_hora_encerramento)

        turno_op = TurnoOp.objects.get(turno=self.turno)
        self.assertEqual(turno_op.status, TurnoOp.Status.ENCERRADA)

    def test_bloqueia_encerrar_turno_ja_encerrado(self) -> None:
        encerrar_turno(turno_id=str(self.turno.id))

        with self.assertRaises(TurnoEncerramentoServiceError):
            encerrar_turno(turno_id=str(self.turno.id))


class AbrirTurnoServiceTests(TestCase):
    def setUp(self) -> None:
        self.setor = Setor.objects.create(codigo="COST", nome="Costura")
        self.operacao = Operacao.objects.create(
            codigo="OP-COST",
            descricao="Costurar lateral",
            setor=self.setor,
            tempo_padrao_min=Decimal("1.0000"),
            qr_code_token="operacao-costura-token",
        )
        self.produto = Produto.objects.create(codigo="PROD-ABRIR", nome="Produto Abrir")
        ProdutoOperacao.objects.create(
            produto=self.produto,
            operacao=self.operacao,
            sequencia=1,
            versao_roteiro=1,
            vigente=True,
        )

    def test_abre_turno_com_op_e_deriva_estrutura_operacional(self) -> None:
        turno = abrir_turno(
            operadores_disponiveis=3,
            minutos_turno=540,
            ops=[
                TurnoOpPlanejadaInput(
                    numero_op="OP-ABRIR-100",
                    produto_id=str(self.produto.id),
                    quantidade_planejada=120,
                )
            ],
        )

        self.assertEqual(turno.status, Turno.Status.ABERTO)
        self.assertEqual(turno.operadores_disponiveis, 3)
        self.assertEqual(TurnoOp.objects.filter(turno=turno).count(), 1)
        self.assertEqual(TurnoSetor.objects.filter(turno=turno).count(), 1)
        self.assertEqual(TurnoSetorDemanda.objects.filter(turno=turno).count(), 1)
        self.assertEqual(TurnoSetorOperacao.objects.filter(turno=turno).count(), 1)

    def test_abre_turno_deriva_qualidade_quando_faz_parte_do_roteiro(self) -> None:
        setor_qualidade = Setor.objects.create(
            codigo="QUAL",
            nome="Qualidade",
            modo_apontamento=Setor.ModoApontamento.REVISAO_QUALIDADE,
            sequencia_fluxo=99,
        )
        operacao_qualidade = Operacao.objects.create(
            codigo="OP-QUAL",
            descricao="Revisar produto",
            setor=setor_qualidade,
            tempo_padrao_min=Decimal("0.5000"),
            qr_code_token="operacao-qualidade-token",
        )
        ProdutoOperacao.objects.create(
            produto=self.produto,
            operacao=operacao_qualidade,
            sequencia=2,
            versao_roteiro=1,
            vigente=True,
        )

        turno = abrir_turno(
            operadores_disponiveis=3,
            minutos_turno=540,
            ops=[
                TurnoOpPlanejadaInput(
                    numero_op="OP-ABRIR-QUALIDADE",
                    produto_id=str(self.produto.id),
                    quantidade_planejada=120,
                )
            ],
        )

        self.assertEqual(TurnoSetor.objects.filter(turno=turno).count(), 2)
        demanda_qualidade = TurnoSetorDemanda.objects.get(turno=turno, setor=setor_qualidade)
        operacao_qualidade_turno = TurnoSetorOperacao.objects.get(
            turno=turno,
            setor=setor_qualidade,
        )
        self.assertEqual(demanda_qualidade.quantidade_planejada, 120)
        self.assertEqual(demanda_qualidade.quantidade_liberada_setor, 0)
        self.assertEqual(operacao_qualidade_turno.operacao, operacao_qualidade)

    def test_abrir_encerra_turno_aberto_anterior(self) -> None:
        turno_anterior = Turno.objects.create(
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=1,
            minutos_turno=480,
        )

        abrir_turno(
            operadores_disponiveis=2,
            minutos_turno=480,
            ops=[
                TurnoOpPlanejadaInput(
                    numero_op="OP-ABRIR-200",
                    produto_id=str(self.produto.id),
                    quantidade_planejada=50,
                )
            ],
        )

        turno_anterior.refresh_from_db()
        self.assertEqual(turno_anterior.status, Turno.Status.ENCERRADO)
        self.assertEqual(Turno.objects.filter(status=Turno.Status.ABERTO).count(), 1)

    def test_bloqueia_abrir_sem_ops(self) -> None:
        with self.assertRaises(TurnoAberturaServiceError):
            abrir_turno(operadores_disponiveis=2, minutos_turno=480, ops=[])

    def test_bloqueia_op_duplicada_no_mesmo_turno(self) -> None:
        with self.assertRaises(TurnoAberturaServiceError):
            abrir_turno(
                operadores_disponiveis=2,
                minutos_turno=480,
                ops=[
                    TurnoOpPlanejadaInput(
                        numero_op="OP-DUP",
                        produto_id=str(self.produto.id),
                        quantidade_planejada=10,
                    ),
                    TurnoOpPlanejadaInput(
                        numero_op="OP-DUP",
                        produto_id=str(self.produto.id),
                        quantidade_planejada=20,
                    ),
                ],
            )
