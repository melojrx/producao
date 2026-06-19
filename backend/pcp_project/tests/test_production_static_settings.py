import os

from django.test import SimpleTestCase

os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-for-production-static")
os.environ.setdefault("POSTGRES_DB", "test_db")
os.environ.setdefault("POSTGRES_USER", "test_user")
os.environ.setdefault("POSTGRES_PASSWORD", "test_password")

from pcp_project.config import production  # noqa: E402


class ProductionStaticSettingsTests(SimpleTestCase):
    def test_static_root_e_url_configurados(self) -> None:
        self.assertTrue(str(production.STATIC_ROOT).endswith("staticfiles"))
        self.assertEqual(production.STATIC_URL, "/static/")

    def test_whitenoise_apos_security_middleware(self) -> None:
        security_index = production.MIDDLEWARE.index("django.middleware.security.SecurityMiddleware")
        whitenoise_index = production.MIDDLEWARE.index("whitenoise.middleware.WhiteNoiseMiddleware")
        self.assertEqual(whitenoise_index, security_index + 1)
