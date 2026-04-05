# AGENTS.md — Contexto permanente do projeto (OpenAI Codex)

> Este arquivo é lido automaticamente pelo Codex CLI em toda sessão.
> Equivalente ao CLAUDE.md — mesma base, otimizado para o comportamento do Codex.
> Nunca remova ou altere seções marcadas como OBRIGATÓRIO.

---

## LEITURA OBRIGATÓRIA ANTES DE QUALQUER AÇÃO

O Codex deve ler os seguintes arquivos antes de escrever qualquer linha de código:

```
1. AGENTS.md          (este arquivo)
2. docs/PRD.md        (regras de negócio, fluxos, metas de produção)
3. docs/TASKS.md      (sprint atual, HUs, evidências esperadas)
```

Observação:
- `CLAUDE.md` pode existir como referência histórica complementar, mas o ritual obrigatório de início desta base deve usar `AGENTS.md`, `docs/PRD.md` e `docs/TASKS.md`

Após a leitura, responda confirmando:
- Qual sprint está ativa
- Quais HUs estão pendentes nessa sprint
- Qual é a evidência da primeira HU

Aguarde confirmação antes de executar.

---

## COMPORTAMENTO ESPERADO DO AGENTE

- Execute uma HU por vez, na ordem definida no TASKS.md
- Enquanto a sprint estiver explicitamente em `realinhamento documental`, não iniciar implementação de frontend sem reabertura oficial e confirmação do usuário
- Após cada HU: marque `[x]` no checkbox e escreva uma linha de evidência abaixo
- Nunca avance de sprint sem confirmação explícita do usuário
- Se encontrar ambiguidade em uma HU, pergunte antes de implementar
- Prefira código funcional e simples a código sofisticado e quebrado
- Sempre rode `npx tsc --noEmit` após criar ou editar arquivos TypeScript

---

## 1. IDENTIDADE DO PROJETO

**Nome:** Sistema de Controle de Produção para Confecção
**Objetivo:** Monitoramento em tempo real da produtividade de operadores, máquinas e operações de costura. Compara realizado vs metas planejadas — meta individual por operação e meta coletiva de produtos completos por dia.
**Usuários finais:** Operadores de costura (baixa familiaridade com tecnologia), supervisores e administradores.

---

## 2. STACK — USAR EXATAMENTE ESTAS VERSÕES

```
Next.js         16      (App Router obrigatório — nunca Pages Router)
React           19
TypeScript      5       (strict mode obrigatório)
Tailwind CSS    4
Framer Motion   latest
Lucide React    latest
Supabase        @supabase/ssr + @supabase/supabase-js
react-qr-code   latest  (geração de QR Code)
html5-qrcode    latest  (leitura via câmera)
Recharts        latest  (gráficos)
Node.js         >= 20
```

Não instalar libs fora desta lista sem aprovação explícita.

---

## 3. ARQUITETURA — OBRIGATÓRIO

### Camadas (nunca misturar responsabilidades)

| Camada | Pasta | Responsabilidade |
|---|---|---|
| Apresentação | `app/` | Rotas, layouts, páginas Next.js |
| Componentes | `components/` | React components reutilizáveis — SEM lógica de negócio |
| Negócio | `lib/actions/` | Server Actions — toda mutação passa aqui |
| Leitura | `lib/queries/` | Queries read-only ao Supabase |
| Utilitários | `lib/utils/` | Funções puras de cálculo — sem efeitos colaterais |
| Estado | `hooks/` | Hooks React — Realtime, estado de UI |
| Contratos | `types/` | Interfaces e types TypeScript |

### Regra de acesso ao banco

```
PERMITIDO:   components/ → hooks/ → lib/queries/ → Supabase
PERMITIDO:   app/ → lib/actions/ → Supabase (Server Actions)
PROIBIDO:    components/ → Supabase (acesso direto)
PROIBIDO:    components/ → lib/actions/ dentro de useEffect
```

---

## 4. TYPESCRIPT — OBRIGATÓRIO

```typescript
// CORRETO
function buscarOperador(token: string): Promise<Operador | null> { ... }

// ERRADO — proibido
function buscarOperador(token: any): Promise<any> { ... }
```

Regras inegociáveis:
- `strict: true` no tsconfig.json
- Sem `any` explícito — usar `unknown` + type guard se necessário
- Sem `!` non-null assertion sem verificação prévia
- Interfaces para contratos externos (Supabase, props)
- Types para uniões: `type Status = 'ativo' | 'inativo' | 'afastado'`
- Rodar `npx tsc --noEmit` após toda alteração de tipo

---

## 5. REACT E NEXT.JS — OBRIGATÓRIO

```typescript
// Server Component (padrão — sem 'use client')
export default async function PaginaOperadores() {
  const operadores = await listarOperadores() // lib/queries/
  return <TabelaOperadores data={operadores} />
}

// Client Component (apenas quando necessário)
'use client'
export function QRScanner({ onScan }: Props) { ... }
```

Regras:
- Server Components por padrão
- `'use client'` apenas para: câmera, Realtime, `useState`, `useEffect`, eventos de UI
- Mutações via Server Actions (`lib/actions/`) — nunca `fetch` client-side para escrita
- Formulários com `useActionState` do React 19
- Sem prop drilling além de 2 níveis — usar Context ou Server Components

---

## 6. CLEAN CODE — OBRIGATÓRIO

```typescript
// CORRETO — nome revela intenção
function calcularMetaGrupo(funcionariosAtivos: number, minutosTurno: number, tpProduto: number): number {
  if (tpProduto <= 0 || funcionariosAtivos <= 0 || minutosTurno <= 0) return 0
  return Math.floor((funcionariosAtivos * minutosTurno) / tpProduto)
}

// ERRADO — nome não revela nada, número mágico, sem validação
function calc(a: number, b: number, c: number): number {
  return Math.floor((a * b) / c)
}
```

Regras:
- Nomes expressivos — nunca `d`, `tmp`, `data2`, `res`, `val`
- Uma função = uma responsabilidade
- Sem números mágicos — tudo em `lib/constants.ts`
- Early return para condições de guarda
- Sem `catch(e) {}` vazio — tratar ou relançar com contexto
- Sem `console.log` em código de produção

---

## 7. ESTILO E UI — OBRIGATÓRIO

- **Tailwind CSS apenas** — sem CSS Modules, styled-components, estilos inline (exceto valores dinâmicos pontuais)
- **Lucide React** para todos os ícones — sem outras libs de ícone
- **Mobile-first** — breakpoints: `sm:640px`, `md:768px`, `lg:1024px`
- **Framer Motion** para feedback de sucesso/erro/transição — sem animações decorativas
- Acessibilidade: `aria-label` em elementos interativos, `alt` em imagens, `label` em campos

---

## 8. CONVENÇÃO DE QR CODE — OBRIGATÓRIO

Todo QR Code codifica exatamente neste formato:

```
tipo:token
```

```
operador:a1b2c3d4e5f6...   ← qr_code_token da tabela operadores
maquina:b2c3d4e5f6a7...    ← qr_code_token da tabela maquinas
operacao:c3d4e5f6a7b8...   ← qr_code_token da tabela operacoes
```

Parseamento sempre assim — não inventar outro formato:
```typescript
const [tipo, token] = qrResult.split(':')
```

Lookup no banco sempre por `qr_code_token`, nunca por `id`.
Implementação de referência em `lib/utils/qrcode.ts`.

---

## 9. FÓRMULAS DE NEGÓCIO — OBRIGATÓRIO

Estas fórmulas são a essência do sistema. Implementar exatamente assim:

```typescript
// Meta por hora de uma operação
metaHora = Math.floor(60 / tpOperacao)

// Meta individual do operador no dia
metaIndividual = Math.floor(minutosTurno / tpOperacao)

// Meta coletiva de produtos completos no dia
metaGrupo = Math.floor((funcionariosAtivos * minutosTurno) / tpProduto)

// T.P do produto = soma dos T.P de todas as operações do roteiro
tpProduto = operacoes.reduce((soma, op) => soma + op.tempoPadraoMin, 0)

// Eficiência do operador
eficiencia = (quantidadeProduzida * tpOperacao / minutosTrabalhados) * 100
```

Onde buscar os valores reais do dia:
- `minutosTurno` → tabela `configuracao_turno` WHERE data = hoje
- `funcionariosAtivos` → tabela `configuracao_turno` WHERE data = hoje
- `tpProduto` → tabela `configuracao_turno.tp_produto_min` (calculado ao salvar)
- **NUNCA usar `MINUTOS_TURNO_PADRAO` em produção** — é apenas fallback de dev

---

## 10. ESTRUTURA DE PASTAS

```
/
├── AGENTS.md
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── BACKLOG.md
│   └── TASKS.md
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── operadores/page.tsx
│   │   ├── maquinas/page.tsx
│   │   ├── operacoes/page.tsx
│   │   ├── produtos/page.tsx
│   │   └── relatorios/page.tsx
│   └── (operador)/scanner/page.tsx
├── components/
│   ├── dashboard/
│   │   ├── CardKPI.tsx
│   │   ├── ModalConfiguracaoTurno.tsx
│   │   ├── RankingOperadores.tsx
│   │   ├── StatusMaquinas.tsx
│   │   └── GraficoProducaoPorHora.tsx
│   ├── scanner/
│   │   ├── QRScanner.tsx
│   │   └── ConfirmacaoRegistro.tsx
│   ├── qrcode/QRCodeDisplay.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── Toast.tsx
│       ├── DataTable.tsx
│       └── StatusBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts      ← createBrowserClient
│   │   ├── server.ts      ← createServerClient
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
│   │   ├── producao.ts    ← todas as fórmulas da seção 9
│   │   ├── qrcode.ts      ← parseQRCode()
│   │   └── exportacao.ts
│   └── constants.ts
├── hooks/
│   ├── useRealtimeProducao.ts
│   └── useScanner.ts
└── types/
    ├── index.ts
    └── supabase.ts        ← gerado via CLI
```

---

## 11. GLOSSÁRIO DO DOMÍNIO

| Termo | Significado |
|---|---|
| T.P Operação | Tempo Padrão de uma operação em minutos (ex: `0.28`) |
| T.P Produto | Soma de todos os T.P das operações do roteiro |
| MT/H | Meta/Hora = `floor(60 / tp_operacao)` |
| Meta Individual | Peças que um operador deve fazer no turno = `floor(minutos_turno / tp_operacao)` |
| Meta Grupo | Produtos completos que a linha entrega no dia = `floor((funcionarios × minutos) / tp_produto)` |
| Eficiência % | `(qtd × tp / minutos_trabalhados) × 100` |
| Turno | Período de trabalho — minutos definidos diariamente pelo supervisor |
| Configuração do Turno | 3 campos preenchidos pelo supervisor: funcionários, minutos, produto do dia |
| Gargalo | Operação com eficiência abaixo da média da linha |
| Roteiro | Sequência de operações para produzir um produto |
| rt | Máquina reta |
| ov | Overloque |
| 2ag | Duas agulhas |
| gal | Galoneira |
| man | Manual (sem máquina) |

---

## 12. CONSTANTES (lib/constants.ts)

```typescript
export const MINUTOS_TURNO_PADRAO = 540       // FALLBACK apenas — não usar em produção
export const ALERTA_MAQUINA_PARADA = 15       // min sem registro → alerta vermelho
export const ALERTA_EFICIENCIA_BAIXA = 70     // % → destaque amarelo
export const ALERTA_EFICIENCIA_CRITICA = 50   // % → destaque vermelho
export const QR_TIPOS = ['operador', 'maquina', 'operacao'] as const
export type QRTipo = typeof QR_TIPOS[number]
```

---

## 13. VARIÁVEIS DE AMBIENTE

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # server-side only — jamais expor ao cliente
MCP_API_KEY=...                     # usar para Supabase Management API
```

---

## 14. SUPABASE MANAGEMENT API — OBRIGATÓRIO PARA SQL REMOTO

Sempre que o agente precisar executar schema, migração, validação SQL ou qualquer ação administrativa remota no Supabase, deve preferir a rota oficial da Supabase Management API:

```text
POST /v1/projects/{ref}/database/query
```

Regras:
- usar `MCP_API_KEY` como credencial para a Management API
- preferir essa rota quando precisar aplicar SQL remotamente no projeto
- usar `POST /v1/projects/{ref}/database/query/read-only` para consultas de validação sem escrita
- não depender do host direto do Postgres quando a ação puder ser feita pela Management API

Referência oficial:
- https://supabase.com/docs/reference/api/v1-run-a-query

---

## 15. COMANDOS DO PROJETO

```bash
npm run dev                                                      # dev server
npm run build                                                    # build produção
npm run lint                                                     # ESLint
npx tsc --noEmit                                                 # checar tipos
npx supabase gen types typescript --local > types/supabase.ts   # gerar types
npx supabase db reset                                            # resetar banco local
```

---

## 16. PROIBIÇÕES ABSOLUTAS

O Codex nunca deve fazer nenhum dos itens abaixo, independente do que for pedido:

| Proibido | Alternativa correta |
|---|---|
| `any` explícito em TypeScript | `unknown` + type guard |
| Supabase direto em `components/` | Via `lib/queries/` ou `lib/actions/` |
| Pages Router (`pages/`) | App Router (`app/`) |
| `!` non-null sem verificação | Verificação explícita antes |
| `console.log` em produção | Remover antes de commitar |
| Números mágicos no código | Constantes em `lib/constants.ts` |
| `MINUTOS_TURNO_PADRAO` em produção | `configuracao_turno` do banco |
| CSS fora do Tailwind | Classes Tailwind ou variáveis dinâmicas inline |
| Ícones fora do Lucide React | Lucide React |
| `fetch` client-side para mutações | Server Actions |
| Avançar sprint sem evidências | Marcar `[x]` e registrar evidência |
| Implementar fora do escopo da sprint atual | Abrir issue ou perguntar |
