from rest_framework import viewsets
from shared.permissions import IsSupervisor

from produtos.selectors import (
    get_produto_operacao,
    list_produto_operacoes,
)
from produtos.serializers import ProdutoOperacaoSerializer


class ProdutoOperacaoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para operacoes de produto (roteiro).

    Endpoints:
    - GET /api/v1/produtos-operacoes/ - lista todas as operacoes de produto
    - GET /api/v1/produtos-operacoes/{id}/ - detalhe da operacao de produto
    """
    serializer_class = ProdutoOperacaoSerializer
    permission_classes = [IsSupervisor]

    def get_queryset(self):
        produto_id = self.request.query_params.get("produto_id")
        vigente = self.request.query_params.get("vigente")
        if vigente is not None:
            vigente = vigente.lower() == "true"
        return list_produto_operacoes(produto_id=produto_id, vigente=vigente)

    def get_object(self):
        pk = self.kwargs.get("pk")
        if pk:
            obj = get_produto_operacao(pk)
            self.check_object_permissions(self.request, obj)
            return obj
        return super().get_object()