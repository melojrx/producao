from __future__ import annotations

import logging
import uuid
from time import time

from django.core.files.uploadedfile import UploadedFile
from django.db import transaction

from infra.services.arquivos import (
    construir_url_publica_arquivo,
    remover_arquivo_relativo,
    salvar_arquivo_relativo,
)
from produtos.models import Produto
from shared.imagens import (
    ImagemValidationError,
    construir_caminho_imagem_produto,
    extrair_caminho_storage_produto,
    validar_arquivo_imagem,
)
from shared.storage_constants import PRODUTO_IMAGEM_TIPOS


logger = logging.getLogger(__name__)


class ProdutoImagemServiceError(ValueError):
    """Erro de regra de negocio no upload/remocao de imagens de produto."""


def upload_imagem_produto(
    *,
    produto_id: str,
    tipo: str,
    arquivo: UploadedFile,
    request=None,
) -> Produto:
    if tipo not in PRODUTO_IMAGEM_TIPOS:
        raise ProdutoImagemServiceError("Tipo de imagem invalido. Use frente ou costa.")

    rotulo = "Frente" if tipo == "frente" else "Costa"

    try:
        validar_arquivo_imagem(arquivo, rotulo=rotulo)
    except ImagemValidationError as error:
        raise ProdutoImagemServiceError(str(error)) from error

    caminho_novo = construir_caminho_imagem_produto(
        produto_id,
        tipo,
        arquivo.content_type or "",
        timestamp_ms=int(time() * 1000),
        token=str(uuid.uuid4()),
    )

    conteudo = arquivo.read()
    caminho_salvo: str | None = None

    try:
        caminho_salvo = salvar_arquivo_relativo(caminho_relativo=caminho_novo, conteudo=conteudo)
        url_publica = construir_url_publica_arquivo(caminho_salvo, request=request)

        with transaction.atomic():
            produto = Produto.objects.select_for_update().get(id=produto_id)
            campo_url = "imagem_frente_url" if tipo == "frente" else "imagem_costa_url"
            url_anterior = getattr(produto, campo_url) or None
            setattr(produto, campo_url, url_publica)
            produto.save(update_fields=[campo_url, "updated_at"])

        produto.refresh_from_db()
    except Produto.DoesNotExist as error:
        if caminho_salvo:
            remover_arquivo_relativo(caminho_salvo)
        raise ProdutoImagemServiceError("Produto nao encontrado.") from error
    except Exception:
        if caminho_salvo:
            remover_arquivo_relativo(caminho_salvo)
        raise

    caminho_anterior = extrair_caminho_storage_produto(url_anterior, produto_id)
    if caminho_anterior and caminho_anterior != caminho_salvo:
        try:
            remover_arquivo_relativo(caminho_anterior)
        except Exception:
            logger.warning(
                "Nao foi possivel remover imagem anterior de produto.",
                extra={"produto_id": produto_id, "caminho": caminho_anterior},
                exc_info=True,
            )

    return produto


def remover_imagem_produto(*, produto_id: str, tipo: str) -> Produto:
    if tipo not in PRODUTO_IMAGEM_TIPOS:
        raise ProdutoImagemServiceError("Tipo de imagem invalido. Use frente ou costa.")

    with transaction.atomic():
        produto = Produto.objects.select_for_update().get(id=produto_id)
        campo_url = "imagem_frente_url" if tipo == "frente" else "imagem_costa_url"
        url_anterior = getattr(produto, campo_url) or None
        setattr(produto, campo_url, "")
        produto.save(update_fields=[campo_url, "updated_at"])

    caminho_anterior = extrair_caminho_storage_produto(url_anterior, produto_id)
    if caminho_anterior:
        remover_arquivo_relativo(caminho_anterior)

    produto.refresh_from_db()
    return produto
