from rest_framework import viewsets
from rest_framework.decorators import action
from shared.permissions import IsSupervisor
from rest_framework.response import Response

from relatorios.selectors.dashboard import (
    get_dashboard_resumo,
    get_indicadores_qualidade,
    get_indicadores_turno,
    get_producao_diaria,
)
from relatorios.serializers.dashboard import (
    DashboardResumoSerializer,
    IndicadorTurnoSerializer,
    IndicadoresQualidadeSerializer,
    ProducaoDiariaSerializer,
)


class DashboardViewSet(viewsets.ViewSet):
    """ViewSet para dashboard operacional."""

    permission_classes = [IsSupervisor]

    @action(detail=False, methods=["get"])
    def resumo(self, request):
        """Retorna resumo geral do dashboard."""
        data = get_dashboard_resumo()
        serializer = DashboardResumoSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def indicadores_turno(self, request, pk=None):
        """Retorna indicadores de um turno especifico."""
        data = get_indicadores_turno(pk)
        serializer = IndicadorTurnoSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def producao_diaria(self, request):
        """Retorna producao diaria dos ultimos dias."""
        dias = int(request.query_params.get("dias", 30))
        data = get_producao_diaria(dias=dias)
        serializer = ProducaoDiariaSerializer(data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def indicadores_qualidade(self, request):
        """Retorna indicadores de qualidade."""
        dias = int(request.query_params.get("dias", 30))
        data = get_indicadores_qualidade(dias=dias)
        serializer = IndicadoresQualidadeSerializer(data)
        return Response(serializer.data)