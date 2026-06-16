from decimal import Decimal

from django.test import TestCase

from cadastros.models import Setor
from shared.turno_dominio import calcular_quantidade_planejada_remanescente, validar_nova_op_fisica


class TurnoDominioTests(TestCase):
    def test_calcula_remanescente_com_heranca_setorial(self) -> None:
        remanescente = calcular_quantidade_planejada_remanescente(
            quantidade_planejada_origem=100,
            demandas_origem=[
                {"quantidade_realizada": 20, "quantidade_herdada_setor": 10},
                {"quantidade_realizada": 15, "quantidade_herdada_setor": 5},
            ],
        )
        self.assertEqual(remanescente, 80)

    def test_bloqueia_nova_op_fisica_com_saldo_pendente(self) -> None:
        permitido, mensagem = validar_nova_op_fisica(
            numero_op="207675",
            ops_existentes=[
                type(
                    "Op",
                    (),
                    {
                        "id": "op-1",
                        "numero_op": "207675",
                        "status": "em_andamento",
                        "turno_op_origem_id": None,
                        "quantidade_planejada_remanescente": 12,
                    },
                )()
            ],
        )
        self.assertFalse(permitido)
        self.assertIn("carry-over", mensagem or "")
