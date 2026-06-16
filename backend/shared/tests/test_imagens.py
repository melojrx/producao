from django.test import SimpleTestCase

from shared.imagens import (
    construir_caminho_imagem_operacao,
    construir_caminho_imagem_produto,
    extrair_caminho_storage_operacao,
    extrair_caminho_storage_produto,
    validar_arquivo_imagem,
)
from shared.storage_constants import IMAGEM_MAX_BYTES


class SharedImagensTests(SimpleTestCase):
    def test_construir_caminho_produto_inclui_tipo(self) -> None:
        caminho = construir_caminho_imagem_produto(
            "abc-123",
            "frente",
            "image/jpeg",
            timestamp_ms=1700000000000,
            token="uuid-test",
        )
        self.assertEqual(caminho, "produtos/abc-123/frente/1700000000000-uuid-test.jpg")

    def test_construir_caminho_operacao(self) -> None:
        caminho = construir_caminho_imagem_operacao(
            "op-123",
            "image/png",
            timestamp_ms=1700000000000,
            token="uuid-test",
        )
        self.assertEqual(caminho, "operacoes/op-123/1700000000000-uuid-test.png")

    def test_extrair_caminho_storage_produto_supabase(self) -> None:
        url = (
            "https://projeto.supabase.co/storage/v1/object/public/produtos/"
            "abc-123/frente/1700000000000-uuid-test.jpg"
        )
        caminho = extrair_caminho_storage_produto(url, "abc-123")
        self.assertEqual(caminho, "produtos/abc-123/frente/1700000000000-uuid-test.jpg")

    def test_extrair_caminho_storage_produto_django(self) -> None:
        url = "http://localhost:8001/media/produtos/abc-123/frente/1700000000000-uuid-test.jpg"
        caminho = extrair_caminho_storage_produto(url, "abc-123")
        self.assertEqual(caminho, "produtos/abc-123/frente/1700000000000-uuid-test.jpg")

    def test_extrair_caminho_storage_operacao(self) -> None:
        url = "http://localhost:8001/media/operacoes/op-123/1700000000000-uuid-test.webp"
        caminho = extrair_caminho_storage_operacao(url, "op-123")
        self.assertEqual(caminho, "operacoes/op-123/1700000000000-uuid-test.webp")

    def test_rejeita_mime_type_invalido(self) -> None:
        class ArquivoFake:
            content_type = "image/gif"
            size = 1024

        with self.assertRaisesMessage(Exception, "JPG, PNG ou WEBP"):
            validar_arquivo_imagem(ArquivoFake(), rotulo="teste")

    def test_rejeita_arquivo_muito_grande(self) -> None:
        class ArquivoFake:
            content_type = "image/jpeg"
            size = IMAGEM_MAX_BYTES + 1

        with self.assertRaisesMessage(Exception, "no maximo"):
            validar_arquivo_imagem(ArquivoFake(), rotulo="teste")
