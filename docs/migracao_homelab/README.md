# Migração do Produção para o Homelab

Este runbook acompanha a migração de `producao.costurai.com.br` da VPS para o
Homelab. Ele registra evidências operacionais sem incluir senhas, tokens,
chaves privadas ou valores de variáveis de ambiente.

## Regras de segurança e promoção

- O Homelab recebe somente imagens imutáveis do GHCR por digest. Ele não faz
  checkout, `git pull` ou `docker build` da aplicação.
- O PostgreSQL não é publicado externamente. Dados, mídia, secrets, rede,
  runner e concorrência terão nomes exclusivos iniciados por `producao_`.

O job de staging roda no próprio Homelab e chama exclusivamente
`/usr/local/sbin/stage-producao-release` via `sudo`. Esse wrapper aceita apenas
dois digests GHCR e grava apenas esses metadados em `/srv/producao/releases`
com propriedade `root`; ele não lê nem executa conteúdo do checkout. O runner
usa uma conta de serviço sem login, com esse único privilégio. O controlador e
os manifestos de deploy ficam root-owned em `/usr/local/lib/producao`; a
promoção continua restrita a `/usr/local/sbin/deploy-producao-release`.
- No destino não haverá Nginx: WhiteNoise entrega `/static/` a partir da
  imagem; o Django entrega `/media/` somente quando `SERVE_MEDIA_FILES=true`.
- Backup/restauração de produção, mudança de Cloudflare/DNS, corte de tráfego
  e parada da VPS exigem autorização explícita no momento da ação.
- A parada futura usa somente `docker compose stop`; checkout, volumes,
  backups e configurações da VPS permanecem recuperáveis.

## Estado inicial observado

| Item | Evidência |
| --- | --- |
| Data da captura | 2026-09-15, auditoria somente leitura anterior a esta execução |
| Código de partida | `main` em `978035249e13d129754052a40bda7ef8eb8e4c8c` |
| Domínio público | `https://producao.costurai.com.br` |
| Stack atual na VPS | Compose `producao-prod` em `/opt/producao` |
| Serviços atuais | `frontend`, `backend`, `proxy` (Nginx) e `db` |
| Volumes fonte | `producao-prod_postgres_data`, `producao-prod_media_data` |
| Volumes alvo reservados | `producao_postgres_data`, `producao_media` |
| Dados observados | PostgreSQL: aproximadamente 23 MB; mídia: 41 arquivos, 7.287.585 bytes |

Esta captura é referência de planejamento, não substitui a coleta fresca que
antecede o restore ou o corte. As contagens finais devem ser agregadas, sem
registrar PII.

## Comandos de paridade na VPS

Executar apenas com autorização para a etapa de backup/cutover e registrar
somente os resultados agregados abaixo.

```bash
docker exec producao-prod-db-1 psql -U pcp_user -d pcp_db -At -F '|' \
  -c "select relname,n_live_tup from pg_stat_user_tables order by relname"
docker exec producao-prod-backend-1 find /app/media -type f | wc -l
docker exec producao-prod-backend-1 du -sb /app/media
```

## Ledger de aceite

| Marco | Data/hora | Evidência agregada | Resultado |
| --- | --- | --- | --- |
| Homologação do Swarm | Pendente | serviços, health, static e media | — |
| Backup e restore ensaiado | Pendente | hashes, migrations, tabelas e mídia | — |
| Cutover público | Pendente | domínio, fluxo autenticado e rollback | — |
| Parada reversível da VPS | Pendente | containers parados e volumes presentes | — |

## Rollback

Até a aceitação funcional, a VPS permanece ligada e é o caminho de retorno.
Após o cutover, rollback significa devolver Cloudflare/DNS à VPS e reabrir a
escrita nela. Não sincronizar dados do Homelab para a VPS sem uma reconciliação
formalmente aprovada.
