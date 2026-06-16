from cadastros.viewsets.maquina import MaquinaViewSet
from cadastros.viewsets.operacao import OperacaoViewSet
from cadastros.viewsets.operador import OperadorViewSet
from cadastros.viewsets.setor import SetorViewSet
from cadastros.viewsets.tipo_maquina import TipoMaquinaViewSet
from cadastros.viewsets.imagens_operacao import OperacaoImagemViewSet

__all__ = [
    "SetorViewSet",
    "OperacaoViewSet",
    "MaquinaViewSet",
    "TipoMaquinaViewSet",
    "OperadorViewSet",
    "OperacaoImagemViewSet",
]