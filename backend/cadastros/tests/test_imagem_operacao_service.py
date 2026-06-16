from decimal import Decimal
from unittest.mock import patch

from django.core.files.storage import default_storage
from django.test import TestCase, override_settings

from cadastros.models import Operacao, Setor
from cadastros.services import OperacaoImagemServiceError, remover_imagem_operacao, upload_imagem_operacao
from shared.imagens import extrair_caminho_storage_operacao
from shared.tests.support import criar_arquivo_imagem_teste


@override_settings(MEDIA_ROOT="/tmp/mdj14-operacao-media-test")
class OperacaoImagemServiceTests(TestCase):
    def setUp(self) -> None:
        self.setor = Setor.objects.create(codigo="COST", nome="Costura")
        self.operacao = Operacao.objects.create(
            codigo="OP-IMG",
            descricao="Operacao imagem",
            setor=self.setor,
            tempo_padrao_min=Decimal("1.5000"),
            qr_code_token="operacao-img-token",
        )

    def test_upload_imagem_operacao_atualiza_url(self) -> None:
        operacao = upload_imagem_operacao(
            operacao_id=str(self.operacao.id),
            arquivo=criar_arquivo_imagem_teste(),
        )

        self.assertTrue(operacao.imagem_url)
        self.assertIn("/media/operacoes/", operacao.imagem_url)

    def test_upload_mantem_nova_imagem_quando_remocao_da_antiga_falha(self) -> None:
        operacao_inicial = upload_imagem_operacao(
            operacao_id=str(self.operacao.id),
            arquivo=criar_arquivo_imagem_teste(nome="operacao-1.jpg"),
        )
        url_anterior = operacao_inicial.imagem_url
        caminho_anterior = extrair_caminho_storage_operacao(url_anterior, str(self.operacao.id))

        def remover_com_falha(caminho_relativo: str) -> None:
            if caminho_relativo == caminho_anterior:
                raise RuntimeError("falha simulada ao remover arquivo antigo")

        with self.assertLogs("cadastros.services.imagens_operacao", level="WARNING") as logs:
            with patch("cadastros.services.imagens_operacao.remover_arquivo_relativo", side_effect=remover_com_falha):
                operacao = upload_imagem_operacao(
                    operacao_id=str(self.operacao.id),
                    arquivo=criar_arquivo_imagem_teste(nome="operacao-2.jpg"),
                )

        self.assertIn("Nao foi possivel remover imagem anterior de operacao.", logs.output[0])
        caminho_novo = extrair_caminho_storage_operacao(operacao.imagem_url, str(self.operacao.id))
        self.assertNotEqual(operacao.imagem_url, url_anterior)
        self.assertIsNotNone(caminho_novo)
        self.assertTrue(default_storage.exists(caminho_novo))

    def test_remove_imagem_operacao(self) -> None:
        upload_imagem_operacao(
            operacao_id=str(self.operacao.id),
            arquivo=criar_arquivo_imagem_teste(),
        )
        operacao = remover_imagem_operacao(operacao_id=str(self.operacao.id))

        self.assertEqual(operacao.imagem_url, "")

    def test_rejeita_mime_type_invalido(self) -> None:
        with self.assertRaises(OperacaoImagemServiceError):
            upload_imagem_operacao(
                operacao_id=str(self.operacao.id),
                arquivo=criar_arquivo_imagem_teste(nome="foto.gif", content_type="image/gif"),
            )
