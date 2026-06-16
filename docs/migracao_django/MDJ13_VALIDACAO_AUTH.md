# MDJ-13 — Validacao Auth, Permissoes e Django Admin

**Data:** 2026-06-15
**Sprint:** MDJ-13 — Auth, permissoes e Django Admin
**Status:** ✅ Concluida

---

## Comandos de validacao

```bash
docker compose -f docker-compose.dev.yml build backend
docker compose -f docker-compose.dev.yml up -d backend
docker compose -f docker-compose.dev.yml exec -T backend python manage.py check
docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb
git diff --check
```

**Resultado (2026-06-15):**
- `manage.py check` — OK
- `makemigrations --check --dry-run` — No changes detected
- `manage.py test --keepdb` — **71 testes OK** (+5 em `accounts.tests`, +3 complementares em `qualidade.tests`)
- `git diff --check` — OK

---

## Endpoints de autenticacao

| Metodo | Rota | Auth | Status |
|--------|------|------|--------|
| POST | `/api/v1/accounts/login/` | Publico | Implementado + testado |
| POST | `/api/v1/accounts/refresh/` | Publico | Implementado (SimpleJWT) |
| GET | `/api/v1/accounts/me/` | JWT | Implementado + testado |

Payload login:
```json
{ "email": "admin@example.com", "senha": "senha" }
```

Resposta:
```json
{ "access": "...", "refresh": "...", "user": { "id", "email", "nome", "papel", "pode_revisar_qualidade", "ativo" } }
```

---

## Permissoes aplicadas

| Classe | Uso |
|--------|-----|
| `IsSupervisor` | Cadastros, produtos, turnos, producao, qualidade (defeitos), relatorios |
| `IsQualidadeReviewer` | `POST /api/v1/qualidade/revisoes/` |
| `AllowAny` | Apenas login e refresh |

**Evidencia:** `GET /api/v1/cadastros/setores/` retorna **401** sem Bearer token; `GET /health/` permanece **200**.

---

## Homologacao complementar — autoria da revisao de Qualidade

A revisao de Qualidade agora usa o usuario autenticado via JWT como revisor efetivo. O campo `revisor_usuario_id` permanece aceito no payload apenas por compatibilidade, mas nao define autoria.

Validacoes adicionadas:
- payload com `revisor_usuario_id` divergente grava/chama o service com `request.user.id`
- payload sem `revisor_usuario_id` continua aceito
- supervisor autenticado sem `pode_revisar_qualidade` recebe 403

Resultado:
```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test qualidade.tests.test_revisao_api --keepdb
```

- `qualidade.tests.test_revisao_api` — 9 testes OK

---

## Django Admin

Modelos registrados:
- `accounts.User`, `accounts.Operador`
- `cadastros.Setor`, `TipoMaquina`, `Maquina`, `Operacao`
- `produtos.Produto`, `ProdutoOperacao`

Acesso: `http://localhost:8001/admin/` (usuarios com `is_staff=True`).

---

## Management command

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py definir_senha_usuario --email <email> --senha <senha>
```

Usuarios importados do Supabase chegam com `set_unusable_password()` — este comando permite definir senha local para homologacao.

---

## Arquivos principais

| Camada | Arquivo |
|--------|---------|
| Config | `backend/pcp_project/config/base.py` (REST_FRAMEWORK, SIMPLE_JWT) |
| Permissoes | `backend/shared/permissions.py` |
| Auth service | `backend/accounts/services/auth.py` |
| API | `backend/accounts/viewsets/auth.py`, `accounts/urls.py` |
| Admin | `backend/accounts/admin.py`, `cadastros/admin.py`, `produtos/admin.py` |
| Testes | `backend/accounts/tests/test_auth_api.py` |

---

## Fora de escopo (confirmado intocado)

- Supabase remoto e Supabase Auth
- Frontend Next.js e Server Actions
- Cutover do login do frontend (MDJ-16)
- Storage de imagens (MDJ-14)
