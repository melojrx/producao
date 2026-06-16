from django.db import transaction
from django.db.models import Min

from accounts.models import Operador, User
from cadastros.models import Maquina
from producao.models import RegistroProducao
from producao.selectors import SaldoFisicoInsuficienteError, SaldoFisicoOperacao, validar_quantidade_dentro_saldo_fisico
from turnos.models import Turno, TurnoOp, TurnoSetorDemanda, TurnoSetorOperacao


class ProducaoServiceError(ValueError):
    """Erro de regra de negocio em apontamentos produtivos."""


def registrar_apontamento_operacao(
    *,
    turno_setor_operacao_id: str,
    operador_id: str,
    quantidade: int,
    origem_apontamento: str = RegistroProducao.OrigemApontamento.OPERADOR_QR,
    maquina_id: str | None = None,
    usuario_sistema_id: str | None = None,
    observacao: str = "",
) -> RegistroProducao:
    _validar_quantidade_positiva(quantidade)
    _validar_origem_apontamento(origem_apontamento)

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
            .get(id=turno_setor_operacao_id)
        )
        turno = Turno.objects.select_for_update().get(id=turno_setor_operacao.turno_id)
        turno_op = TurnoOp.objects.select_for_update().get(id=turno_setor_operacao.turno_op_id)
        turno_setor_demanda = TurnoSetorDemanda.objects.select_for_update().get(
            id=turno_setor_operacao.turno_setor_demanda_id
        )
        operador = Operador.objects.select_for_update().get(id=operador_id)

        _validar_operador_ativo(operador)
        _validar_turno_aberto(turno)
        _validar_contexto_operacional_aberto(turno_setor_operacao)
        saldo = _validar_saldo_fisico(turno_setor_operacao, quantidade)

        maquina = _get_maquina(maquina_id)
        usuario_sistema = _get_usuario_sistema(usuario_sistema_id)

        registro = RegistroProducao.objects.create(
            operador=operador,
            maquina=maquina,
            operacao=turno_setor_operacao.operacao,
            produto=turno_op.produto,
            quantidade=quantidade,
            usuario_sistema=usuario_sistema,
            origem_apontamento=origem_apontamento,
            turno=turno,
            turno_op=turno_op,
            turno_setor=turno_setor_operacao.turno_setor,
            turno_setor_demanda=turno_setor_demanda,
            turno_setor_operacao=turno_setor_operacao,
            observacao=observacao.strip(),
        )

        turno_setor_operacao.quantidade_realizada += quantidade
        turno_setor_operacao.status = _get_status_operacao(turno_setor_operacao)
        turno_setor_operacao.save(update_fields=["quantidade_realizada", "status", "updated_at"])

        _sincronizar_demanda(turno_setor_demanda)
        _sincronizar_turno_op(turno_op)

        registro.saldo_fisico_antes_apontamento = saldo.saldo_restante
        return registro


def _validar_quantidade_positiva(quantidade: int) -> None:
    if quantidade <= 0:
        raise ProducaoServiceError("Quantidade apontada deve ser maior que zero.")


def _validar_origem_apontamento(origem_apontamento: str) -> None:
    origens_validas = {choice.value for choice in RegistroProducao.OrigemApontamento}
    if origem_apontamento not in origens_validas:
        raise ProducaoServiceError("Origem do apontamento e invalida.")


def _validar_operador_ativo(operador: Operador) -> None:
    if operador.status != Operador.Status.ATIVO:
        raise ProducaoServiceError("Operador deve estar ativo para registrar producao.")


def _validar_turno_aberto(turno: Turno) -> None:
    if turno.status != Turno.Status.ABERTO:
        raise ProducaoServiceError("Turno deve estar aberto para registrar producao.")


def _validar_contexto_operacional_aberto(turno_setor_operacao: TurnoSetorOperacao) -> None:
    statuses_bloqueados = {
        TurnoSetorOperacao.Status.CONCLUIDA,
        TurnoSetorOperacao.Status.ENCERRADA_MANUALMENTE,
    }
    if turno_setor_operacao.status in statuses_bloqueados:
        raise ProducaoServiceError("Operacao do turno nao esta disponivel para apontamento.")


def _validar_saldo_fisico(turno_setor_operacao: TurnoSetorOperacao, quantidade: int) -> SaldoFisicoOperacao:
    try:
        return validar_quantidade_dentro_saldo_fisico(
            turno_op_id=turno_setor_operacao.turno_op_id,
            operacao_id=turno_setor_operacao.operacao_id,
            quantidade_solicitada=quantidade,
            turno_setor_operacao_id=turno_setor_operacao.id,
        )
    except SaldoFisicoInsuficienteError as exc:
        raise ProducaoServiceError(str(exc)) from exc


def _get_maquina(maquina_id: str | None) -> Maquina | None:
    if maquina_id is None:
        return None
    return Maquina.objects.get(id=maquina_id)


def _get_usuario_sistema(usuario_sistema_id: str | None) -> User | None:
    if usuario_sistema_id is None:
        return None
    return User.objects.get(id=usuario_sistema_id)


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
