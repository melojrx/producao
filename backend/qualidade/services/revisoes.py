from dataclasses import dataclass
from typing import Mapping, Sequence

from django.db import transaction
from django.db.models import Min

from accounts.models import User
from cadastros.models import Setor
from qualidade.models import QualidadeDefeito, QualidadeDetalhe, QualidadeRegistro
from turnos.models import Turno, TurnoOp, TurnoSetorDemanda, TurnoSetorOperacao


class QualidadeRevisaoServiceError(ValueError):
    """Erro de regra de negocio em revisoes operacionais de Qualidade."""


@dataclass(frozen=True)
class DefeitoRevisaoInput:
    defeito_id: str
    quantidade_defeito: int
    turno_setor_operacao_origem_id: str | None = None
    operacao_id: str | None = None
    observacao: str = ""


def registrar_revisao_qualidade_operacional(
    *,
    turno_setor_operacao_id_qualidade: str,
    revisor_usuario_id: str,
    quantidade_aprovada: int,
    quantidade_reprovada: int,
    defeitos: Sequence[DefeitoRevisaoInput | Mapping[str, object]] = (),
    observacao: str = "",
    origem_lancamento: str = "manual_qualidade",
) -> QualidadeRegistro:
    _validar_quantidades_revisao(quantidade_aprovada, quantidade_reprovada)
    defeitos_normalizados = [_normalizar_defeito_input(defeito) for defeito in defeitos]
    _validar_defeitos_obrigatorios(quantidade_reprovada, defeitos_normalizados)

    with transaction.atomic():
        turno_setor_operacao = (
            TurnoSetorOperacao.objects.select_for_update()
            .select_related(
                "turno",
                "turno_op",
                "turno_op__produto",
                "turno_setor",
                "turno_setor_demanda",
                "operacao",
                "setor",
            )
            .get(id=turno_setor_operacao_id_qualidade)
        )
        turno = Turno.objects.select_for_update().get(id=turno_setor_operacao.turno_id)
        turno_op = TurnoOp.objects.select_for_update().get(id=turno_setor_operacao.turno_op_id)
        turno_setor_demanda = TurnoSetorDemanda.objects.select_for_update().get(
            id=turno_setor_operacao.turno_setor_demanda_id
        )
        revisor = User.objects.select_for_update().get(id=revisor_usuario_id)

        _validar_revisor(revisor)
        _validar_turno_aberto(turno)
        _validar_contexto_qualidade(turno_setor_operacao)
        _validar_contexto_operacional_aberto(turno_setor_operacao)
        pendencia_qualidade = _get_pendencia_aprovacao(turno_setor_operacao)
        _validar_pendencia_aprovacao(pendencia_qualidade, quantidade_aprovada)

        registro = QualidadeRegistro.objects.create(
            revisor=revisor,
            turno=turno,
            turno_op=turno_op,
            turno_setor_operacao=turno_setor_operacao,
            quantidade_aprovada=quantidade_aprovada,
            quantidade_reprovada=quantidade_reprovada,
            observacao=observacao.strip(),
        )

        detalhes = [_criar_detalhe(registro, turno_op, defeito_input) for defeito_input in defeitos_normalizados]
        QualidadeDetalhe.objects.bulk_create(detalhes)
        registro.pendencia_qualidade_antes_revisao = pendencia_qualidade
        registro.detalhes_criados = detalhes

        if quantidade_aprovada > 0:
            turno_setor_operacao.quantidade_realizada += quantidade_aprovada
            turno_setor_operacao.status = _get_status_operacao(turno_setor_operacao)
            turno_setor_operacao.save(update_fields=["quantidade_realizada", "status", "updated_at"])
            _sincronizar_demanda(turno_setor_demanda)
            _sincronizar_turno_op(turno_op)

        return registro


def registrar_revisao_qualidade(
    *,
    turno_setor_operacao_id: str,
    revisor_id: str,
    quantidade_aprovada: int,
    quantidade_reprovada: int,
    defeitos: Sequence[DefeitoRevisaoInput | Mapping[str, object]] = (),
    observacao: str = "",
) -> QualidadeRegistro:
    return registrar_revisao_qualidade_operacional(
        turno_setor_operacao_id_qualidade=str(turno_setor_operacao_id),
        revisor_usuario_id=str(revisor_id),
        quantidade_aprovada=quantidade_aprovada,
        quantidade_reprovada=quantidade_reprovada,
        defeitos=defeitos,
        observacao=observacao,
    )


def _normalizar_defeito_input(defeito: DefeitoRevisaoInput | Mapping[str, object]) -> DefeitoRevisaoInput:
    if isinstance(defeito, DefeitoRevisaoInput):
        return defeito

    defeito_id = defeito.get("defeito_id") or defeito.get("qualidade_defeito_id")
    quantidade_defeito = defeito.get("quantidade_defeito")
    turno_setor_operacao_origem_id = (
        defeito.get("turno_setor_operacao_origem_id") or defeito.get("turno_setor_operacao_id_origem")
    )
    operacao_id = defeito.get("operacao_id")
    observacao = defeito.get("observacao", "")

    if defeito_id is None:
        raise QualidadeRevisaoServiceError("Tipo de defeito deve ser informado.")
    if not isinstance(quantidade_defeito, int):
        raise QualidadeRevisaoServiceError("Quantidade de defeito deve ser informada.")

    return DefeitoRevisaoInput(
        defeito_id=str(defeito_id),
        quantidade_defeito=quantidade_defeito,
        turno_setor_operacao_origem_id=(
            str(turno_setor_operacao_origem_id) if turno_setor_operacao_origem_id is not None else None
        ),
        operacao_id=str(operacao_id) if operacao_id is not None else None,
        observacao=str(observacao),
    )


def _validar_quantidades_revisao(quantidade_aprovada: int, quantidade_reprovada: int) -> None:
    if quantidade_aprovada < 0 or quantidade_reprovada < 0:
        raise QualidadeRevisaoServiceError("Quantidades de revisao nao podem ser negativas.")
    if quantidade_aprovada + quantidade_reprovada <= 0:
        raise QualidadeRevisaoServiceError("Revisao de qualidade deve informar aprovadas ou reprovadas.")


def _validar_defeitos_obrigatorios(
    quantidade_reprovada: int,
    defeitos: Sequence[DefeitoRevisaoInput],
) -> None:
    if quantidade_reprovada > 0 and len(defeitos) == 0:
        raise QualidadeRevisaoServiceError("Revisao com pecas reprovadas deve informar ao menos um defeito.")


def _validar_revisor(revisor: User) -> None:
    if not revisor.ativo:
        raise QualidadeRevisaoServiceError("Revisor deve estar ativo para revisar qualidade.")
    if not revisor.pode_revisar_qualidade:
        raise QualidadeRevisaoServiceError("Usuario nao possui permissao para revisar qualidade.")


def _validar_turno_aberto(turno: Turno) -> None:
    if turno.status != Turno.Status.ABERTO:
        raise QualidadeRevisaoServiceError("Turno deve estar aberto para revisar qualidade.")


def _validar_contexto_qualidade(turno_setor_operacao: TurnoSetorOperacao) -> None:
    setor = turno_setor_operacao.setor
    if setor.modo_apontamento == Setor.ModoApontamento.REVISAO_QUALIDADE:
        return
    if setor.nome.strip().lower() == "qualidade":
        return
    raise QualidadeRevisaoServiceError("Operacao informada nao pertence ao contexto operacional de Qualidade.")


def _validar_contexto_operacional_aberto(turno_setor_operacao: TurnoSetorOperacao) -> None:
    statuses_bloqueados = {
        TurnoSetorOperacao.Status.CONCLUIDA,
        TurnoSetorOperacao.Status.ENCERRADA_MANUALMENTE,
    }
    if turno_setor_operacao.status in statuses_bloqueados:
        raise QualidadeRevisaoServiceError("Operacao de Qualidade nao esta disponivel para revisao.")


def _get_pendencia_aprovacao(turno_setor_operacao: TurnoSetorOperacao) -> int:
    return max(turno_setor_operacao.quantidade_planejada - turno_setor_operacao.quantidade_realizada, 0)


def _validar_pendencia_aprovacao(pendencia: int, quantidade_aprovada: int) -> None:
    if quantidade_aprovada > pendencia:
        raise QualidadeRevisaoServiceError(
            f"Quantidade aprovada excede a pendencia de aprovacao da Qualidade. Saldo fisico disponivel: {pendencia}."
        )


def _criar_detalhe(
    registro: QualidadeRegistro,
    turno_op: TurnoOp,
    defeito_input: DefeitoRevisaoInput,
) -> QualidadeDetalhe:
    _validar_quantidade_defeito(defeito_input.quantidade_defeito)
    turno_setor_operacao_origem = _get_turno_setor_operacao_origem(defeito_input, turno_op)
    defeito = QualidadeDefeito.objects.select_for_update().get(id=defeito_input.defeito_id)
    _validar_operacao_origem(turno_setor_operacao_origem, turno_op)
    _validar_defeito_ativo(defeito)

    return QualidadeDetalhe(
        registro=registro,
        turno_setor_operacao_origem=turno_setor_operacao_origem,
        operacao=turno_setor_operacao_origem.operacao,
        setor=turno_setor_operacao_origem.setor,
        defeito=defeito,
        quantidade_defeito=defeito_input.quantidade_defeito,
        observacao=defeito_input.observacao.strip(),
    )


def _get_turno_setor_operacao_origem(defeito_input: DefeitoRevisaoInput, turno_op: TurnoOp) -> TurnoSetorOperacao:
    queryset = TurnoSetorOperacao.objects.select_for_update().select_related("operacao", "setor")
    if defeito_input.turno_setor_operacao_origem_id is not None:
        return queryset.get(id=defeito_input.turno_setor_operacao_origem_id)
    if defeito_input.operacao_id is not None:
        turno_setor_operacao = queryset.filter(turno_op=turno_op, operacao_id=defeito_input.operacao_id).first()
        if turno_setor_operacao is not None:
            return turno_setor_operacao
    raise QualidadeRevisaoServiceError("Defeito deve referenciar uma operacao produtiva de origem.")


def _validar_quantidade_defeito(quantidade_defeito: int) -> None:
    if quantidade_defeito <= 0:
        raise QualidadeRevisaoServiceError("Quantidade de defeito deve ser maior que zero.")


def _validar_operacao_origem(turno_setor_operacao_origem: TurnoSetorOperacao, turno_op: TurnoOp) -> None:
    if turno_setor_operacao_origem.turno_op_id != turno_op.id:
        raise QualidadeRevisaoServiceError("Defeito deve referenciar operacao produtiva da mesma OP.")
    if turno_setor_operacao_origem.setor.modo_apontamento == Setor.ModoApontamento.REVISAO_QUALIDADE:
        raise QualidadeRevisaoServiceError("Defeito deve ser atribuido a uma operacao produtiva, nao a Qualidade.")


def _validar_defeito_ativo(defeito: QualidadeDefeito) -> None:
    if not defeito.ativo:
        raise QualidadeRevisaoServiceError("Tipo de defeito deve estar ativo para ser usado na revisao.")


def _get_status_operacao(turno_setor_operacao: TurnoSetorOperacao) -> str:
    if turno_setor_operacao.quantidade_realizada >= turno_setor_operacao.quantidade_planejada:
        return TurnoSetorOperacao.Status.CONCLUIDA
    return TurnoSetorOperacao.Status.EM_ANDAMENTO


def _sincronizar_demanda(turno_setor_demanda: TurnoSetorDemanda) -> None:
    operacoes = TurnoSetorOperacao.objects.select_for_update().filter(turno_setor_demanda=turno_setor_demanda)
    menor_realizado = operacoes.aggregate(menor=Min("quantidade_realizada"))["menor"] or 0
    turno_setor_demanda.quantidade_realizada = menor_realizado
    turno_setor_demanda.save(update_fields=["quantidade_realizada", "updated_at"])


def _sincronizar_turno_op(turno_op: TurnoOp) -> None:
    demandas = TurnoSetorDemanda.objects.select_for_update().filter(turno_op=turno_op)
    menor_realizado = demandas.aggregate(menor=Min("quantidade_realizada"))["menor"] or 0
    turno_op.quantidade_realizada = menor_realizado
    if menor_realizado >= turno_op.quantidade_planejada:
        turno_op.status = TurnoOp.Status.CONCLUIDA
    elif menor_realizado > 0:
        turno_op.status = TurnoOp.Status.EM_ANDAMENTO
    turno_op.save(update_fields=["quantidade_realizada", "status", "updated_at"])
