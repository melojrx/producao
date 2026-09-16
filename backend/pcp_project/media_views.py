from pathlib import Path

from django.conf import settings
from django.core.exceptions import SuspiciousFileOperation
from django.http import Http404, HttpRequest, HttpResponse
from django.utils._os import safe_join
from django.views.static import serve as static_serve


def serve_media(request: HttpRequest, path: str) -> HttpResponse:
    """Entrega mídia persistente somente quando habilitada explicitamente."""
    if not getattr(settings, "SERVE_MEDIA_FILES", False):
        raise Http404("Entrega de mídia não está habilitada.")

    try:
        arquivo = Path(safe_join(str(settings.MEDIA_ROOT), path))
    except SuspiciousFileOperation as exc:
        raise Http404("Arquivo não encontrado.") from exc

    if not arquivo.is_file():
        raise Http404("Arquivo não encontrado.")

    return static_serve(request, path, document_root=settings.MEDIA_ROOT)
