from __future__ import annotations

from decimal import Decimal

from django.db import transaction

from cadastros.models import Setor
from produtos.models import Produto, ProdutoOperacao
from produtos.selectors import get_operacoes_do_produto
from shared.turno_dominio import gerar_qr_token, setor_qualidade_legado
from turnos.models import TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOp, TurnoSetorOperacao
from turnos.services.carry_over import calcular_tp_produto_min


class TurnoSincronizacaoError(ValueError):
    """Erro ao derivar estrutura operacional de uma OP no turno."""


def sincronizar_derivacao_turno_op(turno_op: TurnoOp) -> int:
    if TurnoSetorOp.objects.filter(turno_op=turno_op, quantidade_realizada__gt=0).exists():
        raise TurnoSincronizacaoError(
            "Não é possível regerar seções de uma OP que já possui produção apontada."
        )

    roteiro = list(get_operacoes_do_produto(str(turno_op.produto_id), vigente=True))
    if not roteiro:
        raise TurnoSincronizacaoError(
            f"O produto {turno_op.produto_id} não possui roteiro vigente para derivar o turno."
        )

    setores_do_roteiro: dict[str, Setor] = {}
    for item in roteiro:
        setor = item.operacao.setor
        if setor.id not in setores_do_roteiro:
            setores_do_roteiro[str(setor.id)] = setor

    if not setores_do_roteiro:
        raise TurnoSincronizacaoError(
            f"O produto {turno_op.produto_id} não possui setores válidos no roteiro."
        )

    _limpar_derivacao_turno_op(turno_op)

    total_setores = 0
    for setor in setores_do_roteiro.values():
        turno_setor_op = TurnoSetorOp.objects.create(
            turno=turno_op.turno,
            turno_op=turno_op,
            setor=setor,
            quantidade_planejada=turno_op.quantidade_planejada,
            quantidade_realizada=0,
            status=TurnoSetorOp.Status.ABERTA,
            qr_code_token=gerar_qr_token("turno-setor-op"),
        )
        _sincronizar_demanda_e_operacoes_atomica(turno_setor_op, roteiro)
        total_setores += 1

    tp_produto = calcular_tp_produto_min(str(turno_op.produto_id))
    turno_op.tp_produto_min_snapshot = tp_produto
    turno_op.save(update_fields=["tp_produto_min_snapshot", "updated_at"])
    return total_setores


def _limpar_derivacao_turno_op(turno_op: TurnoOp) -> None:
    demanda_ids = list(
        TurnoSetorDemanda.objects.filter(turno_op=turno_op).values_list("id", flat=True)
    )
    if demanda_ids:
        TurnoSetorOperacao.objects.filter(turno_setor_demanda_id__in=demanda_ids).delete()
        TurnoSetorDemanda.objects.filter(id__in=demanda_ids).delete()
    TurnoSetorOp.objects.filter(turno_op=turno_op).delete()


def _sincronizar_demanda_e_operacoes_atomica(
    turno_setor_op: TurnoSetorOp,
    roteiro: list[ProdutoOperacao],
) -> TurnoSetorDemanda:
    setor = turno_setor_op.setor
    turno_setor, _ = TurnoSetor.objects.get_or_create(
        turno=turno_setor_op.turno,
        setor=setor,
        defaults={
            "qr_code_token": gerar_qr_token("turno-setor"),
            "status": TurnoSetor.Status.ABERTO,
        },
    )

    demanda, _ = TurnoSetorDemanda.objects.update_or_create(
        turno_setor_op_legacy=turno_setor_op,
        defaults={
            "turno_setor": turno_setor,
            "turno": turno_setor_op.turno,
            "turno_op": turno_setor_op.turno_op,
            "produto": turno_setor_op.turno_op.produto,
            "setor": setor,
            "quantidade_planejada": turno_setor_op.quantidade_planejada,
            "quantidade_realizada": turno_setor_op.quantidade_realizada,
        },
    )

    if TurnoSetorOperacao.objects.filter(turno_setor_op=turno_setor_op, quantidade_realizada__gt=0).exists():
        raise TurnoSincronizacaoError(
            "Não é possível regerar operações de uma seção que já possui produção apontada."
        )

    TurnoSetorOperacao.objects.filter(turno_setor_op=turno_setor_op).delete()

    operacoes_do_setor = [
        item
        for item in roteiro
        if str(item.operacao.setor_id) == str(setor.id)
    ]
    if not operacoes_do_setor:
        raise TurnoSincronizacaoError(
            f"A seção {setor.nome} não possui operações válidas derivadas do roteiro."
        )

    TurnoSetorOperacao.objects.bulk_create(
        [
            TurnoSetorOperacao(
                turno=turno_setor_op.turno,
                turno_op=turno_setor_op.turno_op,
                turno_setor=turno_setor,
                turno_setor_demanda=demanda,
                turno_setor_op=turno_setor_op,
                produto_operacao=item,
                operacao=item.operacao,
                setor=setor,
                sequencia=item.sequencia,
                produto_operacao_id_snapshot=item.id,
                versao_roteiro_snapshot=item.versao_roteiro,
                tempo_padrao_min_snapshot=item.operacao.tempo_padrao_min,
                quantidade_planejada=turno_setor_op.quantidade_planejada,
                quantidade_realizada=0,
                status=TurnoSetorOperacao.Status.ABERTA,
            )
            for item in operacoes_do_setor
        ]
    )
    return demanda


def validar_produto_planejado(produto_id: str) -> Produto:
    try:
        produto = Produto.objects.get(id=produto_id)
    except Produto.DoesNotExist as exc:
        raise TurnoSincronizacaoError("Produto da OP não encontrado.") from exc

    if not produto.ativo:
        raise TurnoSincronizacaoError(f"O produto {produto.nome} está inativo e não pode ser planejado.")

    roteiro = list(get_operacoes_do_produto(produto_id, vigente=True))
    if not roteiro:
        raise TurnoSincronizacaoError(
            f"O produto {produto.nome} não possui roteiro configurado e não pode ser usado no turno."
        )

    possui_operacao_produtiva = any(
        not setor_qualidade_legado(item.operacao.setor.nome, item.operacao.setor.modo_apontamento)
        for item in roteiro
    )
    if not possui_operacao_produtiva:
        raise TurnoSincronizacaoError(
            f"O produto {produto.nome} precisa possuir ao menos uma operação produtiva ativa no roteiro."
        )
    return produto
