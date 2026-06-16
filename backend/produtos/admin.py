from django.contrib import admin

from produtos.models import Produto, ProdutoOperacao


class ProdutoOperacaoInline(admin.TabularInline):
    model = ProdutoOperacao
    extra = 0
    fields = ["operacao", "sequencia", "versao_roteiro", "vigente"]


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nome", "ativo", "created_at"]
    list_filter = ["ativo"]
    search_fields = ["codigo", "nome"]
    inlines = [ProdutoOperacaoInline]


@admin.register(ProdutoOperacao)
class ProdutoOperacaoAdmin(admin.ModelAdmin):
    list_display = ["produto", "operacao", "sequencia", "versao_roteiro", "vigente"]
    list_filter = ["vigente"]
    search_fields = ["produto__codigo", "produto__nome", "operacao__codigo"]
