from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Sequence

from django.db import transaction
from django.utils import timezone

from accounts.models import Operador
from shared.formulas import meta_grupo
from shared.turno_dominio import OpFisicaExistente, validar_nova_op_fisica
from turnos.models import Turno, TurnoOp, TurnoOperador
from turnos.services.carry_over import (
    TurnoCarryOverServiceError,
    buscar_ultimo_turno_encerrado,
    calcular_tp_produto_min,
    carregar_pendencias_turno_anterior as executar_carry_over_turno_anterior,
)
from turnos.services.encerramento import encerrar_turno
from turnos.services.sincronizacao import sincronizar_derivacao_turno_op, validar_produto_planejado


class TurnoAberturaServiceError(ValueError):
    """Erro de regra de negocio ao abrir turno."""


@dataclass(frozen=True)
class TurnoOpPlanejadaInput:
    numero_op: str
    produto_id: str
    quantidade_planejada: int


def abrir_turno(
    *,
    operadores_disponiveis: int,
    minutos_turno: int,
    ops: Sequence[TurnoOpPlanejadaInput | dict[str, object]],
    operador_ids: Sequence[str] = (),
    observacao: str = "",
    encerrar_turno_aberto_anterior: bool = True,
    carregar_pendencias_turno_anterior: bool = False,
    turno_origem_pendencias_id: str | None = None,
    turno_op_ids_pendentes: Sequence[str] = (),
) -> Turno:
    ops_normalizadas = [_normalizar_op_planejada(op) for op in ops]
    _validar_parametros_abertura(
        operadores_disponiveis,
        minutos_turno,
        ops_normalizadas,
        carregar_pendencias_turno_anterior=carregar_pendencias_turno_anterior,
    )

    with transaction.atomic():
        turno_aberto_anterior: Turno | None = None
        if encerrar_turno_aberto_anterior:
            turno_aberto_anterior = Turno.objects.select_for_update().filter(status=Turno.Status.ABERTO).first()
            if turno_aberto_anterior:
                encerrar_turno(turno_id=str(turno_aberto_anterior.id))

        turno = Turno.objects.create(
            status=Turno.Status.ABERTO,
            data_hora_abertura=timezone.now(),
            operadores_disponiveis=operadores_disponiveis,
            minutos_turno=minutos_turno,
            observacao=observacao.strip(),
        )
        _alocar_operadores(turno, operador_ids)

        turno_origem_id = turno_origem_pendencias_id
        if carregar_pendencias_turno_anterior:
            if not turno_origem_id:
                turno_origem_id = (
                    str(turno_aberto_anterior.id) if turno_aberto_anterior else None
                ) or (
                    str(ultimo_encerrado.id)
                    if (ultimo_encerrado := buscar_ultimo_turno_encerrado())
                    else None
                )
            if not turno_origem_id:
                raise TurnoAberturaServiceError(
                    "Nenhum turno anterior com pendências foi encontrado para carry-over."
                )
            _validar_ops_sem_conflito_carry_over(ops_normalizadas, turno_origem_id, turno_op_ids_pendentes)

        for op_input in ops_normalizadas:
            inserir_turno_op(
                turno_id=str(turno.id),
                numero_op=op_input.numero_op,
                produto_id=op_input.produto_id,
                quantidade_planejada=op_input.quantidade_planejada,
            )

        if carregar_pendencias_turno_anterior and turno_origem_id:
            try:
                executar_carry_over_turno_anterior(
                    turno_origem_id=turno_origem_id,
                    turno_destino_id=str(turno.id),
                    turno_op_ids=turno_op_ids_pendentes or None,
                    inserir_turno_op_fn=inserir_turno_op,
                )
            except TurnoCarryOverServiceError as exc:
                raise TurnoAberturaServiceError(str(exc)) from exc

        turno.meta_grupo = _calcular_meta_grupo_turno(turno)
        turno.save(update_fields=["meta_grupo", "updated_at"])
        return turno


def inserir_turno_op(
    *,
    turno_id: str,
    numero_op: str,
    produto_id: str,
    quantidade_planejada: int,
    turno_op_origem_id: str | None = None,
    quantidade_planejada_remanescente: int | None = None,
) -> TurnoOp:
    numero_normalizado = numero_op.strip()
    if not numero_normalizado:
        raise TurnoAberturaServiceError("O número da OP é obrigatório.")
    if quantidade_planejada <= 0:
        raise TurnoAberturaServiceError("A quantidade planejada da OP deve ser maior que zero.")

    with transaction.atomic():
        turno = Turno.objects.select_for_update().get(id=turno_id)
        if turno.status != Turno.Status.ABERTO:
            raise TurnoAberturaServiceError("Somente turnos abertos podem receber novas OPs.")

        if TurnoOp.objects.filter(turno=turno, numero_op=numero_normalizado).exists():
            raise TurnoAberturaServiceError(f"A OP {numero_normalizado} já está cadastrada neste turno.")

        _validar_container_fisico(
            numero_op=numero_normalizado,
            turno_op_origem_id=turno_op_origem_id,
        )
        produto = validar_produto_planejado(produto_id)

        turno_op = TurnoOp.objects.create(
            turno=turno,
            numero_op=numero_normalizado,
            produto=produto,
            quantidade_planejada=quantidade_planejada,
            quantidade_planejada_remanescente=quantidade_planejada_remanescente or quantidade_planejada,
            turno_op_origem_id=turno_op_origem_id,
            status=TurnoOp.Status.PLANEJADA,
            tp_produto_min_snapshot=calcular_tp_produto_min(produto_id),
        )
        sincronizar_derivacao_turno_op(turno_op)
        return turno_op


def _normalizar_op_planejada(op: TurnoOpPlanejadaInput | dict[str, object]) -> TurnoOpPlanejadaInput:
    if isinstance(op, TurnoOpPlanejadaInput):
        return op
    numero_op = op.get("numero_op") or op.get("numeroOp")
    produto_id = op.get("produto_id") or op.get("produtoId")
    quantidade_planejada = op.get("quantidade_planejada") or op.get("quantidadePlanejada")
    if not isinstance(numero_op, str) or produto_id is None or not isinstance(quantidade_planejada, int):
        raise TurnoAberturaServiceError("Uma ou mais OPs planejadas possuem formato inválido.")
    return TurnoOpPlanejadaInput(
        numero_op=numero_op,
        produto_id=str(produto_id),
        quantidade_planejada=quantidade_planejada,
    )


def _validar_parametros_abertura(
    operadores_disponiveis: int,
    minutos_turno: int,
    ops: Sequence[TurnoOpPlanejadaInput],
    *,
    carregar_pendencias_turno_anterior: bool,
) -> None:
    if operadores_disponiveis <= 0 or minutos_turno <= 0:
        raise TurnoAberturaServiceError(
            "Operadores disponíveis e minutos do turno devem ser números inteiros maiores que zero."
        )
    if not ops and not carregar_pendencias_turno_anterior:
        raise TurnoAberturaServiceError(
            "Informe pelo menos uma OP planejada ou carregue pendências do turno anterior para abrir o turno."
        )

    numeros_op: set[str] = set()
    for op in ops:
        numero = op.numero_op.strip()
        if numero in numeros_op:
            raise TurnoAberturaServiceError(f"A OP {numero} foi informada mais de uma vez no mesmo turno.")
        numeros_op.add(numero)


def _validar_ops_sem_conflito_carry_over(
    ops: Sequence[TurnoOpPlanejadaInput],
    turno_origem_id: str,
    turno_op_ids_pendentes: Sequence[str],
) -> None:
    from turnos.services.carry_over import selecionar_pendencias_turno_anterior

    pendencias = selecionar_pendencias_turno_anterior(
        turno_origem_id,
        turno_op_ids_pendentes or None,
    )
    numeros_pendencias = {pendencia.numero_op for pendencia in pendencias}
    for op in ops:
        if op.numero_op.strip() in numeros_pendencias:
            raise TurnoAberturaServiceError(
                f"A OP {op.numero_op} foi informada manualmente e também selecionada no carry-over."
            )


def _validar_container_fisico(*, numero_op: str, turno_op_origem_id: str | None) -> None:
    ops_existentes = [
        OpFisicaExistente(
            id=str(op.id),
            numero_op=op.numero_op,
            status=op.status,
            turno_op_origem_id=str(op.turno_op_origem_id) if op.turno_op_origem_id else None,
            quantidade_planejada_remanescente=op.quantidade_planejada_remanescente,
        )
        for op in TurnoOp.objects.filter(numero_op=numero_op)
    ]
    permitido, mensagem = validar_nova_op_fisica(
        numero_op=numero_op,
        turno_op_origem_id=turno_op_origem_id,
        ops_existentes=ops_existentes,
    )
    if not permitido:
        raise TurnoAberturaServiceError(mensagem or "A OP informada já existe.")


def _alocar_operadores(turno: Turno, operador_ids: Sequence[str]) -> None:
    ids_unicos = list(dict.fromkeys(str(operador_id) for operador_id in operador_ids if operador_id))
    if not ids_unicos:
        return

    operadores = list(Operador.objects.filter(id__in=ids_unicos))
    if len(operadores) != len(ids_unicos):
        raise TurnoAberturaServiceError("Um ou mais operadores informados não foram encontrados.")

    operador_inativo = next((operador for operador in operadores if operador.status != Operador.Status.ATIVO), None)
    if operador_inativo:
        raise TurnoAberturaServiceError("Apenas operadores com status ativo podem ser alocados no turno.")

    TurnoOperador.objects.bulk_create(
        [TurnoOperador(turno=turno, operador=operador) for operador in operadores],
        ignore_conflicts=True,
    )


def _calcular_meta_grupo_turno(turno: Turno) -> int:
    tp_total = Decimal("0")
    for op in turno.ops.all():
        snapshot = op.tp_produto_min_snapshot or calcular_tp_produto_min(str(op.produto_id))
        tp_total += snapshot
    if tp_total <= 0:
        return 0
    return meta_grupo(turno.operadores_disponiveis, turno.minutos_turno, tp_total)
