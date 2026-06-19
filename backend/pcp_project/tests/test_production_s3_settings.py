import os

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-for-production-import")
os.environ.setdefault("POSTGRES_DB", "test_db")
os.environ.setdefault("POSTGRES_USER", "test_user")
os.environ.setdefault("POSTGRES_PASSWORD", "test_password")

from pcp_project.config.production import (  # noqa: E402
    resolve_aws_default_acl,
    validar_configuracao_s3_storage,
)

VALID_S3_ENV = {
    "AWS_ACCESS_KEY_ID": "test-access-key",
    "AWS_SECRET_ACCESS_KEY": "test-secret-key",
    "AWS_STORAGE_BUCKET_NAME": "test-bucket",
}


class S3StorageValidationTests(SimpleTestCase):
    def test_missing_access_key_raises_improperly_configured(self) -> None:
        env = {
            "AWS_SECRET_ACCESS_KEY": "secret",
            "AWS_STORAGE_BUCKET_NAME": "bucket",
        }

        with self.assertRaises(ImproperlyConfigured) as context:
            validar_configuracao_s3_storage(True, environ=env)

        self.assertIn("AWS_ACCESS_KEY_ID", str(context.exception))

    def test_use_s3_false_skips_validation(self) -> None:
        validar_configuracao_s3_storage(False, environ={})

    def test_complete_s3_env_passes_validation(self) -> None:
        validar_configuracao_s3_storage(True, environ=VALID_S3_ENV)

    def test_aws_default_acl_defaults_to_private(self) -> None:
        self.assertEqual(resolve_aws_default_acl({}), "private")

    def test_aws_default_acl_respects_explicit_public_read(self) -> None:
        self.assertEqual(
            resolve_aws_default_acl({"AWS_DEFAULT_ACL": "public-read"}),
            "public-read",
        )
