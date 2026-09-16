import importlib
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from django.urls import clear_url_caches

os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-for-media-delivery")
os.environ.setdefault("POSTGRES_DB", "test_db")
os.environ.setdefault("POSTGRES_USER", "test_user")
os.environ.setdefault("POSTGRES_PASSWORD", "test_password")

from pcp_project.config import production  # noqa: E402


class ProductionMediaSettingsTests(SimpleTestCase):
    def test_habilita_entrega_de_media_quando_flag_esta_ativa(self) -> None:
        with patch.dict(os.environ, {"SERVE_MEDIA_FILES": "true"}, clear=False):
            settings = importlib.reload(production)

        self.assertTrue(getattr(settings, "SERVE_MEDIA_FILES", False))


class ProductionMediaDeliveryTests(SimpleTestCase):
    def _reload_urls(self) -> None:
        from pcp_project import urls

        importlib.reload(urls)
        clear_url_caches()

    def test_entrega_arquivo_quando_flag_esta_ativa(self) -> None:
        with TemporaryDirectory() as media_root:
            arquivo = Path(media_root, "produtos", "imagem.png")
            arquivo.parent.mkdir(parents=True)
            arquivo.write_bytes(b"png")

            with override_settings(
                DEBUG=False,
                MEDIA_ROOT=media_root,
                MEDIA_URL="/media/",
                ROOT_URLCONF="pcp_project.urls",
                SERVE_MEDIA_FILES=True,
            ):
                self._reload_urls()
                response = self.client.get(
                    "/media/produtos/imagem.png",
                    HTTP_X_FORWARDED_PROTO="https",
                )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(b"".join(response.streaming_content), b"png")

        self._reload_urls()

    def test_retorna_404_quando_flag_esta_desativada(self) -> None:
        with TemporaryDirectory() as media_root:
            arquivo = Path(media_root, "produtos", "imagem.png")
            arquivo.parent.mkdir(parents=True)
            arquivo.write_bytes(b"png")

            with override_settings(
                DEBUG=False,
                MEDIA_ROOT=media_root,
                MEDIA_URL="/media/",
                ROOT_URLCONF="pcp_project.urls",
                SERVE_MEDIA_FILES=False,
            ):
                self._reload_urls()
                response = self.client.get("/media/produtos/imagem.png")

            self.assertEqual(response.status_code, 404)

        self._reload_urls()

    def test_retorna_404_para_arquivo_ausente(self) -> None:
        with TemporaryDirectory() as media_root:
            with override_settings(
                DEBUG=False,
                MEDIA_ROOT=media_root,
                MEDIA_URL="/media/",
                ROOT_URLCONF="pcp_project.urls",
                SERVE_MEDIA_FILES=True,
            ):
                self._reload_urls()
                response = self.client.get("/media/produtos/ausente.png")

            self.assertEqual(response.status_code, 404)

        self._reload_urls()

    def test_retorna_404_para_tentativa_de_travessia_de_diretorio(self) -> None:
        with TemporaryDirectory() as media_root:
            Path(media_root, "segredo.txt").write_text("segredo")

            with override_settings(
                DEBUG=False,
                MEDIA_ROOT=media_root,
                MEDIA_URL="/media/",
                ROOT_URLCONF="pcp_project.urls",
                SERVE_MEDIA_FILES=True,
            ):
                self._reload_urls()
                response = self.client.get("/media/../segredo.txt")

            self.assertEqual(response.status_code, 404)

        self._reload_urls()
