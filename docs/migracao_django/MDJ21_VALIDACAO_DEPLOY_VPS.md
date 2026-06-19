# MDJ-21 — Validacao deploy VPS producao

**Data:** _(preencher apos deploy)_  
**Sprint:** MDJ-21 — Deploy VPS producao  
**Dominio:** `https://producao.costurai.com.br`  
**VPS:** `38.52.128.62`

---

## Escopo executado

- [ ] Stack Docker prod na VPS
- [ ] TLS HTTPS
- [ ] Banco migrado (vazio de dados de negocio)
- [ ] Flags Django OFF
- [ ] Smoke publico 5/5

---

## Comandos e evidencias

### Health

```bash
curl -s https://producao.costurai.com.br/health/
```

Resultado:

```json

```

### Smoke

```bash
SMOKE_PROD_BASE_URL=https://producao.costurai.com.br \
SMOKE_ADMIN_EMAIL=... \
SMOKE_ADMIN_PASSWORD=... \
node scripts/smoke-stack-prod.mjs
```

Resultado:

```text

```

### Compose ps

```bash
docker compose -f docker-compose.prod.yml ps
```

---

## Checklist MDJ-21

- [ ] Docker + firewall OK
- [ ] `.env` na VPS (secrets fortes, flags OFF)
- [ ] TLS funcional
- [ ] Superusuario criado
- [ ] Backup manual testado
- [ ] `git diff --check` OK (se houve commit de doc pos-deploy)

---

## Proximo marco

**MDJ-20** — importacao snapshot congelado Supabase → Postgres prod.
