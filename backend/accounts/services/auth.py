from __future__ import annotations

from django.contrib.auth import authenticate

from accounts.models import User


class AuthServiceError(ValueError):
    """Erro de autenticacao ou autorizacao administrativa."""


def autenticar_usuario_administrativo(*, email: str, senha: str) -> User:
    email_normalizado = email.strip().lower()
    if not email_normalizado or not senha:
        raise AuthServiceError("Email e senha são obrigatórios.")

    usuario = authenticate(username=email_normalizado, password=senha)
    if usuario is None:
        usuario = User.objects.filter(email__iexact=email_normalizado).first()
        if usuario is None or not usuario.check_password(senha):
            raise AuthServiceError("Email ou senha inválidos.")

    if not isinstance(usuario, User):
        raise AuthServiceError("Email ou senha inválidos.")

    if not usuario.is_active or not usuario.ativo:
        raise AuthServiceError("Sua conta não possui cadastro administrativo ativo.")

    if usuario.papel not in (User.Papel.ADMIN, User.Papel.SUPERVISOR):
        raise AuthServiceError("Sua conta não possui permissão para acessar a área administrativa.")

    return usuario
