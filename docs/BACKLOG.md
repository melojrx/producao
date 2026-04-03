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
| 11 | Edição do turno aberto | ✅ Concluída | 2 |
| 12 | Refatoração estrutural do turno por setor | ✅ Concluída | 4 |
| 13 | Simplificação do domínio de máquinas | ✅ Concluída | 2 |
| 14 | Prévia de pessoas por setor na abertura do turno | ✅ Concluída | 2 |
| 15 | Consistência do progresso da OP entre demanda, setor e dashboard | ✅ Concluída | 2 |
| 16 | KPI de progresso operacional ponderado por T.P. | ✅ Concluída | 3 |
| 17 | KPIs de eficiência por hora e por dia na dashboard V2 | ✅ Concluída | 3 |
| 18 | Ajuste cirúrgico do input de quantidade no scanner | ✅ Concluída | 1 |
| 19 | Cadastro de produto orientado por setores | ✅ Concluída | 3 |
| 20 | Ciclo de vida e exclusão segura de produtos | ✅ Concluída | 2 |
| 21 | Relatório operacional de QR Codes do turno | ✅ Concluída | 2 |
| 22 | Duplicação assistida de produtos | ✅ Concluída | 1 |

**Total estimado: 47 dias úteis**

**Observação:** o plano antigo de “multi-produto por blocos” foi substituído pelo rebaseline V2 baseado em `turno + OP + setor`. As Sprints 15 a 18 foram concluídas e consolidaram a consistência estrutural do progresso, a separação entre `quantidade concluída` e `progresso operacional`, os KPIs de eficiência por hora e por dia e o ajuste cirúrgico do input de quantidade no scanner. A Sprint 19 foi retomada após a homologação da Sprint 20 e fechada com a UX de produto orientada por setores, mantendo `imagem_url` temporariamente oculta por decisão de produto e preservando o bloco comentado para futura inclusão real da imagem. A Sprint 20 fechou o ciclo de vida seguro do CRUD de produtos com homologação manual da UI real. A Sprint 21 separou definitivamente a dashboard pública da fábrica da superfície operacional de impressão, movendo os QRs do turno para `/admin/qrcodes` com presets de impressão por página. A Sprint 22 acrescentou a duplicação assistida de produtos no próprio CRUD, reutilizando o modal existente em modo de criação pré-carregada. O detalhamento técnico oficial está em `TASKS.md`.

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

## SPRINT 11 — Edição do turno aberto
**Objetivo:** permitir que supervisor/admin incluam novas OPs em um turno já aberto, refletindo isso em dashboard, scanner, QRs, apontamentos e relatórios sem fechar o turno.
**Entregável:** turno aberto editável na dashboard, com inclusão segura de novas OPs e propagação imediata da cadeia derivada `OP -> seção -> operação`.
**Status:** ✅ Concluída

- Expor ação `Editar turno` na dashboard do turno aberto
- Permitir `Adicionar OP` ao turno atual sem encerrá-lo
- Reusar a derivação automática existente para seções e operações
- Exibir imediatamente os novos QRs das seções geradas
- Permitir editar OP existente apenas quando ainda não houver produção
- Recalcular planejado vs realizado do turno após a inclusão
- Homologar scanner, `/admin/apontamentos` e dashboard com OP adicionada durante o turno

**Nota de replanejamento:** a homologação desta sprint expôs uma inconsistência estrutural. A regra de negócio validada exige `setor` como estrutura física reaproveitada do turno, e não `setor + OP` como unidade operacional visível. A dependência foi resolvida na Sprint 12, e a homologação funcional da Sprint 11 foi reaberta e concluída em `2026-04-02` no modelo `turno + setor`.

## SPRINT 12 — Refatoração estrutural do turno por setor
**Objetivo:** substituir a unidade operacional visível do sistema por `setor do turno`, reutilizando a estrutura física da fábrica e movendo a OP para dentro da demanda do setor.
**Entregável:** QR operacional por setor do turno, scanner escolhendo `OP/produto` dentro do setor, dashboard consolidada por setor, KPI `Meta do Grupo` com gráfico horário e carry-over de saldo entre turnos.
**Status:** ✅ Concluída

- Introduzir a estrutura `turno + setor + demanda setorial + operação`
- Gerar QR operacional por `turno + setor`
- Reaproveitar setores já ativos ao incluir nova OP
- Refatorar dashboard e edição do turno para impedir duplicação visual
- Refatorar scanner para `setor -> operador -> OP/produto -> operação -> quantidade`
- Implementar a KPI `Meta do Grupo` do turno pela média simples dos `tp_produto_min` das `turno_ops`
- Exibir o gráfico `Projeção do planejado x Alcançado por hora` na dashboard V2
- Implementar carry-over de OPs pendentes entre turnos
- Reabrir a homologação funcional ponta a ponta após a refatoração

## SPRINT 13 — Simplificação do domínio de máquinas
**Objetivo:** remover da entidade `maquinas` os atributos operacionais herdados do modelo antigo e mantê-la apenas como cadastro patrimonial e de rastreabilidade física.
**Entregável:** tabela `maquinas`, CRUD, queries e types sem `tipo_maquina` e sem vínculo direto com `setor`, preservando QR patrimonial e integridade do restante da V2.
**Status:** ✅ Concluída

- Formalizar `maquinas` como entidade patrimonial, não operacional
- Remover `tipo_maquina` do schema e do contrato de `maquinas`
- Remover a vinculação direta entre `maquinas` e `setor`
- Ajustar CRUD, queries, types e telas administrativas de máquinas
- Remover dependências residuais da relação `maquina -> setor` nas leituras da aplicação
- Alinhar `types/supabase.ts` ao schema aplicado e validar `npx tsc --noEmit` e `npm run build`

## SPRINT 14 — Prévia de pessoas por setor na abertura do turno
**Objetivo:** calcular uma sugestão de quantidade de pessoas necessárias por setor durante a abertura do turno, com base na carga planejada das OPs e no tempo disponível do dia.
**Entregável:** modal de novo turno exibindo uma prévia setorial de capacidade, sem alterar o contrato persistido do turno nesta primeira etapa.
**Status:** ✅ Concluída

- Criar função pura em `lib/utils/` para calcular `tp_total_setor_produto`, `carga_min_setor` e `pessoas_necessarias_setor`
- Consolidar a carga de múltiplas OPs quando elas compartilharem o mesmo setor
- Exibir a prévia de pessoas por setor em `ModalNovoTurnoV2`
- Sinalizar déficit quando a soma sugerida ultrapassar `operadoresDisponiveis`
- Preservar a gravação atual do turno sem persistir o dimensionamento nesta sprint
- Homologar cenários com um produto, múltiplas OPs e setores compartilhados
- Decisão homologada: manter o dimensionamento apenas como prévia operacional; nenhuma sprint de persistência foi aberta neste momento

## SPRINT 15 — Consistência do progresso da OP entre demanda, setor e dashboard
**Objetivo:** eliminar divergências de realizado, saldo e status entre a camada atômica de operação e os consolidados de demanda, setor e OP do turno.
**Entregável:** dashboard, scanner e relatórios V2 lendo o mesmo progresso consolidado após cada apontamento, com backfill para turnos já afetados.
**Status:** ✅ Concluída

- Recalcular `turno_setor_demandas` explicitamente a partir de `turno_setor_operacoes`
- Reencadear a consolidação `demanda -> setor -> OP` dentro do apontamento atômico
- Executar backfill seguro para turnos abertos e dados recentes afetados
- Revisar queries e snapshots da dashboard, scanner e relatórios que dependem de `turno_setor_demandas`
- Homologar o contrato atual de peças completas sem regressão entre dashboard, scanner e relatórios

## SPRINT 16 — KPI de progresso operacional ponderado por T.P.
**Objetivo:** implementar um KPI incremental de progresso operacional da OP, do setor e do turno, separado da métrica de peças completas e ponderado pelo esforço real (`tempo_padrao_min`) das operações.
**Entregável:** dashboard, modal, scanner e relatórios distinguindo explicitamente `progresso operacional` de `quantidade concluída`, com cálculo consistente a partir das operações atômicas.
**Status:** ✅ Concluída

- Formalizar contratos tipados e funções puras para `progresso operacional` e `quantidade concluída`
- Calcular o progresso por operação, setor, OP e turno com peso proporcional ao `tempo_padrao_min`
- Atualizar queries e snapshots para expor os dois indicadores sem ambiguidade
- Ajustar dashboard e modal da OP para usar o novo KPI principal de progresso
- Alinhar scanner, `/admin/apontamentos` e relatórios V2 ao novo contrato
- Homologar cenários reais com setores em estágios diferentes, sem perder a leitura de peças completas

## SPRINT 17 — KPIs de eficiência por hora e por dia na dashboard V2
**Objetivo:** introduzir um domínio próprio de eficiência do operador na dashboard V2, separado do progresso operacional da OP e calculado por minutos padrão realizados no tempo disponível do turno.
**Entregável:** dashboard V2 exibindo `Eficiência por hora` por `hora + operador + operação` e `Eficiência do dia` por operador, com suporte explícito para troca de operação dentro da mesma hora.
**Status:** ✅ Concluída

- Formalizar contratos e queries para `Eficiência por hora` e `Eficiência do dia`
- Usar `tempo_padrao_min_snapshot` como base obrigatória do cálculo
- Usar `minutos_turno` do turno consultado como denominador do KPI diário
- Tratar múltiplas operações do mesmo operador dentro da mesma hora sem colapsar as linhas horárias
- Integrar os KPIs a um bloco visual próprio de `Eficiência operacional` na dashboard V2
- Homologar cenários reais com jornadas variáveis e troca de operação dentro da mesma hora

## SPRINT 18 — Ajuste cirúrgico do input de quantidade no scanner
**Objetivo:** remover o travamento da quantidade em `1` no scanner V2 e permitir digitação direta com reset para `0`, preservando o fluxo atômico já consolidado.
**Entregável:** tela de confirmação do scanner permitindo editar a quantidade manualmente, zerar a contagem e registrar apenas valores válidos acima de `0`.
**Status:** ✅ Concluída

- Mapear o ponto exato em que a UI do scanner força o valor mínimo `1`
- Corrigir o input de quantidade sem alterar o contrato transacional do registro
- Permitir decremento e reset até `0`, mantendo respeito ao saldo máximo da operação
- Homologar o ajuste na UI sem regressão nas ações de troca de operador, operação e OP/produto

## SPRINT 19 — Cadastro de produto orientado por setores
**Objetivo:** reorganizar o cadastro de produto para que o roteiro seja montado por setores, deixando explícita a composição do fluxo fabril sem alterar o contrato persistido do roteiro.
**Entregável:** modal de produto guiando a seleção por setores, exibindo apenas as operações do setor selecionado, preservando o `T.P Produto` automático e salvando o roteiro final no formato atual de `operacaoId + sequencia`.
**Status:** ✅ Concluída

- Formalizar no PRD a nova UX do cadastro de produto por setores
- Refatorar o modal para seleção de setores antes das operações
- Respeitar a ordem oficial dos setores por `setor.codigo`, sem reorder manual
- Preservar a ordem das operações dentro do setor conforme a seleção do usuário
- Manter o `T.P Produto` como cálculo automático e visualmente secundário
- Permitir ampliar o modal se isso for necessário para manter a experiência enxuta e intuitiva
- Homologar criação e edição de produtos com múltiplos setores

## SPRINT 20 — Ciclo de vida e exclusão segura de produtos
**Objetivo:** concluir o CRUD de produtos com ações seguras de arquivamento e exclusão, preservando histórico e bloqueando qualquer remoção indevida de produto em uso.
**Entregável:** CRUD de produtos com validação de `produto em turno aberto`, distinção clara entre `arquivar` e `excluir permanentemente`, e preservação garantida do histórico operacional.
**Status:** ✅ Concluída

- Formalizar a diferença entre `arquivar/desativar` e `excluir permanentemente`
- Bloquear produto em `turno aberto` tanto para arquivamento quanto para exclusão
- Bloquear exclusão física quando houver histórico em `turno_ops`, `configuracao_turno` ou `registros_producao`
- Preservar a produção passada ao arquivar produto
- Expor ações claras e coerentes no CRUD de produtos
- Homologar cenários de produto virgem, produto com histórico e produto em turno aberto

---

## DEPENDÊNCIAS ENTRE SPRINTS

```
Sprint 0 ──► Sprint 1 ──► Sprint 2 ──► Sprint 3
                                  └──► Sprint 4
                    Sprint 3 + Sprint 4 ──► Sprint 5
Sprint 5 ──► Sprint 6 ──► Sprint 7 ──► Sprint 8 ──► Sprint 9 ──► Sprint 10 ──► Sprint 11 ──► Sprint 12 ──► Sprint 13 ──► Sprint 14 ──► Sprint 15 ──► Sprint 16 ──► Sprint 17 ──► Sprint 18 ──► Sprint 19 ──► Sprint 20
```

Sprints 3 e 4 puderam ser desenvolvidas em paralelo após Sprint 2.
As Sprints 6 a 12 da V2 devem seguir de forma sequencial para reduzir regressão de domínio.
