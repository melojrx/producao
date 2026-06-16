from django.urls import path

from qualidade.viewsets.qualidade import (
    QualidadeDefeitoViewSet,
    QualidadeDetalheViewSet,
    QualidadeRegistroViewSet,
)
from qualidade.viewsets.revisao import RevisaoQualidadeOperacionalViewSet

urlpatterns = [
    path(
        "qualidade/revisoes/",
        RevisaoQualidadeOperacionalViewSet.as_view({"post": "create"}),
        name="qualidade-revisoes-create",
    ),
    path("qualidade/registros/", QualidadeRegistroViewSet.as_view({"get": "list"}), name="qualidade-registros-list"),
    path("qualidade/registros/<uuid:pk>/", QualidadeRegistroViewSet.as_view({"get": "retrieve"}), name="qualidade-registros-detail"),
    path("qualidade/detalhes/", QualidadeDetalheViewSet.as_view({"get": "list"}), name="qualidade-detalhes-list"),
    path(
        "qualidade/defeitos/",
        QualidadeDefeitoViewSet.as_view({"get": "list", "post": "create"}),
        name="qualidade-defeitos-list",
    ),
    path(
        "qualidade/defeitos/<uuid:pk>/",
        QualidadeDefeitoViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="qualidade-defeitos-detail",
    ),
    path(
        "qualidade/defeitos/<uuid:pk>/inativar/",
        QualidadeDefeitoViewSet.as_view({"post": "inativar"}),
        name="qualidade-defeitos-inativar",
    ),
    path(
        "qualidade/defeitos/<uuid:pk>/reativar/",
        QualidadeDefeitoViewSet.as_view({"post": "reativar"}),
        name="qualidade-defeitos-reativar",
    ),
]
