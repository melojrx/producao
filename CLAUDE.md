# CLAUDE.md — Contexto permanente do projeto

> Este arquivo é lido automaticamente pelo Claude Code em toda sessão.
> Nunca remova ou altere as seções marcadas como OBRIGATÓRIO.

---

## 1. IDENTIDADE DO PROJETO

**Nome:** Sistema de Controle de Produção para Confecção
**Objetivo:** Permitir que o dono de uma confecção acompanhe em tempo real a produtividade de cada operador, máquina e operação de costura, comparando o realizado com as metas planejadas — tanto metas individuais por operação quanto a meta coletiva de produtos completos entregues no dia.
**Público-alvo do usuário final:** Operadores de costura (baixa familiaridade com tecnologia), supervisores e administradores de confecção.

---

## 2. STACK TECNOLÓGICA

```
Frontend:   Next.js 16 (App Router)
            React 19
            TypeScript 5
            Tailwind CSS 4
            Framer Motion
            Lucide React

BaaS:       Supabase
            ├── PostgreSQL (banco principal)
            ├── Realtime (WebSocket via Postgres CDC)
            ├── Auth (autenticação de admin/supervisor)
            └── Storage (imagens de produtos e QR Codes)

QR Code:    react-qr-code        (geração — client side)
            html5-qrcode          (leitura via câmera do celular)

Charts:     Recharts

Deploy:     Vercel (frontend)
            Supabase Cloud (BaaS)
```

**Versões mínimas obrigatórias:**
- Node.js >= 20
- TypeScript strict mode habilitado
- Next.js App Router (nunca Pages Router)

---

## 3. ARQUITETURA E PADRÕES — OBRIGATÓRIO

### 3.1 Clean Architecture

O projeto segue os princípios de Clean Architecture. As responsabilidades são separadas em camadas:

```
app/              ← camada de apresentação (UI, rotas, layouts)
components/       ← componentes React reutilizáveis (sem lógica de negócio)
lib/              ← lógica de negócio, utilitários, clientes externos
hooks/            ← estado e efeitos colaterais reutilizáveis
types/            ← contratos de dados (interfaces, types)
```

**Regra fundamental:** componentes em `components/` nunca acessam o Supabase diretamente. Toda comunicação com o banco passa por `lib/` (Server Actions ou funções utilitárias) ou por hooks em `hooks/`.

### 3.2 Clean Code — regras obrigatórias

- **Nomes expressivos:** variáveis, funções e componentes devem revelar intenção. Nunca `d`, `tmp`, `data2`, `handleClick2`.
- **Funções pequenas e com responsabilidade única:** uma função faz uma coisa. Se precisar de comentário para explicar o que faz, o nome está errado.
- **Sem números mágicos:** constantes nomeadas em `lib/constants.ts`. Ex: `MINUTOS_TURNO_PADRAO = 540`, não `540` espalhado no código.
- **Sem comentários óbvios:** o código deve ser autoexplicativo. Comentários apenas para decisões não óbvias de negócio.
- **Tratamento de erros explícito:** nunca `catch(e) {}` vazio. Toda exceção é tratada ou relançada com contexto.
- **Early return:** evitar aninhamento profundo. Retornar cedo em condições de erro/guarda.

### 3.3 TypeScript — regras obrigatórias

- **Sem `any` explícito.** Se inevitável, use `unknown` e faça type guard.
- **Interfaces para contratos externos** (dados do Supabase, props de componentes).
- **Types para uniões e utilitários** (`type Status = 'ativo' | 'inativo'`).
- **Gerar types do Supabase via CLI:**
  ```bash
  npx supabase gen types typescript --local > types/supabase.ts
  ```
- **Nunca usar `!` (non-null assertion)** sem verificação prévia.

### 3.4 React e Next.js — regras obrigatórias

- **Server Components por padrão.** Usar `'use client'` apenas quando necessário: interatividade, hooks de estado, Realtime, câmera.
- **Server Actions para mutações** (criar, editar, excluir registros). Nunca `fetch` client-side para operações de escrita.
- **Supabase server client** em Server Components e Server Actions.
- **Supabase browser client** em Client Components.
- **Sem prop drilling além de 2 níveis.** Usar Context ou passar dados via Server Components.
- **Formulários com `useActionState`** do React 19 (não `useState` + `fetch`).

### 3.5 Estilo e UI — regras obrigatórias

- **Tailwind CSS apenas** para estilos. Sem CSS Modules, styled-components ou estilos inline (exceto casos dinâmicos pontuais).
- **Lucide React** para todos os ícones. Nunca importar ícones de outras libs.
- **Mobile-first** em todas as telas. Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px).
- **Acessibilidade básica:** todo elemento interativo tem `aria-label`, imagens têm `alt`, formulários têm `label`.
- **Framer Motion** para animações de feedback (sucesso, erro, transições). Sem animações decorativas.

---

## 4. CONVENÇÃO DE QR CODE — OBRIGATÓRIO

Todo QR Code no sistema codifica uma string no formato:

```
tipo:uuid-token
```

Exemplos:
```
operador:a1b2c3d4-e5f6-7890-abcd-ef1234567890
maquina:b2c3d4e5-f6a7-8901-bcde-f12345678901
operacao:c3d4e5f6-a7b8-9012-cdef-123456789012
```

**Regras:**
- O `tipo` é sempre um dos três valores: `operador`, `maquina`, `operacao`
- O `uuid-token` é o campo `qr_code_token` da tabela correspondente no banco
- O token **não é** o `id` primário da entidade — é um campo separado gerado para esse fim
- O parseamento é sempre: `const [tipo, token] = qrResult.split(':')`
- Lookup no banco é sempre pelo campo `qr_code_token`, nunca pelo `id`

---

## 5. ESTRUTURA DE PASTAS

```
/
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── BACKLOG.md
│   └── TASKS.md
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── operadores/
│   │   │   └── page.tsx
│   │   ├── maquinas/
│   │   │   └── page.tsx
│   │   ├── operacoes/
│   │   │   └── page.tsx
│   │   └── produtos/
│   │       └── page.tsx
│   └── (operador)/
│       └── scanner/
│           └── page.tsx
├── components/
│   ├── dashboard/
│   │   ├── CardKPI.tsx
│   │   ├── ModalConfiguracaoTurno.tsx
│   │   ├── RankingOperadores.tsx
│   │   ├── StatusMaquinas.tsx
│   │   └── GraficoProducaoPorHora.tsx
│   ├── scanner/
│   │   ├── QRScanner.tsx
│   │   └── RegistroProducao.tsx
│   ├── qrcode/
│   │   └── QRCodeDisplay.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── Toast.tsx
│       ├── DataTable.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── actions/
│   │   ├── operadores.ts
│   │   ├── maquinas.ts
│   │   ├── operacoes.ts
│   │   ├── producao.ts
│   │   └── turno.ts
│   ├── queries/
│   │   ├── operadores.ts
│   │   ├── maquinas.ts
│   │   ├── producao.ts
│   │   └── turno.ts
│   ├── utils/
│   │   ├── producao.ts
│   │   ├── qrcode.ts
│   │   └── exportacao.ts
│   └── constants.ts
├── hooks/
│   ├── useRealtimeProducao.ts
│   └── useEficiencia.ts
└── types/
    ├── index.ts
    └── supabase.ts
```

---

## 6. GLOSSÁRIO DO DOMÍNIO — OBRIGATÓRIO

| Termo | Significado técnico |
|---|---|
| **T.P Operação** | Tempo Padrão de uma operação individual em minutos (ex: `0.28`) |
| **T.P Produto** | Soma dos T.P de todas as operações do roteiro do produto |
| **MT/H** | Meta por Hora de uma operação = `Math.floor(60 / tp_operacao)` |
| **Meta Individual** | Quantidade que um operador deve produzir na sua operação no dia: `Math.floor(minutos_turno / tp_operacao)` |
| **Meta Grupo** | Quantidade de produtos completos que a linha deve entregar no dia: `Math.floor((funcionarios_ativos × minutos_turno) / tp_produto)` |
| **Eficiência %** | `(qtd_produzida × tp_operacao / minutos_trabalhados) × 100` |
| **Configuração do Turno** | 3 parâmetros definidos pelo supervisor no início do dia: funcionários ativos, minutos do turno, produto do dia |
| **Gargalo** | Operação com eficiência abaixo da média da linha |
| **Balanceamento** | Distribuição equilibrada de operações entre operadores |
| **Roteiro** | Sequência ordenada de operações para fabricar um produto |
| **rt** | Máquina reta — ponto fixo |
| **ov** | Overloque — corta e cose simultaneamente |
| **2ag** | Duas agulhas — costura paralela |
| **gal** | Galoneira — ponto corrente na borda |
| **man** | Operação manual, sem máquina |

---

## 7. CONSTANTES GLOBAIS (lib/constants.ts)

```typescript
export const MINUTOS_TURNO_PADRAO = 540      // fallback — valor real vem de configuracao_turno
export const ALERTA_MAQUINA_PARADA = 15      // minutos sem registro = alerta
export const ALERTA_EFICIENCIA_BAIXA = 70    // % abaixo = destaque amarelo
export const ALERTA_EFICIENCIA_CRITICA = 50  // % abaixo = destaque vermelho
export const QR_TIPOS = ['operador', 'maquina', 'operacao'] as const
export type QRTipo = typeof QR_TIPOS[number]
```

> `MINUTOS_TURNO_PADRAO` é apenas o fallback para desenvolvimento.
> Em produção, os minutos do turno vêm sempre de `configuracao_turno`
> preenchida pelo supervisor no início de cada dia.

---

## 8. VARIÁVEIS DE AMBIENTE

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # apenas server-side, nunca expor
```

---

## 9. COMANDOS ÚTEIS

```bash
npm run dev
npm run build
npm run lint
npx supabase gen types typescript --local > types/supabase.ts
npx supabase db reset
```

---

## 10. O QUE NUNCA FAZER

- ❌ Usar `any` explícito no TypeScript
- ❌ Acessar Supabase diretamente em componentes (usar lib/ ou hooks/)
- ❌ Usar Pages Router (sempre App Router)
- ❌ Usar `!` non-null assertion sem verificação
- ❌ Deixar `console.log` no código de produção
- ❌ Hardcodar valores de negócio (usar `lib/constants.ts`)
- ❌ Usar `MINUTOS_TURNO_PADRAO` como fonte de verdade — sempre buscar `configuracao_turno` do dia
- ❌ Criar CSS fora do Tailwind
- ❌ Usar ícones fora do Lucide React
- ❌ Fazer `fetch` client-side para mutações (usar Server Actions)
- ❌ Avançar sprint sem marcar evidências no TASKS.md
