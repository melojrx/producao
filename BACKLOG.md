# BACKLOG.md — Plano de Implementação

> Visão macro das sprints. Atualizar status ao concluir cada sprint.
> Detalhamento técnico de cada sprint está em TASKS.md.

---

## STATUS GERAL

| Sprint | Nome | Status | Dias |
|---|---|---|---|
| 0 | Scaffolding e infraestrutura | ✅ Concluída | 1 |
| 1 | Banco de dados | ✅ Concluída | 1 |
| 2 | Cadastros (CRUD) | ✅ Concluída | 2 |
| 3 | Scanner mobile | ✅ Concluída | 2 |
| 4 | Dashboard em tempo real | 🚧 Em andamento | 2 |
| 5 | Alertas e relatórios | ⏳ Não iniciado | 1 |
| 6 | Multi-produto no mesmo dia | 🔭 Proposta pós-MVP | 2 |

**Total estimado: 9 dias úteis**

---

## SPRINT 0 — Scaffolding e infraestrutura
**Objetivo:** Projeto rodando localmente com todas as dependências e Supabase conectado.
**Entregável:** `npm run dev` responde sem erros. Query de teste no Supabase retorna dados.

- Criar projeto Next.js 16 com TypeScript e Tailwind
- Instalar e configurar todas as dependências
- Configurar Supabase SSR (client browser + server)
- Criar estrutura de pastas conforme CLAUDE.md
- Configurar ESLint e TypeScript strict
- Layout base (sidebar admin + header)
- Proxy de autenticação Supabase (Next 16)

---

## SPRINT 1 — Banco de dados
**Objetivo:** Schema completo executado no Supabase com dados de teste.
**Entregável:** Todas as tabelas e views funcionando. Realtime habilitado.

- Tabelas base: tipos_maquina, operadores, maquinas, operacoes, produtos, produto_operacoes, registros_producao
- Tabela de configuração diária do turno (funcionarios_ativos, minutos_turno, produto_id, meta_grupo)
- Views analíticas: vw_producao_hoje, vw_status_maquinas, vw_producao_por_hora
- Row Level Security (RLS)
- Realtime habilitado para registros_producao e maquinas
- Types TypeScript gerados via CLI
- Seed de dados para desenvolvimento

---

## SPRINT 2 — Cadastros (CRUD)
**Objetivo:** Admin consegue cadastrar operadores, máquinas, operações e produtos com QR Code.
**Entregável:** 4 CRUDs funcionando. QR Code gerado e disponível para download PNG.
**Status:** ✅ Concluída

- Funções utilitárias: calcularMetaHora, calcularMetaDia, calcularMetaIndividual, calcularMetaGrupo, calcularTpProduto, parseQRCode
- CRUD Operadores com QR Code + download PNG
- CRUD Máquinas com QR Code + troca de status
- CRUD Operações com cálculo automático de meta/hora
- CRUD Produtos com roteiro e T.P Produto calculado
- Login real para admin/supervisor com proteção de rotas `/admin/*`

---

## SPRINT 3 — Scanner mobile
**Objetivo:** Operador registra produção completa pelo celular via QR Code.
**Entregável:** Fluxo completo testado em celular físico.
**Status:** ✅ Concluída

- Hook useScanner com máquina de estados tipada
- Componente QRScanner com html5-qrcode
- Tela /scanner com os 3 momentos do fluxo
- Exibição de meta individual após scan da operação
- Componente de confirmação com quantidade e botão de registro
- Server Action de registro com validações
- Feedback visual e háptico

---

## SPRINT 4 — Dashboard em tempo real
**Objetivo:** Supervisor acompanha a produção ao vivo com metas calculadas.
**Entregável:** Dashboard atualiza automaticamente. Modal de configuração do turno funcionando.
**Status:** 🚧 Em andamento

- Hook useRealtimeProducao (Supabase Realtime)
- Modal de configuração do turno (3 campos + cálculo de Meta Grupo)
- Cards de KPI: Meta Grupo, Progresso %, Peças hoje, Eficiência média
- Gráfico de produção por hora (Recharts)
- Ranking de operadores com eficiência colorida
- Grid de status das máquinas com alertas
- Animações de atualização (Framer Motion)

---

## SPRINT 5 — Alertas e relatórios
**Objetivo:** Sistema completo pronto para uso em produção.
**Entregável:** Deploy na Vercel + relatório diário exportável.

- Página de relatórios com filtros
- Comparativo meta grupo vs realizado por dia
- Exportação CSV
- Testes de responsividade final
- Testes de carga (20 operadores simultâneos)
- Deploy Vercel + Supabase produção
- Manual do operador

---

## SPRINT 6 — Multi-produto no mesmo dia
**Objetivo:** Permitir mais de um produto no mesmo dia sem perder consistência de meta e rastreabilidade.
**Entregável:** Supervisor planeja múltiplos blocos por dia, ativa um bloco por vez e o scanner registra produção no bloco ativo.
**Status:** 🔭 Proposta pós-MVP

- Refatorar a configuração diária para suportar **blocos de produção**
- Calcular `meta_grupo` por bloco e somar o total do dia
- Permitir planejar sequência de produtos no dashboard
- Registrar produção vinculada ao bloco ativo
- Exibir no dashboard: total do dia + progresso por bloco
- Manter compatibilidade com histórico do MVP de 1 produto por dia

---

## DEPENDÊNCIAS ENTRE SPRINTS

```
Sprint 0 ──► Sprint 1 ──► Sprint 2 ──► Sprint 3
                                  └──► Sprint 4
                    Sprint 3 + Sprint 4 ──► Sprint 5
                                     └──► Sprint 6 (pós-MVP)
```

Sprints 3 e 4 podem ser desenvolvidas em paralelo após Sprint 2.
