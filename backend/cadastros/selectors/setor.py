from cadastros.models import Setor


def list_setores(situacao=None):
    """Lista setores com filtro opcional por situacao."""
    qs = Setor.objects.all()
    if situacao:
        qs = qs.filter(situacao=situacao)
    return qs


def get_setor(setor_id):
    """Retorna um setor pelo ID."""
    return Setor.objects.filter(id=setor_id).first()


def get_setor_por_token(token):
    """Retorna um setor pelo QR code token."""
    return Setor.objects.filter(qr_code_token=token).first()