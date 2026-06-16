from cadastros.models import Maquina


def list_maquinas(situacao=None):
    """Lista maquinas com filtro opcional por situacao."""
    qs = Maquina.objects.all()
    if situacao:
        qs = qs.filter(situacao=situacao)
    return qs


def get_maquina(maquina_id):
    """Retorna uma maquina pelo ID."""
    return Maquina.objects.filter(id=maquina_id).first()


def get_maquina_por_token(token):
    """Retorna uma maquina pelo QR code token."""
    return Maquina.objects.filter(qr_code_token=token).first()