<div align="center">

# Sistema de Controle de Produção

### PCP em tempo real para confecções — turnos, setores e OPs via QR Code

[![Deploy](https://img.shields.io/badge/Deploy-Produção%20VPS-success?style=for-the-badge&logo=docker)](https://producao.costurai.com.br)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Django](https://img.shields.io/badge/Django-REST-092E20?style=for-the-badge&logo=django)](https://www.djangoproject.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://docs.docker.com/compose/)

**🔗 [Acessar sistema em produção →](https://producao.costurai.com.br)**

</div>

---

## 📋 Sobre o Projeto

Sistema web de **Planejamento e Controle da Produção (PCP)** para confecções. Monitora em tempo real a produtividade de operadores, setores e OPs, comparando o realizado contra metas planejadas — meta individual por operação e meta coletiva de produtos completos por turno.

> **Princípio central:** simplicidade extrema para o operador, riqueza de informação para o supervisor.

### O Problema

Donos de confecção não conseguem medir em tempo real a produtividade da sua linha de produção. As metas existem (tempo padrão por operação, meta/hora), mas a comparação com o realizado só acontece manualmente no final do dia — quando já é tarde para corrigir gargalos, realocar operadores ou identificar máquinas paradas.

### A Solução

O sistema funciona como um **PCP operacional** com acompanhamento em tempo real e gestão de capacidade produtiva. A coleta de dados é feita via QR Code pelo celular do operador, e o supervisor monitora tudo pela dashboard na TV da fábrica.

Três objetos físicos impressos e plastificados fazem toda a coleta — o operador nunca digita nada:

| Objeto | Onde fica | Quando é usado |
|---|---|---|
| 🪪 **Crachá do Operador** | Com o operador durante todo o expediente | Para abrir ou trocar a sessão de scanner |
| 📇 **QR Operacional do Setor** | Impresso pelo supervisor e deixado no setor | Durante aquele turno, para abrir a seção operacional do setor |
| 🏷️ **Etiqueta da Máquina** | Colada na máquina (patrimônio) | Para rastreabilidade e auditoria — não obrigatória no apontamento diário |

---

## ✨ Funcionalidades

### 📱 Scanner Mobile (`/scanner`)
- Câmera ativa para leitura de QR Code (câmera traseira)
- Fluxo guiado: **setor → operador → OP/produto → operação → quantidade**
- Exibição do contexto completo do turno, setor, OP e operação selecionada
- Troca de operador, OP/produto e operação sem precisar reler o QR do setor
- Botão de quantidade touch-friendly, com digitação direta
- Feedback visual (animação) e háptico (vibração) no sucesso

### 📊 Dashboard em Tempo Real (`/admin/dashboard`)
- Aba **Visão Geral** — meta mensal global da fábrica, independente de turno ativo
- Aba **Visão Operacional** — monitoramento do turno, OPs e setores em tempo real
- Aba **Operadores** — eficiência por hora (operador + operação) e eficiência do dia por operador
- Aba **Qualidade** — pendências, revisões, reprovações, defeitos e rankings de qualidade
- KPIs ao vivo: **Meta do Grupo** (média ponderada de T.P.), **Progresso Operacional** (por T.P.), **Peças Completas** e **Eficiência**
- Kanban operacional com uma coluna por setor, seguindo a ordem do fluxo fabril
- Atualização via polling automático (sem refresh manual)

### 📺 Painel TV dedicado (`/tv`)
- Superfície pública para acompanhamento contínuo no chão de fábrica
- Layout 16:9 sem rolagem vertical em TVs
- Metas, atingimento mensal/diário, eficiência por hora e eficiência do dia visíveis ao mesmo tempo

### ⚙️ Módulos Administrativos
| Módulo | Rota | Recursos |
|---|---|---|
| Operadores | `/admin/operadores` | CRUD + QR Code + download PNG + carga horária |
| Máquinas | `/admin/maquinas` | CRUD patrimonial + QR Code + status |
| Operações | `/admin/operacoes` | CRUD + meta/hora calculada + QR Code + setor + máquina específica |
| Produtos | `/admin/produtos` | CRUD + roteiro por setores + T.P Produto + duplicação + ciclo de vida (arquivar/excluir) |
| Setores | `/admin/setores` | CRUD do cadastro mestre de setores |
| Usuários | `/admin/usuarios` | CRUD admin/supervisor com permissões |
| Apontamentos | `/admin/apontamentos` | Lançamentos administrativos por operador + operação |
| QR Codes | `/admin/qrcodes` | Relatório operacional de QRs do turno + presets de impressão |
| Relatórios | `/admin/relatorios` | Filtros por período/turno/OP/setor/operador + comparativo planejado vs realizado |

### 🎯 Capacidade e Planejamento
- **Prévia de pessoas por setor** no modal de abertura do turno
- **Capacidade setorial como trava real** — um setor não aceita mais do que consegue produzir no turno
- **Carry-over setorial parcelado** entre turnos — saldo não concluído vira backlog do próximo turno
- **Encerramentos automáticos** — setor ao atingir o planejado, OP ao concluir todos os setores, turno manual ou ao abrir o próximo
- **Edição do turno aberto** — incluir nova OP sem encerrar o turno, reaproveitando setores já ativos
- **Versionamento de roteiro** — alterações no produto não retroagem a turnos já abertos

### ✅ Qualidade como etapa operacional
- Qualidade como setor final do fluxo, recebendo peças da Finalização
- Catálogo estruturado de defeitos (máquina, operador, processo, matéria-prima)
- Múltiplos defeitos por revisão, com operação produtiva de origem
- Revisão parcial — revisor pode pegar qualquer quantidade da pendência
- Indicadores de qualidade: taxa de aprovação, reprovação, ranking de defeitos e operadores

### 🚨 Alertas e Indicadores
- Máquina sem registro há **> 15 minutos** → alerta vermelho pulsante
- Eficiência do operador **< 70%** → destaque amarelo
- Eficiência do operador **< 50%** → destaque vermelho
- Desconformidade entre demanda e capacidade setorial → aviso taxativo na abertura do turno

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│  Operador (Mobile)             Supervisor (TV/Tablet)   │
│  /scanner — câmera QR         /admin/dashboard — polling│
│                                /tv — painel 16:9         │
└────────────┬───────────────────────────┬────────────────┘
             │                           │
     ┌───────▼───────────────────────────▼────────────┐
     │             Next.js 16 (App Router)             │
     │  ┌──────────────┐  ┌────────────────────────┐  │
     │  │ Server Actions│  │ Server Components       │  │
     │  │ lib/actions/  │  │ lib/queries/ + lib/django│ │
     │  └──────┬───────┘  └───────────┬────────────┘  │
     └─────────┼──────────────────────┼───────────────┘
               │  JWT cookies SSR       │
     ┌─────────▼────────────────────────▼───────────────┐
     │              Django REST API                      │
     │              /api/v1/  ──  Auth + Permissões       │
     └─────────┬─────────────────────────────────────────┘
               │
     ┌─────────▼─────────────────────────────────────────┐
     │              PostgreSQL 17                          │
     │              Schema + Views + Funções transacionais  │
     └─────────────────────────────────────────────────────┘
```

### Camadas do Projeto

| Camada | Pasta | Responsabilidade |
|---|---|---|
| Apresentação | `app/` | Rotas, layouts e páginas (Next.js App Router) |
| Componentes | `components/` | React components reutilizáveis — sem lógica de negócio |
| Backend | `backend/` | Django REST API — models, views, permissões, transações |
| Negócio (frontend) | `lib/actions/` | Server Actions — toda mutação passa aqui via Django |
| Leitura | `lib/queries/` + `lib/django/queries/` | Queries read-only (Server e Client) |
| Utilitários | `lib/utils/` | Funções puras de cálculo |
| Estado | `hooks/` | Hooks React (polling, estado de UI, scanner) |
| Contratos | `types/` | Interfaces e types TypeScript |
| Infra | `docker/` + `scripts/` | Compose modular, Dockerfiles, scripts de smoke/backup |

### Princípios de Auth
- **JWT em cookies HTTP-only** via SSR (sem `localStorage`)
- Refresh em memória por request (`React cache()`) — não muta cookies dentro de Server Components
- Sem Row Level Security — auth e autorização no Django
- Papéis: `admin` e `supervisor` na tabela `usuarios_sistema`

### Princípios de Realtime
- Dashboard usa **polling Django** (intervalo configurável, padrão 15s) — não WebSocket
- Indicador de conexão na UI: `polling` / `erro` / `pausado`

---

## 🛠️ Tech Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| **Next.js** | 16 | Framework principal (App Router) |
| **React** | 19 | UI layer |
| **TypeScript** | 5 (strict) | Tipagem estática |
| **Django** | latest | Backend REST API + auth + transações |
| **PostgreSQL** | 17 | Banco de dados principal |
| **Tailwind CSS** | 4 | Estilização |
| **Docker Compose** | — | Stack dev/prod modular |
| **Framer Motion** | latest | Animações de feedback |
| **Recharts** | latest | Gráficos do dashboard |
| **react-qr-code** | latest | Geração de QR Code |
| **html5-qrcode** | latest | Leitura de QR Code via câmera |
| **Lucide React** | latest | Ícones |

---

## 🗄️ Banco de Dados

### Tabelas Principais

```
# Cadastros mestres
setores             → setores produtivos (Preparação, Frente, Costa, Montagem, Finalização, Qualidade)
operadores          → operadores (com qr_code_token único e carga_horaria_min)
maquinas            → máquinas (cadastro patrimonial — sem vínculo operacional)
operacoes           → operações de costura (tempo_padrao_min, meta_hora, setor_id)
produtos            → produtos (referência, roteiro, tp_produto_min)
produto_operacoes   → roteiro: ligação produto ↔ operações em sequência
usuarios_sistema    → usuários admin/supervisor (papel, situação)

# Turno operacional
turnos              → cabeçalho do turno (status, minutos_turno, operadores_disponiveis)
turno_operadores    → alocação dinâmica de operadores no turno
turno_ops           → OPs planejadas no turno (numero_op, produto, quantidade_planejada)
turno_setores       → setor ativo do turno (QR operacional por turno + setor)
turno_setor_demandas→ demanda por OP dentro de cada setor do turno
turno_setor_operacoes→ operações derivadas dentro de cada demanda setorial

# Produção e qualidade
registros_producao  → cada apontamento atômico (operador + operação + seção)
qualidade_registros  → revisões de qualidade
qualidade_detalhes   → defeitos por operação produtiva + tipo de defeito
qualidade_defeitos   → catálogo mestre de defeitos

# Metas e configuração
metas_mensais        → meta mensal global da fábrica
configuracao_turno   → histórico (deprecado — uso oficial = turnos V2)
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
operador:a1b2c3d4e5f6...       ← qr_code_token da tabela operadores
setor-op:b2c3d4e5f6a7...      ← qr_code_token do turno_setores (temporário por turno)
maquina:c3d4e5f6a7b8...        ← qr_code_token da tabela maquinas (patrimonial)
operacao:d4e5f6a7b8c9...       ← qr_code_token da tabela operacoes
```

---

## 📐 Fórmulas de Negócio

```typescript
// Meta por hora de uma operação
metaHora = Math.floor(60 / tpOperacao)

// Meta individual do operador no dia
metaIndividual = Math.floor(minutosTurno / tpOperacao)

// Meta do Grupo (média ponderada por T.P. dos produtos do turno)
mediaTpProdutoTurno = AVG(tp_produto_min dos produtos vinculados às turno_ops)
metaGrupoTurno = Math.floor((operadoresDisponiveis * minutosTurno) / mediaTpProdutoTurno)

// T.P do produto = soma dos T.P de todas as operações do roteiro
tpProduto = operacoes.reduce((soma, op) => soma + op.tempoPadraoMin, 0)

// Eficiência do operador
eficiencia = (quantidadeProduzida * tpOperacao / minutosTrabalhados) * 100

// Capacidade do setor em peças
capacidadePecasSetor = Math.floor((operadoresAlocados * minutosTurno) / tpTotalSetorProduto)

// Carry-over setorial (saldo entre turnos)
backlogSetor = saldoNaoAceito + saldoAceitoNaoConcluido
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- Node.js >= 20
- Docker + Docker Compose
- npm

### 1. Clonar o repositório

```bash
git clone https://github.com/melojrx/producao.git
cd producao
```

### 2. Instalar dependências do frontend

```bash
npm install
```

### 3. Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz (ou `.env.local` para dev com frontend no host):

```bash
cp .env.example .env
# ajustar secrets (DJANGO_SECRET_KEY, POSTGRES_PASSWORD, etc.)
```

Para dev com frontend no host, também crie `.env.local`:

```bash
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8001
NEXT_PUBLIC_USE_DJANGO_AUTH=true
NEXT_PUBLIC_USE_DJANGO_SCANNER_READS=true
# ... ver .env.example para a lista completa
```

### 4. Subir a stack dev integrada (Django + PostgreSQL + Next.js via Docker)

```bash
npm run dev:docker
```

Ou, para subir só backend + banco (frontend roda no host via `npm run dev`):

```bash
npm run dev:docker:backend
```

### 5. Migrations do Django

```bash
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate
```

### 6. Criar usuário administrativo inicial

```bash
node scripts/ensure-admin-user.mjs
```

### 7. Health check

```bash
curl -sf http://localhost:8001/health/
# {"status":"ok","database":"ok"}
```

### 8. Acessar

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend Django: [http://localhost:8001](http://localhost:8001)

---

## 🔧 Variáveis de Ambiente

As variáveis principais estão documentadas em `.env.example`. Resumo:

| Grupo | Variáveis | Uso |
|---|---|---|
| Django | `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS`, `BACKEND_PORT` | Configuração backend |
| PostgreSQL | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Conexão com o banco |
| Media | `MEDIA_URL`, `MEDIA_BASE_URL` | Arquivos estáticos de imagens |
| CORS/CSRF | `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` | Segurança |
| Frontend build | `NEXT_PUBLIC_DJANGO_API_URL` | URL da API Django (build-time) |
| Flags de cutover | `NEXT_PUBLIC_USE_DJANGO_*` (8 flags) | Liga/desliga rotas Django no frontend |
| Runtime SSR | `USE_DJANGO_*` (8 flags) | Flags server-side equivalentes |

---

## 🚢 Produção

**URL:** `https://producao.costurai.com.br` (VPS Hostinger `38.52.128.62`)

### Deploy via CI/CD

O workflow GitHub Actions **Deploy Production** na branch `main` executa:

1. Build das imagens Docker (frontend standalone + backend Gunicorn)
2. Push e deploy na VPS
3. Migrations automáticas no entrypoint
4. Health check automático

### Homologação local de produção

```bash
# Subir stack prod local (porta 8080, requer .env com secrets)
npm run prod:docker
npm run prod:docker:config

# Smoke test
node scripts/smoke-stack-prod.mjs
```

### Runbook e auditoria

- [Runbook de deploy VPS](docs/migracao_django/MDJ21_RUNBOOK_DEPLOY_VPS.md)
- [Auditoria VPS](docs/migracao_django/MDJ21_VPS_AUDITORIA.md)
- [Validação de produção](docs/migracao_django/MDJ18_VALIDACAO_PRODUCAO.md)

---

## 📁 Estrutura de Pastas

```
/
├── app/                          # Rotas Next.js (App Router)
│   ├── (admin)/                  # Área administrativa (protegida)
│   │   ├── dashboard/            # Dashboard V2 com abas
│   │   ├── operadores/           # CRUD de operadores
│   │   ├── maquinas/             # CRUD patrimonial de máquinas
│   │   ├── operacoes/            # CRUD de operações
│   │   ├── produtos/             # CRUD de produtos com roteiro
│   │   ├── setores/               # CRUD de setores
│   │   ├── usuarios/             # CRUD de usuários admin/supervisor
│   │   ├── apontamentos/         # Apontamentos administrativos
│   │   ├── qrcodes/              # Relatório de QRs do turno
│   │   └── relatorios/           # Relatórios e comparativos
│   ├── (auth)/login/             # Login
│   ├── (operador)/scanner/       # Scanner mobile (público)
│   └── tv/                       # Painel TV 16:9
├── backend/                      # Django REST API
│   ├── accounts/                 # Auth e usuários
│   ├── cadastros/                # Operadores, máquinas, operações, setores
│   ├── produtos/                 # Produtos e roteiros
│   ├── turnos/                   # Turnos, OPs, setores e demandas
│   ├── producao/                 # Apontamentos atômicos
│   ├── qualidade/                # Revisões e defeitos
│   ├── metas/                    # Metas mensais
│   ├── relatorios/               # Relatórios consolidados
│   ├── scanner/                  # Contexto do scanner
│   └── pcp_project/              # Settings Django
├── components/                   # React components
│   ├── dashboard/                # KPIs, kanban, gráficos, modais
│   ├── scanner/                  # QRScanner, seleção, confirmação
│   ├── apontamentos/             # Painel de apontamentos
│   ├── qrcode/                   # QRCodeDisplay, relatório de impressão
│   ├── relatorios/               # Filtros, tabelas, resumos
│   └── ui/                       # Modal, Toast, DataTable, StatusBadge
├── lib/
│   ├── actions/                  # Server Actions (mutações via Django)
│   ├── queries/                  # Queries read-only
│   ├── django/                   # Helpers e queries Django
│   ├── utils/                    # Fórmulas puras de cálculo
│   └── constants.ts              # Constantes do domínio
├── hooks/                        # Hooks React (polling, scanner, UI)
├── types/                        # Contratos TypeScript
├── docker/                       # Compose modular (dev/prod/restore)
│   ├── compose/                  # Arquivos canônicos de compose
│   ├── nginx/                    # Configs de proxy
│   └── frontend/                # Dockerfiles do Next.js
├── scripts/                      # Smoke, backup, import, admin
│   ├── infra/                    # Scripts operacionais (backup, restore)
│   └── mdj19/                    # Verificação de flags de cutover
└── docs/                         # Documentação
    ├── PRD.md                    # Regras de negócio
    ├── TASKS.md                  # Especificação técnica
    ├── BACKLOG.md                # Backlog de sprints
    └── migracao_django/          # Documentação de migração + estado atual
```

---

## 🔑 Usuários e Acesso

| Perfil | Dispositivo | Rota | Acesso |
|---|---|---|---|
| **Operador** | Celular (câmera) | `/scanner` | Público — QR Code é a identificação |
| **Supervisor** | TV / Tablet | `/admin/dashboard` | Autenticado (JWT) |
| **Administrador** | Desktop | `/admin/*` | Autenticado (JWT) + papel `admin` |

---

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev                      # Frontend no host (requer backend no Docker)
npm run dev:docker               # Stack dev integrada (frontend + backend + db)
npm run dev:docker:backend       # Só backend + db (frontend no host)

# Produção (homologação local)
npm run prod:docker              # Stack prod local (porta 8080)
npm run prod:docker:config       # Valida config do compose prod

# Qualidade
npm run lint                     # ESLint
npx tsc --noEmit                 # Verificação de tipos TypeScript
npm run build                    # Build de produção

# Smoke e validação
node scripts/smoke-stack-dev.mjs                # Smoke dev
node scripts/smoke-stack-prod.mjs              # Smoke prod local/VPS
node scripts/mdj19/verificar-flags-cutover.mjs  # Verificação de flags
node scripts/ensure-admin-user.mjs             # Criar admin inicial
```

---

## 📖 Glossário

| Termo | Significado |
|---|---|
| **T.P Operação** | Tempo Padrão de uma operação em minutos (ex: `0.28`) |
| **T.P Produto** | Soma de todos os T.P das operações do roteiro |
| **Setor** | Estrutura física reaproveitável do turno (Preparação, Frente, Costa, Montagem, Finalização, Qualidade) |
| **Turno** | Cabeçalho operacional do dia — minutos, operadores disponíveis e OPs planejadas |
| **OP** | Ordem de Produção planejada no turno (número + produto + quantidade) |
| **Demanda setorial** | Relação entre `turno_setor` e `turno_op` — a OP dentro daquele setor |
| **Quantidade concluída** | Peças completas = menor realizado entre os setores obrigatórios da OP |
| **Progresso operacional** | Avanço contínuo ponderado por `tempo_padrao_min` (diferente de peças completas) |
| **Meta do Grupo** | Produtos completos que a linha entrega no dia = `floor((operadores × minutos) / média T.P.)` |
| **Eficiência por hora** | Minutos padrão realizados por `hora + operador + operação` |
| **Carry-over** | Saldo não aceito ou não concluído de um setor que vira backlog do próximo turno |
| **Backlog setorial** | `saldo_não_aceito + saldo_aceito_não_concluído` de um setor |
| **Roteiro** | Sequência de operações para produzir um produto, agrupada por setores |
| **Versionamento de roteiro** | Alterações no produto não retroagem a turnos já abertos |

---

## 📚 Documentação Adicional

- [PRD — Regras de negócio](docs/PRD.md)
- [TASKS — Especificação técnica](docs/TASKS.md)
- [BACKLOG — Backlog de sprints](docs/BACKLOG.md)
- [Estado atual da migração](docs/migracao_django/ESTADO_ATUAL.md)
- [Docker — Guia rápido](docker/README.md)
- [Runbook de deploy VPS](docs/migracao_django/MDJ21_RUNBOOK_DEPLOY_VPS.md)

---

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

---

<div align="center">

## 👨‍💻 Desenvolvedor

<img src="https://github.com/melojrx.png" width="100" height="100" style="border-radius: 50%;" alt="Júnior Melo" />

### Júnior Melo

📧 [jrmeloafrf@gmail.com](mailto:jrmeloafrf@gmail.com)

[![GitHub](https://img.shields.io/badge/GitHub-melojrx-181717?style=for-the-badge&logo=github)](https://github.com/melojrx)
[![Portfólio](https://img.shields.io/badge/Portfólio-melojrx.github.io-0A0A0A?style=for-the-badge&logo=githubpages&logoColor=white)](https://melojrx.github.io/)

Feito com ❤️ para a indústria de confecção brasileira

**[🔗 Acessar sistema →](https://producao.costurai.com.br)**

</div>
