from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.tests.support import criar_usuario_supervisor
from qualidade.models import QualidadeDefeito
from qualidade.services import criar_defeito_qualidade


class QualidadeDefeitoApiTests(APITestCase):
    def setUp(self) -> None:
        self.usuario = criar_usuario_supervisor(email="supervisor-defeitos@test.com")
        self.client.force_authenticate(user=self.usuario)

    def test_cria_defeito_via_api(self) -> None:
        response = self.client.post(
            reverse("qualidade-defeitos-list"),
            {
                "nome": "Costura aberta",
                "classificacao": QualidadeDefeito.Classificacao.PROCESSO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["nome"], "Costura aberta")
        self.assertTrue(QualidadeDefeito.objects.filter(nome="Costura aberta", ativo=True).exists())

    def test_bloqueia_nome_duplicado_via_api(self) -> None:
        criar_defeito_qualidade(nome="Ponto falho", classificacao=QualidadeDefeito.Classificacao.PROCESSO)

        response = self.client.post(
            reverse("qualidade-defeitos-list"),
            {
                "nome": "ponto falho",
                "classificacao": QualidadeDefeito.Classificacao.OPERADOR,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_atualiza_defeito_via_patch(self) -> None:
        defeito = criar_defeito_qualidade(nome="Borda torta", classificacao=QualidadeDefeito.Classificacao.OPERADOR)

        response = self.client.patch(
            reverse("qualidade-defeitos-detail", kwargs={"pk": defeito.id}),
            {
                "nome": "Borda desalinhada",
                "classificacao": QualidadeDefeito.Classificacao.PROCESSO,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        defeito.refresh_from_db()
        self.assertEqual(defeito.nome, "Borda desalinhada")
        self.assertEqual(defeito.classificacao, QualidadeDefeito.Classificacao.PROCESSO)

    def test_inativa_e_reativa_defeito_via_api(self) -> None:
        defeito = criar_defeito_qualidade(nome="Linha solta", classificacao=QualidadeDefeito.Classificacao.PROCESSO)

        response_inativar = self.client.post(reverse("qualidade-defeitos-inativar", kwargs={"pk": defeito.id}))
        self.assertEqual(response_inativar.status_code, status.HTTP_200_OK)
        defeito.refresh_from_db()
        self.assertFalse(defeito.ativo)

        response_reativar = self.client.post(reverse("qualidade-defeitos-reativar", kwargs={"pk": defeito.id}))
        self.assertEqual(response_reativar.status_code, status.HTTP_200_OK)
        defeito.refresh_from_db()
        self.assertTrue(defeito.ativo)

    def test_mantem_registros_de_qualidade_sem_mutacao(self) -> None:
        response = self.client.post(reverse("qualidade-registros-list"), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_delete_defeito_nao_exposto_na_api(self) -> None:
        defeito = criar_defeito_qualidade(nome="Nao deletar", classificacao=QualidadeDefeito.Classificacao.PROCESSO)

        response = self.client.delete(reverse("qualidade-defeitos-detail", kwargs={"pk": defeito.id}))

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(QualidadeDefeito.objects.filter(id=defeito.id).exists())
