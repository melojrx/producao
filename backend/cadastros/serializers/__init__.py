from cadastros.serializers.maquina import MaquinaSerializer
from cadastros.serializers.operacao import OperacaoSerializer
from cadastros.serializers.operador import OperadorSerializer
from cadastros.serializers.setor import SetorSerializer
from cadastros.serializers.tipo_maquina import TipoMaquinaSerializer
from cadastros.serializers.imagens import OperacaoImagemResponseSerializer, OperacaoImagemUploadSerializer

__all__ = [
    "SetorSerializer",
    "OperacaoSerializer",
    "MaquinaSerializer",
    "TipoMaquinaSerializer",
    "OperadorSerializer",
    "OperacaoImagemUploadSerializer",
    "OperacaoImagemResponseSerializer",
]