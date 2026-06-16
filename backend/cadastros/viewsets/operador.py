from rest_framework import viewsets
from shared.permissions import IsSupervisor

from cadastros.selectors import (
    get_operador,
    get_operador_por_token,
    list_operadores,
)
from cadastros.serializers import OperadorSerializer


class OperadorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para operadores.

    Endpoints:
    - GET /api/v1/cadastros/operadores/ - lista operadores
    - GET /api/v1/cadastros/operadores/{id}/ - detalhe do operador
    """
    serializer_class = OperadorSerializer
    permission_classes = [IsSupervisor]

    def get_queryset(self):
        status = self.request.query_params.get("status")
        return list_operadores(status=status)

    def get_object(self):
        pk = self.kwargs.get("pk")
        if pk:
            obj = get_operador(pk)
            self.check_object_permissions(self.request, obj)
            return obj
        return super().get_object()