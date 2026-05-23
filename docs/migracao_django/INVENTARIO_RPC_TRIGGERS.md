# INVENTARIO_RPC_TRIGGERS.md — MDJ-1.2

> Inventario de RPCs, funcoes SQL e triggers com efeito de dominio.
> Fontes: `types/supabase.ts`, chamadas `.rpc()` no codigo TypeScript e scripts SQL em `scripts/`.
> Escopo desta HU: decidir o que deve virar service, selector, validacao ou tarefa de manutencao no Django.

---

## 1. Estado da leitura

Este inventario foi produzido sem executar SQL remoto, sem alterar schema e sem alterar dados.

Fontes usadas:

- `types/supabase.ts`
- `lib/actions/producao.ts`
- `lib/actions/qualidade.ts`
- `lib/queries/scanner.ts`
- `scripts/sprint7_turnos_schema.sql`
- `scripts/sprint8_apontamento_v2.sql`
- `scripts/sprint8_encerramentos_automaticos.sql`
- `scripts/sprint9_apontamento_atomico_v2.sql`
- `scripts/sprint9_apontamento_supervisor_v2.sql`
- `scripts/sprint12_turno_setores_refactor.sql`
- `scripts/sprint15_consistencia_progresso.sql`
- `scripts/sprint15_backfill_consistencia.sql`
- `scripts/sprint29_fluxo_sequencial_apontamento.sql`
- `scripts/sprint36_qualidade_apontamento.sql`
- `scripts/sprint42_unblock_apontamentos_scanner.sql`
- `scripts/sprint50_saldo_fisico_op.sql`
- `scripts/sprint51_*.sql`
- `scripts/sprint52_versionamento_roteiro_produto.sql`
- `scripts/scanner_operador_manual_origem.sql`

Observacoes importantes:

- Existem varias versoes `CREATE OR REPLACE FUNCTION` para a mesma RPC ao longo das sprints. Este documento classifica a responsabilidade de dominio; a versao remota final deve ser confirmada durante MDJ-2 antes de portar a logica.
- `types/supabase.ts` ainda lista `registrar_revisao_lote_qualidade`, mas `scripts/sprint51_remover_fluxo_lotes_qualidade.sql` remove essa RPC, a tabela `qualidade_lotes` e a coluna `qualidade_lote_id`. Tratar como divergencia ate validar o Supabase remoto.
- A regra de roteiro vigente da Sprint 52 aparece em funcoes de derivacao: novos planejamentos devem usar apenas `produto_operacoes.vigente = true`, preservando turnos ja derivados.

---

## 2. RPCs chamadas diretamente pela aplicacao

| RPC | Chamador atual | Tipo | Criticidade | Alvo Django |
|---|---|---|---|---|
| `buscar_turno_setor_op_scanner` | `lib/queries/scanner.ts` | Leitura | Alta | Selector read-only do scanner para resolver QR operacional de `turno + setor`. |
| `registrar_producao_turno_setor_op` | `lib/actions/producao.ts` | Escrita transacional legada/compatibilidade | Alta | Manter compatibilidade durante transicao; alvo final deve preferir apontamento atomico por operacao. |
| `registrar_producao_turno_setor_operacao` | `lib/actions/producao.ts` | Escrita transacional critica | Critica | Service Django `ProducaoService.registrar_apontamento_operacao()` com `transaction.atomic()`, locks e validacao de saldo fisico. |
| `registrar_producao_supervisor_em_lote` | `lib/actions/producao.ts` | Escrita transacional em lote | Critica | Service Django para lancamento administrativo em lote, chamando a regra atomica por operacao dentro de uma transacao controlada. |
| `registrar_revisao_qualidade_turno_setor_operacao` | `lib/actions/qualidade.ts` | Escrita transacional critica | Critica | Service Django `QualidadeService.registrar_revisao_operacional()` com validacao de revisor, saldo fisico, defeitos e consolidacao de progresso. |

Notas:

- As actions atuais ja fazem parte das validacoes de entrada e revalidacao de rotas, mas a autoridade transacional esta nas RPCs.
- A migracao segura deve trocar primeiro leituras por selectors Django e so depois substituir mutacoes.
- As mutacoes de producao e qualidade precisam de testes de concorrencia antes de qualquer cutover.

---

## 3. Funcoes tipadas sem chamada direta no TypeScript

| Funcao | Tipo | Papel atual | Alvo Django |
|---|---|---|---|
| `sincronizar_andamento_turno_setor_op` | Sincronizacao | Consolida progresso/status da secao e cascata relacionada. | Service interno de consolidacao, chamado explicitamente apos apontamentos e revisoes. |
| `sincronizar_turno_setor_operacoes` | Derivacao | Gera operacoes atomicas da secao com base no roteiro do produto. | Service de derivacao de turno/setor/operacoes. Deve usar roteiro vigente apenas para novos turnos. |
| `registrar_revisao_lote_qualidade` | Legado/divergente | Revisao por lote paralelo de qualidade, removida pela Sprint 51.12. | Nao portar sem validacao remota. A regra alvo e qualidade operacional por etapa final. |

---

## 4. Funcoes SQL por responsabilidade de dominio

### 4.1 Scanner e seletores

| Funcao | Origem principal | Classificacao | Migracao |
|---|---|---|---|
| `buscar_turno_setor_op_scanner` | `scripts/sprint8_apontamento_v2.sql` | Leitura | Converter em selector Django. Deve retornar contexto aberto do QR operacional e saldo restante. |
| `obter_disponibilidade_fluxo_turno_setor_operacao` | `scripts/sprint29_fluxo_sequencial_apontamento.sql` | Leitura/validacao operacional | Converter em selector ou domain service para disponibilidade visual, sem bloquear excecoes legitimas do chao de fabrica. |

### 4.2 Derivacao de turno, setor, demanda e operacoes

| Funcao | Origem principal | Classificacao | Migracao |
|---|---|---|---|
| `sincronizar_turno_setor_ops` | `scripts/sprint52_versionamento_roteiro_produto.sql` | Derivacao | Service Django de abertura/edicao de turno. Usar apenas `produto_operacoes.vigente = true` em novos planejamentos. |
| `sincronizar_turno_setor_operacoes` | `scripts/sprint52_versionamento_roteiro_produto.sql` | Derivacao | Service Django para criar operacoes atomicas de uma demanda/secao. Nao reescrever operacoes ja produzidas. |
| `sincronizar_turno_setor_demanda_legada` | `scripts/sprint51_remover_qualidade_legado_fluxo_ativo.sql` e `scripts/sprint12_turno_setores_refactor.sql` | Compatibilidade/sincronizacao | Migrar com cautela como compatibilidade entre `turno_setor_ops` e `turno_setor_demandas`. |
| `recalcular_turno_setor` | `scripts/sprint12_turno_setores_refactor.sql` | Sincronizacao | Service de agregacao do setor fisico a partir das demandas internas. |
| `turno_ops_sincronizar_setores_trigger` | `scripts/sprint7_turnos_schema.sql` | Trigger helper | Preferir chamada explicita em service Django ao criar/alterar OP do turno. |
| `turno_setor_ops_sincronizar_operacoes_trigger` | `scripts/sprint9_apontamento_atomico_v2.sql` | Trigger helper | Preferir chamada explicita em service Django apos criar/alterar secao da OP. |
| `turno_setor_ops_espelhar_em_turno_setor_demandas_trigger` | `scripts/sprint12_turno_setores_refactor.sql` | Trigger helper/compatibilidade | Reavaliar no modelo Django; evitar espelhamento invisivel se a camada de service puder manter demanda como contrato principal. |

### 4.3 Apontamento produtivo

| Funcao | Origem principal | Classificacao | Migracao |
|---|---|---|---|
| `registrar_producao_turno_setor_op` | `scripts/sprint8_encerramentos_automaticos.sql` | Escrita transacional legada | Manter como regra de compatibilidade; nao deve ser o primeiro alvo de cutover se o fluxo atual usa operacao atomica. |
| `registrar_producao_turno_setor_operacao` | `scripts/scanner_operador_manual_origem.sql`, com versoes em Sprints 9/15/29/42 | Escrita transacional critica | Portar para Django como service central de apontamento. Precisa validar operador, quantidade, turno aberto, contexto nao encerrado, origem, saldo e consolidacao de status. |
| `registrar_producao_supervisor_em_lote` | `scripts/sprint9_apontamento_supervisor_v2.sql` | Escrita transacional em lote | Portar apos a regra atomica. Deve validar usuario administrativo e executar todos os lancamentos com consistencia transacional. |

### 4.4 Qualidade

| Funcao | Origem principal | Classificacao | Migracao |
|---|---|---|---|
| `registrar_revisao_qualidade_turno_setor_operacao` | `scripts/sprint51_restaurar_qualidade_operacional.sql` | Escrita transacional critica | Portar como service de revisao operacional. Deve validar permissao do revisor, quantidade revisada, defeitos obrigatorios quando houver reprovadas e saldo fisico. |
| `validar_insert_qualidade_saldo_fisico_op` | `scripts/sprint50_saldo_fisico_op.sql` | Validacao defensiva | A regra deve existir no service Django; considerar constraint/trigger defensivo no PostgreSQL destino se houver risco de escrita fora da API. |
| `setor_qualidade_legado` | `scripts/sprint51_*.sql` | Helper/compatibilidade | Validar comportamento remoto antes de portar, pois a Qualidade deve permanecer etapa final operacional quando fizer parte do roteiro. |
| `criar_lote_qualidade_de_registro_producao` | `scripts/sprint51_fluxo_continuo_qualidade.sql` | Legado removido | Nao portar como regra ativa. |
| `registrar_revisao_lote_qualidade` | `scripts/sprint51_fluxo_continuo_qualidade.sql` | Legado removido/divergente | Nao portar como regra ativa sem validacao remota. |

### 4.5 Saldo fisico, consolidacao e backfill

| Funcao | Origem principal | Classificacao | Migracao |
|---|---|---|---|
| `calcular_saldo_fisico_operacao_op` | `scripts/sprint50_saldo_fisico_op.sql` | Calculo/validacao critica | Portar como domain function/selector testavel. E oraculo da regra de OP fisica finita. |
| `validar_insert_registro_saldo_fisico_op` | `scripts/sprint50_saldo_fisico_op.sql` | Validacao defensiva | Regra obrigatoria no service de producao; considerar protecao defensiva no banco destino. |
| `sincronizar_turno_setor_demanda` | `scripts/sprint15_*.sql` | Sincronizacao | Service interno para consolidar demanda apos apontamento/revisao. |
| `sincronizar_andamento_turno_setor_op` | `scripts/sprint15_*.sql` | Sincronizacao | Service interno para consolidar secao e encadeamentos. |
| `sincronizar_andamento_turno_op` | `scripts/sprint15_backfill_consistencia.sql` e `scripts/sprint8_encerramentos_automaticos.sql` | Sincronizacao | Service interno para consolidar OP. |
| `backfill_consistencia_turno` | `scripts/sprint15_backfill_consistencia.sql` | Backfill/manutencao | Converter em management command Django, nao endpoint publico. |
| `backfill_consistencia_turnos_recentes` | `scripts/sprint15_backfill_consistencia.sql` | Backfill/manutencao | Converter em management command Django, com execucao controlada. |

### 4.6 Cadastros e auxiliares

| Funcao | Origem principal | Classificacao | Migracao |
|---|---|---|---|
| `proximo_codigo_operacao` | `scripts/sprint6_operacoes_setor.sql` | Helper de cadastro | Pode virar service simples no Django ou regra de serializer/admin. |

---

## 5. Triggers com efeito de dominio

| Trigger | Tabela | Momento | Funcao | Papel | Alvo Django |
|---|---|---|---|---|---|
| `trg_turno_ops_sincronizar_setores` | `turno_ops` | `AFTER INSERT OR UPDATE` | `turno_ops_sincronizar_setores_trigger` | Deriva setores da OP planejada. | Service explicito ao criar/editar OP do turno. |
| `trg_turno_setor_ops_sincronizar_operacoes` | `turno_setor_ops` | `AFTER INSERT OR UPDATE` | `turno_setor_ops_sincronizar_operacoes_trigger` | Deriva operacoes atomicas da secao. | Service explicito de derivacao; evitar regenerar historico. |
| `trg_turno_setor_ops_espelhar_em_turno_setor_demandas` | `turno_setor_ops` | `AFTER INSERT OR UPDATE OR DELETE` | `turno_setor_ops_espelhar_em_turno_setor_demandas_trigger` | Espelha camada legada em demandas e recalcula setor fisico. | Reavaliar como compatibilidade; no alvo, demanda deve ser contrato claro. |
| `trg_registros_producao_saldo_fisico_op` | `registros_producao` | `BEFORE INSERT` | `validar_insert_registro_saldo_fisico_op` | Impede apontamento acima do saldo fisico da OP. | Regra obrigatoria no service e candidata a protecao defensiva no banco. |
| `trg_qualidade_registros_saldo_fisico_op` | `qualidade_registros` | `BEFORE INSERT` | `validar_insert_qualidade_saldo_fisico_op` | Impede revisao de qualidade acima do saldo fisico da OP. | Regra obrigatoria no service e candidata a protecao defensiva no banco. |
| `trg_registros_producao_criar_lote_qualidade` | `registros_producao` | `AFTER INSERT` | `criar_lote_qualidade_de_registro_producao` | Criava lotes paralelos de qualidade. | Removido pela Sprint 51.12; nao portar como regra ativa. |

Diretriz para Django:

- Evitar depender de triggers invisiveis para comportamento principal do dominio.
- Preferir services explicitos com `transaction.atomic()` e chamadas nomeadas de derivacao/consolidacao.
- Manter constraints e protecoes defensivas no PostgreSQL destino para impedir corrupcao caso alguma escrita futura contorne a API.

---

## 6. Services Django candidatos

| Dominio | Service/selector candidato | Absorve |
|---|---|---|
| `scanner` | `buscar_contexto_setor_por_qr()` | `buscar_turno_setor_op_scanner` |
| `turnos` | `derivar_setores_da_op()` | `sincronizar_turno_setor_ops`, `trg_turno_ops_sincronizar_setores` |
| `turnos` | `derivar_operacoes_da_demanda()` | `sincronizar_turno_setor_operacoes`, `trg_turno_setor_ops_sincronizar_operacoes` |
| `turnos` | `consolidar_demanda_setor_op()` | `sincronizar_turno_setor_demanda`, `sincronizar_andamento_turno_setor_op`, `recalcular_turno_setor` |
| `turnos` | `consolidar_turno_op()` | `sincronizar_andamento_turno_op` |
| `producao` | `calcular_saldo_fisico_operacao_op()` | `calcular_saldo_fisico_operacao_op` |
| `producao` | `registrar_apontamento_operacao()` | `registrar_producao_turno_setor_operacao`, validacoes de saldo e status |
| `producao` | `registrar_apontamentos_supervisor()` | `registrar_producao_supervisor_em_lote` |
| `qualidade` | `registrar_revisao_operacional()` | `registrar_revisao_qualidade_turno_setor_operacao`, validacoes de defeitos e saldo |
| `cadastros` | `gerar_proximo_codigo_operacao()` | `proximo_codigo_operacao` |
| `infra` | `backfill_consistencia_turno()` | `backfill_consistencia_turno`, `backfill_consistencia_turnos_recentes` |

---

## 7. Riscos e pontos de validacao

1. **Versao remota final das funcoes.** Ha varias redefinicoes em scripts. MDJ-2 deve capturar o schema remoto real antes do desenho definitivo dos services.
2. **Divergencia de Qualidade por lotes.** O type local ainda lista objetos removidos pela Sprint 51.12. Nao modelar `qualidade_lotes` como contrato ativo sem confirmacao remota.
3. **Qualidade como etapa operacional.** A regra de negocio atual exige Qualidade como etapa final quando estiver no roteiro. Qualquer helper que exclua qualidade de derivacao precisa ser validado contra o estado remoto e a decisao homologada.
4. **Triggers escondem comportamento.** No Django, o comportamento deve ficar em services testaveis. Triggers defensivos podem permanecer apenas como protecao de integridade.
5. **Concorrencia em apontamentos.** As regras de producao, qualidade, saldo fisico e status dependem de locks/transacoes. O backend Django nao pode reimplementar isso como updates soltos.
6. **Compatibilidade `turno_setor_ops` vs `turno_setor_demandas`.** A migracao deve respeitar historico e telas atuais antes de simplificar o modelo alvo.

---

## 8. Prioridade de migracao

Ordem recomendada para portar comportamento:

1. Selectors read-only: scanner, dashboard, turnos, cadastros e qualidade.
2. Services de derivacao sem escrita critica externa: criar estrutura de turno em ambiente isolado.
3. Service de apontamento atomico por operacao.
4. Service de apontamento supervisor em lote.
5. Service de revisao operacional de qualidade.
6. Services de fechamento, carry-over e backfills de consistencia.

O corte de cada service so deve acontecer apos comparacao com Supabase atual, testes de invariantes e rollback documentado.
