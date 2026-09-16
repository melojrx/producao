# Migração do Produção para o Homelab — Especificação

**Data:** 2026-09-15  
**Status:** proposta aprovada para planejamento  
**Decisão:** opção 1 — migração em fases, corte controlado e parada reversível da VPS após aceitação funcional.

## 1. Objetivo

Mover a operação de produção de `producao.costurai.com.br` da VPS para o Homelab, preservando dados, mídia, domínio e comportamento funcional. A entrega substitui o deploy por checkout e build na VPS por promoção de imagens imutáveis no Docker Swarm.

O encerramento desta migração inclui parar os containers do stack `producao-prod` na VPS depois de todos os gates de aceitação. Não inclui apagar o checkout, volumes, banco, backups ou configuração da VPS.

## 2. Estado observado e limites

- A produção atual executa na VPS em Docker Compose: Next.js, Django/Gunicorn, PostgreSQL e Nginx interno.
- O domínio público responde pela VPS e a aplicação possui dados ativos e mídia persistente.
- O deploy atual atualiza um checkout e constrói imagens no host da VPS; esse fluxo será removido da promoção normal.
- O Homelab ainda precisa estar acessível para que seus serviços, runner, `edge`, Traefik, Tunnel e secrets sejam validados antes de qualquer corte.
- A Sprint 23 permanece em realinhamento documental; esta migração não reabre HU visual nem altera frontend fora do escopo estrito de entrega de mídia em produção.

## 3. Arquitetura alvo

```text
GitHub Actions
  ├─ TypeScript, Compose config e testes Django
  ├─ build de imagens linux/amd64
  └─ GHCR por digest imutável
                 │
                 ▼
Runner dedicado do Produção
  └─ wrapper root validado por caminho e digest
                 │
                 ▼
Docker Swarm (nó homelab)
  ├─ postgres       rede interna, sem porta publicada
  ├─ migrate        execução pontual, sem réplica permanente
  ├─ backend        Django + WhiteNoise + volume de mídia
  ├─ frontend       Next.js standalone
  ├─ cloudflared    Tunnel exclusivo do domínio
  └─ Traefik/edge    roteamento público compartilhado
```

O stack deve ter nome, redes, volumes, secrets, concorrência e runner exclusivos do Produção. Nenhum serviço do Produção reutiliza volumes de outra aplicação.

### 3.1 Roteamento público sem Nginx

Traefik é o único proxy HTTP do stack:

| Regra | Serviço destino |
|---|---|
| `Host(producao.costurai.com.br)` | `frontend:3000` |
| `Host(...) && PathPrefix(/api/v1/)` | `backend:8000` |
| `Host(...) && PathPrefix(/django-admin/)` | `backend:8000` |
| `Host(...) && PathPrefix(/health/)` | `backend:8000` |
| `Host(...) && PathPrefix(/media/)` | `backend:8000` |

As rotas de backend têm prioridade acima da rota raiz do frontend. Traefik envia `X-Forwarded-Proto: https` para que Django aplique corretamente seus controles de segurança.

### 3.2 Estáticos e mídia

- `/static/`: WhiteNoise serve arquivos coletados durante o build da imagem Django. Não haverá volume persistente de `staticfiles`.
- `/media/`: Django deve registrar explicitamente uma rota de produção, condicionada a `SERVE_MEDIA_FILES=true`, que entrega apenas arquivos abaixo de `MEDIA_ROOT` por `FileResponse`/`django.views.static.serve` sem permitir traversal de caminho. A rota inexistente ou desabilitada responde 404.
- O volume de mídia é montado em leitura e escrita no backend e somente no backend. O conteúdo é migrado da VPS e validado por contagem, tamanho e amostragem de URLs públicas.

WhiteNoise não deve ser usado para mídia de usuários.

### 3.3 Dados, secrets e migrações

- PostgreSQL 16 permanece privado em rede overlay `internal: true` e volume nomeado exclusivo.
- O serviço `migrate` executa `python manage.py migrate --noinput` usando a mesma imagem do backend antes da promoção do `backend` e `frontend`.
- Segredos Django, PostgreSQL e token do Tunnel são Docker Swarm secrets externos, com nomes exclusivos `producao_*`; não entram no repositório, imagem, logs ou variáveis `NEXT_PUBLIC_*`.
- Variáveis públicas necessárias ao build do Next.js permanecem argumentos de build controlados pelo CI. Credenciais e configurações privadas existem apenas no runtime do Swarm.

## 4. Pipeline de promoção

1. Push em `main` dispara validação TypeScript, configuração de stack e testes Django.
2. Após sucesso, o CI produz imagens `linux/amd64` no GHCR, com SBOM e proveniência, identificadas pelo digest.
3. O job de produção usa apenas o runner rotulado para o Produção.
4. O runner chama um único wrapper root com checkout permitido e digest validado.
5. O wrapper instala a especificação de release em diretório derivado do digest, puxa o digest, executa migração, atualiza o stack e verifica saúde.

O Homelab não pode usar `git pull`, checkout de aplicação ou `docker build` para promoção. Um novo deploy nunca usa tag mutável como identificador de release.

## 5. Fases e gates obrigatórios

### Fase A — Prontidão do Homelab

Validar Swarm, nó `homelab`, rede externa `edge`, Traefik, runner exclusivo, Docker secrets, acesso ao GHCR, Cloudflare Tunnel e capacidade de disco. Falha em qualquer item impede a migração.

### Fase B — Artefatos e mídia sem Nginx

Implementar e testar a rota Django de mídia em produção e a topologia Swarm. Os testes devem cobrir rota habilitada, rota desabilitada, arquivo ausente, tentativa de path traversal e o cabeçalho HTTPS encaminhado por Traefik. O build precisa comprovar que WhiteNoise atende os estáticos a partir da imagem.

### Fase C — Backup e restauração ensaiada

Gerar backup novo da VPS, composto por dump custom do PostgreSQL e arquivo da mídia. Validar os artefatos e restaurá-los em banco e volume temporários no Homelab. Comparar migrations e contagens agregadas das tabelas relevantes; mídia deve ter contagem e tamanho compatíveis. Sem restore comprovado, não há cutover.

### Fase D — Promoção e corte

Promover o digest aprovado para o Swarm, restaurar a cópia final dos dados e mídia com janela de escrita controlada, executar migrations e validar o domínio pelo Tunnel. Alterar o roteamento público somente após health, login, dashboard, scanner, apontamento, qualidade, imagens e mídia retornarem sucesso.

### Fase E — Aceitação e parada reversível da VPS

Após validação técnica e funcional no domínio canônico, parar somente os containers do Compose `producao-prod` na VPS. Os volumes `producao-prod_postgres_data` e `producao-prod_media_data`, checkout `/opt/producao`, `.env` e backups permanecem preservados. O rollback consiste em restaurar o roteamento anterior e iniciar o Compose da VPS; não há sincronização reversa de dados sem reconciliação explícita.

## 6. Critérios de aceite

- O domínio canônico responde via Cloudflare Tunnel e Traefik, não pelo IP público da VPS.
- Não há Nginx no stack do Homelab.
- Estáticos carregam via WhiteNoise e mídia existente é entregue por Django em HTTPS.
- PostgreSQL não expõe porta externa; mídia e banco usam volumes exclusivos do Produção.
- As contagens do banco, migrations e inventário de mídia da cópia final são compatíveis com a VPS.
- Login, painel administrativo, dashboard, scanner, apontamento operacional, qualidade e URLs de mídia são validados de forma autenticada quando aplicável.
- O release implantado corresponde exatamente a um digest GHCR registrado pelo CI.
- Backup e restauração são evidenciados antes do corte.
- A VPS só é parada após os itens anteriores; dados e volumes permanecem recuperáveis.

## 7. Fora de escopo

- Exclusão de dados, volumes, checkout ou conta da VPS.
- Migração de outros serviços hospedados na VPS.
- Alta disponibilidade, réplica de banco, autoscaling ou sincronização bidirecional VPS/Homelab.
- Reabertura da Sprint 23 ou redesenho visual.
- Remoção imediata das dependências Supabase que ainda estejam no código, desde que não sejam necessárias ao comportamento validado do release.

## 8. Riscos e respostas

| Risco | Resposta obrigatória |
|---|---|
| Homelab indisponível | não iniciar promoção ou transferência até a conectividade ser validada |
| Backup desatualizado | gerar novo backup e ensaiar restore antes do corte |
| Divergência por escrita na VPS durante cópia | instituir janela de escrita controlada e realizar snapshot final |
| Mídia 404 após retirada do Nginx | bloquear corte até teste público de rota Django e amostra real de mídia |
| Falha de release | rollback por digest anterior ou retorno temporário à VPS preservada |
| Exposição de segredo | usar Swarm secrets; nunca registrar valores em documentos, logs ou workflow summary |

## 9. Evidência de encerramento

O encerramento funcional requer um registro com: SHA e digest promovidos; resultado do CI; estado do Swarm; identificação sem segredo dos volumes/secrets; verificação de Tunnel e DNS; backup/restore aprovado; contagens agregadas; evidência dos fluxos funcionais; e confirmação de containers VPS parados com volumes preservados.
