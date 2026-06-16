from io import BytesIO
from unittest.mock import patch

from django.core.files.storage import default_storage
from django.test import TestCase, override_settings

from produtos.models import Produto
from produtos.services import ProdutoImagemServiceError, remover_imagem_produto, upload_imagem_produto
from shared.imagens import extrair_caminho_storage_produto
from shared.storage_constants import IMAGEM_MAX_BYTES
from shared.tests.support import criar_arquivo_imagem_teste


@override_settings(MEDIA_ROOT="/tmp/mdj14-produto-media-test")
class ProdutoImagemServiceTests(TestCase):
    def setUp(self) -> None:
        self.produto = Produto.objects.create(codigo="PROD-IMG", nome="Produto Imagem")

    def test_upload_imagem_frente_atualiza_url(self) -> None:
        produto = upload_imagem_produto(
            produto_id=str(self.produto.id),
            tipo="frente",
            arquivo=criar_arquivo_imagem_teste(),
        )

        self.assertTrue(produto.imagem_frente_url)
        self.assertIn("/media/produtos/", produto.imagem_frente_url)

    def test_upload_substitui_imagem_anterior(self) -> None:
        upload_imagem_produto(
            produto_id=str(self.produto.id),
            tipo="frente",
            arquivo=criar_arquivo_imagem_teste(nome="frente-1.jpg"),
        )
        produto = upload_imagem_produto(
            produto_id=str(self.produto.id),
            tipo="frente",
            arquivo=criar_arquivo_imagem_teste(nome="frente-2.jpg"),
        )

        self.assertTrue(produto.imagem_frente_url)

    def test_upload_mantem_nova_imagem_quando_remocao_da_antiga_falha(self) -> None:
        produto_inicial = upload_imagem_produto(
            produto_id=str(self.produto.id),
            tipo="frente",
            arquivo=criar_arquivo_imagem_teste(nome="frente-1.jpg"),
        )
        url_anterior = produto_inicial.imagem_frente_url
        caminho_anterior = extrair_caminho_storage_produto(url_anterior, str(self.produto.id))

        def remover_com_falha(caminho_relativo: str) -> None:
            if caminho_relativo == caminho_anterior:
                raise RuntimeError("falha simulada ao remover arquivo antigo")

        with self.assertLogs("produtos.services.imagens", level="WARNING") as logs:
            with patch("produtos.services.imagens.remover_arquivo_relativo", side_effect=remover_com_falha):
                produto = upload_imagem_produto(
                    produto_id=str(self.produto.id),
                    tipo="frente",
                    arquivo=criar_arquivo_imagem_teste(nome="frente-2.jpg"),
                )

        self.assertIn("Nao foi possivel remover imagem anterior de produto.", logs.output[0])
        caminho_novo = extrair_caminho_storage_produto(produto.imagem_frente_url, str(self.produto.id))
        self.assertNotEqual(produto.imagem_frente_url, url_anterior)
        self.assertIsNotNone(caminho_novo)
        self.assertTrue(default_storage.exists(caminho_novo))

    def test_remove_imagem_frente(self) -> None:
        upload_imagem_produto(
            produto_id=str(self.produto.id),
            tipo="frente",
            arquivo=criar_arquivo_imagem_teste(),
        )
        produto = remover_imagem_produto(produto_id=str(self.produto.id), tipo="frente")

        self.assertEqual(produto.imagem_frente_url, "")

    def test_rejeita_tipo_invalido(self) -> None:
        with self.assertRaises(ProdutoImagemServiceError):
            upload_imagem_produto(
                produto_id=str(self.produto.id),
                tipo="lateral",
                arquivo=criar_arquivo_imagem_teste(),
            )

    def test_rejeita_mime_type_invalido(self) -> None:
        with self.assertRaises(ProdutoImagemServiceError):
            upload_imagem_produto(
                produto_id=str(self.produto.id),
                tipo="costa",
                arquivo=criar_arquivo_imagem_teste(nome="foto.gif", content_type="image/gif"),
            )

    def test_rejeita_arquivo_muito_grande(self) -> None:
        arquivo_grande = criar_arquivo_imagem_teste(
            nome="grande.jpg",
            conteudo=BytesIO(b"x" * (IMAGEM_MAX_BYTES + 1)).read(),
        )

        with self.assertRaises(ProdutoImagemServiceError):
            upload_imagem_produto(
                produto_id=str(self.produto.id),
                tipo="frente",
                arquivo=arquivo_grande,
            )
