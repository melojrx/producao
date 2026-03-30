# Proposta de Redesign — Sistema de Controle de Produção

> **Status:** Proposta. Não implementado.
> **Data:** 2026-03-29

---

## 1. Direção Criativa: "Precision Industrial"

**Conceito:** Um painel de controle de manufatura de precisão — não corporativo, não startup colorida. A estética de um equipamento industrial de alto valor: sério, legível, funcional, com personalidade. Pensa numa interface de CNC moderno, ou no painel de controle de uma linha de produção automatizada.

**O que vai ser lembrado:** Números em fonte monoespaçada com o acento âmbar/dourado sobre fundos escuros — como o display luminoso de uma máquina de costura industrial de última geração.

---

## 2. Identidade Visual

### 2.1 Paleta de Cores

#### Conceito
- **Fundo:** Slate profundo com leve tom azulado (industrial, sólido)
- **Acento primário:** Âmbar/dourado — evoca iluminação de chão de fábrica, alertas de equipamento, precisão
- **Sem azul genérico** como accent — o azul vai para feedback de informação apenas

#### Light Mode
```
Fundo principal:     #f8f7f4   (off-white quente, não branco frio)
Fundo de card:       #ffffff
Fundo sidebar:       #1c2333   (slate escuro — contraste intencional)
Fundo sidebar hover: #252d40
Texto principal:     #111827   (quase preto)
Texto secundário:    #6b7280
Texto muted:         #9ca3af
Borda sutil:         #e5e7eb
Borda card:          #f0ede8   (quente)
Acento primário:     #d97706   (âmbar 600)
Acento hover:        #b45309   (âmbar 700)
Acento suave:        #fef3c7   (âmbar 50 — backgrounds de badge)
Sucesso:             #059669   (esmeralda 600)
Alerta:              #d97706   (âmbar — mesmo que accent)
Erro:                #dc2626   (vermelho 600)
```

#### Dark Mode
```
Fundo principal:     #0f1117   (quase preto com leve azul)
Fundo de card:       #1a1f2e   (slate profundo)
Fundo sidebar:       #141824   (mais escuro que o card)
Fundo sidebar hover: #1f2538
Texto principal:     #f1f0ed   (off-white quente)
Texto secundário:    #9ca3af
Texto muted:         #6b7280
Borda sutil:         #252d3d
Borda card:          #1f2538
Acento primário:     #f59e0b   (âmbar 500 — mais brilhante no escuro)
Acento hover:        #fbbf24   (âmbar 400)
Acento suave:        #451a03   (âmbar 950 — fundo de badge)
Sucesso:             #10b981
Alerta:              #f59e0b
Erro:                #ef4444
```

### 2.2 Tipografia

| Uso | Fonte | Peso | Tamanho |
|-----|-------|------|---------|
| **Números / Dados** | `DM Mono` | 500, 600 | variável |
| **Labels / UI** | `Outfit` | 400, 500, 600 | variável |
| **Logo / Título** | `Outfit` | 700 | 18-20px |

**Por quê estas fontes:**
- **DM Mono** — monoespaçada humanista. Números de KPI em monospace dão sensação de "leitura de sensor", precisão industrial. Disponível no Google Fonts.
- **Outfit** — geométrica, limpa, moderna mas não fria. Substitui qualquer sans-serif genérica. Excelente legibilidade em português.

**Import no globals.css:**
```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700&display=swap');
```

### 2.3 Espaçamento e Bordas

```
Border radius padrão (card):   8px  (rounded-lg)
Border radius pequeno (badge): 4px  (rounded)
Border radius grande (modal):  12px (rounded-xl)
Border radius botão:           6px  (rounded-md)

Gap padrão entre cards:   16px (gap-4)
Padding de card:          20px (p-5)
Padding de página:        24px (p-6)

Sombra card (light): 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
Sombra card (dark):  nenhuma — usa borda sutil no lugar
```

---

## 3. Sistema de Tokens — Tailwind CSS v4

No `app/globals.css`, substituir as variáveis atuais por:

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@400;500;600;700&display=swap');

@theme {
  --font-sans: 'Outfit', sans-serif;
  --font-mono: 'DM Mono', monospace;
}

:root {
  /* Superfícies */
  --bg-root:        #f8f7f4;
  --bg-card:        #ffffff;
  --bg-sidebar:     #1c2333;
  --bg-sidebar-item:#252d40;
  --bg-input:       #ffffff;

  /* Texto */
  --text-primary:   #111827;
  --text-secondary: #6b7280;
  --text-muted:     #9ca3af;
  --text-sidebar:   #e2e8f0;
  --text-sidebar-muted: #94a3b8;

  /* Bordas */
  --border:         #e5e7eb;
  --border-card:    #f0ede8;

  /* Acento âmbar */
  --accent:         #d97706;
  --accent-hover:   #b45309;
  --accent-subtle:  #fef3c7;
  --accent-text:    #92400e;

  /* Semânticas */
  --success:        #059669;
  --success-subtle: #d1fae5;
  --warning:        #d97706;
  --warning-subtle: #fef3c7;
  --error:          #dc2626;
  --error-subtle:   #fee2e2;
  --info:           #2563eb;
  --info-subtle:    #dbeafe;
}

.dark {
  --bg-root:        #0f1117;
  --bg-card:        #1a1f2e;
  --bg-sidebar:     #141824;
  --bg-sidebar-item:#1f2538;
  --bg-input:       #1f2538;

  --text-primary:   #f1f0ed;
  --text-secondary: #9ca3af;
  --text-muted:     #6b7280;
  --text-sidebar:   #e2e8f0;
  --text-sidebar-muted: #64748b;

  --border:         #252d3d;
  --border-card:    #1f2538;

  --accent:         #f59e0b;
  --accent-hover:   #fbbf24;
  --accent-subtle:  #451a03;
  --accent-text:    #fde68a;

  --success:        #10b981;
  --success-subtle: #064e3b;
  --warning:        #f59e0b;
  --warning-subtle: #451a03;
  --error:          #ef4444;
  --error-subtle:   #450a0a;
  --info:           #3b82f6;
  --info-subtle:    #1e3a5f;
}

body {
  background-color: var(--bg-root);
  color: var(--text-primary);
  font-family: var(--font-sans);
}
```

---

## 4. AdminShell — Sidebar Redesenhada

### Estrutura Visual

```
┌─────────────────────────────────────────────────────────────┐
│ SIDEBAR (dark, 240px)        │ TOPBAR (light/dark, 60px)    │
│ ┌──────────────────────────┐ │ ┌──────────────────────────┐ │
│ │  ⚙ PRODUÇÃO              │ │ │ Breadcrumb   [☀/☾] [user]│ │
│ │  Sistema de Controle     │ │ └──────────────────────────┘ │
│ ├──────────────────────────┤ │                              │
│ │  ◉ Dashboard             │ │ CONTEÚDO                     │
│ │  👥 Operadores           │ │                              │
│ │  ⚙ Máquinas              │ │                              │
│ │  🔧 Operações            │ │                              │
│ │  📦 Produtos             │ │                              │
│ │  🏭 Setores              │ │                              │
│ ├──────────────────────────┤ │                              │
│ │  👤 Usuários (admin)     │ │                              │
│ │  📊 Relatórios           │ │                              │
│ ├──────────────────────────┤ │                              │
│ │  [◀] Recolher            │ │                              │
│ └──────────────────────────┘ │                              │
└─────────────────────────────────────────────────────────────┘
```

### Detalhes da Sidebar
- **Fundo:** `var(--bg-sidebar)` — slate escuro mesmo no light mode. Contraste intencional.
- **Logo:** Ícone de fábrica + "PRODUÇÃO" em Outfit 700 + subtítulo "Controle" em 11px muted
- **Item ativo:** barra âmbar de 3px na esquerda + fundo levemente mais claro + texto branco
- **Item hover:** fundo `var(--bg-sidebar-item)` suave
- **Separador:** linha sutil entre grupos de nav
- **Botão de colapso:** na parte inferior, com ícone chevron animado
- **Collapsed (64px):** apenas ícones centrados com tooltip no hover

### Topbar
- **Altura:** 60px, com borda inferior sutil
- **Fundo:** mesmo que `--bg-card` (contraste com conteúdo)
- **Esquerda:** breadcrumb contextual
- **Direita:** toggle light/dark + avatar/nome do usuário

---

## 5. Dashboard — Layout Proposto

### Wireframe do Grid (desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ [Turno: Aberto - 07:00 às 16:00] [Produto: Calça Jeans]     │
│ [Funcionários: 12]  [Meta Grupo: 243 peças]         [⚙ ...]│
├──────────┬──────────┬──────────┬──────────────────────────┤
│ KPI      │ KPI      │ KPI      │ KPI                      │
│ Produção │ Eficiên. │ Meta     │ Tempo Restante            │
│  1.247   │  87,3%   │  1.500   │  3h 42min                │
│ ↑ +12%   │ ↑ +5%    │          │                           │
├──────────┴──────────┴──────────┴──────────────────────────┤
│ GRÁFICO DE PRODUÇÃO POR HORA (largura total)               │
│ Barras: realizado vs meta por hora                          │
├──────────────────────────────┬─────────────────────────────┤
│ RANKING OPERADORES (tabela)  │ STATUS MÁQUINAS (grid)      │
│ pos | nome | qtd | efic%     │ [🟢 RT-01] [🟡 OV-03]      │
│  1  | Ana  │ 156 │ 94%       │ [🟢 RT-02] [🔴 2AG-01]     │
│  2  | João │ 143 │ 86%       │ [🟢 OV-01] [🟢 GAL-01]     │
└──────────────────────────────┴─────────────────────────────┘
```

### KPI Cards — Visual
- **Número principal:** DM Mono, 32px, bold — destaque imediato
- **Label:** Outfit 12px uppercase, letter-spacing 0.05em, text-secondary
- **Tendência:** badge pequeno (+12%) com cor semântica
- **Ícone:** canto superior direito, 36x36px, fundo accent-subtle, ícone accent
- **Borda esquerda:** 3px sólida na cor semântica (azul=info, âmbar=atenção, verde=sucesso)

### Ranking de Operadores
- Lista densa mas legível
- Números de posição em DM Mono
- Barra de progresso inline na célula de eficiência (sem chart separado)
- Destaque âmbar no 1º lugar

### Status de Máquinas
- Grid de badges compactos (3-4 por linha)
- Cores: verde (ativa), âmbar (parada < 15min), vermelho (parada > 15min), cinza (offline)
- Nome da máquina + tempo desde último registro

---

## 6. Login Page — Proposta Visual

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│              FUNDO: bg-root com textura                  │
│              sutil (noise ou grid fino)                  │
│                                                          │
│        ┌────────────────────────────────────┐            │
│        │  ⚙ PRODUÇÃO                        │            │
│        │  Sistema de Controle de Produção   │            │
│        │                                    │            │
│        │  Usuário                           │            │
│        │  [________________________]        │            │
│        │                                    │            │
│        │  Senha                             │            │
│        │  [________________________]        │            │
│        │                                    │            │
│        │  [     Entrar     ] âmbar          │            │
│        │                                    │            │
│        │  ℹ Acesso restrito a               │            │
│        │    funcionários autorizados        │            │
│        └────────────────────────────────────┘            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Detalhes:**
- Card centralizado max-w-sm, sombra média, border-card
- Fundo da página com padrão de pontos ou grade muito sutil (CSS puro)
- Logo com ícone Factory de Lucide + nome em Outfit 700
- Botão de submit em âmbar sólido, sem outline
- Sem fundo azul no banner de aviso — usar ícone simples + texto muted

---

## 7. Componentes Base

### Button
```
Variante primária:   bg-[--accent] text-white hover:bg-[--accent-hover]
Variante secundária: bg-[--bg-card] border border-[--border] hover:bg-[--bg-root]
Variante ghost:      transparent hover:bg-[--bg-root]
Variante destrutiva: bg-[--error] text-white
Tamanho sm: h-8 px-3 text-sm
Tamanho md: h-9 px-4 text-sm   (padrão)
Tamanho lg: h-10 px-5 text-base
Border radius: rounded-md (6px)
```

### Card
```
bg-[--bg-card] rounded-lg border border-[--border-card]
shadow-sm (light) / sem sombra (dark, usa só borda)
p-5
```

### Badge / StatusBadge
```
Sucesso:  bg-[--success-subtle] text-[--success] ring-1 ring-[--success]/30
Alerta:   bg-[--warning-subtle] text-[--warning] ring-1 ring-[--warning]/30
Erro:     bg-[--error-subtle]   text-[--error]   ring-1 ring-[--error]/30
Info:     bg-[--info-subtle]    text-[--info]     ring-1 ring-[--info]/30
Tamanho:  text-xs font-medium px-2 py-0.5 rounded
```

### Input
```
bg-[--bg-input] border border-[--border] rounded-md
h-9 px-3 text-sm
focus:ring-2 focus:ring-[--accent]/40 focus:border-[--accent]
placeholder:text-[--text-muted]
```

---

## 8. Estratégia de Implementação — 4 Fases

### Fase 1 — Fundação (1 arquivo + 2 modificações)
**Objetivo:** Mudar a base sem quebrar nada.

1. **`app/globals.css`** — Substituir variáveis, adicionar imports de fontes, tokens completos
2. **`tailwind.config.ts`** (se existir) — Registrar fontes custom
3. **`components/admin/AdminShell.tsx`** — Aplicar nova sidebar escura e topbar

**Risco:** Baixo. Mudança de CSS puro + um componente.

---

### Fase 2 — KPI Cards e Dashboard (3-4 componentes)
**Objetivo:** A parte mais visível fica profissional primeiro.

1. **`components/dashboard/CardKPI.tsx`** — DM Mono nos números, borda colorida, ícone redesenhado
2. **`components/dashboard/StatusMaquinas.tsx`** — Grid de badges compactos
3. **`components/dashboard/RankingOperadores.tsx`** — Barras inline de progresso
4. **`app/globals.css`** — Ajuste fino pós-Fase 1

---

### Fase 3 — Componentes base e Login (4-5 arquivos)
**Objetivo:** Consistência nos formulários e modais.

1. **`components/ui/Button.tsx`** — Criar componente base reutilizável
2. **`components/ui/Card.tsx`** — Wrapper de card
3. **`components/ui/Badge.tsx`** — Unificar StatusBadge
4. **`app/(auth)/login/page.tsx`** + `components/auth/LoginForm.tsx`

---

### Fase 4 — Modais e Scanner (polimento final)
**Objetivo:** Harmonizar os modais e a tela do operador.

1. Modais de CRUD (ModalMaquina, ModalOperacao etc.) — padding, tipografia, inputs
2. **`app/(operador)/scanner/page.tsx`** — Adaptar ao novo tema
3. Toggle light/dark na topbar
4. Revisão geral de espaçamentos

---

## 9. Toggle Light/Dark

**Implementação recomendada:** classe `.dark` na tag `<html>` via `localStorage`.

```tsx
// components/admin/ThemeToggle.tsx
'use client'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark'
    setDark(saved)
    document.documentElement.classList.toggle('dark', saved)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <button onClick={toggle} aria-label="Alternar tema">
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
```

---

## 10. Resumo da Proposta

| Aspecto | Atual | Proposto |
|---------|-------|---------|
| Palette | Azul genérico + cinzas | Âmbar/dourado + slate profundo |
| Tipografia | System fonts | Outfit (UI) + DM Mono (dados) |
| Sidebar | Branca sobre cinza | Escura (contraste intencional) |
| KPI cards | Números em sans genérico | DM Mono, borda colorida |
| Dark mode | CSS vars básicas | Sistema completo de tokens |
| Light mode | Branco frio | Off-white quente (#f8f7f4) |
| Componentes | Estilos inline dispersos | Button/Card/Badge centralizados |
| Login | Banner azul genérico | Minimalista, fundo texturado |

**Complexidade:** 4 fases, ~12 arquivos modificados/criados. Sem mudança de arquitetura.
