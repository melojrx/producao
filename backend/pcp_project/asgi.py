"""ASGI config for pcp_project."""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pcp_project.config.local")

application = get_asgi_application()
