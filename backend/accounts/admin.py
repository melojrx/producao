from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from accounts.models import Operador, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = (
        (None, {"fields": ("email", "password")}),
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
        (
            "Permissões",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Datas importantes", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "nome",
                    "papel",
                    "pode_revisar_qualidade",
                    "ativo",
                    "is_staff",
                    "is_superuser",
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
    search_fields = ["email", "nome"]
    ordering = ["email"]


@admin.register(Operador)
class OperadorAdmin(admin.ModelAdmin):
    list_display = ["nome", "matricula", "status", "funcao", "created_at"]
    list_filter = ["status"]
    search_fields = ["nome", "matricula", "qr_code_token"]
    readonly_fields = ["created_at", "updated_at"]
