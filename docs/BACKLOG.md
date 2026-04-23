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
| 23 | Consolidação visual profissional do admin | 🔄 Em realinhamento documental | 3 |
| 24 | Meta mensal global da fábrica | ✅ Concluída | 2 |
| 25 | Apontamentos operacionais sem preview e orientados por pendência | ✅ Concluída | 2 |
| 26 | Operações com máquina específica e código manual | ✅ Concluída | 2 |
| 27 | Paginação e ordenação profissional do CRUD de operações | ✅ Concluída | 1 |
| 28 | Paginação e ordenação profissional de relatórios | ✅ Concluída | 1 |
| 29 | Capacidade setorial sequencial, fila real e kanban operacional | ✅ Concluída | 2 |
| 30 | Capacidade como trava real e parcelamento setorial entre turnos | ✅ Concluída | 2 |
| 31 | Fluxo paralelo com sincronização parcial em Montagem | ✅ Concluída | 2 |
| 32 | Fluxo contínuo por setor, capacidade diária cumulativa e disciplina operacional de fila | ✅ Concluída | 3 |

**Total estimado: 67 dias úteis**

**Observação:** o plano antigo de “multi-produto por blocos” foi substituído pelo rebaseline V2 baseado em `turno + OP + setor`. As Sprints 15 a 18 foram concluídas e consolidaram a consistência estrutural do progresso, a separação entre `quantidade concluída` e `progresso operacional`, os KPIs de eficiência por hora e por dia e o ajuste cirúrgico do input de quantidade no scanner. A Sprint 19 foi retomada após a homologação da Sprint 20 e fechada com a UX de produto orientada por setores, mantendo `imagem_url` temporariamente oculta por decisão de produto e preservando o bloco comentado para futura inclusão real da imagem. A Sprint 20 fechou o ciclo de vida seguro do CRUD de produtos com homologação manual da UI real. A Sprint 21 separou definitivamente a dashboard pública da fábrica da superfície operacional de impressão, movendo os QRs do turno para `/admin/qrcodes` com presets de impressão por página. A Sprint 22 acrescentou a duplicação assistida de produtos no próprio CRUD, reutilizando o modal existente em modo de criação pré-carregada. A Sprint 23 permanece em realinhamento documental após a reversão do worktree visual, preservando `docs/DESIGN_PROPOSAL.md` como norte homologado sem reabrir implementação de frontend até nova confirmação explícita do usuário, e sai da prioridade ativa do projeto até segunda ordem. A Sprint 24 foi concluída com a frente de meta mensal global da fábrica disponível na dashboard e em `/admin/apontamentos`. A Sprint 25 foi concluída simplificando o fluxo operacional de apontamentos, removendo previews expandidos, ocultando itens concluídos do fluxo de lançamento e pré-preenchendo a quantidade com base no saldo da operação. A Sprint 26 foi concluída alinhando o cadastro de operações ao domínio atual de máquinas patrimoniais, substituindo `tipo_maquina_codigo` por `maquina_id`, expondo a máquina pelo `modelo` na UI e tornando `codigo` da operação um campo manual. A Sprint 27 profissionalizou `/admin/operacoes` com paginação, ordenação por coluna e persistência de navegação via URL. A Sprint 28 concluiu a versão mínima segura desse mesmo padrão em `/admin/relatorios`, com contrato tipado de ordenação, paginação completa na tabela de detalhamento e preservação dos filtros atuais na URL. As Sprints 29, 30 e 31 consolidaram, em sequência, a capacidade setorial com fila real, o parcelamento/carry-over por backlog aceito e o fluxo paralelo oficial `Frente + Costa -> Montagem`. A Sprint 32 fica aberta para levar esse domínio ao modelo de fila contínua por setor, com capacidade diária cumulativa, prioridade de conclusão e leitura operacional mais fiel ao chão de fábrica. O detalhamento técnico oficial está em `TASKS.md`.

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

## SPRINT 23 — Consolidação visual profissional do admin
**Objetivo:** realinhar documentalmente a futura migração visual do admin, preservando `docs/DESIGN_PROPOSAL.md` como direção de design, mantendo o baseline restaurado do frontend e adiando a definição da estratégia técnica da migração para sprint oficial futura.
**Entregável:** documentação coerente entre PRD, TASKS, BACKLOG e DESIGN_PROPOSAL, deixando explícitos o alvo visual futuro, o baseline atual restaurado e o fato de que a migração técnica ainda não está alinhada nem reaberta para implementação.
**Status:** 🔄 Em realinhamento documental

- Formalizar que `docs/DESIGN_PROPOSAL.md` é direção de design, não plano técnico de execução
- Registrar que a tentativa inicial de migração visual ampla foi revertida para restaurar o baseline anterior do admin
- Reabrir documentalmente as tasks visuais da sprint que não permanecem entregues no código atual
- Definir com clareza o que é alvo futuro, o que é baseline atual e o que ainda precisa de alinhamento técnico
- Preservar o scanner como exceção fora do escopo desta frente documental

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

## SPRINT 24 — Meta mensal global da fábrica
**Objetivo:** introduzir a meta mensal gerencial da fábrica na dashboard e em `/admin/apontamentos`, sem depender de turno ativo.
**Entregável:** cadastro, edição e leitura da meta mensal por competência, com KPIs e evolução diária/semanal na `Visão Geral`.
**Status:** ✅ Concluída

- Persistir uma meta mensal única por competência
- Permitir cadastro e edição em `/admin/apontamentos`
- Exibir KPIs mensais e leitura acumulada na `Visão Geral`
- Separar `Visão Geral` gerencial de `Visão Operacional`
- Homologar estados sem meta, sem produção e produção parcial

## SPRINT 25 — Apontamentos operacionais sem preview e orientados por pendência
**Objetivo:** simplificar o fluxo operacional de `/admin/apontamentos` para que o supervisor atue apenas sobre pendências reais, sem atravessar previews expandidos de seções.
**Entregável:** aba `Operação do Turno` trabalhando com filtros de itens pendentes, formulário direto do recorte atual e quantidade inicial sugerida pelo saldo da operação.
**Status:** ✅ Concluída

- Limitar filtros operacionais a OPs, setores e operações com `saldo > 0`
- Remover a dependência de preview expandido antes do formulário
- Exibir diretamente o formulário acionável do recorte filtrado
- Pré-preencher a quantidade com o saldo remanescente da operação
- Recalcular o recorte após cada lançamento e retirar do fluxo os itens concluídos
- Homologação funcional confirmada pelo usuário em `2026-04-07`

## SPRINT 29 — Capacidade setorial sequencial, fila real e kanban operacional
**Objetivo:** fazer o sistema abandonar a leitura de demanda distribuída simultaneamente para todos os setores e assumir oficialmente um fluxo sequencial por capacidade, fila e movimentação real de saldos entre setores.
**Entregável:** abertura do turno com carga pendente real por setor, apontamentos respeitando liberação sequencial, carry-over coerente com o setor pendente e dashboard com kanban operacional em tempo real.
**Status:** ✅ Concluída

- Formalizar no PRD o modelo sequencial por capacidade, fila FIFO e carry-over real
- Introduzir contratos tipados e funções puras para capacidade, fila e posição atual da OP/lote
- Corrigir a prévia de abertura do turno para usar apenas carga pendente real por setor e alertar desconformidade de capacidade
- Propagar no backend a liberação sequencial entre setores, bloqueando excesso acima do lote liberado
- Exibir o kanban operacional em tempo real na dashboard V2
- Homologação concluída em `2026-04-16` com `node --test --experimental-strip-types` nos utilitários da sprint e `npx tsc --noEmit`, ambos sem erros

## SPRINT 30 — Capacidade como trava real e parcelamento setorial entre turnos
**Objetivo:** transformar a capacidade setorial em limitador operacional efetivo do turno, fazendo a OP ser aceita parceladamente por setor e carregando o excedente como backlog setorial para turnos futuros.
**Entregável:** turno aberto e carry-over trabalhando com `backlog setorial`, `quantidade aceita no turno`, `quantidade concluída` e `saldo excedente`, sem liberar a mesma OP integralmente para todos os setores do mesmo dia.
**Status:** ✅ Concluída

- Formalizar no PRD o parcelamento setorial entre turnos como comportamento oficial do produto
- Explicitar contratos de backlog, aceite e excedente sem perder a demanda total original da OP
- Limitar abertura e edição do turno à capacidade real do setor elegível
- Respeitar capacidade do setor de destino ao transferir produção entre setores
- Atualizar dashboard, scanner e apontamentos para distinguir backlog total, aceito no turno, concluído e excedente
- Homologar cenários com saturação diária repetida e carry-over setorial recorrente
- Homologação concluída em `2026-04-17` com utilitário puro de carry-over setorial recorrente, testes de saturação repetida entre turnos e `npx tsc --noEmit` sem erros

## SPRINT 31 — Fluxo paralelo com sincronização parcial em Montagem
**Objetivo:** evoluir o domínio do chão de fábrica de um fluxo estritamente linear para um fluxo oficial com bifurcação paralela `Frente + Costa` e sincronização parcial por quantidade em `Montagem`, preservando capacidade setorial, fila, scanner, carry-over e simplicidade operacional.
**Entregável:** fluxo oficial `Preparação -> (Frente || Costa) -> Montagem -> Final` ativo na base tipada, nas queries, no kanban, no carry-over, no scanner e nos apontamentos, com `Montagem` liberada apenas pela interseção real já concluída entre `Frente` e `Costa`.
**Status:** ✅ Concluída

- Formalizar no PRD o novo fluxo oficial com bifurcação paralela e sincronização parcial
- Introduzir contratos tipados para dependências paralelas e múltiplas predecessoras
- Recalcular `Montagem` pela interseção entre `Frente` e `Costa`
- Permitir a mesma OP simultaneamente nas colunas `Frente` e `Costa` do kanban
- Adaptar carry-over, scanner e apontamentos ao novo modelo de dependência
- Homologar cenários com parcial em `Frente`, parcial em `Costa`, liberação parcial de `Montagem` e continuidade entre turnos

## SPRINT 32 — Fluxo contínuo por setor, capacidade diária cumulativa e disciplina operacional de fila
**Objetivo:** evoluir o domínio homologado nas Sprints 29 a 31 para um modelo em que cada setor funciona como fila contínua alimentada ao longo do dia, limitada pela capacidade diária cumulativa e orientada por prioridade de conclusão da OP atual.
**Entregável:** turno, scanner, apontamentos e dashboard operando com backlog vivo por setor, aceite acumulado do dia sem reinício artificial de capacidade, fila FIFO cronológica e leitura explícita entre `chegou`, `disponível agora`, `aceito`, `concluído` e `excedente`, com o preview de abertura priorizando a capacidade produtiva disponível do turno.
**Status:** 🔄 Reaberta documentalmente em `2026-04-22` para a `HU 32.9`

- Formalizar no PRD o setor como fila contínua alimentada pelo setor anterior ao longo do dia
- Tornar cumulativa a capacidade diária do setor, sem reabrir artificialmente o teto a cada recomputação
- Preservar a regra paralela oficial `Frente + Costa -> Montagem`
- Priorizar a conclusão da OP/lote atual antes de espalhar esforço em múltiplas OPs simultâneas no mesmo setor
- Separar na UI sugestão de capacidade, atividade real e alocação formal de operadores
- Reorientar o preview de abertura do turno para mostrar primeiro a capacidade produtiva disponível com os recursos informados no momento
- Reancorar o aceite operacional setorial ao teto global do turno, preservando scanner e apontamentos sem trava transacional e com alerta visual de desconformidade
- Homologar o comportamento sobre cenários reais de turno aberto e carry-over setorial

**Fechamento em `2026-04-20`:** a sprint foi reaberta pontualmente para a `HU 32.6`, ajustando o preview de abertura do turno para priorizar a capacidade produtiva disponível naquele momento com base em `operadoresDisponiveis × minutosTurno`, sem recolocar no resumo principal o card agregado de desconformidade. O fechamento final permaneceu com o domínio e a UI alinhados ao modelo de fila contínua, capacidade diária cumulativa, prioridade de conclusão e vocabulário operacional explícito. A homologação final ficou consolidada por testes determinísticos em `lib/utils/fluxo-continuo-turno.test.ts`, pela suíte complementar de capacidade, hidratação, fluxo paralelo, carry-over e kanban, além de `npx tsc --noEmit` e `npm run build`, todos sem erros.

**Reabertura documental em `2026-04-20`:** a análise do turno aberto `8042d118-870e-4414-a8da-a9d764eb4b72` expôs uma ambiguidade entre `capacidade produtiva global do turno` e `aceite operacional setorial`. A sprint foi reaberta para a `HU 32.7`, que passa a exigir `capacidadeGlobalTurnoPecas` como teto canônico do dia, com aceite setorial sempre derivado desse teto e sem reintroduzir travas transacionais em scanner ou apontamentos. O objetivo da reabertura é corrigir a semântica do domínio e da UI com o menor acréscimo de complexidade possível.

**Reabertura documental em `2026-04-22`:** a homologação funcional da leitura setorial expôs um segundo desvio semântico: o saldo acima do limite diário remanescente continuava podendo vazar para `disponível agora`, mesmo já estando fora da capacidade do dia. A sprint foi reaberta para a `HU 32.8`, que passa a exigir classificação imediata desse saldo em `quantidadeExcedenteTurno`, com composição explícita do próximo turno e uso gerencial do excedente por setor para ajuste de capacidade, prioridade e distribuição operacional nos turnos seguintes.

**Fechamento em `2026-04-22`:** a `HU 32.8` consolidou a semântica final da sprint, fazendo o saldo acima do limite diário remanescente nascer imediatamente como `quantidadeExcedenteTurno`, sem continuar aparecendo como disponibilidade executável do turno atual. O domínio, as queries operacionais e a UI de scanner/dashboard passaram a refletir a separação entre o que chegou ao setor, o que ainda cabe no dia e o que já virou compromisso explícito do próximo turno, preservando FIFO, prioridade de conclusão e carry-over setorial.

**Reabertura documental em `2026-04-22`:** a análise operacional de `Finalização` expôs um terceiro ajuste semântico: a prioridade automática da fila está correta como política padrão, mas o fluxo do supervisor precisa de uma exceção controlada para consumir manualmente saldo já aceito no dia em OPs posteriores da fila, desde que o setor não ultrapasse seu `Plano do dia`. A sprint foi reaberta para a `HU 32.9`, que passa a separar explicitamente `liberação automática prioritária` de `saldoManualPermitido`, preservando FIFO, teto diário, scanner disciplinado e rastreabilidade da exceção administrativa.

---

## DEPENDÊNCIAS ENTRE SPRINTS

```
Sprint 0 ──► Sprint 1 ──► Sprint 2 ──► Sprint 3
                                  └──► Sprint 4
                    Sprint 3 + Sprint 4 ──► Sprint 5
Sprint 5 ──► Sprint 6 ──► Sprint 7 ──► Sprint 8 ──► Sprint 9 ──► Sprint 10 ──► Sprint 11 ──► Sprint 12 ──► Sprint 13 ──► Sprint 14 ──► Sprint 15 ──► Sprint 16 ──► Sprint 17 ──► Sprint 18 ──► Sprint 19 ──► Sprint 20 ──► Sprint 24 ──► Sprint 25 ──► Sprint 26 ──► Sprint 27 ──► Sprint 28 ──► Sprint 29 ──► Sprint 30 ──► Sprint 31 ──► Sprint 32
```

Sprints 3 e 4 puderam ser desenvolvidas em paralelo após Sprint 2.
As Sprints 6 a 12 da V2 devem seguir de forma sequencial para reduzir regressão de domínio.
