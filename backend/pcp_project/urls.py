"""URL configuration for the PCP Django backend."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def healthcheck(_request):
    from django.db import connection

    payload = {"status": "ok", "database": "ok"}

    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        payload["status"] = "degraded"
        payload["database"] = "unavailable"
        return JsonResponse(payload, status=503)

    return JsonResponse(payload)


urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("health/", healthcheck, name="healthcheck"),
    path("api/v1/cadastros/", include("cadastros.urls")),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/produtos/", include("produtos.urls")),
    path("api/v1/", include("turnos.urls")),
    path("api/v1/", include("producao.urls")),
    path("api/v1/", include("qualidade.urls")),
    path("api/v1/", include("relatorios.urls")),
    path("api/v1/scanner/", include("scanner.urls")),
    path("api/v1/", include("metas.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
