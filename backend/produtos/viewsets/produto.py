from rest_framework import viewsets
from shared.permissions import IsSupervisor

from produtos.selectors import (
    get_produto,
    get_produto_por_codigo,
    list_produtos,
)
from produtos.serializers import ProdutoDetailSerializer, ProdutoSerializer


class ProdutoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para produtos.

    Endpoints:
    - GET /api/v1/produtos/ - lista produtos
    - GET /api/v1/produtos/{id}/ - detalhe do produto com roteiro
    """
    permission_classes = [IsSupervisor]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProdutoDetailSerializer
        return ProdutoSerializer

    def get_queryset(self):
        ativo = self.request.query_params.get("ativo")
        if ativo is not None:
            ativo = ativo.lower() == "true"
        return list_produtos(ativo=ativo)

    def get_object(self):
        pk = self.kwargs.get("pk")
        if pk:
            obj = get_produto(pk)
            self.check_object_permissions(self.request, obj)
            return obj
        return super().get_object()