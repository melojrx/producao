from django.core.management.base import BaseCommand, CommandError

from accounts.models import User


class Command(BaseCommand):
    help = "Define senha de um usuario administrativo importado do Supabase."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--email", required=True, help="Email do usuario")
        parser.add_argument("--senha", required=True, help="Nova senha")

    def handle(self, *args, **options) -> None:
        email = str(options["email"]).strip().lower()
        senha = str(options["senha"])
        if len(senha) < 6:
            raise CommandError("A senha deve ter pelo menos 6 caracteres.")

        usuario = User.objects.filter(email__iexact=email).first()
        if usuario is None:
            raise CommandError(f"Usuario com email {email} nao encontrado.")

        usuario.set_password(senha)
        usuario.save(update_fields=["password"])
        self.stdout.write(self.style.SUCCESS(f"Senha atualizada para {email}"))
