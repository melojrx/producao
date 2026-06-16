from rest_framework import viewsets
from shared.permissions import IsSupervisor

from cadastros.selectors import (
    get_operacao,
    get_operacao_por_token,
    list_operacoes,
)
from cadastros.serializers import OperacaoSerializer


class OperacaoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para operacoes.

    Endpoints:
    - GET /api/v1/cadastros/operacoes/ - lista operacoes
    - GET /api/v1/cadastros/operacoes/{id}/ - detalhe da operacao
    """
    serializer_class = OperacaoSerializer
    permission_classes = [IsSupervisor]

    def get_queryset(self):
        setor_id = self.request.query_params.get("setor_id")
        situacao = self.request.query_params.get("situacao")
        return list_operacoes(setor_id=setor_id, situacao=situacao)

    def get_object(self):
        pk = self.kwargs.get("pk")
        if pk:
            obj = get_operacao(pk)
            self.check_object_permissions(self.request, obj)
            return obj
        return super().get_object()