from django.urls import path

from produtos.viewsets import ProdutoImagemViewSet, ProdutoOperacaoViewSet, ProdutoViewSet

urlpatterns = [
    path("", ProdutoViewSet.as_view({"get": "list"}), name="produto-list"),
    path("<uuid:pk>/", ProdutoViewSet.as_view({"get": "retrieve"}), name="produto-detail"),
    path(
        "<uuid:pk>/imagens/<str:tipo>/",
        ProdutoImagemViewSet.as_view({"post": "upload", "delete": "destroy"}),
        name="produto-imagem",
    ),
    path("operacoes/", ProdutoOperacaoViewSet.as_view({"get": "list"}), name="produto-operacao-list"),
    path("operacoes/<uuid:pk>/", ProdutoOperacaoViewSet.as_view({"get": "retrieve"}), name="produto-operacao-detail"),
]