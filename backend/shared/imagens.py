from __future__ import annotations

from urllib.parse import unquote, urlparse

from django.core.files.uploadedfile import UploadedFile

from shared.storage_constants import (
    EXTENSAO_POR_MIME_TYPE,
    IMAGEM_MAX_BYTES,
    IMAGEM_MIME_TYPES,
    OPERACAO_IMAGENS_DIR,
    PRODUTO_IMAGENS_DIR,
)


class ImagemValidationError(ValueError):
    """Erro de validacao de arquivo de imagem."""


def formatar_tamanho_maximo_imagem() -> str:
    return f"{IMAGEM_MAX_BYTES // (1024 * 1024)} MB"


def validar_arquivo_imagem(arquivo: UploadedFile, *, rotulo: str) -> None:
    content_type = arquivo.content_type or ""

    if content_type not in IMAGEM_MIME_TYPES:
        raise ImagemValidationError(
            f"A imagem de {rotulo} deve estar em JPG, PNG ou WEBP."
        )

    if arquivo.size > IMAGEM_MAX_BYTES:
        raise ImagemValidationError(
            f"A imagem de {rotulo} deve ter no maximo {formatar_tamanho_maximo_imagem()}."
        )


def obter_extensao_imagem(content_type: str) -> str:
    extensao = EXTENSAO_POR_MIME_TYPE.get(content_type)
    if extensao:
        return extensao
    raise ImagemValidationError("Nao foi possivel determinar a extensao da imagem enviada.")


def construir_caminho_imagem_produto(
    produto_id: str,
    tipo: str,
    content_type: str,
    *,
    timestamp_ms: int,
    token: str,
) -> str:
    extensao = obter_extensao_imagem(content_type)
    return f"{PRODUTO_IMAGENS_DIR}/{produto_id}/{tipo}/{timestamp_ms}-{token}.{extensao}"


def construir_caminho_imagem_operacao(
    operacao_id: str,
    content_type: str,
    *,
    timestamp_ms: int,
    token: str,
) -> str:
    extensao = obter_extensao_imagem(content_type)
    return f"{OPERACAO_IMAGENS_DIR}/{operacao_id}/{timestamp_ms}-{token}.{extensao}"


def extrair_caminho_storage(url: str | None, *, prefixo_esperado: str) -> str | None:
    if not url:
        return None

    try:
        parsed_url = urlparse(url)
        caminho = unquote(parsed_url.path.lstrip("/"))

        marcadores = (
            f"storage/v1/object/public/{prefixo_esperado}/",
            f"media/{prefixo_esperado}/",
            f"{prefixo_esperado}/",
        )

        for marcador in marcadores:
            indice = caminho.find(marcador)
            if indice < 0:
                continue

            caminho_relativo = caminho[indice + len(marcador) :]
            if caminho_relativo.startswith(f"{prefixo_esperado}/"):
                return caminho_relativo

            return f"{prefixo_esperado}/{caminho_relativo}"
    except ValueError:
        return None

    return None


def extrair_caminho_storage_produto(url: str | None, produto_id: str) -> str | None:
    caminho = extrair_caminho_storage(url, prefixo_esperado=PRODUTO_IMAGENS_DIR)
    if not caminho:
        return None

    if not caminho.startswith(f"{PRODUTO_IMAGENS_DIR}/{produto_id}/"):
        return None

    return caminho


def extrair_caminho_storage_operacao(url: str | None, operacao_id: str) -> str | None:
    caminho = extrair_caminho_storage(url, prefixo_esperado=OPERACAO_IMAGENS_DIR)
    if not caminho:
        return None

    if not caminho.startswith(f"{OPERACAO_IMAGENS_DIR}/{operacao_id}/"):
        return None

    return caminho
