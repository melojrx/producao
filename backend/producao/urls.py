from django.urls import path

from producao.viewsets.producao import ApontamentoOperacaoViewSet, RegistroProducaoViewSet

urlpatterns = [
    path("producao/apontamentos/", ApontamentoOperacaoViewSet.as_view({"post": "create"}), name="producao-apontamentos-create"),
    path("producao/registros/", RegistroProducaoViewSet.as_view({"get": "list"}), name="producao-registros-list"),
    path("producao/registros/<uuid:pk>/", RegistroProducaoViewSet.as_view({"get": "retrieve"}), name="producao-registros-detail"),
]
