import uuid

from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email: str, password: str | None = None, **extra_fields) -> "User":
        email_normalizado = self._normalizar_email_obrigatorio(email)
        extra_fields.setdefault("username", email_normalizado)
        user = self.model(email=email_normalizado, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email: str, password: str | None = None, **extra_fields) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("ativo", True)
        extra_fields.setdefault("papel", User.Papel.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser deve ter is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser deve ter is_superuser=True.")

        return self.create_user(email, password, **extra_fields)

    def _normalizar_email_obrigatorio(self, email: str | None) -> str:
        email_normalizado = self.normalize_email(email or "").strip().lower()
        if not email_normalizado:
            raise ValueError("Email é obrigatório.")
        return email_normalizado


class User(AbstractUser):
    class Papel(models.TextChoices):
        ADMIN = "admin", "Admin"
        SUPERVISOR = "supervisor", "Supervisor"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=254, unique=True, blank=True, editable=False)
    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=150, blank=True)
    papel = models.CharField(max_length=20, choices=Papel.choices, default=Papel.SUPERVISOR)
    pode_revisar_qualidade = models.BooleanField(default=False)
    ativo = models.BooleanField(default=True)
    supabase_auth_uid = models.UUIDField(null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    objects = UserManager()

    class Meta:
        indexes = [
            models.Index(fields=["papel", "ativo"]),
            models.Index(fields=["supabase_auth_uid"]),
        ]

    @property
    def identificacao(self) -> str:
        return self.nome or self.email

    def save(self, *args, **kwargs) -> None:
        self.email = User.objects._normalizar_email_obrigatorio(self.email)
        self.username = self.email
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.identificacao
