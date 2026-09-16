# Migração do Produção para o Homelab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar `producao.costurai.com.br` da VPS para o Homelab com GHCR por digest, Docker Swarm, Traefik, WhiteNoise, mídia entregue pelo Django e parada reversível da VPS.

**Architecture:** CI publica imagens linux/amd64 imutáveis. Runner exclusivo promove somente seus digests para PostgreSQL privado, Django e Next.js no Swarm. Traefik roteia backend por caminho e frontend pela raiz; WhiteNoise atende estáticos e Django atende mídia persistente.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Django 6, PostgreSQL 16, Gunicorn, WhiteNoise, Docker Swarm, Traefik, Cloudflare Tunnel e GHCR.

## Global Constraints

- Não reabrir a Sprint 23 nem alterar o visual do admin.
- Não usar Nginx no Homelab. O Nginx e Compose atuais permanecem intactos na VPS até o desligamento final.
- WhiteNoise atende apenas `/static/`; `/media/` é rota explícita Django, condicionada a `SERVE_MEDIA_FILES=true`.
- O Homelab não faz checkout, `git pull` ou `docker build`; releases usam exclusivamente digests GHCR.
- Não expor PostgreSQL; banco, mídia, secrets, rede, runner e concorrência têm nomes exclusivos `producao_*`.
- Não registrar segredos em código, GitHub, documentação ou logs.
- Backup/restauração final, alteração Cloudflare/DNS, cutover e parada da VPS exigem confirmação explícita no momento da ação.

## File Structure

Create:

- `backend/pcp_project/media_views.py` — entrega de mídia segura.
- `backend/pcp_project/tests/test_media_views.py` — testes da entrega.
- `backend/docker-entrypoint-web.sh` e `backend/docker-entrypoint-migrate.sh` — processos separados.
- `deploy/swarm/producao.yml`, `deploy/swarm/producao-edge.yml`, `deploy/swarm/producao.env.example` — stack e contrato de ambiente.
- `scripts/homelab/load-env.sh`, `scripts/homelab/deploy-stack.sh`, `scripts/deploy-homelab.sh` — promoção validada.
- `ops/homelab-runner/deploy-producao` — wrapper versionado.
- `.github/workflows/build-homelab-image.yml` — build/publish/promoção.
- `docs/migracao_homelab/README.md` — runbook e evidências sem segredos.

Modify:

- `backend/pcp_project/urls.py` e `backend/pcp_project/config/production.py`.
- `backend/Dockerfile`, `docker/frontend/Dockerfile.prod`, `.github/workflows/ci.yml` e, só após cutover, `.github/workflows/deploy-production.yml`.

Do not modify during preparation: `docker/compose/prod.*.yml`, `docker/nginx/prod.conf`, `scripts/deploy/vps-production.sh`, `.env`, volumes ou containers VPS.

### Task 1: Registrar baseline e runbook

**Files:** Create: `docs/migracao_homelab/README.md`

**Interfaces:** Consumes VPS current state. Produces timestamped acceptance ledger.

- [ ] **Step 1: Criar seção Estado inicial**

Registrar domínio, SHA, stack `producao-prod`, volumes `producao-prod_postgres_data`/`producao-prod_media_data`, volumes-alvo e a regra de não documentar segredos.

- [ ] **Step 2: Registrar comandos agregados de paridade**

~~~bash
docker exec producao-prod-db-1 psql -U pcp_user -d pcp_db -At -F '|' \
  -c "select relname,n_live_tup from pg_stat_user_tables order by relname"
docker exec producao-prod-backend-1 find /app/media -type f | wc -l
docker exec producao-prod-backend-1 du -sb /app/media
~~~

- [ ] **Step 3: Verificar documentação**

Run: `git diff --check -- docs/migracao_homelab/README.md`  
Expected: sem saída.

### Task 2: Implementar mídia Django em produção

**Files:** Create: `backend/pcp_project/media_views.py`, `backend/pcp_project/tests/test_media_views.py`; Modify: `backend/pcp_project/urls.py`, `backend/pcp_project/config/production.py`.

**Interfaces:** Produces `serve_media(request, path: str)`; consumes `MEDIA_ROOT`, `MEDIA_URL`, `SERVE_MEDIA_FILES`.

- [ ] **Step 1: Escrever testes vermelhos**

Cobrir flag desligada → 404; arquivo existente → 200 e bytes; ausente → 404; `../secret` → 404; request com `HTTP_X_FORWARDED_PROTO='https'` sem redirect. Usar `TemporaryDirectory`, `override_settings` e `b''.join(response.streaming_content)`.

~~~python
with override_settings(MEDIA_ROOT=tempdir, SERVE_MEDIA_FILES=True):
    Path(tempdir, 'produtos', 'imagem.png').parent.mkdir(parents=True)
    Path(tempdir, 'produtos', 'imagem.png').write_bytes(b'png')
    response = self.client.get('/media/produtos/imagem.png', HTTP_X_FORWARDED_PROTO='https')
    self.assertEqual(response.status_code, 200)
    self.assertEqual(b''.join(response.streaming_content), b'png')
~~~

- [ ] **Step 2: Implementar view mínima**

Rejeitar flag falsa; resolver com `safe_join(str(settings.MEDIA_ROOT), path)`; converter `SuspiciousFileOperation` e ausência em `Http404`; devolver `django.views.static.serve` apenas para arquivo regular.

- [ ] **Step 3: Registrar rota e flag**

Em produção definir `SERVE_MEDIA_FILES = os.environ.get('SERVE_MEDIA_FILES', 'false').lower() in {'1', 'true', 'yes'}`. Manter `static()` só para DEBUG; quando `not DEBUG and SERVE_MEDIA_FILES`, registrar `path('media/<path:path>', serve_media, name='serve_media')`.

- [ ] **Step 4: Validar**

Run: `docker compose -f docker-compose.dev.yml run --rm --no-deps backend python manage.py test pcp_project.tests.test_media_views pcp_project.tests.test_production_static_settings`  
Expected: PASS.

### Task 3: Separar imagem web, collectstatic e migrate

**Files:** Create: `backend/docker-entrypoint-web.sh`, `backend/docker-entrypoint-migrate.sh`; Modify: `backend/Dockerfile`.

**Interfaces:** Produces Docker targets `web` and `migrate` from the same application source.

- [ ] **Step 1: Criar entrypoints de responsabilidade única**

`docker-entrypoint-web.sh` executa somente Gunicorn. `docker-entrypoint-migrate.sh` executa somente `python manage.py migrate --noinput` e encerra. Nenhum web task faz migration.

- [ ] **Step 2: Coletar estáticos no estágio de build**

Criar estágio `assets`; nele usar apenas valores artificiais de build para `DJANGO_SECRET_KEY`/PostgreSQL e rodar `python manage.py collectstatic --noinput`. Copiar `/app/staticfiles` para as imagens finais. Nenhuma variável artificial fica como ENV da imagem final.

- [ ] **Step 3: Validar targets**

~~~bash
docker build --target web -t producao-backend:test backend
docker build --target migrate -t producao-migrate:test backend
docker run --rm producao-backend:test test -d /app/staticfiles
~~~

Expected: exit 0.

### Task 4: Criar manifests Swarm sem Nginx

**Files:** Create: `deploy/swarm/producao.yml`, `deploy/swarm/producao-edge.yml`, `deploy/swarm/producao.env.example`.

**Interfaces:** Consumes `PRODUCAO_BACKEND_IMAGE`, `PRODUCAO_FRONTEND_IMAGE`, external secrets and `edge`. Produces `postgres`, `migrate`, `backend`, `frontend`, `cloudflared`.

- [ ] **Step 1: Declarar dados privados**

PostgreSQL `postgres:16-alpine` usa `producao_postgres_data`, rede overlay `producao_backend` com `internal: true`, secret `producao_postgres_password`, healthcheck `pg_isready` e nenhum `ports`. Backend monta `producao_media:/app/media`; não criar volume de staticfiles.

- [ ] **Step 2: Declarar web e migrate**

`migrate` inicia com zero réplicas e target Docker migrate. Backend usa target web, `SERVE_MEDIA_FILES=true`, health `/health/`; frontend usa `DJANGO_API_URL=http://backend:8000`. Ambos têm update rollback e placement `node.hostname == homelab`.

- [ ] **Step 3: Registrar routers Traefik**

Backend recebe prioridade 100 para `PathPrefix('/api/v1/')`, `/django-admin/`, `/health/` e `/media/`, porta 8000 e header `X-Forwarded-Proto=https`. Frontend recebe `Host('producao.costurai.com.br')`, prioridade 1 e porta 3000. Ambos usam `edge`; só backend conecta em `producao_backend`.

- [ ] **Step 4: Declarar Tunnel**

`producao-edge.yml` contém somente Cloudflare Tunnel com `producao_cloudflared_tunnel_token`, rede `edge`, uma réplica e `--token-file /run/secrets/producao_cloudflared_tunnel_token`.

- [ ] **Step 5: Validar manifest**

~~~bash
PRODUCAO_BACKEND_IMAGE=ghcr.io/melojrx/producao-backend@sha256:$(printf 'a%.0s' {1..64}) \
PRODUCAO_FRONTEND_IMAGE=ghcr.io/melojrx/producao-frontend@sha256:$(printf 'b%.0s' {1..64}) \
docker stack config -c deploy/swarm/producao.yml -c deploy/swarm/producao-edge.yml >/dev/null
~~~

Expected: exit 0; `rg -n 'nginx|ports:' deploy/swarm` não encontra Nginx nem porta PostgreSQL.

### Task 5: Criar controlador e staging por digest

**Files:** Create: `scripts/homelab/load-env.sh`, `scripts/homelab/deploy-stack.sh`, `scripts/deploy-homelab.sh`, `ops/homelab-runner/deploy-producao`.

**Interfaces:** Produces `deploy-stack.sh <release-dir> <backend-digest> <frontend-digest>`.

- [ ] **Step 1: Validar antes de qualquer I/O**

`load-env.sh` aceita exclusivamente `ghcr.io/melojrx/producao-backend@sha256:[a-f0-9]{64}` e equivalente frontend. Tags, digest curto e registry diferente falham antes de SSH/Docker.

- [ ] **Step 2: Implementar controlador root**

O controlador lê `/srv/producao/producao.env` root-owned, valida release, faz `docker pull` dos dois digests, aplica `docker stack deploy --with-registry-auth`, executa tarefa migrate temporária, espera backend/frontend 1/1 e verifica health. Caminho do release deve ser `/srv/producao/releases/sha256-<digest>`.

- [ ] **Step 3: Implementar staging manual**

`scripts/deploy-homelab.sh --stage-only <backend> <frontend>` transfere só manifests e scripts ao diretório derivado de digest. Sem a flag, chama wrapper instalado. Nunca transfere `.env`, fonte da app ou dados.

- [ ] **Step 4: Testar a fronteira**

~~~bash
shellcheck scripts/homelab/*.sh scripts/deploy-homelab.sh ops/homelab-runner/deploy-producao
sh scripts/deploy-homelab.sh --stage-only invalid invalid
~~~

Expected: ShellCheck passa; segundo comando falha antes de abrir SSH.

### Task 6: Publicar imagens sem mudar ainda o destino VPS

**Files:** Create: `.github/workflows/build-homelab-image.yml`; Modify: `.github/workflows/ci.yml`.

**Interfaces:** Produces outputs `backend_image` and `frontend_image` as immutable digests.

- [ ] **Step 1: Estender CI**

Adicionar teste Django de mídia e `docker stack config` com digests sintéticos. Preservar testes TypeScript, Compose e Django existentes.

- [ ] **Step 2: Criar workflow GHCR**

Após CI reutilizável, usar `docker/build-push-action@v6`: backend com contexto `backend`, target `web`; frontend com contexto raiz e `docker/frontend/Dockerfile.prod`. Ambos: `platforms: linux/amd64`, `provenance: true`, `sbom: true`, tag SHA e output digest no summary.

- [ ] **Step 3: Manter promoção Homelab manual neste estágio**

O job deploy usa `workflow_dispatch` e runner `[self-hosted, homelab-producao-deploy]`. Não tocar `.github/workflows/deploy-production.yml`: `main` continua atualizando a VPS até corte aprovado.

- [ ] **Step 4: Validar**

Run: `npx tsc --noEmit && docker compose -f docker-compose.prod.yml config >/dev/null && docker stack config -c deploy/swarm/producao.yml -c deploy/swarm/producao-edge.yml >/dev/null`  
Expected: exit 0.

### Task 7: Homologar a infraestrutura do Homelab

**Files:** Modify: `docs/migracao_homelab/README.md`.

**Interfaces:** Consumes prepared artifacts. Produces readiness proof without public cutover.

- [ ] **Step 1: Bloquear se o alvo estiver indisponível**

Run: `ssh -o BatchMode=yes -o ConnectTimeout=10 melojr@100.93.170.120 'docker info --format "{{.Swarm.LocalNodeState}} {{.Swarm.ControlAvailable}}"; docker network inspect edge >/dev/null'`  
Expected: `active true`; se falhar, parar sem criar recursos.

- [ ] **Step 2: Após autorização, criar recursos isolados**

Criar Swarm secrets `producao_django_secret_key`, `producao_postgres_password`, `producao_cloudflared_tunnel_token`; criar `/srv/producao/producao.env` root-owned; instalar `/usr/local/sbin/deploy-producao-release`; registrar runner com label `homelab-producao-deploy`.

- [ ] **Step 3: Ensaiar com hostname temporário**

Promover digest conhecido sem redirecionar o domínio canônico. Comprovar serviços 1/1, health, static via WhiteNoise, media via Django e ausência de PostgreSQL externo.

### Task 8: Executar backup e restore ensaiado

**Files:** Modify: `docs/migracao_homelab/README.md`.

**Interfaces:** Produces fresh custom dump, media tar and parity record.

- [ ] **Step 1: Solicitar autorização no momento da operação**

Não gerar nem transferir o snapshot de produção sem confirmação explícita.

- [ ] **Step 2: Gerar e validar artefatos VPS**

Executar `scripts/infra/backup_postgres.sh` e `backup_media.sh`; validar `pg_restore -l dump >/dev/null`, `tar -tzf media.tar.gz >/dev/null` e `sha256sum` dos dois arquivos.

- [ ] **Step 3: Restaurar somente em recursos temporários**

Usar banco/volume `producao_restore_*`, nunca o destino definitivo. Comparar migrations, `pg_stat_user_tables`, número e bytes de mídia com a captura fresca.

- [ ] **Step 4: Registrar resultado**

Registrar timestamps, hashes e contagens sem PII. Não remover volumes temporários sem identificar o nome e receber confirmação para o comando destrutivo.

### Task 9: Cortar tráfego para Homelab

**Files:** Modify: `docs/migracao_homelab/README.md`.

**Interfaces:** Consumes approved restore and explicit cutover authority. Produces public domain on Homelab.

- [ ] **Step 1: Instituir janela de escrita controlada**

Avisar operação, impedir novos apontamentos pelo mecanismo aprovado e manter VPS ligada.

- [ ] **Step 2: Capturar e restaurar snapshot final**

Gerar backup final, validar hashes, restaurar volumes definitivos vazios, rodar migrate e iniciar a stack pelo digest aprovado.

- [ ] **Step 3: Configurar rota pública**

Associar `producao.costurai.com.br` ao Tunnel dedicado apenas após readiness interna. Confirmar que DNS não retorna mais o IP VPS e não publicar porta no roteador residencial.

- [ ] **Step 4: Validar função real**

Verificar health, login autenticado, dashboard, leitura QR, apontamento autorizado, qualidade autorizada, imagens e URL de mídia real. Registrar dados descartáveis ou IDs agregados; fazer rollback se um gate falhar.

- [ ] **Step 5: Definir rollback**

Rollback é retornar Cloudflare/DNS à VPS e reabrir escrita nela. Não sincronizar dados Homelab → VPS sem reconciliação aprovada.

### Task 10: Automatizar Homelab e parar VPS reversivelmente

**Files:** Modify: `.github/workflows/deploy-production.yml`, `docs/migracao_homelab/README.md`.

**Interfaces:** Produces `main` → runner Homelab and preserved stopped VPS.

- [ ] **Step 1: Só após aceite, trocar o job de deploy**

Substituir SSH/VPS por job no runner `homelab-producao-deploy`, com concorrência `deploy-producao-production` e `cancel-in-progress: false`, chamando:

~~~bash
sudo /usr/local/sbin/deploy-producao-release "$GITHUB_WORKSPACE" \
  "ghcr.io/melojrx/producao-backend@${{ needs.publish.outputs.backend_digest }}" \
  "ghcr.io/melojrx/producao-frontend@${{ needs.publish.outputs.frontend_digest }}"
~~~

- [ ] **Step 2: Solicitar confirmação específica para parar VPS**

Só depois de apresentar todas as evidências da Task 9, executar:

~~~bash
cd /opt/producao
docker compose -f docker-compose.prod.yml stop
docker compose -f docker-compose.prod.yml ps
docker volume inspect producao-prod_postgres_data producao-prod_media_data
~~~

Expected: containers parados e volumes presentes. Nunca usar `down -v`, `docker volume rm`, exclusão de backup ou alteração de outros serviços da VPS.

- [ ] **Step 3: Período de observação e fechamento**

Revalidar Tunnel, Swarm e domínio após parada. Documentar VPS como standby desligado com volumes preservados; não alegar descomissionamento físico, HA ou backup externo sem evidência separada.

## Final Verification

- [ ] `npx tsc --noEmit`, testes Django de mídia, Compose rollback e `docker stack config` passam.
- [ ] Dois digests GHCR são publicados e o runner aceita somente eles.
- [ ] Não existe Nginx no Swarm; static vem de WhiteNoise e media de Django.
- [ ] Backup/restore final e paridade agregada foram registrados.
- [ ] Domínio canônico é servido pelo Tunnel/Homelab; PostgreSQL não é público.
- [ ] VPS só é parada após confirmação específica; checkout e volumes permanecem recuperáveis.
