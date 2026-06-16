from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Sequence

from cadastros.models import Setor


def setor_qualidade_legado(nome: str, modo_apontamento: str | None) -> bool:
    modo = (modo_apontamento or Setor.ModoApontamento.PRODUCAO_PADRAO).strip()
    if modo == Setor.ModoApontamento.REVISAO_QUALIDADE:
        return True
    return (nome or "").strip().lower() == "qualidade"


def setor_participa_fluxo_produtivo_ativo(setor: Setor) -> bool:
    return not setor_qualidade_legado(setor.nome, setor.modo_apontamento)


def normalizar_inteiro_nao_negativo(valor: int) -> int:
    if valor <= 0:
        return 0
    return int(valor)


def calcular_quantidade_planejada_remanescente(
    *,
    quantidade_planejada_origem: int,
    demandas_origem: Sequence[dict[str, int]],
    quantidade_realizada_fallback: int = 0,
) -> int:
    quantidade_planejada_origem = normalizar_inteiro_nao_negativo(quantidade_planejada_origem)

    if not demandas_origem:
        fallback = normalizar_inteiro_nao_negativo(quantidade_realizada_fallback)
        return max(quantidade_planejada_origem - fallback, 0)

    quantidade_finalizada = min(
        normalizar_inteiro_nao_negativo(demanda.get("quantidade_realizada", 0))
        + normalizar_inteiro_nao_negativo(demanda.get("quantidade_herdada_setor", 0))
        for demanda in demandas_origem
    )
    return max(quantidade_planejada_origem - quantidade_finalizada, 0)


@dataclass(frozen=True)
class OpFisicaExistente:
    id: str
    numero_op: str
    status: str
    turno_op_origem_id: str | None
    quantidade_planejada_remanescente: int | None


def validar_nova_op_fisica(
    *,
    numero_op: str,
    turno_op_origem_id: str | None = None,
    ops_existentes: Sequence[OpFisicaExistente],
    ignorar_turno_op_id: str | None = None,
) -> tuple[bool, str | None]:
    numero_normalizado = numero_op.strip()
    ops_mesma_numeracao = [
        op
        for op in ops_existentes
        if op.id != ignorar_turno_op_id and op.numero_op == numero_normalizado
    ]

    if not ops_mesma_numeracao:
        return True, None

    if turno_op_origem_id:
        pertence_linhagem = any(
            op.id == turno_op_origem_id or op.turno_op_origem_id == turno_op_origem_id
            for op in ops_mesma_numeracao
        )
        if pertence_linhagem:
            return True, None

    possui_saldo_pendente = any(
        op.status != "concluida"
        and normalizar_inteiro_nao_negativo(op.quantidade_planejada_remanescente or 0) > 0
        for op in ops_mesma_numeracao
    )
    if possui_saldo_pendente:
        return (
            False,
            f"A OP {numero_normalizado} já existe no histórico operacional com saldo físico pendente. "
            "Reabra essa OP por carry-over; não crie um novo container físico com o mesmo número.",
        )

    return (
        False,
        f"A OP {numero_normalizado} já foi concluída no histórico operacional. "
        "A próxima produção deve usar outra OP.",
    )


def gerar_qr_token(prefixo: str) -> str:
    return f"{prefixo}-{uuid.uuid4().hex}"
