from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import Operador, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "Perfil administrativo",
            {
                "fields": (
                    "nome",
                    "papel",
                    "pode_revisar_qualidade",
                    "ativo",
                    "supabase_auth_uid",
                )
            },
        ),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        (
            "Perfil administrativo",
            {
                "fields": (
                    "nome",
                    "papel",
                    "pode_revisar_qualidade",
                    "ativo",
                )
            },
        ),
    )
    list_display = [
        "email",
        "nome",
        "papel",
        "pode_revisar_qualidade",
        "ativo",
        "is_active",
        "is_staff",
    ]
    list_filter = ["papel", "ativo", "is_active", "pode_revisar_qualidade"]
    search_fields = ["email", "nome", "username"]
    ordering = ["email"]


@admin.register(Operador)
class OperadorAdmin(admin.ModelAdmin):
    list_display = ["nome", "matricula", "status", "funcao", "created_at"]
    list_filter = ["status"]
    search_fields = ["nome", "matricula", "qr_code_token"]
    readonly_fields = ["created_at", "updated_at"]
