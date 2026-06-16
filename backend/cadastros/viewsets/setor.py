from rest_framework import viewsets
from shared.permissions import IsSupervisor

from cadastros.selectors import (
    get_setor,
    get_setor_por_token,
    list_setores,
)
from cadastros.serializers import SetorSerializer


class SetorViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para setores.

    Endpoints:
    - GET /api/v1/cadastros/setores/ - lista setores
    - GET /api/v1/cadastros/setores/{id}/ - detalhe do setor
    """
    serializer_class = SetorSerializer
    permission_classes = [IsSupervisor]

    def get_queryset(self):
        situacao = self.request.query_params.get("situacao")
        return list_setores(situacao=situacao)

    def get_object(self):
        pk = self.kwargs.get("pk")
        if pk:
            obj = get_setor(pk)
            self.check_object_permissions(self.request, obj)
            return obj
        return super().get_object()