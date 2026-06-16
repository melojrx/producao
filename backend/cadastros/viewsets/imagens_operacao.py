from rest_framework import status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from shared.permissions import IsSupervisor

from cadastros.models import Operacao
from cadastros.serializers import OperacaoImagemResponseSerializer, OperacaoImagemUploadSerializer
from cadastros.services import OperacaoImagemServiceError, remover_imagem_operacao, upload_imagem_operacao


class OperacaoImagemViewSet(viewsets.GenericViewSet):
    permission_classes = [IsSupervisor]
    parser_classes = [MultiPartParser, FormParser]
    queryset = Operacao.objects.all()
    lookup_field = "pk"

    def upload(self, request, pk=None):
        serializer = OperacaoImagemUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            operacao = upload_imagem_operacao(
                operacao_id=str(pk),
                arquivo=serializer.validated_data["arquivo"],
                request=request,
            )
        except OperacaoImagemServiceError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except Operacao.DoesNotExist:
            return Response({"detail": "Operacao nao encontrada."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            OperacaoImagemResponseSerializer(operacao).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, pk=None):
        try:
            operacao = remover_imagem_operacao(operacao_id=str(pk))
        except OperacaoImagemServiceError as error:
            return Response({"detail": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except Operacao.DoesNotExist:
            return Response({"detail": "Operacao nao encontrada."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            OperacaoImagemResponseSerializer(operacao).data,
            status=status.HTTP_200_OK,
        )
