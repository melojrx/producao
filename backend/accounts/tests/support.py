from __future__ import annotations

from accounts.models import User


def criar_usuario_admin(*, email: str = "admin@test.com", senha: str = "senha-teste") -> User:
    usuario, _created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email,
            "nome": "Admin Teste",
            "papel": User.Papel.ADMIN,
            "ativo": True,
            "is_staff": True,
            "is_superuser": True,
            "pode_revisar_qualidade": True,
        },
    )
    usuario.set_password(senha)
    usuario.is_active = True
    usuario.ativo = True
    usuario.save()
    return usuario


def criar_usuario_supervisor(
    *,
    email: str = "supervisor@test.com",
    senha: str = "senha-teste",
    pode_revisar_qualidade: bool = False,
) -> User:
    usuario, _created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email,
            "nome": "Supervisor Teste",
            "papel": User.Papel.SUPERVISOR,
            "ativo": True,
            "pode_revisar_qualidade": pode_revisar_qualidade,
        },
    )
    usuario.set_password(senha)
    usuario.is_active = True
    usuario.ativo = True
    usuario.pode_revisar_qualidade = pode_revisar_qualidade
    usuario.save()
    return usuario
