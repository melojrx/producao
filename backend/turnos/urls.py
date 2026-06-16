from django.urls import path

from turnos.viewsets.mutacao import AbrirTurnoViewSet, EncerrarTurnoViewSet
from turnos.viewsets.turno import (
    TurnoOpViewSet,
    TurnoOperadorViewSet,
    TurnoSetorDemandaViewSet,
    TurnoSetorOperacaoViewSet,
    TurnoSetorViewSet,
    TurnoViewSet,
)

urlpatterns = [
    path("turnos/abrir/", AbrirTurnoViewSet.as_view({"post": "create"}), name="turno-abrir"),
    path(
        "turnos/<uuid:turno_id>/encerrar/",
        EncerrarTurnoViewSet.as_view({"post": "create"}),
        name="turno-encerrar",
    ),
    path("turnos/", TurnoViewSet.as_view({"get": "list"}), name="turno-list"),
    path("turnos/aberto/", TurnoViewSet.as_view({"get": "aberto"}), name="turno-aberto"),
    path("turnos/<uuid:pk>/", TurnoViewSet.as_view({"get": "retrieve"}), name="turno-detail"),
    path("turnos-ops/", TurnoOpViewSet.as_view({"get": "list"}), name="turno-op-list"),
    path("turnos-setores/", TurnoSetorViewSet.as_view({"get": "list"}), name="turno-setor-list"),
    path("turnos-demandas/", TurnoSetorDemandaViewSet.as_view({"get": "list"}), name="turno-demanda-list"),
    path("turnos-operacoes/", TurnoSetorOperacaoViewSet.as_view({"get": "list"}), name="turno-operacao-list"),
    path("turnos-operadores/", TurnoOperadorViewSet.as_view({"get": "list"}), name="turno-operador-list"),
]