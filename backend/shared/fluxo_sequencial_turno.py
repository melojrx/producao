from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from shared.turno_dominio import normalizar_inteiro_nao_negativo


@dataclass(frozen=True)
class DemandaFluxoSequencialBase:
    id: str
    turno_op_id: str
    setor_id: str
    setor_sequencia_fluxo: int
    setor_nome: str
    quantidade_planejada: int
    quantidade_realizada: int
    quantidade_herdada_setor: int
    quantidade_liberada_setor: int
    status: str
    iniciado_em: object | None
    encerrado_em: object | None


@dataclass(frozen=True)
class DemandaFluxoSequencialEnriquecida(DemandaFluxoSequencialBase):
    quantidade_pendente_setor: int
    quantidade_liberada_setor_fluxo: int
    quantidade_disponivel_apontamento: int
    setor_anterior_id: str | None


def calcular_progresso_operacional_setor(
    demanda: DemandaFluxoSequencialBase,
) -> int:
    return min(
        normalizar_inteiro_nao_negativo(demanda.quantidade_planejada),
        normalizar_inteiro_nao_negativo(demanda.quantidade_realizada)
        + normalizar_inteiro_nao_negativo(demanda.quantidade_herdada_setor),
    )


def calcular_quantidade_liberada_setor(
    quantidade_planejada: int,
    quantidade_concluida_setor_anterior: int | None,
) -> int:
    quantidade_planejada_normalizada = normalizar_inteiro_nao_negativo(quantidade_planejada)
    if quantidade_concluida_setor_anterior is None:
        return quantidade_planejada_normalizada
    return min(
        quantidade_planejada_normalizada,
        normalizar_inteiro_nao_negativo(quantidade_concluida_setor_anterior),
    )


def enriquecer_demandas_com_fluxo_sequencial(
    demandas: Sequence[DemandaFluxoSequencialBase],
) -> list[DemandaFluxoSequencialEnriquecida]:
    demandas_por_turno_op: dict[str, list[DemandaFluxoSequencialBase]] = {}
    for demanda in demandas:
        demandas_por_turno_op.setdefault(demanda.turno_op_id, []).append(demanda)

    diagnosticos: dict[str, tuple[int, int, int, str | None]] = {}

    for demandas_turno_op in demandas_por_turno_op.values():
        demandas_ordenadas = sorted(
            demandas_turno_op,
            key=lambda demanda: (demanda.setor_sequencia_fluxo, demanda.setor_id),
        )
        for indice, demanda_atual in enumerate(demandas_ordenadas):
            demanda_anterior = demandas_ordenadas[indice - 1] if indice > 0 else None
            progresso_atual = calcular_progresso_operacional_setor(demanda_atual)
            progresso_anterior = (
                calcular_progresso_operacional_setor(demanda_anterior) if demanda_anterior else None
            )
            quantidade_pendente_setor = max(
                normalizar_inteiro_nao_negativo(demanda_atual.quantidade_planejada) - progresso_atual,
                0,
            )
            quantidade_liberada_setor = calcular_quantidade_liberada_setor(
                demanda_atual.quantidade_planejada,
                progresso_anterior,
            )
            quantidade_disponivel_apontamento = max(
                quantidade_liberada_setor - progresso_atual,
                0,
            )
            diagnosticos[demanda_atual.id] = (
                quantidade_pendente_setor,
                quantidade_liberada_setor,
                quantidade_disponivel_apontamento,
                demanda_anterior.setor_id if demanda_anterior else None,
            )

    enriquecidas: list[DemandaFluxoSequencialEnriquecida] = []
    for demanda in demandas:
        diagnostico = diagnosticos.get(demanda.id, (0, 0, 0, None))
        enriquecidas.append(
            DemandaFluxoSequencialEnriquecida(
                id=demanda.id,
                turno_op_id=demanda.turno_op_id,
                setor_id=demanda.setor_id,
                setor_sequencia_fluxo=demanda.setor_sequencia_fluxo,
                setor_nome=demanda.setor_nome,
                quantidade_planejada=demanda.quantidade_planejada,
                quantidade_realizada=demanda.quantidade_realizada,
                quantidade_herdada_setor=demanda.quantidade_herdada_setor,
                quantidade_liberada_setor=demanda.quantidade_liberada_setor,
                status=demanda.status,
                iniciado_em=demanda.iniciado_em,
                encerrado_em=demanda.encerrado_em,
                quantidade_pendente_setor=diagnostico[0],
                quantidade_liberada_setor_fluxo=diagnostico[1],
                quantidade_disponivel_apontamento=diagnostico[2],
                setor_anterior_id=diagnostico[3],
            )
        )
    return enriquecidas
