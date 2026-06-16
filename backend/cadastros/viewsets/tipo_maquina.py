from rest_framework import viewsets
from shared.permissions import IsSupervisor

from cadastros.selectors import (
    get_tipo_maquina,
    list_tipos_maquina,
)
from cadastros.serializers import TipoMaquinaSerializer


class TipoMaquinaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para tipos de maquina.

    Endpoints:
    - GET /api/v1/cadastros/tipos-maquina/ - lista tipos
    - GET /api/v1/cadastros/tipos-maquina/{codigo}/ - detalhe do tipo
    """
    serializer_class = TipoMaquinaSerializer
    permission_classes = [IsSupervisor]
    lookup_field = "codigo"

    def get_queryset(self):
        return list_tipos_maquina()

    def get_object(self):
        codigo = self.kwargs.get("codigo")
        if codigo:
            obj = get_tipo_maquina(codigo)
            self.check_object_permissions(self.request, obj)
            return obj
        return super().get_object()