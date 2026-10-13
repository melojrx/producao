# Recuperação da integração Next.js/Django no Homelab

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execução inline autorizada, sem worktree separado.

**Goal:** restaurar autenticação e consultas do frontend com uma configuração reproduzível de produção.

**Architecture:** Cloudflare Tunnel e Traefik mantêm HTTPS público. Next.js comunica com Django pela overlay privada usando o alias exclusivo `producao-api`. Somente o cliente server-side, explicitamente configurado no runtime do Homelab, sinaliza `X-Forwarded-Proto: https`; Django mantém `SECURE_SSL_REDIRECT=true`, cookies seguros e HSTS.

**Tech Stack:** Next.js 16, TypeScript 5, Django, PostgreSQL 16, Docker Swarm, GHCR.

## Global Constraints

- Branch de trabalho criada a partir de `main`, sem worktree; implementação inline com revisão pontual somente leitura.
- Sem novos pacotes, alteração de domínio, schema, dados produtivos ou volumes.
- Sem Nginx; WhiteNoise para estáticos e Django para mídia.
- Publicação por digest GHCR e controlador root-owned; sem build/checkout no Homelab.
- Contas de teste já criadas; não registrar senhas/tokens neste documento.
- Sprint 54 concluída; recuperação operacional não abre sprint de produto.

### Task 1: Contrato HTTP e regressão

**Files:** `lib/django/client.ts`, `lib/django/client.test.ts`, `lib/constants.ts`.

- [x] Testar uma API HTTP local que retorna `301` sem protocolo encaminhado e `200` com `https`. Executar `node --test --experimental-strip-types lib/django/client.test.ts` e observar falha antes da correção.
- [x] No cliente, ativar o cabeçalho apenas quando `typeof window === 'undefined'`, `DJANGO_INTERNAL_API_HTTPS === 'true'` e a URL configurada for HTTP. Não alterar requisições browser ou HTTPS público.
- [x] Usar `redirect: 'manual'` e timeout limitado; tratar redirecionamento como erro de configuração, sem encaminhar POST ou credenciais a outro protocolo/host.
- [x] Validar servidor com flag desativada, browser e HTTPS público sem cabeçalho forçado; executar testes e `npx tsc --noEmit`.

**Evidência local:** RED reproduziu falha do cliente sem protocolo, redirecionamento seguido e ausência de timeout. GREEN: 8/8 testes do cliente e 26/26 incluindo sessão, cookies e flags; TypeScript sem erros.

### Task 2: Deploy e verificação integrada

**Files:** `deploy/swarm/producao.yml`, `scripts/homelab/frontend-healthcheck.mjs`, `docker/frontend/Dockerfile.prod`, `ops/homelab-controller/deploy-stack.sh`, `.github/workflows/ci.yml`, `.github/workflows/deploy-production.yml`.

- [x] Definir alias `producao-api` apenas na rede privada; adicionar esse hostname aos hosts Django, com `DJANGO_API_URL=http://producao-api:8000` e `DJANGO_INTERNAL_API_HTTPS=true` no frontend.
- [x] Incorporar healthcheck standalone na imagem frontend, validando a página local e `health/` do Django pelo caminho interno, com `redirect: manual`, timeout e JSON `status=ok/database=ok`.
- [x] Fazer controlador aguardar `UpdateStatus=completed` e digests atuais antes de anunciar sucesso; verificar a integração pelo frontend após rollout.
- [x] Desativar disparo automático do deploy VPS legado: manter somente workflow manual com confirmação específica de rollback.
- [x] Adicionar testes de regressão ao CI; executar testes, TypeScript, ESLint, configuração Swarm e build.

**Evidência local:** healthcheck standalone 2/2 (sucesso e rejeição de 301); TypeScript, ESLint dos arquivos alterados, `sh -n`, `docker stack config`, `git diff --check` e build Next.js passaram. Promoção real permanece na Task 3.

### Task 3: Promoção e aceite

**Files:** `docs/migracao_homelab/README.md` e este plano.

- [x] Registrar commit; push da branch e execução manual de `build-homelab-image.yml` com `--ref codex/recuperacao-integracao-homelab`. CI deve passar antes de publicar.
- [x] Criar backup dos manifestos/controlador atuais, conferir hashes e instalar os artefatos de infraestrutura revisados como root-owned.
- [x] Promover os digests produzidos usando `/usr/local/sbin/deploy-producao-release <diretorio-da-release>`.
- [x] Conferir UpdateStatus concluído, imagens por digest, volumes existentes e serviços saudáveis; `/health/`, login e mídia públicos devem responder corretamente.
- [x] Validar formulário, sessão, dashboard e gestão de usuários para admin; supervisor deve acessar dashboard e ser bloqueado na gestão de usuários. Não criar apontamentos produtivos durante validação.
- [x] Registrar evidências e limites de aceite, inclusive diferença entre testes de leitura/permissões e homologação operacional com escrita.

**Aceite da recuperação em 2026-10-13, 16:33 America/Fortaleza:** workflow final `38454865050` concluído com sucesso; código funcional `2252579`; backend `sha256:db30082f731c092aaa92f319d41a5ce4eca05a7ca7eb5c6af90ad7b53b1abb64`; frontend `sha256:15ea0f5d5912df3b56549932d25927ec0b97e82c240003c4db30ac7cf3abb1e0`. Ambos com `UpdateStatus=completed` e containers healthy. Controlador concluiu `Frontend, Django, banco e fronteira JWT: OK`.

**Evidência funcional:** admin fez login público, acessou usuários e dashboard operacional, e logout voltou ao login. Supervisor fez login público, abriu dashboard e foi redirecionado ao tentar `/admin/usuarios`; API admin usuários `200`, supervisor `403`. Leituras de metas, produtos, operadores e turnos `200` para ambos. Apontamentos, produtos, relatórios e TV renderizaram. Scanner final mostrou `Escaneie o QR operacional` e ativação manual da câmera. Não foi ativada a câmera nem lançado apontamento. Mídia real pública `200 image/jpeg`, health público `200`.

**Preservação:** 1.321 registros, 60 turnos, 26 migrações, 41 mídias; volume ativo `producao_producao_media`. Backup de configuração/controlador/manifesto em `/srv/producao/backups/recuperacao-20261013-zj79O2`, root-owned e configuração com modo0600. Release anterior preservada.

**Limites e integração:** PR4 aberta e pronta para revisão; sem merge nesta etapa. A alteração do gatilho VPS está na branch/PR e só se torna canônica após merge. Mutações administrativas legadas não foram convertidas nesta recuperação: produtos/operações/usuários ainda exigem completar escrita Django. Recuperação de acesso não equivale à homologação dessas escritas nem à execução de produção/qualidade/câmera.

## Rollback

Preservar o diretório de release anterior e a cópia dos manifestos/controlador. Reverter esses artefatos e o digest anterior se a promoção falhar. Não restaurar banco nem sincronizar a VPS: dados atuais do Homelab são a fonte operacional.

## Gate funcional intermediário

Em 2026-10-13, workflow `38452677061` passou CI/publicação/staging. O controlador concluiu rollout e health integrado. Login público do admin criou sessão e `/admin/usuarios` renderizou corretamente. A dashboard revelou uma URL legada sem barra final (`/api/v1/metas/resumo?competencia=...`), anteriormente mascarada pelo follow automático. O Django registra `/api/v1/metas/resumo/`.

Correção adicional no mesmo escopo: `lib/django/queries/metas.ts` usa o construtor puro `metas-paths.ts`, com teste de pathname canônico e competência preservada. A proteção contra redirect permanece. A aplicação não foi declarada recuperada neste gate intermediário; exige nova imagem e repetição do aceite da dashboard.

Gate seguinte: dashboard, login admin/supervisor, bloqueio de usuários para supervisor, apontamentos, produtos, relatórios e TV renderizaram. O scanner revelou `NEXT_PUBLIC_SCANNER_V2_ENABLED` ausente no Dockerfile/workflow, que desabilita a interface em produção. A flag passa a ser um argumento explícito de build e recebe `true` somente no workflow Homelab. Não há alteração na regra de QR nem teste de escrita produtiva.
