from __future__ import annotations

from calendar import monthrange
from datetime import date

from django.db import IntegrityError, transaction

from metas.models import MetaMensal
from metas.selectors.meta_mensal import normalizar_competencia


class MetaMensalServiceError(ValueError):
    """Erro de regra de negócio ao salvar meta mensal."""


def _validar_parametros(competencia: date | str, meta_pecas: int, dias_produtivos: int) -> date:
    competencia_normalizada = normalizar_competencia(competencia)

    if meta_pecas <= 0:
        raise MetaMensalServiceError("A meta mensal deve ser um número inteiro maior que zero.")

    if dias_produtivos <= 0:
        raise MetaMensalServiceError("Os dias produtivos devem ser um número inteiro maior que zero.")

    dias_da_competencia = monthrange(competencia_normalizada.year, competencia_normalizada.month)[1]
    if dias_produtivos > dias_da_competencia:
        raise MetaMensalServiceError(
            f"Os dias produtivos não podem ultrapassar {dias_da_competencia} dias nesta competência."
        )

    return competencia_normalizada


def criar_meta_mensal(
    *,
    competencia: date | str,
    meta_pecas: int,
    dias_produtivos: int,
    observacao: str = "",
) -> MetaMensal:
    competencia_normalizada = _validar_parametros(competencia, meta_pecas, dias_produtivos)
    observacao_normalizada = observacao.strip()

    try:
        with transaction.atomic():
            return MetaMensal.objects.create(
                competencia=competencia_normalizada,
                meta_pecas=meta_pecas,
                dias_produtivos=dias_produtivos,
                observacao=observacao_normalizada,
            )
    except IntegrityError as exc:
        raise MetaMensalServiceError(
            "Já existe uma meta mensal cadastrada para esta competência."
        ) from exc


def editar_meta_mensal(
    *,
    meta_id: str,
    competencia: date | str,
    meta_pecas: int,
    dias_produtivos: int,
    observacao: str = "",
) -> MetaMensal:
    competencia_normalizada = _validar_parametros(competencia, meta_pecas, dias_produtivos)
    observacao_normalizada = observacao.strip()

    try:
        with transaction.atomic():
            meta = MetaMensal.objects.select_for_update().filter(id=meta_id).first()
            if meta is None:
                raise MetaMensalServiceError("Meta mensal da competência selecionada não foi encontrada.")

            meta.competencia = competencia_normalizada
            meta.meta_pecas = meta_pecas
            meta.dias_produtivos = dias_produtivos
            meta.observacao = observacao_normalizada
            meta.save(
                update_fields=[
                    "competencia",
                    "meta_pecas",
                    "dias_produtivos",
                    "observacao",
                    "updated_at",
                ]
            )
            return meta
    except IntegrityError as exc:
        raise MetaMensalServiceError(
            "Já existe uma meta mensal cadastrada para esta competência."
        ) from exc
