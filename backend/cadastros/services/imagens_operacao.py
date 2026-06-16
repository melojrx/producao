from __future__ import annotations

import logging
import uuid
from time import time

from django.core.files.uploadedfile import UploadedFile
from django.db import transaction

from cadastros.models import Operacao
from infra.services.arquivos import (
    construir_url_publica_arquivo,
    remover_arquivo_relativo,
    salvar_arquivo_relativo,
)
from shared.imagens import (
    ImagemValidationError,
    construir_caminho_imagem_operacao,
    extrair_caminho_storage_operacao,
    validar_arquivo_imagem,
)


logger = logging.getLogger(__name__)


class OperacaoImagemServiceError(ValueError):
    """Erro de regra de negocio no upload/remocao de imagem de operacao."""


def upload_imagem_operacao(
    *,
    operacao_id: str,
    arquivo: UploadedFile,
    request=None,
) -> Operacao:
    try:
        validar_arquivo_imagem(arquivo, rotulo="operacao")
    except ImagemValidationError as error:
        raise OperacaoImagemServiceError(str(error)) from error

    caminho_novo = construir_caminho_imagem_operacao(
        operacao_id,
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
            operacao = Operacao.objects.select_for_update().get(id=operacao_id)
            url_anterior = operacao.imagem_url or None
            operacao.imagem_url = url_publica
            operacao.save(update_fields=["imagem_url", "updated_at"])

        operacao.refresh_from_db()
    except Operacao.DoesNotExist as error:
        if caminho_salvo:
            remover_arquivo_relativo(caminho_salvo)
        raise OperacaoImagemServiceError("Operacao nao encontrada.") from error
    except Exception:
        if caminho_salvo:
            remover_arquivo_relativo(caminho_salvo)
        raise

    caminho_anterior = extrair_caminho_storage_operacao(url_anterior, operacao_id)
    if caminho_anterior and caminho_anterior != caminho_salvo:
        try:
            remover_arquivo_relativo(caminho_anterior)
        except Exception:
            logger.warning(
                "Nao foi possivel remover imagem anterior de operacao.",
                extra={"operacao_id": operacao_id, "caminho": caminho_anterior},
                exc_info=True,
            )

    return operacao


def remover_imagem_operacao(*, operacao_id: str) -> Operacao:
    with transaction.atomic():
        operacao = Operacao.objects.select_for_update().get(id=operacao_id)
        url_anterior = operacao.imagem_url or None
        operacao.imagem_url = ""
        operacao.save(update_fields=["imagem_url", "updated_at"])

    caminho_anterior = extrair_caminho_storage_operacao(url_anterior, operacao_id)
    if caminho_anterior:
        remover_arquivo_relativo(caminho_anterior)

    operacao.refresh_from_db()
    return operacao
