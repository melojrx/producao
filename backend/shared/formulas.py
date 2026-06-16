from decimal import Decimal, ROUND_FLOOR


def meta_hora(tp_operacao: Decimal) -> int:
    if tp_operacao <= 0:
        return 0
    return int((Decimal("60") / tp_operacao).to_integral_value(rounding=ROUND_FLOOR))


def meta_individual(minutos_turno: int, tp_operacao: Decimal) -> int:
    if minutos_turno <= 0 or tp_operacao <= 0:
        return 0
    return int((Decimal(minutos_turno) / tp_operacao).to_integral_value(rounding=ROUND_FLOOR))


def meta_grupo(funcionarios_ativos: int, minutos_turno: int, tp_produto: Decimal) -> int:
    if funcionarios_ativos <= 0 or minutos_turno <= 0 or tp_produto <= 0:
        return 0
    capacidade = Decimal(funcionarios_ativos * minutos_turno)
    return int((capacidade / tp_produto).to_integral_value(rounding=ROUND_FLOOR))


def eficiencia(quantidade_produzida: int, tp_operacao: Decimal, minutos_trabalhados: int) -> Decimal:
    if minutos_trabalhados <= 0:
        return Decimal("0")
    return (Decimal(quantidade_produzida) * tp_operacao / Decimal(minutos_trabalhados)) * Decimal("100")
