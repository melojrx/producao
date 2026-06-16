from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from infra.services.arquivos import construir_url_publica_arquivo


class ConstruirUrlPublicaArquivoTests(SimpleTestCase):
    @override_settings(MEDIA_BASE_URL="https://api.example.com")
    def test_preserva_url_absoluta_retornada_pelo_storage(self) -> None:
        with patch(
            "infra.services.arquivos.default_storage.url",
            return_value="https://cdn.example.com/produtos/imagem.jpg",
        ):
            url = construir_url_publica_arquivo("produtos/imagem.jpg")

        self.assertEqual(url, "https://cdn.example.com/produtos/imagem.jpg")
