from cadastros.models import TipoMaquina


def list_tipos_maquina():
    """Lista todos os tipos de maquina."""
    return TipoMaquina.objects.all()


def get_tipo_maquina(codigo):
    """Retorna um tipo de maquina pelo codigo."""
    return TipoMaquina.objects.filter(codigo=codigo).first()