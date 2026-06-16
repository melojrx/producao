from accounts.models import Operador


def list_operadores(status=None):
    """Lista operadores com filtro opcional por status."""
    qs = Operador.objects.select_related("maquina_preferida")
    if status:
        qs = qs.filter(status=status)
    return qs


def get_operador(operador_id):
    """Retorna um operador pelo ID."""
    return Operador.objects.select_related("maquina_preferida").filter(id=operador_id).first()


def get_operador_por_token(token):
    """Retorna um operador pelo QR code token."""
    return Operador.objects.select_related("maquina_preferida").filter(qr_code_token=token).first()


def get_operador_por_matricula(matricula):
    """Retorna um operador pela matricula."""
    return Operador.objects.select_related("maquina_preferida").filter(matricula=matricula).first()