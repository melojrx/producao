from django.urls import path

from metas.viewsets.meta_mensal import MetaMensalViewSet

urlpatterns = [
    path(
        "metas/",
        MetaMensalViewSet.as_view({"get": "list", "post": "create"}),
        name="meta-mensal-list",
    ),
    path("metas/resumo/", MetaMensalViewSet.as_view({"get": "resumo"}), name="meta-mensal-resumo"),
    path(
        "metas/competencia/<str:competencia>/",
        MetaMensalViewSet.as_view({"get": "por_competencia"}),
        name="meta-mensal-competencia",
    ),
    path(
        "metas/<uuid:pk>/",
        MetaMensalViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="meta-mensal-detail",
    ),
]
