from decimal import Decimal

from django.test import TestCase

from cadastros.models import Operacao, Setor
from produtos.models import Produto, ProdutoOperacao
from shared.fluxo_sequencial_turno import DemandaFluxoSequencialBase
from turnos.models import TurnoOp, TurnoSetorDemanda
from turnos.services import (
    TurnoAberturaServiceError,
    TurnoOpPlanejadaInput,
    abrir_turno,
    encerrar_turno,
    normalizar_demandas_carry_over_entre_turnos,
    selecionar_pendencias_turno_anterior,
)


class NormalizarDemandasCarryOverTests(TestCase):
    def test_normaliza_progresso_setorial_sem_reabrir_setores_concluidos(self) -> None:
        snapshots = normalizar_demandas_carry_over_entre_turnos(
            quantidade_planejada_destino=80,
            demandas_origem=[
                DemandaFluxoSequencialBase(
                    id="prep",
                    turno_op_id="turno-op-1",
                    setor_id="setor-preparacao",
                    setor_sequencia_fluxo=10,
                    setor_nome="Preparação",
                    quantidade_planejada=100,
                    quantidade_realizada=100,
                    quantidade_herdada_setor=0,
                    quantidade_liberada_setor=0,
                    status="concluida",
                    iniciado_em=None,
                    encerrado_em=None,
                ),
                DemandaFluxoSequencialBase(
                    id="frente",
                    turno_op_id="turno-op-1",
                    setor_id="setor-frente",
                    setor_sequencia_fluxo=20,
                    setor_nome="Frente",
                    quantidade_planejada=100,
                    quantidade_realizada=70,
                    quantidade_herdada_setor=0,
                    quantidade_liberada_setor=0,
                    status="em_andamento",
                    iniciado_em=None,
                    encerrado_em=None,
                ),
                DemandaFluxoSequencialBase(
                    id="costa",
                    turno_op_id="turno-op-1",
                    setor_id="setor-costa",
                    setor_sequencia_fluxo=30,
                    setor_nome="Costa",
                    quantidade_planejada=100,
                    quantidade_realizada=20,
                    quantidade_herdada_setor=0,
                    quantidade_liberada_setor=0,
                    status="em_andamento",
                    iniciado_em=None,
                    encerrado_em=None,
                ),
            ],
        )

        self.assertEqual(
            [
                {
                    "setor_id": snapshot.setor_id,
                    "quantidade_herdada_destino": snapshot.quantidade_herdada_destino,
                    "quantidade_pendente_destino": snapshot.quantidade_pendente_destino,
                }
                for snapshot in snapshots
            ],
            [
                {"setor_id": "setor-preparacao", "quantidade_herdada_destino": 80, "quantidade_pendente_destino": 0},
                {"setor_id": "setor-frente", "quantidade_herdada_destino": 70, "quantidade_pendente_destino": 10},
                {"setor_id": "setor-costa", "quantidade_herdada_destino": 20, "quantidade_pendente_destino": 60},
            ],
        )


class CarryOverEntreTurnosTests(TestCase):
    def setUp(self) -> None:
        self.setor_prep = Setor.objects.create(codigo="PREP", nome="Preparação", sequencia_fluxo=10)
        self.setor_frente = Setor.objects.create(codigo="FREN", nome="Frente", sequencia_fluxo=20)
        self.operacao_prep = Operacao.objects.create(
            codigo="OP-PREP",
            descricao="Preparar",
            setor=self.setor_prep,
            tempo_padrao_min=Decimal("1.0000"),
            qr_code_token="operacao-prep-token",
        )
        self.operacao_frente = Operacao.objects.create(
            codigo="OP-FREN",
            descricao="Costurar frente",
            setor=self.setor_frente,
            tempo_padrao_min=Decimal("1.5000"),
            qr_code_token="operacao-frente-token",
        )
        self.produto = Produto.objects.create(codigo="PROD-CO", nome="Produto Carry Over")
        ProdutoOperacao.objects.create(
            produto=self.produto,
            operacao=self.operacao_prep,
            sequencia=1,
            versao_roteiro=1,
            vigente=True,
        )
        ProdutoOperacao.objects.create(
            produto=self.produto,
            operacao=self.operacao_frente,
            sequencia=2,
            versao_roteiro=1,
            vigente=True,
        )

    def test_abre_turno_com_carry_over_da_op_pendente(self) -> None:
        turno_origem = abrir_turno(
            operadores_disponiveis=2,
            minutos_turno=480,
            encerrar_turno_aberto_anterior=False,
            ops=[
                TurnoOpPlanejadaInput(
                    numero_op="OP-CO-100",
                    produto_id=str(self.produto.id),
                    quantidade_planejada=100,
                )
            ],
        )
        turno_op_origem = TurnoOp.objects.get(turno=turno_origem)
        demanda_prep = TurnoSetorDemanda.objects.get(turno_op=turno_op_origem, setor=self.setor_prep)
        demanda_frente = TurnoSetorDemanda.objects.get(turno_op=turno_op_origem, setor=self.setor_frente)
        demanda_prep.quantidade_realizada = 100
        demanda_prep.save(update_fields=["quantidade_realizada", "updated_at"])
        demanda_frente.quantidade_realizada = 70
        demanda_frente.save(update_fields=["quantidade_realizada", "updated_at"])

        encerrar_turno(turno_id=str(turno_origem.id))
        turno_op_origem.refresh_from_db()
        self.assertEqual(turno_op_origem.quantidade_planejada_remanescente, 30)

        pendencias = selecionar_pendencias_turno_anterior(str(turno_origem.id))
        self.assertEqual(len(pendencias), 1)
        self.assertEqual(pendencias[0].quantidade_planejada_remanescente, 30)

        turno_destino = abrir_turno(
            operadores_disponiveis=2,
            minutos_turno=480,
            encerrar_turno_aberto_anterior=False,
            carregar_pendencias_turno_anterior=True,
            turno_origem_pendencias_id=str(turno_origem.id),
            ops=[],
        )

        turno_op_destino = TurnoOp.objects.get(turno=turno_destino)
        self.assertEqual(turno_op_destino.numero_op, "OP-CO-100")
        self.assertEqual(turno_op_destino.quantidade_planejada, 30)
        self.assertEqual(str(turno_op_destino.turno_op_origem_id), str(turno_op_origem.id))

        demanda_prep_destino = TurnoSetorDemanda.objects.get(turno_op=turno_op_destino, setor=self.setor_prep)
        demanda_frente_destino = TurnoSetorDemanda.objects.get(turno_op=turno_op_destino, setor=self.setor_frente)
        self.assertEqual(demanda_prep_destino.quantidade_herdada_setor, 30)
        self.assertEqual(demanda_frente_destino.quantidade_herdada_setor, 30)

    def test_bloqueia_conflito_entre_op_manual_e_carry_over(self) -> None:
        turno_origem = abrir_turno(
            operadores_disponiveis=2,
            minutos_turno=480,
            encerrar_turno_aberto_anterior=False,
            ops=[
                TurnoOpPlanejadaInput(
                    numero_op="OP-CONFLITO",
                    produto_id=str(self.produto.id),
                    quantidade_planejada=50,
                )
            ],
        )
        turno_op_origem = TurnoOp.objects.get(turno=turno_origem)
        demanda_prep = TurnoSetorDemanda.objects.get(turno_op=turno_op_origem, setor=self.setor_prep)
        demanda_prep.quantidade_realizada = 30
        demanda_prep.save(update_fields=["quantidade_realizada", "updated_at"])
        encerrar_turno(turno_id=str(turno_origem.id))

        with self.assertRaises(TurnoAberturaServiceError):
            abrir_turno(
                operadores_disponiveis=2,
                minutos_turno=480,
                encerrar_turno_aberto_anterior=False,
                carregar_pendencias_turno_anterior=True,
                turno_origem_pendencias_id=str(turno_origem.id),
                turno_op_ids_pendentes=[str(turno_op_origem.id)],
                ops=[
                    TurnoOpPlanejadaInput(
                        numero_op="OP-CONFLITO",
                        produto_id=str(self.produto.id),
                        quantidade_planejada=10,
                    )
                ],
            )
