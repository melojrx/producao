from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from shared.permissions import IsSupervisor
from rest_framework.response import Response

from metas.models import MetaMensal
from metas.selectors import get_meta_mensal_by_competencia, get_resumo_meta_mensal_dashboard
from metas.serializers.meta_mensal import MetaMensalResumoDashboardSerializer, MetaMensalSerializer


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
