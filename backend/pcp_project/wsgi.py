"""WSGI config for pcp_project."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pcp_project.config.local")

application = get_wsgi_application()
