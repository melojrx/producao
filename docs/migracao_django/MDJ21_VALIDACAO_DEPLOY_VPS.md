# MDJ-21 — Validacao deploy VPS producao

**Data:** 2026-06-19  
**Sprint:** MDJ-21 — Deploy VPS producao  
**Dominio:** `https://producao.costurai.com.br`  
**VPS:** `38.52.128.62` (`srvjosemaria`)

---

## Escopo executado

- [x] Stack Docker prod na VPS (`producao-prod`)
- [x] TLS HTTPS (Let's Encrypt)
- [x] Banco migrado (vazio de dados de negocio)
- [x] Flags Django OFF
- [x] Apps existentes intactos (brabustore, finanpy, hermes)

---

## Comandos e evidencias

### Health

```bash
curl -s https://producao.costurai.com.br/health/
```

Resultado (2026-06-19):

```json
{"status": "ok", "database": "ok"}
```

### Stack

```bash
docker compose -f /opt/producao/docker-compose.prod.yml ps
```

| Servico | Status | Porta host |
|---|---|---|
| proxy | healthy | 127.0.0.1:8080 |
| backend | healthy | 127.0.0.1:8002 |
| frontend | up | interno |
| db | healthy | interno |

### Apps existentes (nao impactadas)

- `https://brabustore.com.br` → HTTP/2 200
- `https://investiorion.com` → HTTP/2 200

---

## Arquivos na VPS

| Item | Caminho |
|---|---|
| Deploy | `/opt/producao` |
| `.env` | `/opt/producao/.env` (chmod 600) |
| Credenciais admin | `/root/producao-bootstrap-credentials.txt` (chmod 600) |
| Log bootstrap | `/root/producao-bootstrap.log` |
| Nginx vhost | `/etc/nginx/sites-available/producao` |
| Cert TLS | `/etc/letsencrypt/live/producao.costurai.com.br/` |

---

## Checklist MDJ-21

- [x] Docker + firewall OK (pre-existente)
- [x] Repo clonado em `/opt/producao`
- [x] `.env` preenchido — flags OFF
- [x] GitHub secrets CI/CD configurados (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_DEPLOY_PATH`)
- [x] `docker compose config` OK
- [x] Stack `up -d --build` — healthy
- [x] TLS HTTPS funcional
- [x] Health publico OK
- [x] Superusuario criado (ver credenciais no VPS)
- [x] Smoke `smoke-stack-prod.mjs` 5/5 — 2026-06-19
- [ ] Backup manual testado
- [x] Este documento preenchido

Nota pos-MDJ20/cutover: a stack MDJ-21 permanece concluida; importacao de dados, ligacao das flags Django em producao e validacoes de scanner/API foram registradas em `MDJ20_VALIDACAO_IMPORTACAO_PRODUCAO.md`. O backup manual testado segue como pendencia operacional porque nao ha evidencia registrada neste documento.

### CI/CD (2026-06-19)

- GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_DEPLOY_PATH`
- Workflow **Deploy Production** run `27851730897` — ✅ success (merge `2ad1e8b`)
- `NEXT_PUBLIC_SUPABASE_*` adicionadas no `.env` VPS; frontend rebuild — `/login` HTTP 200

---

## Decisoes de bootstrap

- **Nginx host** termina TLS; compose escuta só `127.0.0.1:8080`.
- **`SECURE_SSL_REDIRECT=false`** no container Django — redirect HTTPS no edge (padrao multi-app na VPS).
- **Gunicorn** `--workers=1` na VPS 5GB RAM (ajustavel via `GUNICORN_CMD_ARGS`).

---

## Proximo marco

1. Backup manual testado (`scripts/infra/backup_postgres.sh`)
2. MDJ-19 — limpeza legado Supabase browser e checklist de desligamento remoto
3. Pendencias pos-cutover registradas na MDJ-20: spot-check `/media/` e primeiro registro novo apenas via Django
