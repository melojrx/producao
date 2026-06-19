# MDJ-21 — Auditoria VPS (pre-deploy)

**Data:** 2026-06-19  
**Host:** `srvjosemaria` — `38.52.128.62` (Hostinger)  
**Acesso:** SSH `root@38.52.128.62` (chave configurada)  
**Objetivo:** Mapear o que já roda em produção e definir deploy **complementar**, sem derrubar serviços existentes.

---

## 1. Resumo executivo

A VPS **já é multi-app** com padrão maduro:

```text
Internet :80/:443
    └── nginx (systemd, host Ubuntu) — termina TLS, roteia por server_name
            ├── brabustore.com.br      → 127.0.0.1:3001  (Docker brabustore)
            ├── investiorion.com       → 127.0.0.1:8001  (Docker finanpy)
            ├── neo.investiorion.com   → 127.0.0.1:8787  (Hermes Web UI)
            └── (outros)               → Hermes webhooks, catch-all 444
```

**Conclusão:** nossa stack **não deve** publicar `80`/`443` no Docker. Seguir o **mesmo padrão** das apps existentes:

1. Compose `producao-prod` escuta só em **`127.0.0.1:8080`** (proxy interno nginx do compose).
2. Novo vhost nginx host: `producao.costurai.com.br` → `http://127.0.0.1:8080`.
3. Certificado Let's Encrypt **novo** (`certbot`), sem alterar certs de brabustore/finanpy/neo.
4. `nginx -t` + **`reload`** (nunca `stop`/`restart` brusco).

`producao.costurai.com.br` — DNS A já aponta para a VPS; **ainda não há vhost** nem certificado TLS para esse domínio.

---

## 2. Recursos do servidor

| Recurso | Valor | Observação |
|---|---|---|
| SO | Ubuntu 24.04, kernel 6.8 | VM Hostinger |
| RAM | 4,9 GiB total | ~2,4 GiB em uso; **swap 1,4/2 GiB** — pressão de memória |
| Disco `/` | 77 GiB, **57% usado** (44 GiB) | ~34 GiB livres |
| Load | 0,18 | Baixo no momento |
| Uptime | ~19 dias | Estável |

**Implicação:** stack PCP (Postgres + Gunicorn + Next.js + nginx container) cabe, mas convém monitorar RAM nos primeiros dias. Build Docker consome pico — fazer build em horário de baixo uso ou local + push de imagens (opcional, fase 2).

---

## 3. Portas em uso (localhost)

| Porta | Processo | App |
|---|---|---|
| **80, 443** | nginx (host) | Proxy principal — **não tocar** |
| **8001** | docker-proxy → finanpy-web | **investiorion.com** — **OCUPADA** |
| **3001** | docker-proxy → brabustore-app | **brabustore.com.br** |
| 3000 | node | WhatsApp bridge (Hermes) |
| 8787 | python | Hermes Web UI backend |
| 8644, 8642 | hermes | Webhooks / gateway |
| 9119 | hermes | Dashboard |
| 6379 | redis | Local only |
| 22000 | syncthing | UFW aberta |

### Portas livres para PCP (confirmado via `ss`)

| Porta | Uso proposto |
|---|---|
| **8080** | Proxy nginx **interno** do compose `producao-prod` |
| **8002** | Debug opcional backend (`BACKEND_PORT` já previsto no compose) |

**Não usar 8001** — conflito direto com FinanPy.

---

## 4. Docker na VPS

| Item | Detalhe |
|---|---|
| Versão | Docker 29.1.3, Compose 2.40.3 |
| Projetos ativos | `finanpy`, `brabustore` |
| Containers | 4 running (2 apps + 2 Postgres) |
| Working dirs | `/srv/apps/finanpy`, `/srv/apps/brabustore` |
| Bind pattern | `127.0.0.1:PORT:container` — **replicar** |
| Volumes | Isolados por projeto (`finanpy_*`, `brabustore_*`) |
| Build cache | ~3,7 GiB reclaimable (`docker builder prune` opcional, não urgente) |

Nosso projeto Compose **`producao-prod`** (wrapper raiz) mantém volumes **separados** — zero risco de colisão com finanpy/brabustore.

---

## 5. Nginx host (produção existente)

**Serviço:** `nginx.service` — **active**  
**Sites enabled:**

| Arquivo | Domínio(s) | Upstream |
|---|---|---|
| `brabustore` | brabustore.com.br | 127.0.0.1:3001 |
| `finanpy` | investiorion.com | 127.0.0.1:8001 |
| `hermes-webui` | neo.investiorion.com + default_server | 8787, 8644 |

**Certificados Let's Encrypt existentes:**

- `brabustore.com.br` (expira 2026-08-30)
- `investiorion.com` (expira 2026-07-23)
- `neo.investiorion.com` (expira 2026-07-23)

**`producao.costurai.com.br`:** ausente em `/etc/nginx/` — precisa **novo** site.

**Comportamento HTTP hoje:** qualquer host na porta 80 sem vhost dedicado cai no `default_server` do Hermes → redirect 301 para HTTPS. Com server_name específico para `producao.costurai.com.br`, o nginx escolhe o bloco correto (prioridade sobre `default_server`).

**HTTPS hoje:** `default_server` na 443 devolve **444** para hosts desconhecidos — por isso `https://producao.costurai.com.br` ainda falha (sem cert + sem vhost).

---

## 6. Firewall e segurança

- **UFW:** active — allow 22, 80, 443, 22000; default deny incoming.
- **Fail2Ban:** ativo no SSH (vários IPs banidos).
- Portas de app (3001, 8001, 8080) **não** expostas na UFW — só localhost. Correto.

---

## 7. DNS

```text
producao.costurai.com.br  →  38.52.128.62  ✅
costurai.com.br           →  38.52.128.62  ✅
```

---

## 8. Estratégia de deploy recomendada (complementar)

### O que fazer

| Passo | Ação | Risco p/ apps existentes |
|---|---|---|
| 1 | Clonar repo em `/opt/producao` (ou `/srv/apps/producao` — alinhar com convenção) | Nenhum |
| 2 | `.env` com secrets; `PROD_HTTP_PORT=8080`; flags Django OFF | Nenhum |
| 3 | Ajustar compose proxy: bind **`127.0.0.1:8080:80`** (não `0.0.0.0:80`) | Nenhum |
| 4 | `docker compose -f docker-compose.prod.yml up -d --build` | Nenhum — portas isoladas |
| 5 | Criar `/etc/nginx/sites-available/producao` + symlink enabled | Nenhum se `nginx -t` OK |
| 6 | `certbot certonly --nginx -d producao.costurai.com.br` | Baixo — só adiciona cert |
| 7 | `systemctl reload nginx` | Baixo — reload graceful |
| 8 | Smoke `SMOKE_PROD_BASE_URL=https://producao.costurai.com.br` | Nenhum |

### O que **não** fazer

- ❌ `PROD_HTTP_PORT=80` no compose — **conflita** com nginx host.
- ❌ Parar/reiniciar nginx sem `nginx -t`.
- ❌ Reutilizar porta **8001** ou **3001**.
- ❌ Mesclar volumes Postgres com `finanpy` / `brabustore`.
- ❌ Alterar vhosts existentes (brabustore, finanpy, hermes).

### Esboço vhost nginx (host)

Modelo alinhado a `brabustore` — revisar antes de aplicar:

```nginx
# /etc/nginx/sites-available/producao
server {
    listen 80;
    listen [::]:80;
    server_name producao.costurai.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name producao.costurai.com.br;

    ssl_certificate /etc/letsencrypt/live/producao.costurai.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/producao.costurai.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Ordem segura certbot: criar bloco HTTP com `server_name producao.costurai.com.br` → emitir cert → completar bloco HTTPS → `reload`.

---

## 9. Ajustes no repositório (antes do deploy)

| Item | Mudança sugerida |
|---|---|
| `docker/compose/prod.proxy.yml` | `127.0.0.1:${PROD_HTTP_PORT:-8080}:80` |
| `MDJ21_RUNBOOK_DEPLOY_VPS.md` | Remover `PROD_HTTP_PORT=80`; documentar nginx host |
| Path na VPS | `/opt/producao` ou `/srv/apps/producao` |

---

## 10. Checklist de validação pós-análise

- [x] SSH funcional
- [x] Mapa de portas e apps documentado
- [x] Conflito 80/443 identificado
- [x] Porta upstream 8080 livre
- [x] Padrão nginx host confirmado (finanpy/brabustore)
- [x] DNS producao.costurai.com.br OK
- [ ] Ajuste compose bind localhost (HU deploy)
- [ ] Vhost + certbot + reload nginx (HU deploy)

---

## Referências

- Runbook deploy (a atualizar): `MDJ21_RUNBOOK_DEPLOY_VPS.md`
- Apps existentes: `/srv/apps/finanpy`, `/srv/apps/brabustore`
- Nginx: `/etc/nginx/sites-enabled/`
