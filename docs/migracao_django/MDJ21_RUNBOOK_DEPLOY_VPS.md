# MDJ-21 — Runbook deploy VPS producao

**Data:** 2026-06-17  
**Sprint:** MDJ-21 — Deploy VPS producao  
**Dominio:** `producao.costurai.com.br`  
**VPS:** Hostinger Ubuntu — `38.52.128.62`  
**Pre-requisito:** MDJ-18 concluida; smoke local 5/5; **auditoria VPS** `MDJ21_VPS_AUDITORIA.md` lida.

> **Importante (auditoria 2026-06-19):** a VPS `srvjosemaria` ja roda **nginx host** em `:80`/`:443` (finanpy, brabustore, Hermes). Nossa stack **nao ocupa** essas portas — sobe em `127.0.0.1:8080` e entra via **novo vhost** nginx.

---

## Escopo deste deploy

| Inclui | Nao inclui |
|---|---|
| Stack Docker prod na VPS (db + backend + frontend + nginx) | Importacao de dados (MDJ-20) |
| TLS HTTPS | Cutover flags Django ON |
| Usuario admin Django inicial (vazio ou smoke) | Desligamento Supabase remoto |
| Smoke contra dominio publico | S3 |

**Estado esperado pos-deploy:** aplicacao acessivel em HTTPS, banco com **schema migrado e vazio** de dados de negocio, flags `NEXT_PUBLIC_USE_DJANGO_*` = `false`.

---

## Arquitetura na VPS (multi-app)

```text
Internet :443/:80
    └── nginx HOST (systemd — ja em producao, NAO parar)
            ├── brabustore.com.br     → 127.0.0.1:3001
            ├── investiorion.com      → 127.0.0.1:8001  (finanpy — NAO usar 8001)
            ├── neo.investiorion.com  → 127.0.0.1:8787
            └── producao.costurai.com.br → 127.0.0.1:8080  (NOVO)
                    └── Docker compose producao-prod
                            ├── proxy (nginx container) :8080
                            ├── backend :8000 (rede interna)
                            ├── frontend :3000 (rede interna)
                            └── db (rede interna — nunca publicar)
```

Projeto Compose: `producao-prod` (`docker-compose.prod.yml`). Detalhes: `MDJ21_VPS_AUDITORIA.md`.

---

## 1. Preparar a VPS

### 1.1 Verificar ambiente existente

Docker e nginx **ja instalados**. Nao reinstalar nem parar servicos.

```bash
docker ps
systemctl is-active nginx
ss -tlnp | grep -E ':80|:443|:8001|:3001|:8080'
```

Confirmar: **8080 livre**, **8001 ocupada** (finanpy).

### 1.2 Pacotes (somente se faltar git)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates
```

Instalar Docker Engine + Compose plugin **somente se** `docker --version` falhar.

Verificar:

```bash
docker --version
docker compose version
```

### 1.3 Firewall

UFW **ja ativo** (22, 80, 443). Nao alterar regras existentes.

```bash
ufw status
```

**Nao** abrir 8080 na UFW — upstream fica só em localhost.

### 1.4 DNS (ja feito)

Registro A `producao` → `38.52.128.62`. Validar:

```bash
dig +short producao.costurai.com.br
```

---

## 2. Codigo na VPS

```bash
sudo mkdir -p /opt/producao
sudo chown "$USER:$USER" /opt/producao
cd /opt/producao
git clone <URL_DO_REPOSITORIO> .
git checkout <branch-de-deploy>
```

Usar branch/tag acordada para producao (ex.: `main` apos merge).

---

## 3. Arquivo `.env` na VPS

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

### 3.1 Variaveis obrigatorias (producao real)

```bash
DJANGO_SECRET_KEY=<gerar-string-longa-aleatoria>
POSTGRES_PASSWORD=<senha-forte>

ALLOWED_HOSTS=producao.costurai.com.br,localhost,127.0.0.1,backend
PROD_HTTP_PORT=8080
# Proxy compose escuta 127.0.0.1:8080 — nginx HOST faz TLS e roteia

NEXT_PUBLIC_DJANGO_API_URL=https://producao.costurai.com.br
MEDIA_BASE_URL=https://producao.costurai.com.br
CORS_ALLOWED_ORIGINS=https://producao.costurai.com.br
CSRF_TRUSTED_ORIGINS=https://producao.costurai.com.br

SECURE_SSL_REDIRECT=true
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
SECURE_HSTS_SECONDS=31536000

# Primeira subida: todas OFF (fallback Supabase no frontend)
NEXT_PUBLIC_USE_DJANGO_AUTH=false
NEXT_PUBLIC_USE_DJANGO_SCANNER_READS=false
NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS=false
NEXT_PUBLIC_USE_DJANGO_METAS_READS=false
NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS=false
NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES=false
NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES=false
NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES=false

# Manter Supabase no build (frontend ainda usa fallback)
NEXT_PUBLIC_SUPABASE_URL=<valor-do-projeto>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<valor-do-projeto>
```

Gerar secret Django:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 3.2 Rebuild frontend

Variaveis `NEXT_PUBLIC_*` entram no **build** e no **runtime** do container. Qualquer alteracao exige:

```bash
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

---

## 4. Subir a stack

```bash
cd /opt/producao
docker compose -f docker-compose.prod.yml config   # validar sintaxe
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

O entrypoint do backend executa `migrate` e `collectstatic` automaticamente.

Logs:

```bash
docker compose -f docker-compose.prod.yml logs -f proxy backend
```

Health (upstream compose — antes do vhost host):

```bash
curl -s http://127.0.0.1:8080/health/ | jq .
# Esperado: {"status":"ok","database":"ok"}
```

---

## 5. Nginx HOST + TLS (obrigatorio nesta VPS)

Nginx **ja roda no host** e ocupa `:80`/`:443`. Seguir o padrao de `brabustore` / `finanpy`.

### 5.1 Criar vhost (HTTP primeiro — certbot)

```bash
nano /etc/nginx/sites-available/producao
```

Conteudo inicial (HTTP + proxy para teste local):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name producao.costurai.com.br;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
ln -sf /etc/nginx/sites-available/producao /etc/nginx/sites-enabled/producao
nginx -t && systemctl reload nginx
```

Validar HTTP (antes do cert):

```bash
curl -sI http://producao.costurai.com.br/health/
```

### 5.2 Certificado Let's Encrypt

```bash
certbot certonly --nginx -d producao.costurai.com.br
```

Nao altera certs de `brabustore.com.br`, `investiorion.com` ou `neo.investiorion.com`.

### 5.3 Completar vhost HTTPS

Adicionar bloco 443 (modelo completo em `MDJ21_VPS_AUDITORIA.md` secao 8) e redirect HTTP→HTTPS como brabustore.

```bash
nginx -t && systemctl reload nginx
```

**Requisito Django:** `SECURE_*=true` no `.env`; nginx host envia `X-Forwarded-Proto: https`.

Validar HTTPS:

```bash
curl -s https://producao.costurai.com.br/health/ | jq .
```

**Nunca** usar `systemctl restart nginx` se `nginx -t` falhar. Preferir **`reload`**.

---

## 6. Usuario admin inicial

Banco vazio — criar superusuario para smoke de login:

```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

Ou usuario de dominio conforme `MDJ13_VALIDACAO_AUTH.md`.

---

## 7. Smoke pos-deploy

Da maquina local (com `.env` apontando credenciais de teste):

```bash
SMOKE_PROD_BASE_URL=https://producao.costurai.com.br \
SMOKE_ADMIN_EMAIL=<email> \
SMOKE_ADMIN_PASSWORD=<senha> \
node scripts/smoke-stack-prod.mjs
```

Cenarios esperados (mesmos do homolog local):

- `proxy-health` — 200
- `api-via-proxy` — 401 sem token
- `frontend-login` — 200
- `admin-redirect-sem-sessao` — 307
- `django-login-via-proxy` — OK com credencial valida

Registrar saida em `MDJ21_VALIDACAO_DEPLOY_VPS.md`.

---

## 8. Backups na VPS

Agendar via cron (usuario com acesso ao Docker):

```bash
# Exemplo crontab — ajustar caminhos
0 3 * * * cd /opt/producao && ./scripts/infra/backup_postgres.sh >> /var/log/producao-backup.log 2>&1
0 4 * * * cd /opt/producao && ./scripts/infra/backup_media.sh >> /var/log/producao-backup.log 2>&1
```

Testar manualmente antes de agendar:

```bash
./scripts/infra/backup_postgres.sh
./scripts/infra/test_backup_env.sh
```

---

## 9. Atualizacao de versao (deploys futuros)

```bash
cd /opt/producao
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
# Se NEXT_PUBLIC_* mudou:
docker compose -f docker-compose.prod.yml build frontend && docker compose -f docker-compose.prod.yml up -d frontend
```

---

## 10. Rollback rapido

```bash
docker compose -f docker-compose.prod.yml down
git checkout <tag-anterior>
docker compose -f docker-compose.prod.yml up -d --build
```

Restore de banco: `scripts/infra/restore_postgres.sh` (ver `MDJ15_VALIDACAO_INFRA.md`).

---

## 11. CI/CD (GitHub Actions)

Push em **`main`** dispara:

1. **CI** (`.github/workflows/ci.yml`) — `tsc`, compose config, testes Django
2. **Deploy** (`.github/workflows/deploy-production.yml`) — SSH na VPS + `scripts/deploy/vps-production.sh`

### Secrets obrigatorios (GitHub → Settings → Secrets → Actions)

| Secret | Exemplo | Uso |
|---|---|---|
| `VPS_HOST` | `38.52.128.62` | SSH |
| `VPS_USER` | `root` | SSH |
| `VPS_SSH_KEY` | chave privada PEM | SSH |
| `VPS_DEPLOY_PATH` | `/opt/producao` | opcional; default `/opt/producao` |

### Environment `production`

Criar environment **production** no GitHub com protection rules (opcional: approval manual antes do deploy).

### Primeiro deploy

O CI/CD assume repo **ja clonado** na VPS com `.env` preenchido e vhost nginx configurado (secao 5 deste runbook). Apos bootstrap manual, pushes em `main` atualizam automaticamente.

---

## 12. Checklist MDJ-21

- [ ] Docker + Compose instalados na VPS
- [ ] Firewall: 22, 80, 443 apenas
- [ ] Repo clonado em `/opt/producao` (ou path acordado)
- [ ] `.env` preenchido — secrets fortes, flags OFF
- [ ] GitHub secrets CI/CD configurados (secao 11)
- [ ] `docker compose config` OK
- [ ] Stack `up -d --build` — todos healthy
- [ ] TLS HTTPS funcional
- [ ] `curl https://producao.costurai.com.br/health/` OK
- [ ] Superusuario criado
- [ ] `smoke-stack-prod.mjs` 5/5 contra dominio publico
- [ ] Backup manual testado
- [ ] `MDJ21_VALIDACAO_DEPLOY_VPS.md` preenchido

---

## Proximo marco

**MDJ-20** — importar snapshot congelado do Supabase (backup ja feito) para Postgres prod + midia + paridade. Ver `TASKS.md` sprint MDJ-20.

---

## Referencias

- `ESTADO_ATUAL.md` — visao geral da migracao
- `MDJ18_VALIDACAO_PRODUCAO.md` — homologacao local
- `MDJ15_VALIDACAO_INFRA.md` — scripts backup/restore
- `docker/README.md` — comandos Compose
