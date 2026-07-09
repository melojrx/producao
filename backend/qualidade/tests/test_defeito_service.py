from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from cadastros.models import Operacao, Setor
from produtos.models import Produto
from qualidade.models import QualidadeDefeito, QualidadeDetalhe, QualidadeRegistro
from qualidade.services import (
    QualidadeDefeitoServiceError,
    criar_defeito_qualidade,
    editar_defeito_qualidade,
    excluir_defeito_qualidade_sem_historico,
    inativar_defeito_qualidade,
    reativar_defeito_qualidade,
)
from turnos.models import Turno, TurnoOp


class QualidadeDefeitoServiceTests(TestCase):
    def test_cria_defeito_normalizando_nome(self) -> None:
        defeito = criar_defeito_qualidade(
            nome="  Ponto falho  ",
            classificacao=QualidadeDefeito.Classificacao.PROCESSO,
        )

        self.assertEqual(defeito.nome, "Ponto falho")
        self.assertEqual(defeito.classificacao, QualidadeDefeito.Classificacao.PROCESSO)
        self.assertTrue(defeito.ativo)

    def test_bloqueia_nome_vazio(self) -> None:
        with self.assertRaises(QualidadeDefeitoServiceError):
            criar_defeito_qualidade(nome="   ", classificacao=QualidadeDefeito.Classificacao.OPERADOR)

    def test_bloqueia_classificacao_invalida(self) -> None:
        with self.assertRaises(QualidadeDefeitoServiceError):
            criar_defeito_qualidade(nome="Linha torta", classificacao="produto")

    def test_bloqueia_nome_ativo_duplicado(self) -> None:
        criar_defeito_qualidade(nome="Costura aberta", classificacao=QualidadeDefeito.Classificacao.PROCESSO)

        with self.assertRaises(QualidadeDefeitoServiceError):
            criar_defeito_qualidade(nome="costura aberta", classificacao=QualidadeDefeito.Classificacao.MAQUINA)

    def test_edita_defeito(self) -> None:
        defeito = criar_defeito_qualidade(nome="Ponto solto", classificacao=QualidadeDefeito.Classificacao.OPERADOR)

        atualizado = editar_defeito_qualidade(
            defeito_id=str(defeito.id),
            nome="Ponto estourado",
            classificacao=QualidadeDefeito.Classificacao.PROCESSO,
        )

        self.assertEqual(atualizado.nome, "Ponto estourado")
        self.assertEqual(atualizado.classificacao, QualidadeDefeito.Classificacao.PROCESSO)

    def test_inativa_e_reativa_defeito(self) -> None:
        defeito = criar_defeito_qualidade(nome="Borda larga", classificacao=QualidadeDefeito.Classificacao.PROCESSO)

        inativo = inativar_defeito_qualidade(defeito_id=str(defeito.id))
        self.assertFalse(inativo.ativo)

        reativado = reativar_defeito_qualidade(defeito_id=str(defeito.id))
        self.assertTrue(reativado.ativo)

    def test_exclui_defeito_sem_historico(self) -> None:
        defeito = criar_defeito_qualidade(nome="Sem historico", classificacao=QualidadeDefeito.Classificacao.PROCESSO)

        excluir_defeito_qualidade_sem_historico(defeito_id=str(defeito.id))

        self.assertFalse(QualidadeDefeito.objects.filter(id=defeito.id).exists())

    def test_bloqueia_exclusao_destrutiva_com_historico(self) -> None:
        defeito = criar_defeito_qualidade(
            nome="Defeito com historico",
            classificacao=QualidadeDefeito.Classificacao.PROCESSO,
        )
        self._criar_historico_qualidade(defeito)

        with self.assertRaises(QualidadeDefeitoServiceError):
            excluir_defeito_qualidade_sem_historico(defeito_id=str(defeito.id))

        self.assertTrue(QualidadeDefeito.objects.filter(id=defeito.id).exists())

    def _criar_historico_qualidade(self, defeito: QualidadeDefeito) -> None:
        usuario = User.objects.create_user(email="revisor@test.com", password="senha-teste")
        setor = Setor.objects.create(codigo="QUAL", nome="Qualidade")
        operacao = Operacao.objects.create(
            codigo="OP-QUAL",
            descricao="Revisao final",
            setor=setor,
            tempo_padrao_min=Decimal("1.0000"),
            qr_code_token="operacao-qualidade-token",
        )
        produto = Produto.objects.create(codigo="PROD-QUAL", nome="Produto qualidade")
        turno = Turno.objects.create(
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=1,
            minutos_turno=480,
        )
        turno_op = TurnoOp.objects.create(
            turno=turno,
            numero_op="OP-0001",
            produto=produto,
            quantidade_planejada=10,
        )
        registro = QualidadeRegistro.objects.create(
            revisor=usuario,
            turno=turno,
            turno_op=turno_op,
            quantidade_aprovada=1,
            quantidade_reprovada=1,
        )
        QualidadeDetalhe.objects.create(
            registro=registro,
            operacao=operacao,
            setor=setor,
            defeito=defeito,
            quantidade_defeito=1,
        )
