# INVENTARIO_STORAGE_AUTH.md — MDJ-1.5

> Inventário de dados externos ao banco: Storage, Auth e URLs públicas persistidas.
> Fonte: `lib/constants.ts`, `lib/actions/operacoes.ts`, `lib/actions/produtos.ts`, `lib/actions/usuarios-sistema.ts`, `lib/auth/`, `types/supabase.ts`.
> Objetivo: garantir que imagens, usuários e arquivos não sejam perdidos na migração.

---

## 1. Estado da leitura

Inventário produzido sem executar SQL remoto e sem alterar dados.

---

## 2. Supabase Storage — Buckets

### 2.1 Bucket `produtos`

| Atributo | Valor |
|---|---|
| Nome | `produtos` |
| Constante | `PRODUTO_IMAGENS_BUCKET` em `lib/constants.ts` |
| Visibilidade | público (`public: true`) |
| Tamanho máximo | 5 MB por arquivo |
| Tipos aceitos | `image/jpeg`, `image/png`, `image/webp` |
| Criado por | `lib/actions/produtos.ts` — `garantirBucketImagensProduto()` |

**Campos no banco que armazenam URLs deste bucket:**

| Tabela | Campo | Descrição |
|---|---|---|
| `produtos` | `imagem_url` | Imagem legada (campo antigo, ainda presente) |
| `produtos` | `imagem_frente_url` | Imagem da frente do produto |
| `produtos` | `imagem_costa_url` | Imagem do verso do produto |

**Padrão de caminho no bucket:**
```
{produto_id}/{timestamp}-{uuid}.{ext}
```

**Exemplo de URL pública:**
```
https://{projeto}.supabase.co/storage/v1/object/public/produtos/{produto_id}/{timestamp}-{uuid}.jpg
```

---

### 2.2 Bucket `operacoes`

| Atributo | Valor |
|---|---|
| Nome | `operacoes` |
| Constante | `OPERACAO_IMAGENS_BUCKET` em `lib/constants.ts` |
| Visibilidade | público (`public: true`) |
| Tamanho máximo | 5 MB por arquivo |
| Tipos aceitos | `image/jpeg`, `image/png`, `image/webp` |
| Criado por | `lib/actions/operacoes.ts` — `garantirBucketImagensOperacao()` |

**Campos no banco que armazenam URLs deste bucket:**

| Tabela | Campo | Descrição |
|---|---|---|
| `operacoes` | `imagem_url` | Imagem ilustrativa da operação de costura |

**Padrão de caminho no bucket:**
```
{operacao_id}/{timestamp}-{uuid}.{ext}
```

---

### 2.3 Bucket implícito — fotos de operadores

| Tabela | Campo | Origem |
|---|---|---|
| `operadores` | `foto_url` | Campo presente no schema; sem action de upload identificada no código atual |

**Nota:** `foto_url` existe no schema de `operadores` mas não há action de upload de foto de operador no código atual. Pode ser preenchido manualmente ou via painel Supabase. Deve ser inventariado no banco remoto antes da migração.

---

## 3. Resumo de operações de Storage no código

| Operação | Arquivo | Bucket |
|---|---|---|
| `listBuckets` (verificar existência) | `actions/operacoes.ts`, `actions/produtos.ts` | ambos |
| `createBucket` (criar se não existe) | `actions/operacoes.ts`, `actions/produtos.ts` | ambos |
| `upload` (enviar arquivo) | `actions/operacoes.ts`, `actions/produtos.ts` | ambos |
| `getPublicUrl` (obter URL pública) | `actions/operacoes.ts`, `actions/produtos.ts` | ambos |
| `remove` (excluir arquivo) | `actions/operacoes.ts`, `actions/produtos.ts` | ambos |

**Padrão de extração de caminho a partir da URL:**
```typescript
const marcadorBucket = `/storage/v1/object/public/${BUCKET}/`
const caminho = url.pathname.slice(indiceMarcador + marcadorBucket.length)
```
Este padrão é usado para identificar o caminho relativo ao bucket a partir da URL pública persistida no banco. A migração deve preservar ou reescrever este padrão.

---

## 4. Supabase Auth

### 4.1 Estrutura atual

```
auth.users (Supabase Auth — tabela interna)
  └── usuarios_sistema.auth_user_id (FK para auth.users.id)
```

`auth.users` é gerenciada exclusivamente pelo Supabase Auth. O sistema não acessa `auth.users` diretamente — usa a API Auth do Supabase.

### 4.2 Operações Auth usadas pelo sistema

| Operação | Arquivo | Descrição |
|---|---|---|
| `signInWithPassword` | `actions/auth.ts` | Login com email/senha |
| `signOut` | `actions/auth.ts` | Logout |
| `getUser` | `require-admin-user.ts`, `actions/producao.ts`, `actions/qualidade.ts` | Resolver usuário autenticado da sessão |
| `auth.admin.createUser` | `actions/usuarios-sistema.ts` | Criar usuário no Auth + perfil em `usuarios_sistema` |
| `auth.admin.updateUserById` | `actions/usuarios-sistema.ts` | Atualizar email/senha no Auth |
| `auth.admin.deleteUser` | `actions/usuarios-sistema.ts` | Rollback: excluir do Auth se insert em `usuarios_sistema` falhar |

### 4.3 Relação Auth ↔ `usuarios_sistema`

| Campo | Tipo | Papel |
|---|---|---|
| `usuarios_sistema.auth_user_id` | `uuid` | FK para `auth.users.id` — vínculo entre perfil de domínio e identidade de autenticação |
| `usuarios_sistema.email` | `text` | Espelho do email do Auth (mantido em sincronia manualmente) |
| `usuarios_sistema.papel` | `text` | `admin` ou `supervisor` — papel de domínio, não gerenciado pelo Auth |
| `usuarios_sistema.pode_revisar_qualidade` | `boolean` | Permissão operacional específica do domínio |
| `usuarios_sistema.ativo` | `boolean` | Soft-delete do perfil de domínio (não desativa o Auth) |

**Invariante crítica:** `auth_user_id` é único em `usuarios_sistema`. Um usuário Auth pode ter no máximo um perfil de domínio.

### 4.4 Fluxo de criação de usuário (dupla escrita)

```
1. Verificar duplicidade por email em usuarios_sistema
2. supabase.auth.admin.createUser({ email, password, email_confirm: true })
3. INSERT INTO usuarios_sistema (auth_user_id, nome, email, papel, pode_revisar_qualidade, ativo)
4. Se INSERT falhar → supabase.auth.admin.deleteUser(auth_user_id)  [rollback]
```

**Risco de migração:** Esta dupla escrita não é atômica. No Django, deve ser envolvida em `transaction.atomic()` com rollback explícito do usuário Django se o perfil falhar.

### 4.5 Papéis e permissões

| Papel | Acesso |
|---|---|
| `admin` | Acesso total, incluindo gestão de usuários do sistema (`requireSystemAdmin`) |
| `supervisor` | Acesso administrativo geral (`requireAdminUser`), exceto gestão de usuários |
| (sem papel) | Sem acesso à área administrativa |

**Permissão especial:** `pode_revisar_qualidade` é independente do papel. Um `supervisor` pode ou não ter esta permissão.

---

## 5. URLs públicas persistidas no banco

### 5.1 Mapa completo de campos URL

| Tabela | Campo | Bucket | Observação |
|---|---|---|---|
| `produtos` | `imagem_url` | `produtos` | Campo legado, pode estar nulo ou com URL antiga |
| `produtos` | `imagem_frente_url` | `produtos` | Campo atual para frente |
| `produtos` | `imagem_costa_url` | `produtos` | Campo atual para verso |
| `operacoes` | `imagem_url` | `operacoes` | Imagem ilustrativa da operação |
| `operadores` | `foto_url` | desconhecido | Sem action de upload identificada; origem a confirmar |

### 5.2 Formato das URLs

URLs seguem o padrão Supabase Storage público:
```
https://{SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/{bucket}/{caminho}
```

Estas URLs estão **persistidas diretamente no banco**. Na migração, há duas opções:

**Opção A — Manter URLs Supabase temporariamente:**
- Não requer migração de arquivos imediata
- Funciona enquanto o projeto Supabase existir
- Risco: dependência de infraestrutura Supabase após cutover

**Opção B — Migrar arquivos e reescrever URLs:**
- Copiar arquivos para storage Django (S3, volume local + nginx)
- Atualizar campos URL no banco com novos endereços
- Requer script de migração idempotente com rollback

**Recomendação:** Opção A durante fase de backend paralelo. Opção B antes do cutover final, com script de migração validado.

---

## 6. QR Code Tokens

Campos `qr_code_token` não são URLs externas — são UUIDs gerados internamente e persistidos no banco. Não dependem de Supabase Storage ou Auth.

| Tabela | Campo | Uso |
|---|---|---|
| `operadores` | `qr_code_token` | QR do crachá do operador |
| `operacoes` | `qr_code_token` | QR patrimonial da operação |
| `maquinas` | `qr_code_token` | QR patrimonial da máquina |
| `turno_setores` | `qr_code_token` | QR operacional do setor no turno |

**Formato do QR Code:**
```
{tipo}:{qr_code_token}
```
Exemplos: `operador:uuid`, `maquina:uuid`, `operacao:uuid`, `turno-setor:uuid`

Tokens migram junto com os dados do banco. Não há dependência externa.

---

## 7. Riscos e pontos de atenção

| Risco | Impacto | Mitigação |
|---|---|---|
| URLs de imagens persistidas no banco apontam para Supabase | Alto | Migrar arquivos antes do cutover; manter Supabase ativo durante transição |
| `foto_url` de operadores sem action de upload identificada | Médio | Inventariar no banco remoto; confirmar se há arquivos reais antes de migrar |
| Dupla escrita Auth + `usuarios_sistema` não é atômica | Alto | Django: `transaction.atomic()` + rollback explícito do User Django |
| `auth.users` não é exportável via `pg_dump` padrão | Alto | Exportar via Supabase Auth API ou Management API antes de desativar projeto |
| Senhas no Supabase Auth usam bcrypt interno | Médio | Usuários precisarão redefinir senha ou usar importação via hash compatível |
| `usuarios_sistema.ativo = false` não desativa o Auth | Médio | No Django, desativar `User.is_active` junto com o perfil |

---

## 8. Plano preliminar de preservação

### 8.1 Storage

1. Listar todos os arquivos nos buckets `produtos` e `operacoes` via Supabase Storage API
2. Baixar todos os arquivos para armazenamento local seguro
3. Verificar integridade por contagem e tamanho
4. Definir destino no Django (S3 ou volume local com nginx)
5. Fazer upload para destino Django
6. Executar script de reescrita de URLs no banco (idempotente)
7. Validar que todas as URLs respondem com HTTP 200

### 8.2 Auth e Usuários

1. Exportar lista de usuários via `supabase.auth.admin.listUsers()` (Management API)
2. Mapear `auth.users.id` → `usuarios_sistema` para cada usuário
3. Criar usuários Django com `username = email`, `is_active = usuarios_sistema.ativo`
4. Criar perfis de domínio vinculados
5. Forçar redefinição de senha no primeiro login (ou importar hash se compatível)
6. Validar que todos os usuários com `ativo = true` conseguem autenticar

### 8.3 Critério de aceite

- [ ] Todos os arquivos dos buckets `produtos` e `operacoes` baixados e verificados
- [ ] Contagem de arquivos por bucket documentada
- [ ] `foto_url` de operadores inventariada no banco remoto
- [ ] Lista de usuários Auth exportada com `auth_user_id` mapeado para `usuarios_sistema`
- [ ] Plano de migração de senhas definido (reset ou importação de hash)
- [ ] Estratégia de storage Django definida (S3 ou volume local)
- [ ] Script de reescrita de URLs validado em ambiente isolado
