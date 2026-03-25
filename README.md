<div align="center">

# 🧵 Sistema de Controle de Produção

### Monitoramento em tempo real da produtividade de linhas de costura via QR Code

[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://producao-chi.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

**🔗 [Acessar sistema em produção →](https://producao-chi.vercel.app/)**

</div>

---

## 📋 Sobre o Projeto

Sistema web para **coleta e monitoramento de produção em confecções** via QR Code. Transforma dados em tempo real em ação imediata para supervisores — eliminando gargalos invisíveis, máquinas paradas sem alerta e decisões baseadas em estimativa.

> **Princípio central:** simplicidade extrema para o operador, riqueza de informação para o supervisor.

### O Problema

Donos de confecção não conseguem medir em tempo real a produtividade da sua linha de produção. As metas existem (tempo padrão por operação, meta/hora por máquina), mas a comparação com o realizado só acontece manualmente no final do dia — quando já é tarde para corrigir gargalos, realocar operadores ou identificar máquinas paradas.

### A Solução

Três objetos físicos impressos e plastificados fazem toda a coleta de dados — o operador nunca digita nada:

| Objeto | Onde fica | Quando é usado |
|---|---|---|
| 🪪 **Crachá do Operador** | Pendurado no pescoço | Uma vez ao chegar no trabalho |
| 🏷️ **Etiqueta da Máquina** | Colada na lateral da máquina | Uma vez ao sentar na máquina |
| 📇 **Cartão de Operação** | Sobre a bancada | A cada lote produzido (scan de segundos) |

---

## ✨ Funcionalidades

### 📱 Scanner Mobile (`/scanner`)
- Câmera ativa para leitura de QR Code (câmera traseira)
- Fluxo guiado em 3 etapas: operador → máquina → operação
- Exibição da meta individual da operação após o scan
- Botão de quantidade touch-friendly (grande, verde)
- Feedback visual (animação) e háptico (vibração) no sucesso
- Sessão salva — operador e máquina não precisam ser re-escaneados a cada lote

### 📊 Dashboard em Tempo Real (`/admin/dashboard`)
- Modal de configuração do turno (3 campos: funcionários, minutos, produto)
- **KPIs ao vivo:** Meta Grupo, Progresso %, Peças do dia, Eficiência média
- **Gráfico** de produção por hora (Recharts)
- **Ranking** de operadores com eficiência colorida (verde/amarelo/vermelho)
- **Grid de status** das máquinas com alertas automáticos
- Atualização em tempo real via **Supabase Realtime** (sem refresh)

### ⚙️ Módulos Administrativos
| Módulo | Rota | Recursos |
|---|---|---|
| Operadores | `/admin/operadores` | CRUD + QR Code + download PNG para crachá |
| Máquinas | `/admin/maquinas` | CRUD + QR Code + troca de status |
| Operações | `/admin/operacoes` | CRUD + meta/hora calculada + QR Code |
| Produtos | `/admin/produtos` | CRUD + roteiro de operações + T.P Produto |
| Relatórios | `/admin/relatorios` | Filtros por período/operador + comparativo meta vs realizado |

### 🚨 Alertas Automáticos
- Máquina sem registro há **> 15 minutos** → card vermelho pulsante
- Eficiência do operador **< 70%** → destaque amarelo no ranking
- Eficiência do operador **< 50%** → destaque vermelho

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Operador (Mobile)          Supervisor (TV/Tablet)       │
│  /scanner — câmera QR       /admin/dashboard — realtime  │
└────────────────┬────────────────────────┬───────────────┘
                 │                        │
         ┌───────▼────────────────────────▼──────┐
         │           Next.js 16 (App Router)      │
         │  ┌──────────────┐  ┌────────────────┐  │
         │  │ Server Actions│  │ Server Components│ │
         │  │ lib/actions/ │  │ lib/queries/   │  │
         │  └──────┬───────┘  └───────┬────────┘  │
         └─────────┼──────────────────┼────────────┘
                   │                  │
         ┌─────────▼──────────────────▼────────────┐
         │              Supabase                    │
         │  PostgreSQL + Realtime + Auth + RLS      │
         └──────────────────────────────────────────┘
```

### Camadas do Projeto

| Camada | Pasta | Responsabilidade |
|---|---|---|
| Apresentação | `app/` | Rotas, layouts e páginas (Next.js App Router) |
| Componentes | `components/` | React components reutilizáveis — sem lógica de negócio |
| Negócio | `lib/actions/` | Server Actions — toda mutação passa aqui |
| Leitura | `lib/queries/` | Queries read-only ao Supabase |
| Utilitários | `lib/utils/` | Funções puras de cálculo |
| Estado | `hooks/` | Hooks React (Realtime, estado de UI) |
| Contratos | `types/` | Interfaces e types TypeScript |

---

## 🛠️ Tech Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| **Next.js** | 16 | Framework principal (App Router) |
| **React** | 19 | UI layer |
| **TypeScript** | 5 (strict) | Tipagem estática |
| **Tailwind CSS** | 4 | Estilização |
| **Supabase** | `@supabase/ssr` | Banco de dados, Realtime, Auth |
| **Framer Motion** | latest | Animações de feedback |
| **Recharts** | latest | Gráficos do dashboard |
| **react-qr-code** | latest | Geração de QR Code |
| **html5-qrcode** | latest | Leitura de QR Code via câmera |
| **Lucide React** | latest | Ícones |

---

## 🗄️ Banco de Dados

### Tabelas Principais

```
operadores          → cadastro de operadores (com qr_code_token único)
maquinas            → cadastro de máquinas (com qr_code_token único)
operacoes           → operações de costura (tempo_padrao_min, meta_hora)
produtos            → produtos (referência, roteiro, tp_produto_min)
produto_operacoes   → roteiro: ligação produto ↔ operações em sequência
configuracao_turno  → configuração diária (funcionários, minutos, produto)
registros_producao  → cada registro de peça produzida
tipos_maquina       → rt, ov, 2ag, gal, man, bot, cas
```

### Views Analíticas

| View | Descrição |
|---|---|
| `vw_producao_hoje` | Produção e eficiência de cada operador no dia |
| `vw_status_maquinas` | Status e minutos sem uso de cada máquina |
| `vw_producao_por_hora` | Curva de produção para o gráfico |

### Convenção de QR Code

Todo QR Code é codificado no formato `tipo:token`:

```
operador:a1b2c3d4e5f6...   ← qr_code_token da tabela operadores
maquina:b2c3d4e5f6a7...    ← qr_code_token da tabela maquinas
operacao:c3d4e5f6a7b8...   ← qr_code_token da tabela operacoes
```

---

## 📐 Fórmulas de Negócio

```typescript
// Meta individual do operador no dia
metaIndividual = Math.floor(minutosTurno / tpOperacao)

// Meta coletiva de produtos completos no dia
metaGrupo = Math.floor((funcionariosAtivos * minutosTurno) / tpProduto)

// T.P do produto = soma dos T.P de todas as operações do roteiro
tpProduto = operacoes.reduce((soma, op) => soma + op.tempoPadraoMin, 0)

// Eficiência do operador
eficiencia = (quantidadeProduzida * tpOperacao / minutosTrabalhados) * 100

// Meta por hora de uma operação
metaHora = Math.floor(60 / tpOperacao)
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- Node.js >= 20
- Conta no [Supabase](https://supabase.com)
- npm ou yarn

### 1. Clonar o repositório

```bash
git clone https://github.com/melojrx/producao.git
cd producao
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key   # apenas server-side
```

### 4. Criar o schema no Supabase

Execute os scripts SQL disponíveis em `lib/seed.sql` no SQL Editor do Supabase para criar as tabelas, views, políticas RLS e dados de seed para desenvolvimento.

### 5. Gerar types TypeScript

```bash
npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/supabase.ts
```

### 6. Executar em modo de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 📁 Estrutura de Pastas

```
/
├── app/
│   ├── (admin)/              # Área administrativa (protegida por auth)
│   │   ├── dashboard/        # ← Dashboard em tempo real
│   │   ├── operadores/       # ← CRUD de operadores
│   │   ├── maquinas/         # ← CRUD de máquinas
│   │   ├── operacoes/        # ← CRUD de operações
│   │   ├── produtos/         # ← CRUD de produtos
│   │   └── relatorios/       # ← Relatórios e comparativos
│   ├── (auth)/login/         # ← Login de admin/supervisor
│   └── (operador)/scanner/   # ← Scanner mobile (público)
├── components/
│   ├── dashboard/            # CardKPI, Ranking, StatusMaquinas, Gráfico, Modal
│   ├── scanner/              # QRScanner, ConfirmacaoRegistro
│   ├── qrcode/               # QRCodeDisplay (geração + download PNG)
│   └── ui/                   # Modal, Toast, DataTable, StatusBadge
├── lib/
│   ├── actions/              # Server Actions (toda mutação passa aqui)
│   ├── queries/              # Queries read-only ao Supabase
│   ├── utils/                # Fórmulas: producao.ts, qrcode.ts
│   └── constants.ts          # Constantes do domínio
├── hooks/
│   ├── useRealtimeProducao.ts # Supabase Realtime
│   └── useScanner.ts          # Máquina de estados do scanner
└── types/
    ├── index.ts               # Interfaces de domínio
    └── supabase.ts            # Types gerados via Supabase CLI
```

---

## 📊 Status das Sprints

| Sprint | Nome | Status |
|---|---|---|
| 0 | Scaffolding e infraestrutura | ✅ Concluída |
| 1 | Banco de dados | ✅ Concluída |
| 2 | Cadastros (CRUD) | ✅ Concluída |
| 3 | Scanner mobile | ✅ Concluída |
| 4 | Dashboard em tempo real | ✅ Concluída |
| 5 | Alertas e relatórios | 🚧 Em andamento |
| 6 | Multi-produto no mesmo dia | 🔭 Pós-MVP |
| 7 | Escala do painel de máquinas | 🔭 Pós-MVP |
| 8 | Escala dos CRUDs admin | 🔭 Pós-MVP |
| 9 | Exportação CSV de relatórios | 🔭 Pós-MVP |

---

## 🔑 Usuários e Acesso

| Perfil | Dispositivo | Rota | Acesso |
|---|---|---|---|
| **Operador** | Celular (câmera) | `/scanner` | Público — QR Code é a identificação |
| **Supervisor** | TV / Tablet | `/admin/dashboard` | Autenticado |
| **Administrador** | Desktop | `/admin/*` | Autenticado |

---

## 🛠️ Scripts Disponíveis

```bash
npm run dev        # Servidor de desenvolvimento
npm run build      # Build de produção
npm run start      # Inicia o servidor de produção
npm run lint       # ESLint
npx tsc --noEmit   # Verificação de tipos TypeScript
```

---

## 📖 Glossário

| Termo | Significado |
|---|---|
| **T.P Operação** | Tempo Padrão de uma operação em minutos (ex: `0.28`) |
| **T.P Produto** | Soma de todos os T.P das operações do roteiro |
| **MT/H** | Meta/Hora = `floor(60 / tp_operacao)` |
| **Meta Individual** | Peças que um operador deve fazer no turno |
| **Meta Grupo** | Produtos completos que a linha entrega no dia |
| **Eficiência %** | `(qtd × tp / minutos_trabalhados) × 100` |
| **Gargalo** | Operação com eficiência abaixo da média da linha |
| **Roteiro** | Sequência de operações para produzir um produto |

---

## 👨‍💻 Desenvolvedor

<div align="center">

<img src="https://github.com/melojrx.png" width="100" height="100" style="border-radius: 50%;" alt="Júnior Melo" />

### Júnior Melo

[![GitHub](https://img.shields.io/badge/GitHub-melojrx-181717?style=for-the-badge&logo=github)](https://github.com/melojrx)
[![Portfólio](https://img.shields.io/badge/Portfólio-melojrx.github.io-0A0A0A?style=for-the-badge&logo=githubpages&logoColor=white)](https://melojrx.github.io/)

</div>

---

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

---

<div align="center">

Feito com ❤️ para a indústria de confecção brasileira

**[🔗 Acessar sistema →](https://producao-chi.vercel.app/)**

</div>
