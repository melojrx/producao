from django.conf import settings
from django.test import TestCase, override_settings
from django.urls import reverse

ALLOWED_ORIGIN = "https://app.example.com"
DISALLOWED_ORIGIN = "https://evil.example.com"

CORS_PRODUCTION_SETTINGS = {
    "INSTALLED_APPS": [*settings.INSTALLED_APPS, "corsheaders"],
    "MIDDLEWARE": [
        "corsheaders.middleware.CorsMiddleware",
        *settings.MIDDLEWARE,
    ],
    "CORS_ALLOWED_ORIGINS": [ALLOWED_ORIGIN],
    "CORS_ALLOW_CREDENTIALS": False,
    "CORS_ALLOW_HEADERS": (
        "accept",
        "authorization",
        "content-type",
        "origin",
        "user-agent",
        "x-csrftoken",
        "x-requested-with",
    ),
}


@override_settings(**CORS_PRODUCTION_SETTINGS)
class CorsProductionPreflightTests(TestCase):
    def test_options_preflight_from_allowed_origin_returns_access_control_allow_origin(
        self,
    ) -> None:
        response = self.client.options(
            reverse("healthcheck"),
            HTTP_ORIGIN=ALLOWED_ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Access-Control-Allow-Origin"], ALLOWED_ORIGIN)

    def test_options_preflight_from_disallowed_origin_does_not_reflect_origin(
        self,
    ) -> None:
        response = self.client.options(
            reverse("healthcheck"),
            HTTP_ORIGIN=DISALLOWED_ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        )

        allow_origin = response.get("Access-Control-Allow-Origin")
        self.assertNotEqual(allow_origin, DISALLOWED_ORIGIN)
