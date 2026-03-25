# AUTH.md

## Visão geral

As rotas administrativas usam duas camadas de proteção:

1. `proxy.ts`
   Bloqueia acesso a `/admin/*` antes da renderização.
2. `requireAdminUser()`
   Valida autenticação e autorização dentro do servidor, inclusive nas Server Actions.

Isso segue o PRD: apenas usuários com role `admin` ou `supervisor` acessam `/admin/*`.

## Onde a role é lida

O sistema aceita a role do usuário em uma destas chaves do Supabase Auth:

- `app_metadata.role`
- `user_metadata.role`

Valores aceitos:

- `admin`
- `supervisor`

## Fluxo implementado

- `/login` é público
- `/scanner` é público
- `/admin/*` exige usuário autenticado com role válida
- usuário autenticado com role válida que acessa `/login` é redirecionado para `/admin/dashboard`
- Server Actions admin recusam sessão ausente ou usuário sem role válida

## Arquivos principais

- `proxy.ts`
- `lib/supabase/proxy.ts`
- `lib/auth/roles.ts`
- `lib/auth/require-admin-user.ts`
- `lib/actions/auth.ts`
- `app/(auth)/login/page.tsx`
- `components/auth/LoginForm.tsx`
- `components/admin/AdminShell.tsx`

## Provisionar usuário de teste

Exemplo:

```bash
node scripts/ensure-admin-user.mjs codex.admin@example.com 'CodexAdmin#2026' admin
```

O script cria ou atualiza um usuário no Supabase Auth com `app_metadata.role`.

## Validação local

Checagem de tipos:

```bash
npx tsc --noEmit
```

Build local compatível com este ambiente:

```bash
npm run build -- --webpack
```

Subir servidor de produção local:

```bash
npm run start -- --hostname 127.0.0.1 --port 3002
```

Checks HTTP úteis:

```bash
curl -I http://127.0.0.1:3002/login
curl -I http://127.0.0.1:3002/admin/maquinas
curl -I http://127.0.0.1:3002/maquinas
```

Resultados esperados:

- `/login` -> `200 OK`
- `/admin/maquinas` sem sessão -> `307 /login`
- `/maquinas` -> `307 /admin/maquinas`
