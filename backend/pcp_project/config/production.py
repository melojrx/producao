import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

S3_REQUIRED_ENV_VARS = (
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_STORAGE_BUCKET_NAME",
)


def _require_non_empty_env(
    name: str,
    environ: os._Environ | dict[str, str] | None = None,
) -> str:
    env = environ if environ is not None else os.environ
    value = env.get(name, "").strip()
    if not value:
        raise ImproperlyConfigured(
            f"Variavel de ambiente obrigatoria ausente ou vazia: {name}"
        )
    return value


def validar_configuracao_s3_storage(
    use_s3: bool,
    environ: dict[str, str] | None = None,
) -> None:
    if not use_s3:
        return
    env = environ if environ is not None else os.environ
    for name in S3_REQUIRED_ENV_VARS:
        _require_non_empty_env(name, environ=env)


def resolve_aws_default_acl(
    environ: os._Environ | dict[str, str] | None = None,
) -> str:
    env = environ if environ is not None else os.environ
    return env.get("AWS_DEFAULT_ACL", "private")


def _env_list(name: str) -> list[str]:
    return [value.strip() for value in os.environ.get(name, "").split(",") if value.strip()]


DEBUG = False

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", "").split(",")
    if host.strip()
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["POSTGRES_DB"],
        "USER": os.environ["POSTGRES_USER"],
        "PASSWORD": os.environ["POSTGRES_PASSWORD"],
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "CONN_MAX_AGE": int(os.environ.get("POSTGRES_CONN_MAX_AGE", "60")),
    }
}

MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", str(BASE_DIR / "media")))  # noqa: F405
MEDIA_URL = os.environ.get("MEDIA_URL", "/media/")
MEDIA_BASE_URL = os.environ.get("MEDIA_BASE_URL", "")

STATIC_ROOT = Path(os.environ.get("STATIC_ROOT", str(BASE_DIR / "staticfiles")))  # noqa: F405
STATIC_URL = os.environ.get("STATIC_URL", "/static/")

MIDDLEWARE = [  # noqa: F811
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    *MIDDLEWARE[1:],  # noqa: F405
]

USE_S3_STORAGE = os.environ.get("USE_S3_STORAGE", "false").lower() in {"1", "true", "yes"}

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

if USE_S3_STORAGE:
    validar_configuracao_s3_storage(USE_S3_STORAGE)

    INSTALLED_APPS = [*INSTALLED_APPS, "storages"]  # noqa: F405

    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    }

    AWS_ACCESS_KEY_ID = _require_non_empty_env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = _require_non_empty_env("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = _require_non_empty_env("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME", "us-east-1")
    AWS_S3_CUSTOM_DOMAIN = os.environ.get("AWS_S3_CUSTOM_DOMAIN") or None
    AWS_DEFAULT_ACL = resolve_aws_default_acl()
    AWS_QUERYSTRING_AUTH = os.environ.get("AWS_QUERYSTRING_AUTH", "false").lower() in {
        "1",
        "true",
        "yes",
    }
    AWS_S3_FILE_OVERWRITE = False

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "false").lower() in {
    "1",
    "true",
    "yes",
}
SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() in {
    "1",
    "true",
    "yes",
}
CSRF_COOKIE_SECURE = os.environ.get("CSRF_COOKIE_SECURE", "false").lower() in {
    "1",
    "true",
    "yes",
}
SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = SECURE_HSTS_SECONDS > 0
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

CSRF_TRUSTED_ORIGINS = _env_list("CSRF_TRUSTED_ORIGINS")

CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS")
CORS_ALLOWED_ORIGIN_REGEXES = _env_list("CORS_ALLOWED_ORIGIN_REGEXES")

if CORS_ALLOWED_ORIGINS or CORS_ALLOWED_ORIGIN_REGEXES:
    INSTALLED_APPS = [*INSTALLED_APPS, "corsheaders"]  # noqa: F405

    MIDDLEWARE = [  # noqa: F811
        "corsheaders.middleware.CorsMiddleware",
        *MIDDLEWARE,  # noqa: F405
    ]

    # JWT via Authorization header — cookies de sessao nao sao usados pela API Next.js.
    CORS_ALLOW_CREDENTIALS = False
    CORS_ALLOW_HEADERS = (
        "accept",
        "authorization",
        "content-type",
        "origin",
        "user-agent",
        "x-csrftoken",
        "x-requested-with",
    )

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "structured": {
            "format": (
                "timestamp=%(asctime)s level=%(levelname)s "
                "logger=%(name)s message=%(message)s"
            ),
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "structured",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}
