from django.urls import include, path
from rest_framework.routers import DefaultRouter

from cadastros.viewsets import (
    MaquinaViewSet,
    OperacaoImagemViewSet,
    OperacaoViewSet,
    OperadorViewSet,
    SetorViewSet,
    TipoMaquinaViewSet,
)

router = DefaultRouter()
router.register("setores", SetorViewSet, basename="setor")
router.register("operacoes", OperacaoViewSet, basename="operacao")
router.register("maquinas", MaquinaViewSet, basename="maquina")
router.register("tipos-maquina", TipoMaquinaViewSet, basename="tipo-maquina")
router.register("operadores", OperadorViewSet, basename="operador")

urlpatterns = [
    path("", include(router.urls)),
    path(
        "operacoes/<uuid:pk>/imagem/",
        OperacaoImagemViewSet.as_view({"post": "upload", "delete": "destroy"}),
        name="operacao-imagem",
    ),
]