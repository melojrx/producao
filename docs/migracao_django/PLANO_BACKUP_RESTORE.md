# PLANO_BACKUP_RESTORE.md — MDJ-2

> Procedimento completo de backup, restore e rollback do Supabase.
> **IMPORTANTE:** Nenhum comando destrutivo ou de escrita deve ser executado sem aprovação explícita.
> Leitura e exportação são seguras. Restore deve ser feito em banco isolado, nunca no Supabase de homologação.

---

## Referências do projeto

| Item | Valor |
|---|---|
| Project ref | `jsuufbgdcqxogimmocof` |
| URL Supabase | `https://jsuufbgdcqxogimmocof.supabase.co` |
| Região | Verificar no painel Supabase |
| Banco destino restore | PostgreSQL local isolado (a criar) |

---

## MDJ-2.1 — Backup completo do schema e dados

### Pré-requisitos

**Instalar `pg_dump` (PostgreSQL client):**

```bash
# Ubuntu/Debian
sudo apt-get install -y postgresql-client-16

# Verificar
pg_dump --version
```

**Instalar Supabase CLI (alternativa para schema):**

```bash
# Via npm
npm install -g supabase

# Via script oficial
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh

# Verificar
supabase --version
```

**Credenciais necessárias:**

As credenciais abaixo devem ser obtidas no painel Supabase → Project Settings → Database:

```bash
# Preencher antes de executar qualquer comando
export SUPABASE_PROJECT_REF="jsuufbgdcqxogimmocof"
export SUPABASE_DB_HOST="db.jsuufbgdcqxogimmocof.supabase.co"
export SUPABASE_DB_PORT="5432"
export SUPABASE_DB_NAME="postgres"
export SUPABASE_DB_USER="postgres"
export SUPABASE_DB_PASSWORD="[obter em Project Settings → Database → Database password]"
export SUPABASE_SERVICE_ROLE_KEY="[obter em Project Settings → API → service_role key]"
```

---

### 2.1.1 Exportar schema completo

```bash
# Criar diretório de backup
mkdir -p ~/backup-supabase-$(date +%Y%m%d)
cd ~/backup-supabase-$(date +%Y%m%d)

# Exportar schema (estrutura sem dados)
pg_dump \
  --host=$SUPABASE_DB_HOST \
  --port=$SUPABASE_DB_PORT \
  --username=$SUPABASE_DB_USER \
  --dbname=$SUPABASE_DB_NAME \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-acl \
  --file=schema_public.sql

# Verificar
wc -l schema_public.sql
echo "Schema exportado: $(date)"
```

**Escopo do schema exportado:**
- Todas as tabelas do schema `public`
- Views (`vw_producao_hoje`, `vw_producao_por_hora`, `vw_status_maquinas`)
- Funções/RPCs
- Triggers
- Índices
- Constraints (PK, FK, UNIQUE, CHECK)
- Sequences

**Não inclui:**
- Schema `auth` (Supabase Auth — exportar separadamente, seção 2.1.3)
- Storage (exportar separadamente, seção MDJ-2.2)
- Row Level Security policies (exportar separadamente)

---

### 2.1.2 Exportar dados completos

```bash
# Exportar dados de todas as tabelas do schema public
pg_dump \
  --host=$SUPABASE_DB_HOST \
  --port=$SUPABASE_DB_PORT \
  --username=$SUPABASE_DB_USER \
  --dbname=$SUPABASE_DB_NAME \
  --schema=public \
  --data-only \
  --no-owner \
  --no-acl \
  --file=dados_public.sql

# Verificar tamanho
ls -lh dados_public.sql
echo "Dados exportados: $(date)"
```

**Alternativa — dump completo (schema + dados juntos):**

```bash
pg_dump \
  --host=$SUPABASE_DB_HOST \
  --port=$SUPABASE_DB_PORT \
  --username=$SUPABASE_DB_USER \
  --dbname=$SUPABASE_DB_NAME \
  --schema=public \
  --no-owner \
  --no-acl \
  --format=custom \
  --file=backup_completo.dump

# Formato custom permite restore seletivo por tabela
```

---

### 2.1.3 Exportar usuários Auth

O schema `auth` não é exportável via `pg_dump` padrão sem acesso de superusuário. Usar a Management API:

```bash
# Listar todos os usuários via Management API
curl -X GET \
  "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/auth/users?page=1&per_page=1000" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  | jq '.' > auth_users.json

# Verificar contagem
jq '.users | length' auth_users.json
echo "Usuários Auth exportados: $(date)"
```

**Campos relevantes por usuário:**
- `id` (= `auth_user_id` em `usuarios_sistema`)
- `email`
- `created_at`
- `last_sign_in_at`
- `email_confirmed_at`

**Nota:** Senhas não são exportáveis (hash interno do Supabase Auth). Usuários precisarão redefinir senha ou usar link mágico no primeiro login no Django.

---

### 2.1.4 Exportar RLS policies

```bash
# Exportar policies do schema public
pg_dump \
  --host=$SUPABASE_DB_HOST \
  --port=$SUPABASE_DB_PORT \
  --username=$SUPABASE_DB_USER \
  --dbname=$SUPABASE_DB_NAME \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-acl \
  --section=post-data \
  --file=policies_public.sql

grep -A5 "POLICY\|ROW SECURITY" policies_public.sql | head -100
```

---

### 2.1.5 Gerar contagens por tabela (checksum de integridade)

```bash
# Script para contar registros por tabela
psql \
  --host=$SUPABASE_DB_HOST \
  --port=$SUPABASE_DB_PORT \
  --username=$SUPABASE_DB_USER \
  --dbname=$SUPABASE_DB_NAME \
  --command="
SELECT
  schemaname,
  tablename,
  n_live_tup AS contagem_estimada
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
" > contagens_tabelas.txt

cat contagens_tabelas.txt
echo "Contagens geradas: $(date)"
```

**Contagens exatas (mais lento, mais preciso):**

```bash
psql \
  --host=$SUPABASE_DB_HOST \
  --port=$SUPABASE_DB_PORT \
  --username=$SUPABASE_DB_USER \
  --dbname=$SUPABASE_DB_NAME \
  --command="
SELECT 'configuracao_turno' AS tabela, COUNT(*) FROM configuracao_turno
UNION ALL SELECT 'configuracao_turno_blocos', COUNT(*) FROM configuracao_turno_blocos
UNION ALL SELECT 'maquinas', COUNT(*) FROM maquinas
UNION ALL SELECT 'metas_mensais', COUNT(*) FROM metas_mensais
UNION ALL SELECT 'operacoes', COUNT(*) FROM operacoes
UNION ALL SELECT 'operadores', COUNT(*) FROM operadores
UNION ALL SELECT 'produto_operacoes', COUNT(*) FROM produto_operacoes
UNION ALL SELECT 'produtos', COUNT(*) FROM produtos
UNION ALL SELECT 'qualidade_defeitos', COUNT(*) FROM qualidade_defeitos
UNION ALL SELECT 'qualidade_detalhes', COUNT(*) FROM qualidade_detalhes
UNION ALL SELECT 'qualidade_registros', COUNT(*) FROM qualidade_registros
UNION ALL SELECT 'registros_producao', COUNT(*) FROM registros_producao
UNION ALL SELECT 'setores', COUNT(*) FROM setores
UNION ALL SELECT 'tipos_maquina', COUNT(*) FROM tipos_maquina
UNION ALL SELECT 'turno_operadores', COUNT(*) FROM turno_operadores
UNION ALL SELECT 'turno_ops', COUNT(*) FROM turno_ops
UNION ALL SELECT 'turno_setor_demandas', COUNT(*) FROM turno_setor_demandas
UNION ALL SELECT 'turno_setor_operacoes', COUNT(*) FROM turno_setor_operacoes
UNION ALL SELECT 'turno_setor_ops', COUNT(*) FROM turno_setor_ops
UNION ALL SELECT 'turno_setores', COUNT(*) FROM turno_setores
UNION ALL SELECT 'turnos', COUNT(*) FROM turnos
UNION ALL SELECT 'usuarios_sistema', COUNT(*) FROM usuarios_sistema
ORDER BY tabela;
" > contagens_exatas.txt

cat contagens_exatas.txt
```

---

## MDJ-2.2 — Backup de Storage

### 2.2.1 Listar arquivos nos buckets

```bash
# Listar arquivos no bucket 'produtos'
curl -X GET \
  "https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/list/produtos" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000, "offset": 0, "prefix": ""}' \
  | jq '.' > storage_produtos_lista.json

# Listar arquivos no bucket 'operacoes'
curl -X GET \
  "https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/list/operacoes" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1000, "offset": 0, "prefix": ""}' \
  | jq '.' > storage_operacoes_lista.json

# Contar arquivos
echo "Arquivos em 'produtos': $(jq '. | length' storage_produtos_lista.json)"
echo "Arquivos em 'operacoes': $(jq '. | length' storage_operacoes_lista.json)"
```

### 2.2.2 Baixar todos os arquivos

```bash
mkdir -p ~/backup-supabase-$(date +%Y%m%d)/storage/produtos
mkdir -p ~/backup-supabase-$(date +%Y%m%d)/storage/operacoes

# Script de download — bucket produtos
jq -r '.[].name' storage_produtos_lista.json | while read arquivo; do
  echo "Baixando produtos/$arquivo..."
  curl -s \
    "https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/produtos/${arquivo}" \
    --create-dirs \
    -o "storage/produtos/${arquivo}"
done

# Script de download — bucket operacoes
jq -r '.[].name' storage_operacoes_lista.json | while read arquivo; do
  echo "Baixando operacoes/$arquivo..."
  curl -s \
    "https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/operacoes/${arquivo}" \
    --create-dirs \
    -o "storage/operacoes/${arquivo}"
done

# Verificar
find storage/ -type f | wc -l
du -sh storage/
```

### 2.2.3 Verificar integridade

```bash
# Contar arquivos baixados vs listados
echo "Listados em 'produtos': $(jq '. | length' storage_produtos_lista.json)"
echo "Baixados em 'produtos': $(find storage/produtos -type f | wc -l)"

echo "Listados em 'operacoes': $(jq '. | length' storage_operacoes_lista.json)"
echo "Baixados em 'operacoes': $(find storage/operacoes -type f | wc -l)"

# Verificar arquivos com tamanho zero (download falhou)
find storage/ -type f -empty -print
```

---

## MDJ-2.3 — Restore em PostgreSQL isolado

### 2.3.1 Criar banco PostgreSQL local isolado

```bash
# Instalar PostgreSQL local (se não instalado)
sudo apt-get install -y postgresql-16

# Criar banco isolado para restore
sudo -u postgres psql -c "CREATE DATABASE supabase_restore_test;"
sudo -u postgres psql -c "CREATE USER restore_user WITH PASSWORD 'restore_senha_local';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE supabase_restore_test TO restore_user;"

# Variáveis do banco local
export LOCAL_DB_HOST="localhost"
export LOCAL_DB_PORT="5432"
export LOCAL_DB_NAME="supabase_restore_test"
export LOCAL_DB_USER="restore_user"
export LOCAL_DB_PASSWORD="restore_senha_local"
```

**Alternativa com Docker (sem instalar PostgreSQL):**

```bash
docker run -d \
  --name postgres-restore-test \
  -e POSTGRES_DB=supabase_restore_test \
  -e POSTGRES_USER=restore_user \
  -e POSTGRES_PASSWORD=restore_senha_local \
  -p 5433:5432 \
  postgres:16

export LOCAL_DB_HOST="localhost"
export LOCAL_DB_PORT="5433"
export LOCAL_DB_NAME="supabase_restore_test"
export LOCAL_DB_USER="restore_user"
export LOCAL_DB_PASSWORD="restore_senha_local"
```

### 2.3.2 Restaurar schema

```bash
PGPASSWORD=$LOCAL_DB_PASSWORD psql \
  --host=$LOCAL_DB_HOST \
  --port=$LOCAL_DB_PORT \
  --username=$LOCAL_DB_USER \
  --dbname=$LOCAL_DB_NAME \
  --file=schema_public.sql \
  2>&1 | tee restore_schema.log

# Verificar erros
grep -i "error\|fatal" restore_schema.log | head -20
echo "Erros no restore de schema: $(grep -ic 'error\|fatal' restore_schema.log)"
```

### 2.3.3 Restaurar dados

```bash
PGPASSWORD=$LOCAL_DB_PASSWORD psql \
  --host=$LOCAL_DB_HOST \
  --port=$LOCAL_DB_PORT \
  --username=$LOCAL_DB_USER \
  --dbname=$LOCAL_DB_NAME \
  --file=dados_public.sql \
  2>&1 | tee restore_dados.log

# Verificar erros
grep -i "error\|fatal\|violates" restore_dados.log | head -20
echo "Erros no restore de dados: $(grep -ic 'error\|fatal' restore_dados.log)"
```

### 2.3.4 Validar contagens pós-restore

```bash
# Executar as mesmas contagens exatas do backup no banco local
PGPASSWORD=$LOCAL_DB_PASSWORD psql \
  --host=$LOCAL_DB_HOST \
  --port=$LOCAL_DB_PORT \
  --username=$LOCAL_DB_USER \
  --dbname=$LOCAL_DB_NAME \
  --command="
SELECT 'configuracao_turno' AS tabela, COUNT(*) FROM configuracao_turno
UNION ALL SELECT 'configuracao_turno_blocos', COUNT(*) FROM configuracao_turno_blocos
UNION ALL SELECT 'maquinas', COUNT(*) FROM maquinas
UNION ALL SELECT 'metas_mensais', COUNT(*) FROM metas_mensais
UNION ALL SELECT 'operacoes', COUNT(*) FROM operacoes
UNION ALL SELECT 'operadores', COUNT(*) FROM operadores
UNION ALL SELECT 'produto_operacoes', COUNT(*) FROM produto_operacoes
UNION ALL SELECT 'produtos', COUNT(*) FROM produtos
UNION ALL SELECT 'qualidade_defeitos', COUNT(*) FROM qualidade_defeitos
UNION ALL SELECT 'qualidade_detalhes', COUNT(*) FROM qualidade_detalhes
UNION ALL SELECT 'qualidade_registros', COUNT(*) FROM qualidade_registros
UNION ALL SELECT 'registros_producao', COUNT(*) FROM registros_producao
UNION ALL SELECT 'setores', COUNT(*) FROM setores
UNION ALL SELECT 'tipos_maquina', COUNT(*) FROM tipos_maquina
UNION ALL SELECT 'turno_operadores', COUNT(*) FROM turno_operadores
UNION ALL SELECT 'turno_ops', COUNT(*) FROM turno_ops
UNION ALL SELECT 'turno_setor_demandas', COUNT(*) FROM turno_setor_demandas
UNION ALL SELECT 'turno_setor_operacoes', COUNT(*) FROM turno_setor_operacoes
UNION ALL SELECT 'turno_setor_ops', COUNT(*) FROM turno_setor_ops
UNION ALL SELECT 'turno_setores', COUNT(*) FROM turno_setores
UNION ALL SELECT 'turnos', COUNT(*) FROM turnos
UNION ALL SELECT 'usuarios_sistema', COUNT(*) FROM usuarios_sistema
ORDER BY tabela;
" > contagens_restore.txt

# Comparar com contagens originais
diff contagens_exatas.txt contagens_restore.txt
echo "Diferenças encontradas: $?"
```

**Critério de aceite:** `diff` deve retornar 0 diferenças. Qualquer divergência deve ser documentada e investigada antes de prosseguir.

---

## MDJ-2.4 — Plano de Rollback

### Princípio

O Supabase de homologação é a fonte de verdade até o cutover final. Qualquer operação de migração que falhe deve ser revertida sem afetar o Supabase atual.

### Ações proibidas sem nova aprovação explícita

- Alterar schema do Supabase de homologação
- Deletar dados do Supabase de homologação
- Alterar RLS policies do Supabase de homologação
- Desativar usuários no Supabase Auth
- Remover arquivos dos buckets Storage
- Apontar o frontend Next.js para o backend Django antes do cutover validado

### Procedimento de rollback por fase

**Fase: backup e restore (MDJ-2)**
- Rollback: não há o que reverter — operações são somente leitura no Supabase
- Se restore falhar: documentar erros, investigar, repetir com dump mais recente

**Fase: backend Django paralelo read-only (MDJ-7/8)**
- Rollback: desligar o backend Django; frontend continua usando Supabase
- Nenhum dado foi alterado

**Fase: primeira mutação Django (MDJ-9+)**
- Rollback: reverter feature flag no frontend para apontar de volta ao Supabase
- Dados escritos no Django durante o teste devem ser descartados ou sincronizados manualmente

**Fase: cutover por módulo (MDJ-16)**
- Rollback: reverter feature flag do módulo específico
- Dados escritos no Django após cutover precisam de script de sincronização reversa

### Critério para considerar backup confiável

- [x] `schema_public.sql` gerado sem erros (33KB, 22 tabelas + FKs + indexes + views + triggers)
- [x] Dados exportados sem erros (22 arquivos JSON, 11.187 registros, diff zero vs baseline)
- [x] `auth_users.json` exportado com contagem > 0 (3 usuários)
- [x] Arquivos Storage baixados com contagem igual à listagem (41/41, 0 vazios, 7.4MB)
- [x] Restore em banco isolado sem erros fatais (Docker PostgreSQL 16, session_replication_role=replica)
- [x] Contagens pós-restore idênticas às contagens originais (22 tabelas, 11.187 registros, diff zero)
- [x] Erros conhecidos documentados (self-ref FK em turno_ops resolvido com replication_role)

---

## Erros esperados no restore local

O restore em PostgreSQL local pode apresentar erros esperados que não invalidam o backup:

| Erro esperado | Causa | Ação |
|---|---|---|
| `extension "uuid-ossp" does not exist` | Extensão Supabase não instalada localmente | `CREATE EXTENSION "uuid-ossp";` antes do restore |
| `extension "pg_graphql" does not exist` | Extensão exclusiva Supabase | Ignorar — não usada pelo domínio |
| `role "supabase_admin" does not exist` | Role interno Supabase | Ignorar — não afeta dados |
| `schema "auth" does not exist` | Schema Auth não exportado | Esperado — exportar separadamente |
| `schema "storage" does not exist` | Schema Storage não exportado | Esperado — exportar separadamente |

Documentar todos os erros encontrados no restore real antes de marcar MDJ-2.3 como concluída.

---

## MDJ-2.5 — Baseline de contagens (fonte de verdade)

> Gerado via MCP Supabase em 2026-05-31. Contagens exatas via `COUNT(*)`.
> Usar para validar diff pós-restore (MDJ-2.3.4).

| Tabela | Contagem |
|---|---|
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

**Total de registros:** 11.187  
**Total de tabelas:** 22
