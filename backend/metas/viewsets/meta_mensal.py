from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from shared.permissions import IsSupervisor
from rest_framework.response import Response

from metas.models import MetaMensal
from metas.selectors import get_meta_mensal_by_competencia, get_resumo_meta_mensal_dashboard
from metas.serializers.meta_mensal import MetaMensalResumoDashboardSerializer, MetaMensalSerializer
from metas.serializers.mutacao import MetaMensalInputSerializer
from metas.services import MetaMensalServiceError, criar_meta_mensal, editar_meta_mensal


class MetaMensalViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSupervisor]
    serializer_class = MetaMensalSerializer
    queryset = MetaMensal.objects.all().order_by("-competencia")

    def por_competencia(self, request, competencia: str | None = None):
        meta = get_meta_mensal_by_competencia(competencia)
        if meta is None:
            return Response({"detail": "Meta mensal não encontrada."}, status=404)
        serializer = MetaMensalSerializer(meta)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        competencia_param = request.query_params.get("competencia")
        try:
            data = get_resumo_meta_mensal_dashboard(competencia_param)
        except ValueError as exc:
            raise ValidationError({"competencia": str(exc)}) from exc

        serializer = MetaMensalResumoDashboardSerializer(data)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = MetaMensalInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            meta = criar_meta_mensal(
                competencia=dados["competencia"],
                meta_pecas=dados["meta_pecas"],
                dias_produtivos=dados["dias_produtivos"],
                observacao=dados.get("observacao", ""),
            )
        except MetaMensalServiceError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(MetaMensalSerializer(meta).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None, *args, **kwargs):
        serializer = MetaMensalInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        campos_obrigatorios = ("competencia", "meta_pecas", "dias_produtivos")
        if any(campo not in dados for campo in campos_obrigatorios):
            raise ValidationError({"detail": "Competência, meta em peças e dias produtivos são obrigatórios."})

        try:
            meta = editar_meta_mensal(
                meta_id=str(pk),
                competencia=dados["competencia"],
                meta_pecas=dados["meta_pecas"],
                dias_produtivos=dados["dias_produtivos"],
                observacao=dados.get("observacao", ""),
            )
        except MetaMensalServiceError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(MetaMensalSerializer(meta).data, status=status.HTTP_200_OK)
