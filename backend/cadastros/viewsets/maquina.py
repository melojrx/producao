from rest_framework import viewsets
from shared.permissions import IsSupervisor

from cadastros.selectors import (
    get_maquina,
    get_maquina_por_token,
    list_maquinas,
)
from cadastros.serializers import MaquinaSerializer


class MaquinaViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para maquinas.

    Endpoints:
    - GET /api/v1/cadastros/maquinas/ - lista maquinas
    - GET /api/v1/cadastros/maquinas/{id}/ - detalhe da maquina
    """
    serializer_class = MaquinaSerializer
    permission_classes = [IsSupervisor]

    def get_queryset(self):
        situacao = self.request.query_params.get("situacao")
        return list_maquinas(situacao=situacao)

    def get_object(self):
        pk = self.kwargs.get("pk")
        if pk:
            obj = get_maquina(pk)
            self.check_object_permissions(self.request, obj)
            return obj
        return super().get_object()