from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from cadastros.models import Operacao, Setor
from producao.models import RegistroProducao
from produtos.models import Produto
from qualidade.models import QualidadeDefeito, QualidadeDetalhe, QualidadeRegistro
from qualidade.services import (
    DefeitoRevisaoInput,
    QualidadeRevisaoServiceError,
    registrar_revisao_qualidade_operacional,
)
from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOperacao


class RevisaoQualidadeServiceTests(TestCase):
    def setUp(self) -> None:
        self.setor_produtivo = Setor.objects.create(
            codigo="FIN",
            nome="Finalizacao",
            modo_apontamento=Setor.ModoApontamento.PRODUCAO_PADRAO,
            sequencia_fluxo=1,
        )
        self.setor_qualidade = Setor.objects.create(
            codigo="QUAL",
            nome="Qualidade",
            modo_apontamento=Setor.ModoApontamento.REVISAO_QUALIDADE,
            sequencia_fluxo=2,
        )
        self.operacao_produtiva = Operacao.objects.create(
            codigo="OP-FIN",
            descricao="Fechar peca",
            setor=self.setor_produtivo,
            tempo_padrao_min=Decimal("1.0000"),
            qr_code_token="operacao-finalizacao-token",
        )
        self.operacao_qualidade = Operacao.objects.create(
            codigo="OP-QUAL",
            descricao="Revisao final",
            setor=self.setor_qualidade,
            tempo_padrao_min=Decimal("1.0000"),
            qr_code_token="operacao-qualidade-token",
        )
        self.produto = Produto.objects.create(codigo="PROD-QUAL", nome="Produto Qualidade")
        self.revisor = User.objects.create_user(
            username="revisor-qualidade",
            password="senha-teste",
            pode_revisar_qualidade=True,
        )
        self.turno = Turno.objects.create(
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=1,
            minutos_turno=480,
        )
        self.turno_op = TurnoOp.objects.create(
            turno=self.turno,
            numero_op="OP-QUAL-001",
            produto=self.produto,
            quantidade_planejada=100,
        )
        self.turno_setor_operacao_origem = self._criar_contexto_operacional(
            setor=self.setor_produtivo,
            operacao=self.operacao_produtiva,
            qr_code_token="turno-setor-finalizacao-token",
        )
        self.turno_setor_operacao_origem.quantidade_realizada = 100
        self.turno_setor_operacao_origem.status = TurnoSetorOperacao.Status.CONCLUIDA
        self.turno_setor_operacao_origem.save(update_fields=["quantidade_realizada", "status"])
        self.turno_setor_operacao_origem.turno_setor_demanda.quantidade_realizada = 100
        self.turno_setor_operacao_origem.turno_setor_demanda.save(update_fields=["quantidade_realizada"])
        self.turno_setor_operacao_qualidade = self._criar_contexto_operacional(
            setor=self.setor_qualidade,
            operacao=self.operacao_qualidade,
            qr_code_token="turno-setor-qualidade-token",
        )
        self.defeito_processo = QualidadeDefeito.objects.create(
            nome="Costura aberta",
            classificacao=QualidadeDefeito.Classificacao.PROCESSO,
        )
        self.defeito_operador = QualidadeDefeito.objects.create(
            nome="Linha solta",
            classificacao=QualidadeDefeito.Classificacao.OPERADOR,
        )

    def test_registra_revisao_com_aprovadas_reprovadas_multiplos_defeitos_e_consolida_so_aprovadas(self) -> None:
        registro = registrar_revisao_qualidade_operacional(
            turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
            revisor_usuario_id=str(self.revisor.id),
            quantidade_aprovada=30,
            quantidade_reprovada=5,
            defeitos=[
                DefeitoRevisaoInput(
                    turno_setor_operacao_origem_id=str(self.turno_setor_operacao_origem.id),
                    defeito_id=str(self.defeito_processo.id),
                    quantidade_defeito=8,
                    observacao="barra com abertura",
                ),
                DefeitoRevisaoInput(
                    turno_setor_operacao_origem_id=str(self.turno_setor_operacao_origem.id),
                    defeito_id=str(self.defeito_operador.id),
                    quantidade_defeito=2,
                ),
            ],
            observacao="revisao parcial",
        )

        self.assertEqual(registro.quantidade_aprovada, 30)
        self.assertEqual(registro.quantidade_reprovada, 5)
        self.assertEqual(registro.turno_setor_operacao_id, self.turno_setor_operacao_qualidade.id)
        self.assertEqual(QualidadeDetalhe.objects.filter(registro=registro).count(), 2)
        self.assertEqual(
            sum(QualidadeDetalhe.objects.filter(registro=registro).values_list("quantidade_defeito", flat=True)),
            10,
        )
        self.assertEqual(RegistroProducao.objects.count(), 0)

        self.turno_setor_operacao_qualidade.refresh_from_db()
        self.turno_setor_operacao_qualidade.turno_setor_demanda.refresh_from_db()
        self.turno_op.refresh_from_db()

        self.assertEqual(self.turno_setor_operacao_qualidade.quantidade_realizada, 30)
        self.assertEqual(self.turno_setor_operacao_qualidade.status, TurnoSetorOperacao.Status.EM_ANDAMENTO)
        self.assertEqual(self.turno_setor_operacao_qualidade.turno_setor_demanda.quantidade_realizada, 30)
        self.assertEqual(self.turno_op.quantidade_realizada, 30)
        self.assertEqual(self.turno_op.status, TurnoOp.Status.EM_ANDAMENTO)

    def test_registra_apenas_aprovadas_sem_defeito(self) -> None:
        registro = registrar_revisao_qualidade_operacional(
            turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
            revisor_usuario_id=str(self.revisor.id),
            quantidade_aprovada=10,
            quantidade_reprovada=0,
            defeitos=(),
        )

        self.assertEqual(registro.quantidade_aprovada, 10)
        self.assertEqual(registro.detalhes.count(), 0)

    def test_bloqueia_revisao_sem_quantidade(self) -> None:
        with self.assertRaises(QualidadeRevisaoServiceError):
            registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
                revisor_usuario_id=str(self.revisor.id),
                quantidade_aprovada=0,
                quantidade_reprovada=0,
                defeitos=(),
            )

    def test_bloqueia_reprovadas_sem_defeito(self) -> None:
        with self.assertRaises(QualidadeRevisaoServiceError):
            registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
                revisor_usuario_id=str(self.revisor.id),
                quantidade_aprovada=0,
                quantidade_reprovada=1,
                defeitos=(),
            )

    def test_bloqueia_aprovada_acima_da_pendencia_disponivel(self) -> None:
        self.turno_setor_operacao_qualidade.quantidade_realizada = 95
        self.turno_setor_operacao_qualidade.save(update_fields=["quantidade_realizada"])

        with self.assertRaises(QualidadeRevisaoServiceError):
            registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
                revisor_usuario_id=str(self.revisor.id),
                quantidade_aprovada=6,
                quantidade_reprovada=0,
                defeitos=(),
            )

    def test_bloqueia_turno_fechado(self) -> None:
        self.turno.status = Turno.Status.ENCERRADO
        self.turno.save(update_fields=["status"])

        with self.assertRaises(QualidadeRevisaoServiceError):
            registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
                revisor_usuario_id=str(self.revisor.id),
                quantidade_aprovada=1,
                quantidade_reprovada=0,
                defeitos=(),
            )

    def test_bloqueia_contexto_que_nao_e_qualidade(self) -> None:
        with self.assertRaises(QualidadeRevisaoServiceError):
            registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_origem.id),
                revisor_usuario_id=str(self.revisor.id),
                quantidade_aprovada=1,
                quantidade_reprovada=0,
                defeitos=(),
            )

    def test_bloqueia_contexto_qualidade_encerrado(self) -> None:
        self.turno_setor_operacao_qualidade.status = TurnoSetorOperacao.Status.ENCERRADA_MANUALMENTE
        self.turno_setor_operacao_qualidade.save(update_fields=["status"])

        with self.assertRaises(QualidadeRevisaoServiceError):
            registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
                revisor_usuario_id=str(self.revisor.id),
                quantidade_aprovada=1,
                quantidade_reprovada=0,
                defeitos=(),
            )

    def test_bloqueia_revisor_sem_permissao(self) -> None:
        self.revisor.pode_revisar_qualidade = False
        self.revisor.save(update_fields=["pode_revisar_qualidade"])

        with self.assertRaises(QualidadeRevisaoServiceError):
            registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
                revisor_usuario_id=str(self.revisor.id),
                quantidade_aprovada=1,
                quantidade_reprovada=0,
                defeitos=(),
            )

    def test_bloqueia_defeito_em_operacao_de_qualidade(self) -> None:
        with self.assertRaises(QualidadeRevisaoServiceError):
            registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
                revisor_usuario_id=str(self.revisor.id),
                quantidade_aprovada=0,
                quantidade_reprovada=1,
                defeitos=[
                    DefeitoRevisaoInput(
                        turno_setor_operacao_origem_id=str(self.turno_setor_operacao_qualidade.id),
                        defeito_id=str(self.defeito_processo.id),
                        quantidade_defeito=1,
                    )
                ],
            )

    def test_conclui_operacao_qualidade_quando_aprovadas_alcancam_planejado(self) -> None:
        registrar_revisao_qualidade_operacional(
            turno_setor_operacao_id_qualidade=str(self.turno_setor_operacao_qualidade.id),
            revisor_usuario_id=str(self.revisor.id),
            quantidade_aprovada=100,
            quantidade_reprovada=0,
            defeitos=(),
        )

        self.turno_setor_operacao_qualidade.refresh_from_db()
        self.turno_op.refresh_from_db()

        self.assertEqual(self.turno_setor_operacao_qualidade.status, TurnoSetorOperacao.Status.CONCLUIDA)
        self.assertEqual(self.turno_op.status, TurnoOp.Status.CONCLUIDA)

    def _criar_contexto_operacional(
        self,
        *,
        setor: Setor,
        operacao: Operacao,
        qr_code_token: str,
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
            sequencia=1,
            tempo_padrao_min_snapshot=Decimal("1.0000"),
            quantidade_planejada=100,
        )
