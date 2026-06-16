from cadastros.models import Operacao


def list_operacoes(setor_id=None, situacao=None):
    """Lista operacoes com filtros opcionais."""
    qs = Operacao.objects.select_related("setor", "maquina", "tipo_maquina")
    if setor_id:
        qs = qs.filter(setor_id=setor_id)
    if situacao:
        qs = qs.filter(situacao=situacao)
    return qs


def get_operacao(operacao_id):
    """Retorna uma operacao pelo ID."""
    return Operacao.objects.select_related("setor", "maquina", "tipo_maquina").filter(
        id=operacao_id
    ).first()


def get_operacao_por_token(token):
    """Retorna uma operacao pelo QR code token."""
    return Operacao.objects.select_related("setor", "maquina", "tipo_maquina").filter(
        qr_code_token=token
    ).first()