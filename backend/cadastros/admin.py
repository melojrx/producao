from django.contrib import admin

from cadastros.models import Maquina, Operacao, Setor, TipoMaquina


@admin.register(Setor)
class SetorAdmin(admin.ModelAdmin):
    list_display = ["nome", "codigo", "situacao", "modo_apontamento", "sequencia_fluxo"]
    list_filter = ["situacao", "modo_apontamento"]
    search_fields = ["nome", "codigo"]


@admin.register(TipoMaquina)
class TipoMaquinaAdmin(admin.ModelAdmin):
    list_display = ["nome", "codigo"]
    search_fields = ["nome", "codigo"]


@admin.register(Maquina)
class MaquinaAdmin(admin.ModelAdmin):
    list_display = ["codigo", "modelo", "marca", "situacao"]
    list_filter = ["situacao"]
    search_fields = ["codigo", "modelo", "marca", "numero_patrimonio"]


@admin.register(Operacao)
class OperacaoAdmin(admin.ModelAdmin):
    list_display = ["codigo", "descricao", "setor", "tempo_padrao_min", "situacao"]
    list_filter = ["situacao", "setor"]
    search_fields = ["codigo", "descricao"]
