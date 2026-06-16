from django.db import transaction

from qualidade.models import QualidadeDefeito


class QualidadeDefeitoServiceError(ValueError):
    """Erro de regra de negocio no catalogo de defeitos."""


def criar_defeito_qualidade(*, nome: str, classificacao: str, ativo: bool = True) -> QualidadeDefeito:
    nome_normalizado = _normalizar_nome(nome)
    _validar_classificacao(classificacao)

    with transaction.atomic():
        if ativo:
            _validar_nome_ativo_unico(nome_normalizado)

        return QualidadeDefeito.objects.create(
            nome=nome_normalizado,
            classificacao=classificacao,
            ativo=ativo,
        )


def editar_defeito_qualidade(
    *,
    defeito_id: str,
    nome: str | None = None,
    classificacao: str | None = None,
    ativo: bool | None = None,
) -> QualidadeDefeito:
    with transaction.atomic():
        defeito = QualidadeDefeito.objects.select_for_update().get(id=defeito_id)

        nome_final = defeito.nome if nome is None else _normalizar_nome(nome)
        classificacao_final = defeito.classificacao if classificacao is None else classificacao
        ativo_final = defeito.ativo if ativo is None else ativo

        _validar_classificacao(classificacao_final)
        if ativo_final:
            _validar_nome_ativo_unico(nome_final, excluir_defeito_id=str(defeito.id))

        defeito.nome = nome_final
        defeito.classificacao = classificacao_final
        defeito.ativo = ativo_final
        defeito.save(update_fields=["nome", "classificacao", "ativo", "updated_at"])
        return defeito


def inativar_defeito_qualidade(*, defeito_id: str) -> QualidadeDefeito:
    return editar_defeito_qualidade(defeito_id=defeito_id, ativo=False)


def reativar_defeito_qualidade(*, defeito_id: str) -> QualidadeDefeito:
    return editar_defeito_qualidade(defeito_id=defeito_id, ativo=True)


def excluir_defeito_qualidade_sem_historico(*, defeito_id: str) -> None:
    with transaction.atomic():
        defeito = QualidadeDefeito.objects.select_for_update().get(id=defeito_id)
        if defeito.detalhes.exists():
            raise QualidadeDefeitoServiceError(
                "Tipo de defeito possui historico de qualidade e nao pode ser excluido. Inative o registro."
            )

        defeito.delete()


def _normalizar_nome(nome: str) -> str:
    nome_normalizado = nome.strip()
    if not nome_normalizado:
        raise QualidadeDefeitoServiceError("Nome do tipo de defeito e obrigatorio.")
    return nome_normalizado


def _validar_classificacao(classificacao: str) -> None:
    classificacoes_validas = {choice.value for choice in QualidadeDefeito.Classificacao}
    if classificacao not in classificacoes_validas:
        raise QualidadeDefeitoServiceError("Classificacao do tipo de defeito e invalida.")


def _validar_nome_ativo_unico(nome: str, *, excluir_defeito_id: str | None = None) -> None:
    queryset = QualidadeDefeito.objects.filter(ativo=True, nome__iexact=nome)
    if excluir_defeito_id is not None:
        queryset = queryset.exclude(id=excluir_defeito_id)

    if queryset.exists():
        raise QualidadeDefeitoServiceError("Ja existe um tipo de defeito ativo com este nome.")
