from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage


class ArquivoStorageError(ValueError):
    """Erro ao persistir ou remover arquivo de storage."""


def salvar_arquivo_relativo(*, caminho_relativo: str, conteudo: bytes) -> str:
    if default_storage.exists(caminho_relativo):
        raise ArquivoStorageError(f"Arquivo ja existe: {caminho_relativo}")

    arquivo = ContentFile(conteudo)
    caminho_salvo = default_storage.save(caminho_relativo, arquivo)
    return caminho_salvo


def remover_arquivo_relativo(caminho_relativo: str) -> None:
    if not caminho_relativo:
        return

    if default_storage.exists(caminho_relativo):
        default_storage.delete(caminho_relativo)


def construir_url_publica_arquivo(caminho_relativo: str, request=None) -> str:
    url_storage = default_storage.url(caminho_relativo)
    parsed_url = urlparse(url_storage)
    if parsed_url.scheme and parsed_url.netloc:
        return url_storage

    if request is not None:
        return request.build_absolute_uri(url_storage)

    base_url = getattr(settings, "MEDIA_BASE_URL", "").rstrip("/")
    if base_url:
        return f"{base_url}{url_storage}"

    return url_storage


def caminho_absoluto_arquivo(caminho_relativo: str) -> Path:
    return Path(settings.MEDIA_ROOT) / caminho_relativo
