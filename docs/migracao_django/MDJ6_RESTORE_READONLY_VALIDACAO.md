# MDJ-6 — Validacao do restore read-only

Data da validacao: `2026-06-04`

## Escopo

Esta validacao recriou o restore Supabase em PostgreSQL isolado para servir como fonte local de paridade read-only.

Nao foi feito:

- escrita no Supabase remoto;
- importacao de dados reais no banco operacional Django;
- integracao com Next.js, Server Actions ou queries;
- alteracao de scripts SQL remotos.

## Fonte do backup

Backup local usado:

```text
/home/jrmelo/backup-supabase-20260531
```

Arquivos principais:

- `schema_public.sql`
- `restore_dados_v2.sql`
- `dados_*.json`
- `auth_users.json`
- `storage_listing.json`

## Ambiente de restore

Compose:

```bash
docker compose -f docker-compose.restore.yml up -d
```

Banco:

```text
container: pcp-postgres-restore
database: supabase_restore_test
user: restore_user
porta local: 5433
volume: producao_postgres_restore_data
```

O banco operacional Django permanece em volume separado:

```text
volume: producao_postgres_data
```

## Comandos de restore

Schema:

```bash
docker compose -f docker-compose.restore.yml exec -T postgres_restore \
  psql -U restore_user -d supabase_restore_test \
  -v ON_ERROR_STOP=1 \
  -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" \
  -f /backups/schema_public.sql
```

Dados:

```bash
docker compose -f docker-compose.restore.yml exec -T postgres_restore \
  psql -U restore_user -d supabase_restore_test \
  -v ON_ERROR_STOP=1 \
  -f /backups/restore_dados_v2.sql
```

Logs temporarios:

```text
/tmp/mdj6_restore_schema.log
/tmp/mdj6_restore_dados.log
/tmp/mdj6_counts_json.csv
/tmp/mdj6_counts_restore.csv
```

## Resultado

O restore foi concluido com `COMMIT`, sem erros encontrados em busca por:

```text
error | fatal | violates | rollback
```

O schema restaurado contem:

| Tipo | Total |
|---|---:|
| Tabelas publicas | 22 |
| Views publicas | 3 |

## Contagens validadas

As contagens abaixo foram comparadas contra os arquivos `dados_*.json` do backup local. O `diff` entre JSONs e PostgreSQL restaurado retornou `0` diferencas.

| Tabela | Registros |
|---|---:|
| configuracao_turno | 5 |
| configuracao_turno_blocos | 7 |
| maquinas | 16 |
| metas_mensais | 1 |
| operacoes | 207 |
| operadores | 33 |
| produto_operacoes | 1163 |
| produtos | 38 |
| qualidade_defeitos | 8 |
| qualidade_detalhes | 19 |
| qualidade_registros | 68 |
| registros_producao | 1323 |
| setores | 6 |
| tipos_maquina | 7 |
| turno_operadores | 0 |
| turno_ops | 171 |
| turno_setor_demandas | 848 |
| turno_setor_operacoes | 5083 |
| turno_setor_ops | 850 |
| turno_setores | 274 |
| turnos | 58 |
| usuarios_sistema | 3 |

## Observacoes

- Foi necessario habilitar `pgcrypto` antes de restaurar o schema porque o dump usa `gen_random_bytes()`.
- `restore_dados_v2.sql` usa `session_replication_role = replica` durante a carga para preservar o snapshot mesmo com dependencias historicas complexas.
- A verificacao do changelog Supabase em `2026-06-04` nao indicou breaking change aplicavel ao restore local de schema/dados usado nesta sprint.
- A MDJ-6 libera a proxima etapa para construir leituras read-only comparaveis usando este restore como fonte de paridade local.
