from django.urls import path

from scanner.viewsets.scanner import (
    ScannerOperadorDetailView,
    ScannerSetorDemandasView,
    ScannerSetorDetailView,
    ScannerTurnoSetorDemandasByIdView,
)

urlpatterns = [
    path(
        "operador/<str:token>/",
        ScannerOperadorDetailView.as_view(),
        name="scanner-operador",
    ),
    path(
        "setor/<str:token>/",
        ScannerSetorDetailView.as_view(),
        name="scanner-setor",
    ),
    path(
        "setor/<str:token>/demandas/",
        ScannerSetorDemandasView.as_view(),
        name="scanner-setor-demandas",
    ),
    path(
        "turno-setor/<uuid:turno_setor_id>/demandas/",
        ScannerTurnoSetorDemandasByIdView.as_view(),
        name="scanner-turno-setor-demandas",
    ),
]
