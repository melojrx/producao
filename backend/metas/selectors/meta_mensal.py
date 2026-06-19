from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date, datetime, time
from typing import Any
from zoneinfo import ZoneInfo

from django.db.models import QuerySet

from metas.models import MetaMensal
from turnos.models import Turno, TurnoOp, TurnoSetorDemanda, TurnoSetorOperacao

FUSO_FABRICA = ZoneInfo("America/Fortaleza")


def normalizar_competencia(competencia: date | str | None) -> date:
    if competencia is None:
        hoje = datetime.now(FUSO_FABRICA).date()
        return date(hoje.year, hoje.month, 1)

    if isinstance(competencia, date):
        return date(competencia.year, competencia.month, 1)

    texto = competencia.strip()
    if len(texto) >= 7:
        ano = int(texto[0:4])
        mes = int(texto[5:7])
        return date(ano, mes, 1)

    raise ValueError("Competência mensal inválida.")


def construir_intervalo_competencia(competencia: date | str | None) -> dict[str, Any]:
    competencia_normalizada = normalizar_competencia(competencia)
    ultimo_dia = monthrange(competencia_normalizada.year, competencia_normalizada.month)[1]
    data_fim = date(competencia_normalizada.year, competencia_normalizada.month, ultimo_dia)

    inicio_local = datetime.combine(competencia_normalizada, time.min, tzinfo=FUSO_FABRICA)
    fim_local = datetime.combine(data_fim, time(23, 59, 59, 999000), tzinfo=FUSO_FABRICA)

    return {
        "competencia": competencia_normalizada,
        "data_inicio": competencia_normalizada,
        "data_fim": data_fim,
        "inicio_timestamp": inicio_local,
        "fim_timestamp": fim_local,
    }


def get_meta_mensal_by_competencia(competencia: date | str | None) -> MetaMensal | None:
    competencia_normalizada = normalizar_competencia(competencia)
    return MetaMensal.objects.filter(competencia=competencia_normalizada).first()


def _formatar_data_local(data_hora: datetime) -> str:
    if data_hora.tzinfo is None:
        data_hora = data_hora.replace(tzinfo=FUSO_FABRICA)
    local = data_hora.astimezone(FUSO_FABRICA)
    return local.date().isoformat()


def _listar_datas_competencia(competencia: date) -> list[str]:
    ultimo_dia = monthrange(competencia.year, competencia.month)[1]
    prefixo = competencia.isoformat()[:8]
    return [f"{prefixo}{dia:02d}" for dia in range(1, ultimo_dia + 1)]


def _formatar_dia_mes(data_iso: str | date) -> str:
    if isinstance(data_iso, date):
        data_iso = data_iso.isoformat()
    _, mes, dia = data_iso.split("-")
    return f"{dia}/{mes}"


def _formatar_periodo_semana(inicio: str | date, fim: str | date) -> str:
    if inicio == fim:
        return _formatar_dia_mes(inicio)
    return f"{_formatar_dia_mes(inicio)} a {_formatar_dia_mes(fim)}"


def _calcular_quantidade_concluida_consolidada(
    turno_ops: list[TurnoOp],
    demandas: list[TurnoSetorDemanda],
    operacoes: list[TurnoSetorOperacao],
) -> int:
    if not turno_ops:
        return 0

    demandas_por_op: dict[str, list[TurnoSetorDemanda]] = defaultdict(list)
    for demanda in demandas:
        demandas_por_op[str(demanda.turno_op_id)].append(demanda)

    operacoes_por_op: dict[str, list[TurnoSetorOperacao]] = defaultdict(list)
    for operacao in operacoes:
        operacoes_por_op[str(operacao.turno_op_id)].append(operacao)

    total = 0
    for op in turno_ops:
        demandas_op = demandas_por_op.get(str(op.id), [])
        if not demandas_op:
            total += max(op.quantidade_realizada, 0)
            continue

        operacoes_op = operacoes_por_op.get(str(op.id), [])
        if not operacoes_op:
            total += max(op.quantidade_realizada, 0)
            continue

        concluida_por_demanda: list[int] = []
        for demanda in demandas_op:
            ops_demanda = [item for item in operacoes_op if item.turno_setor_demanda_id == demanda.id]
            if ops_demanda:
                concluida_por_demanda.append(min(item.quantidade_realizada for item in ops_demanda))
            else:
                concluida_por_demanda.append(demanda.quantidade_realizada)

        if concluida_por_demanda:
            total += max(min(concluida_por_demanda), 0)

    return total


def _construir_evolucao_diaria(
    datas_competencia: list[str],
    meta_pecas: int,
    meta_diaria_media: float,
    realizado_por_data: dict[str, int],
) -> list[dict[str, Any]]:
    realizado_acumulado = 0
    evolucao: list[dict[str, Any]] = []

    for indice, data in enumerate(datas_competencia):
        realizado_dia = realizado_por_data.get(data, 0)
        realizado_acumulado += realizado_dia
        meta_acumulada = (
            min(meta_diaria_media * (indice + 1), meta_pecas)
            if meta_pecas > 0 and meta_diaria_media > 0
            else 0
        )
        atingimento = (realizado_acumulado / meta_pecas * 100) if meta_pecas > 0 else 0

        evolucao.append(
            {
                "data": date.fromisoformat(data),
                "dia_label": _formatar_dia_mes(data),
                "meta_diaria_media": meta_diaria_media,
                "meta_acumulada_referencia": meta_acumulada,
                "realizado_dia": realizado_dia,
                "realizado_acumulado": realizado_acumulado,
                "atingimento_acumulado_pct": atingimento,
            }
        )

    return evolucao


def _construir_resumo_semanal(evolucao_diaria: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not evolucao_diaria:
        return []

    resumo: list[dict[str, Any]] = []
    indice_semana = 0
    inicio_semana = ""
    fim_semana = ""
    realizado_semana = 0
    meta_acumulada_antes = 0.0
    meta_acumulada_atual = 0.0
    realizado_acumulado_atual = 0
    atingimento_atual = 0.0

    def fechar_semana() -> None:
        nonlocal realizado_semana, meta_acumulada_antes
        if not inicio_semana or not fim_semana:
            return
        resumo.append(
            {
                "semana": f"Semana {indice_semana}",
                "periodo": _formatar_periodo_semana(inicio_semana, fim_semana),
                "meta_referencia_semana": max(meta_acumulada_atual - meta_acumulada_antes, 0),
                "realizado_semana": realizado_semana,
                "realizado_acumulado": realizado_acumulado_atual,
                "atingimento_acumulado_pct": atingimento_atual,
            }
        )

    for indice, item in enumerate(evolucao_diaria):
        data_atual = datetime.fromisoformat(f"{item['data']}T12:00:00").replace(tzinfo=FUSO_FABRICA)
        iniciou_nova_semana = indice == 0 or data_atual.weekday() == 6

        if iniciou_nova_semana:
            if indice > 0:
                fechar_semana()
            indice_semana += 1
            inicio_semana = item["data"]
            fim_semana = item["data"]
            realizado_semana = 0
            meta_acumulada_antes = evolucao_diaria[indice - 1]["meta_acumulada_referencia"] if indice > 0 else 0

        fim_semana = item["data"]
        realizado_semana += item["realizado_dia"]
        meta_acumulada_atual = item["meta_acumulada_referencia"]
        realizado_acumulado_atual = item["realizado_acumulado"]
        atingimento_atual = item["atingimento_acumulado_pct"]

        if indice == len(evolucao_diaria) - 1:
            fechar_semana()

    return resumo


def get_resumo_meta_mensal_dashboard(competencia: date | str | None = None) -> dict[str, Any]:
    intervalo = construir_intervalo_competencia(competencia)
    competencia_date: date = intervalo["competencia"]
    meta_mensal = get_meta_mensal_by_competencia(competencia_date)

    turnos: QuerySet[Turno] = (
        Turno.objects.filter(
            data_hora_abertura__gte=intervalo["inicio_timestamp"],
            data_hora_abertura__lte=intervalo["fim_timestamp"],
        )
        .order_by("data_hora_abertura")
        .only("id", "data_hora_abertura")
    )
    turno_ids = [turno.id for turno in turnos]

    turnos_ops: list[TurnoOp] = []
    demandas: list[TurnoSetorDemanda] = []
    operacoes: list[TurnoSetorOperacao] = []

    if turno_ids:
        turnos_ops = list(
            TurnoOp.objects.filter(turno_id__in=turno_ids).only(
                "id",
                "turno_id",
                "quantidade_planejada",
                "quantidade_realizada",
                "status",
            )
        )
        turno_op_ids = [op.id for op in turnos_ops]
        if turno_op_ids:
            demandas = list(
                TurnoSetorDemanda.objects.filter(turno_op_id__in=turno_op_ids).select_related(
                    "turno_setor_op_legacy"
                )
            )
            operacoes = list(TurnoSetorOperacao.objects.filter(turno_op_id__in=turno_op_ids))

    meta_pecas = meta_mensal.meta_pecas if meta_mensal else 0
    dias_produtivos = meta_mensal.dias_produtivos if meta_mensal else 0
    meta_diaria_media = (meta_pecas / dias_produtivos) if dias_produtivos > 0 else 0

    turno_ids_por_data: dict[str, list] = defaultdict(list)
    for turno in turnos:
        turno_ids_por_data[_formatar_data_local(turno.data_hora_abertura)].append(turno.id)

    ops_por_turno: dict[str, list[TurnoOp]] = defaultdict(list)
    for op in turnos_ops:
        ops_por_turno[str(op.turno_id)].append(op)

    demandas_por_op: dict[str, list[TurnoSetorDemanda]] = defaultdict(list)
    for demanda in demandas:
        demandas_por_op[str(demanda.turno_op_id)].append(demanda)

    operacoes_por_op: dict[str, list[TurnoSetorOperacao]] = defaultdict(list)
    for operacao in operacoes:
        operacoes_por_op[str(operacao.turno_op_id)].append(operacao)

    realizado_por_data: dict[str, int] = {}
    for data_competencia in _listar_datas_competencia(competencia_date):
        turno_ids_dia = turno_ids_por_data.get(data_competencia, [])
        ops_dia = [op for turno_id in turno_ids_dia for op in ops_por_turno.get(str(turno_id), [])]
        op_ids_dia = [op.id for op in ops_dia]
        demandas_dia = [d for op_id in op_ids_dia for d in demandas_por_op.get(str(op_id), [])]
        operacoes_dia = [o for op_id in op_ids_dia for o in operacoes_por_op.get(str(op_id), [])]
        realizado_por_data[data_competencia] = _calcular_quantidade_concluida_consolidada(
            ops_dia, demandas_dia, operacoes_dia
        )

    evolucao_diaria = (
        _construir_evolucao_diaria(
            _listar_datas_competencia(competencia_date),
            meta_pecas,
            meta_diaria_media,
            realizado_por_data,
        )
        if meta_mensal
        else []
    )
    resumo_semanal = _construir_resumo_semanal(evolucao_diaria) if meta_mensal else []
    alcancado_mes = sum(realizado_por_data.values())
    saldo_mes = max(meta_pecas - alcancado_mes, 0)
    atingimento_pct = (alcancado_mes / meta_pecas * 100) if meta_pecas > 0 else 0

    meta_payload = meta_mensal

    return {
        "competencia": competencia_date,
        "meta_mensal": meta_payload,
        "meta_pecas": meta_pecas,
        "dias_produtivos": dias_produtivos,
        "meta_diaria_media": meta_diaria_media,
        "alcancado_mes": alcancado_mes,
        "saldo_mes": saldo_mes,
        "atingimento_pct": atingimento_pct,
        "evolucao_diaria": evolucao_diaria,
        "resumo_semanal": resumo_semanal,
    }
