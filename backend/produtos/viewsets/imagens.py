from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from shared.permissions import IsSupervisor

from produtos.models import Produto
from produtos.serializers import ProdutoImagemResponseSerializer, ProdutoImagemUploadSerializer
from produtos.services import ProdutoImagemServiceError, remover_imagem_produto, upload_imagem_produto


class ProdutoImagemViewSet(viewsets.GenericViewSet):
    permission_classes = [IsSupervisor]
    parser_classes = [MultiPartParser, FormParser]
    queryset = Produto.objects.all()
    lookup_field = "pk"

    def upload(self, request, pk=None, tipo=None):
        serializer = ProdutoImagemUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            produto = upload_imagem_produto(
                produto_id=str(pk),
                tipo=str(tipo),
                arquivo=serializer.validated_data["arquivo"],
                request=request,
            )
        except ProdutoImagemServiceError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except Produto.DoesNotExist:
            return Response({"detail": "Produto nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            ProdutoImagemResponseSerializer(produto).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, pk=None, tipo=None):
        try:
            produto = remover_imagem_produto(produto_id=str(pk), tipo=str(tipo))
        except ProdutoImagemServiceError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except Produto.DoesNotExist:
            return Response({"detail": "Produto nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            ProdutoImagemResponseSerializer(produto).data,
            status=status.HTTP_200_OK,
        )
