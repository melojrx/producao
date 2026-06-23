export class DjangoTokenAusenteError extends Error {
  constructor() {
    super(
      'Login Django necessario: token JWT ausente. Configure o cookie django_access_token (HU 16.11) ou DJANGO_DEV_ACCESS_TOKEN apenas em desenvolvimento.'
    )
    this.name = 'DjangoTokenAusenteError'
  }
}
