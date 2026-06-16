import os

from .base import *  # noqa: F403

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "backend"]

MEDIA_BASE_URL = os.environ.get("MEDIA_BASE_URL", "http://localhost:8001")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "pcp_db"),
        "USER": os.environ.get("POSTGRES_USER", "pcp_user"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "pcp_password"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}
