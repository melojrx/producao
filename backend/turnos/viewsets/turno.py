from rest_framework import viewsets
from rest_framework.decorators import action
from shared.permissions import IsSupervisor
from rest_framework.response import Response

from turnos.models import Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda, TurnoSetorOperacao, TurnoSetorOp, TurnoOperador
from turnos.selectors import (
    get_turno,
    get_turno_aberto,
    get_turno_completo,
    get_turno_ultimo_encerrado,
    list_turno_ops,
    list_turno_setor_demandas,
    list_turno_setor_operacoes,
    list_turno_setor_ops,
    list_turno_setores,
    list_turnos,
)
from turnos.serializers.turno import (
    TurnoDetailSerializer,
    TurnoOpSerializer,
    TurnoOperadorSerializer,
    TurnoSerializer,
    TurnoSetorDemandaSerializer,
    TurnoSetorOperacaoSerializer,
    TurnoSetorOpSerializer,
    TurnoSetorSerializer,
)


class TurnoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para Turno - leitura."""

    permission_classes = [IsSupervisor]
    serializer_class = TurnoSerializer

    def get_queryset(self):
        status = self.request.query_params.get("status")
        return list_turnos(status=status)

    def retrieve(self, request, *args, **kwargs):
        instance = get_turno(kwargs["pk"])
        serializer = TurnoDetailSerializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def aberto(self, request):
        """Retorna turno aberto ou None."""
        instance = get_turno_aberto()
        if not instance:
            return Response({"detail": "Nenhum turno aberto."}, status=404)
        serializer = TurnoDetailSerializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="ultimo-encerrado")
    def ultimo_encerrado(self, request):
        """Retorna o ultimo turno encerrado ou 404."""
        instance = get_turno_ultimo_encerrado()
        if not instance:
            return Response({"detail": "Nenhum turno encerrado."}, status=404)
        serializer = TurnoDetailSerializer(instance)
        return Response(serializer.data)


class TurnoOpViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para TurnoOp - OPs planejadas."""

    permission_classes = [IsSupervisor]
    serializer_class = TurnoOpSerializer
    queryset = TurnoOp.objects.none()

    def get_queryset(self):
        turno_id = self.request.query_params.get("turno")
        if turno_id:
            return list_turno_ops(turno_id)
        return TurnoOp.objects.none()


class TurnoSetorViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para TurnoSetor - setores ativos no turno."""

    permission_classes = [IsSupervisor]
    serializer_class = TurnoSetorSerializer
    queryset = TurnoSetor.objects.none()

    def get_queryset(self):
        turno_id = self.request.query_params.get("turno")
        if turno_id:
            return list_turno_setores(turno_id)
        return TurnoSetor.objects.none()


class TurnoSetorDemandaViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para TurnoSetorDemanda - demandas no setor."""

    permission_classes = [IsSupervisor]
    serializer_class = TurnoSetorDemandaSerializer
    queryset = TurnoSetorDemanda.objects.none()

    def get_queryset(self):
        turno_setor_id = self.request.query_params.get("turno_setor")
        turno_id = self.request.query_params.get("turno")
        if turno_setor_id:
            return list_turno_setor_demandas(turno_setor_id=turno_setor_id)
        if turno_id:
            return list_turno_setor_demandas(turno_id=turno_id)
        return TurnoSetorDemanda.objects.none()


class TurnoSetorOperacaoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para TurnoSetorOperacao - operacoes atomicas."""

    permission_classes = [IsSupervisor]
    serializer_class = TurnoSetorOperacaoSerializer
    queryset = TurnoSetorOperacao.objects.none()

    def get_queryset(self):
        demanda_id = self.request.query_params.get("demanda")
        turno_id = self.request.query_params.get("turno")
        if demanda_id:
            return list_turno_setor_operacoes(turno_setor_demanda_id=demanda_id)
        if turno_id:
            return list_turno_setor_operacoes(turno_id=turno_id)
        return TurnoSetorOperacao.objects.none()


class TurnoOperadorViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para TurnoOperador - vinculos turno x operador."""

    permission_classes = [IsSupervisor]
    serializer_class = TurnoOperadorSerializer
    queryset = TurnoOperador.objects.none()

    def get_queryset(self):
        turno_id = self.request.query_params.get("turno")
        if turno_id:
            return TurnoOperador.objects.filter(turno_id=turno_id).select_related(
                "operador", "setor"
            )
        return TurnoOperador.objects.none()


class TurnoSetorOpViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para TurnoSetorOp - secoes legadas do turno."""

    permission_classes = [IsSupervisor]
    serializer_class = TurnoSetorOpSerializer
    queryset = TurnoSetorOp.objects.none()

    def get_queryset(self):
        turno_id = self.request.query_params.get("turno")
        if turno_id:
            return list_turno_setor_ops(turno_id)
        return TurnoSetorOp.objects.none()