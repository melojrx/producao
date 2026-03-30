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
| 4 | Dashboard em tempo real | ✅ Concluída | 2 |
| 5 | Rebaseline documental V2 | ✅ Concluída | 1 |
| 6 | Base de domínio V2 | ✅ Concluída | 3 |
| 7 | Planejamento do turno V2 | ✅ Concluída | 3 |
| 8 | Scanner e apontamento V2 | ✅ Concluída | 3 |
| 9 | Dashboard, relatórios e coexistência | ✅ Concluída | 3 |
| 10 | Scanner híbrido por operação | ✅ Concluída | 2 |

**Total estimado: 20 dias úteis**

**Observação:** o plano antigo de “multi-produto por blocos” foi substituído pelo rebaseline V2 baseado em `turno + OP + setor`. O detalhamento técnico oficial está em `TASKS.md`.

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
**Status:** ✅ Concluída

- Hook useRealtimeProducao (Supabase Realtime)
- Modal de configuração do turno (3 campos + cálculo de Meta Grupo)
- Cards de KPI: Meta Grupo, Progresso %, Peças hoje, Eficiência média
- Gráfico de produção por hora (Recharts)
- Ranking de operadores com eficiência colorida
- Grid de status das máquinas com alertas
- Animações de atualização (Framer Motion)

---

## SPRINT 5 — Rebaseline documental V2
**Objetivo:** Consolidar oficialmente a mudança arquitetural antes de mexer no domínio de produção.
**Entregável:** `PRD.md` e `TASKS.md` passam a refletir o modelo V2 como fonte de verdade.
**Status:** ✅ Concluída

- Reescrever o PRD para o fluxo `turno + OP + setor`
- Documentar QR operacional temporário por `setor + OP`
- Formalizar encerramentos automáticos e manuais
- Replanejar as próximas sprints com estratégia de migração aditiva

---

## SPRINT 6 — Base de domínio V2
**Objetivo:** Criar a base estrutural da V2 sem quebrar o fluxo atual.
**Entregável:** novas entidades de domínio criadas, contratos tipados atualizados e CRUD de setores disponível.
**Status:** ✅ Concluída

- Criar tabela e CRUD de `setores`
- Criar tabela `usuarios_sistema`
- Documentar bootstrap do primeiro admin via SQL
- Criar CRUD `/admin/usuarios`
- Restringir a gestão de usuários a papel `admin`
- Documentar fluxo profissional de produção com convite por email e senha definida pelo próprio usuário
- Evoluir `operacoes` para dependerem de `setor`
- Evoluir `maquinas` e `operadores` para a V2
- Regenerar `types/supabase.ts` e contratos da aplicação
- Manter compatibilidade com os CRUDs atuais durante a transição

---

## SPRINT 7 — Planejamento do turno V2
**Objetivo:** Transformar o cadastro estrutural dos produtos em planejamento executável do dia.
**Entregável:** supervisor abre um turno, adiciona OPs e o sistema deriva automaticamente as seções `setor + OP`.
**Status:** ✅ Concluída

- Criar schema de `turnos`, `turno_operadores`, `turno_ops` e `turno_setor_ops`
- Implementar actions e queries do planejamento
- Evoluir a dashboard com o modal `Novo Turno` V2
- Gerar QR operacional temporário para cada `setor + OP`
- Permitir carregar o turno aberto atual ou o último turno encerrado

---

## SPRINT 8 — Scanner e apontamento V2
**Objetivo:** Registrar produção no contexto correto do turno, com bloqueio de excesso sobre o planejado.
**Entregável:** scanner V2 funcional com QR de operador + QR operacional e apontamento seguro por setor.
**Status:** ✅ Concluída

- Evoluir parser e tipos de QR para a V2
- Implementar a nova sessão do scanner
- Registrar produção no contexto da seção do turno
- Tratar máquina como opcional no apontamento
- Implementar bloqueio transacional para não ultrapassar o planejado
- Implementar encerramentos automáticos de setor, OP e turno

---

## SPRINT 9 — Apontamentos atômicos, dashboard, relatórios e coexistência
**Objetivo:** evoluir a V2 para registrar produção no nível correto de operador + operação + seção, migrar a visão gerencial para esse consolidado e preservar a leitura histórica durante a transição.
**Entregável:** apontamento atômico operacional disponível para supervisor e scanner, dashboard e relatórios lendo os consolidados corretos da V2, com coexistência temporária com o legado.
**Status:** ✅ Concluída

- Refazer a dashboard para o modelo `turno + OP + setor`
- Evoluir a modelagem para `turno + OP + setor + operação`
- Implementar tela `/admin/apontamentos` para o supervisor registrar incrementos por operador e operação
- Adaptar dashboard e relatórios para turno, OP, setor, operação, operador e planejado vs realizado
- Implementar compatibilidade temporária com dados do fluxo antigo
- Executar cutover controlado com feature flag
- Validar responsividade final, deploy e manual operacional

## SPRINT 10 — Scanner híbrido por operação
**Objetivo:** transformar o scanner em fluxo móvel híbrido para o supervisor apontar produção atômica diretamente no chão, por seção, operador e operação, sem perder a consistência da V2.
**Entregável:** `/scanner` operando com seleção explícita da operação da seção, troca rápida de operador e reinício total, mantendo `/admin/apontamentos` como contingência administrativa.
**Status:** ✅ Concluída

- Reescrever a máquina de estados do scanner para `scan_secao -> scan_operador -> selecionar_operacao -> informar_quantidade -> registrar`
- Implementar as transições `trocar_operador` e `reiniciar_total`
- Adaptar a UI móvel para listar operações planejadas da seção com saldo e status
- Registrar o apontamento do scanner via `registrarProducaoOperacao`
- Auditar corretamente `operador_id` e, quando houver sessão autenticada, `usuario_sistema_id`
- Remover o fluxo residual que registra apenas quantidade no nível da seção
- Homologar o fluxo híbrido em celular e validar o fallback por `/admin/apontamentos`

---

## DEPENDÊNCIAS ENTRE SPRINTS

```
Sprint 0 ──► Sprint 1 ──► Sprint 2 ──► Sprint 3
                                  └──► Sprint 4
                    Sprint 3 + Sprint 4 ──► Sprint 5
Sprint 5 ──► Sprint 6 ──► Sprint 7 ──► Sprint 8 ──► Sprint 9 ──► Sprint 10
```

Sprints 3 e 4 puderam ser desenvolvidas em paralelo após Sprint 2.
As Sprints 6 a 10 da V2 devem seguir de forma sequencial para reduzir regressão de domínio.
