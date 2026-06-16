import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Papel(models.TextChoices):
        ADMIN = "admin", "Admin"
        SUPERVISOR = "supervisor", "Supervisor"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nome = models.CharField(max_length=150, blank=True)
    papel = models.CharField(max_length=20, choices=Papel.choices, default=Papel.SUPERVISOR)
    pode_revisar_qualidade = models.BooleanField(default=False)
    ativo = models.BooleanField(default=True)
    supabase_auth_uid = models.UUIDField(null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["papel", "ativo"]),
            models.Index(fields=["supabase_auth_uid"]),
        ]

    def __str__(self) -> str:
        return self.nome or self.get_username()
