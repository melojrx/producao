# INVENTARIO_INVARIANTES.md — MDJ-1.4

> Checklist de invariantes de domínio homologadas.
> Fonte: PRD principal, PRD da migração Django e testes em `lib/utils/*.test.ts`.
> Objetivo: orientar testes de paridade Django — a migração só é correta quando todas estas invariantes passam.

---

## 1. Como usar este documento

Cada invariante tem:
- **Regra:** o que o sistema garante
- **Fonte:** onde está homologada (PRD, teste, código)
- **Teste de paridade:** o que o backend Django deve provar antes do cutover

---

## 2. OP Física (container finito)

### INV-OP-01 — OP não pode ser recriada como nova raiz com saldo pendente

**Regra:** Se `numero_op` já existe no histórico com `quantidade_planejada_remanescente > 0`, não é permitido criar nova `turno_op` raiz com o mesmo número. A continuação deve ser por carry-over (`turno_op_origem_id` informado).

**Fonte:** `lib/utils/op-fisica.test.ts` — "recusa nova raiz fisica para numero de OP com saldo pendente no historico"

**Teste de paridade:**
```
POST /api/turnos/{id}/ops/ com numero_op existente e saldo pendente
→ HTTP 422, mensagem: "A OP {numero} já existe no histórico operacional com saldo físico pendente."
```

---

### INV-OP-02 — OP concluída não pode receber nova produção

**Regra:** Se `numero_op` já existe com `status = concluida` e `quantidade_planejada_remanescente = 0`, não é permitido criar nova `turno_op` com o mesmo número.

**Fonte:** `lib/utils/op-fisica.test.ts` — "recusa nova producao para numero de OP ja concluido"

**Teste de paridade:**
```
POST /api/turnos/{id}/ops/ com numero_op concluída
→ HTTP 422, mensagem: "A OP {numero} já foi concluída no histórico operacional."
```

---

### INV-OP-03 — Carry-over com origem informada é permitido

**Regra:** Criar `turno_op` com `turno_op_origem_id` apontando para OP existente com saldo pendente é a forma correta de continuar produção entre turnos.

**Fonte:** `lib/utils/op-fisica.test.ts` — "permite continuar a mesma OP por carry-over informado"

---

## 3. Saldo Físico

### INV-SF-01 — Apontamento não pode ultrapassar saldo físico restante da operação na OP

**Regra:** `saldo_fisico_restante = quantidade_planejada_op - quantidade_produzida_acumulada_operacao`. Apontamento com `quantidade_solicitada > saldo_fisico_restante` é recusado.

**Fórmula:**
```
saldo_fisico_restante = quantidade_planejada_op - max(
  soma(registros_producao.quantidade WHERE operacao_id = X AND turno_op_id IN linhagem),
  quantidade_herdada_setor + quantidade_realizada_turno_operacao
)
```

**Fonte:** `lib/utils/saldo-fisico-op.test.ts` — "recusa consumo acima do saldo fisico restante"

**Teste de paridade:**
```
POST /api/producao/apontamentos/ com quantidade > saldo_fisico_restante
→ HTTP 422, mensagem: "A OP {numero} possui apenas {N} peça(s) com saldo físico nesta operação."
```

---

### INV-SF-02 — Saldo físico considera linhagem completa da OP (raiz + carry-overs)

**Regra:** O cálculo de saldo físico acumulado soma registros de produção de todas as `turno_ops` da mesma linhagem (raiz + todas com `turno_op_origem_id` apontando para a raiz), não apenas do turno atual.

**Fonte:** `lib/queries/saldo-fisico-op.ts` — busca `turno_ops` por `id.eq.raiz OR turno_op_origem_id.eq.raiz`

**Teste de paridade:** Apontamento em carry-over deve considerar produção já feita em turnos anteriores da mesma OP.

---

### INV-SF-03 — Revisão de qualidade também valida saldo físico

**Regra:** `registrar_revisao_qualidade` valida saldo físico antes de registrar. Quantidade validada = `quantidade_aprovada` (aprovadas consomem saldo; reprovadas ficam pendentes).

**Fonte:** `lib/utils/qualidade-operacional.test.ts` — "resume pendencia de aprovacao mantendo revisadas no historico"; `lib/actions/qualidade.ts` — `calcularResumoPendenciaAprovacaoQualidade`

**Fórmula:**
```
quantidade_validacao_saldo_fisico = quantidade_aprovada
quantidade_pendente_aprovacao = quantidade_recebida - quantidade_aprovada
```

---

## 4. Carry-Over entre Turnos

### INV-CO-01 — Saldo remanescente = planejado - menor realizado entre setores

**Regra:** O saldo remanescente da OP para o próximo turno é calculado como `quantidade_planejada_origem - min(quantidade_realizada por setor)`. O setor mais lento define o teto do carry-over.

**Fonte:** `lib/utils/carry-over-turno.test.ts` — "calcula o saldo remanescente da OP a partir do menor realizado entre os setores"

**Exemplo homologado:**
```
planejado=100, setores=[100, 70, 20] → remanescente = 100 - 20 = 80
```

---

### INV-CO-02 — Setor concluído no turno anterior herda quantidade total no próximo

**Regra:** Setor com `status = concluida` no turno anterior recebe `quantidade_herdada = quantidade_planejada_destino` no novo turno. Não reabre produção — apenas registra que já foi feito.

**Fonte:** `lib/utils/carry-over-turno.test.ts` — "normaliza o progresso setorial do carry-over sem reabrir setores já concluídos"

**Exemplo homologado:**
```
setor-preparacao: realizado=100, status=concluida → herdado=80, pendente=0
setor-frente: realizado=70, status=em_andamento → herdado=70, pendente=10
setor-costa: realizado=20, status=em_andamento → herdado=20, pendente=60
```

---

### INV-CO-03 — Carry-over consecutivo preserva parcelamento setorial

**Regra:** Quando a OP passa por múltiplos carry-overs consecutivos, cada setor herda exatamente o que foi realizado no turno anterior, sem acumular ou perder progresso.

**Fonte:** `lib/utils/carry-over-turno.test.ts` — "mantém o parcelamento setorial íntegro quando o carry-over se repete em turnos consecutivos"

---

### INV-CO-04 — Liberação herdada é preservada quando turno intermediário não teve apontamento

**Regra:** Se um setor tinha `quantidade_liberada_setor > 0` no turno anterior e o turno intermediário não registrou apontamento nele, a liberação é propagada para o próximo turno.

**Fonte:** `lib/utils/carry-over-turno.test.ts` — "preserva liberação herdada quando o turno intermediário não teve apontamento novo no setor"

---

### INV-CO-05 — Montagem é liberada no carry-over quando Frente e Costa foram concluídas

**Regra:** No fluxo paralelo (Preparação → Frente+Costa → Montagem), se Frente e Costa foram concluídas por operações atômicas, Montagem recebe `quantidade_liberada = quantidade_planejada_destino` no carry-over.

**Fonte:** `lib/utils/carry-over-turno.test.ts` — "libera Montagem no carry-over quando Frente e Costa foram concluídas por operações atômicas"

---

## 5. Roteiro Versionado

### INV-RV-01 — Novos turnos usam apenas roteiro vigente

**Regra:** Ao derivar setores e operações para um novo turno, usar apenas `produto_operacoes WHERE vigente = true`. Versões antigas são preservadas para rastreabilidade mas não alimentam novos planejamentos.

**Fonte:** PRD migração §6.4; `lib/utils/produto-roteiro-versionamento.test.ts` — "normaliza roteiro vigente ordenando sequencia e removendo versoes antigas"

**Teste de paridade:**
```
Criar turno com produto que tem roteiro v1 (vigente=false) e v2 (vigente=true)
→ turno_setor_operacoes deve referenciar apenas operações da v2
```

---

### INV-RV-02 — Alteração de roteiro não afeta turnos já derivados

**Regra:** Turnos abertos, encerrados, QRs, apontamentos, qualidade e relatórios já derivados permanecem congelados na versão do roteiro usada na abertura. Apenas novos turnos usam o roteiro atualizado.

**Fonte:** PRD migração §6.4; `lib/utils/produto-roteiro-versionamento.test.ts` — "detecta alteracao comparando somente o roteiro vigente normalizado"

---

### INV-RV-03 — Versão do roteiro é incremental e preserva histórico

**Regra:** Cada alteração de roteiro gera `versao_roteiro = max(versao_atual) + 1`. Versões antigas nunca são deletadas.

**Fonte:** `lib/utils/produto-roteiro-versionamento.test.ts` — "calcula proxima versao preservando historico existente"

**Exemplo homologado:**
```
versões existentes: [1, 4] → próxima versão = 5
roteiro vazio → próxima versão = 1
```

---

## 6. Qualidade

### INV-QU-01 — Revisão exige ao menos uma peça aprovada ou reprovada

**Regra:** `quantidade_aprovada + quantidade_reprovada > 0`. Revisão com ambos zerados é recusada.

**Fonte:** `lib/utils/qualidade-operacional.test.ts` — "bloqueia revisao vazia"

---

### INV-QU-02 — Revisão parcial não pode ultrapassar pendência disponível

**Regra:** `quantidade_aprovada + quantidade_reprovada <= quantidade_pendente`. Revisão acima da pendência é recusada.

**Fonte:** `lib/utils/qualidade-operacional.test.ts` — "bloqueia revisao maior que a pendencia disponivel"

---

### INV-QU-03 — Aprovadas consomem pendência; reprovadas ficam no histórico sem consumir

**Regra:** `quantidade_pendente_apos_revisao = quantidade_pendente - quantidade_aprovada`. Reprovadas são registradas mas não reduzem a pendência de aprovação.

**Fonte:** `lib/utils/qualidade-operacional.test.ts` — "permite revisao parcial e consome pendencia somente pelas aprovadas"

**Exemplo homologado:**
```
pendente=914, aprovada=40, reprovada=10
→ revisada=50, consumida_pendencia=40, pendente_apos=874
```

---

### INV-QU-04 — Defeitos são obrigatórios quando há peças reprovadas

**Regra:** Se `quantidade_reprovada > 0`, `defeitos.length >= 1`. Se `quantidade_reprovada = 0`, `defeitos.length = 0`.

**Fonte:** `lib/actions/qualidade.ts` — `validarDefeitos`

---

### INV-QU-05 — Combinação operação+tipo de defeito é única por revisão

**Regra:** Dentro de uma revisão, cada par `(turno_setor_operacao_id_origem, qualidade_defeito_id)` pode aparecer apenas uma vez.

**Fonte:** `lib/actions/qualidade.ts` — `validarDefeitos` com `Set<chaveDefeito>`

---

### INV-QU-06 — Apenas usuário com `pode_revisar_qualidade = true` pode registrar revisão

**Regra:** Revisor deve ter `usuarios_sistema.pode_revisar_qualidade = true`. Usuário sem permissão recebe erro explícito.

**Fonte:** `lib/actions/qualidade.ts` — `resolverRevisorQualidadeAutenticado`; `lib/utils/usuarios-sistema-permissoes.test.ts`

---

### INV-QU-07 — Qualidade permanece no fluxo operacional ativo

**Regra:** Setor com `modo_apontamento = revisao_qualidade` ou nome "Qualidade" participa do fluxo produtivo ativo. Não é excluído de derivações ou dashboards.

**Fonte:** `lib/utils/qualidade.test.ts` — "mantem Qualidade no fluxo operacional ativo para revisao final"

---

## 7. Fluxo Sequencial

### INV-FS-01 — Setor só recebe apontamento após o setor anterior liberar peças

**Regra:** `quantidade_disponivel_apontamento = quantidade_realizada_setor_anterior - quantidade_realizada_setor_atual`. Se o setor anterior não produziu nada, o setor atual tem disponível = 0.

**Fórmula homologada:**
```
disponivel = max(0, realizado_anterior - realizado_atual)
```

**Fonte:** `lib/utils/fluxo-sequencial-turno.test.ts` — "calcula a quantidade disponível com base no setor anterior concluído"

**Exemplos homologados:**
```
disponivel(100, 15, 40) = 25   # anterior=40, atual=15 → 40-15=25
disponivel(100, 15, 10) = 0    # anterior=10, atual=15 → bloqueado
disponivel(100, 15, null) = 85 # sem anterior → 100-15=85
```

---

### INV-FS-02 — Snapshot de parcelamento separa backlog, aceite e excedente

**Regra:** Para cada demanda setorial:
- `backlog_setor = quantidade_planejada - quantidade_realizada_atual`
- `aceite_turno = quantidade_disponivel_apontamento`
- `excedente_turno = backlog_setor - aceite_turno`

**Fonte:** `lib/utils/fluxo-sequencial-turno.test.ts` — "cria snapshot explícito de backlog, aceite e excedente"

---

## 8. Fluxo Paralelo (Costura)

### INV-FP-01 — Grafo oficial: Preparação → fork → Frente+Costa → join parcial → Montagem → Final

**Regra:** O fluxo de costura tem estrutura fixa:
- Preparação: sem predecessora, fork para Frente e Costa
- Frente e Costa: sequencial após Preparação, permitem simultaneidade
- Montagem: join parcial de Frente e Costa
- Final: sequencial após Montagem

**Fonte:** `lib/utils/fluxo-paralelo-turno.test.ts` — "expõe o grafo oficial do fluxo"

---

### INV-FP-02 — Preparação libera o mesmo teto para Frente e Costa (sem duplicar quantidade)

**Regra:** Após Preparação concluir N peças, tanto Frente quanto Costa ficam liberadas para N peças cada. A quantidade não é dividida — é duplicada como teto independente para cada ramo.

**Fonte:** `lib/utils/fluxo-paralelo-turno.test.ts` — "duplica o teto de liberação de Preparação para Frente e Costa sem consumir a quantidade duas vezes"

**Exemplo homologado:**
```
planejado=100, preparacao_concluida=40, frente_realizada=10, costa_realizada=25
→ frente: liberada=40, disponivel=30, pendente=90
→ costa: liberada=40, disponivel=15, pendente=75
```

---

## 9. Capacidade e Dimensionamento

### INV-CA-01 — Capacidade do setor = operadores_alocados × minutos_turno

**Regra:** `capacidade_minutos = operadores_alocados * minutos_turno`

**Fonte:** `lib/utils/capacidade-setor.test.ts` — `calcularCapacidadeSetorEmMinutos(2, 510) = 1020`

---

### INV-CA-02 — Eficiência requerida = carga_pendente / capacidade × 100

**Regra:** Quando `carga_pendente > capacidade`, diagnóstico = `acima_capacidade`. Quando dentro, `dentro_capacidade`.

**Fonte:** `lib/utils/capacidade-setor.test.ts` — "calcula resumo de capacidade do setor com diagnóstico acima da capacidade"

---

### INV-CA-03 — Dimensionamento usa apenas setores pendentes reais no carry-over

**Regra:** Para OPs em carry-over, o dimensionamento usa `cargas_setoriais` (setores com pendência real), não o roteiro completo do produto. Setores já concluídos não entram no cálculo.

**Fonte:** `lib/utils/dimensionamento-pessoas-setor.test.ts` — "usa apenas os setores pendentes reais no carry-over em vez de reabrir o roteiro completo"

---

### INV-CA-04 — Operações sem setor ou com T.P. inválido são ignoradas no dimensionamento

**Regra:** Operações com `setor_id = null` ou `tempo_padrao_min <= 0` não contribuem para carga. OPs com `quantidade_planejada = 0` não geram carga.

**Fonte:** `lib/utils/dimensionamento-pessoas-setor.test.ts` — "ignora operações inválidas do roteiro e quantidades não positivas"

---

## 10. Progresso Operacional

### INV-PO-01 — Progresso é ponderado pelo T.P. das operações

**Regra:** `progresso_pct = carga_realizada_tp / carga_planejada_tp × 100`
onde `carga_tp = quantidade_realizada × tempo_padrao_min` (limitado ao planejado por operação).

**Fonte:** `lib/utils/progresso-operacional.test.ts` — "pondera o progresso operacional pelo T.P. das operações"

---

### INV-PO-02 — Carga realizada é limitada ao planejado da operação

**Regra:** Se `quantidade_realizada > quantidade_planejada` em uma operação, a carga realizada é limitada a `quantidade_planejada × tempo_padrao_min`. Não há progresso acima de 100% por operação.

**Fonte:** `lib/utils/progresso-operacional.test.ts` — "limita a carga realizada ao planejado da operação antes de consolidar o progresso"

---

## 11. Fórmulas de Meta (PRD)

### INV-ME-01 — Fórmulas homologadas de meta e eficiência

**Regra:** As fórmulas abaixo são contratos de domínio. Qualquer reimplementação deve produzir os mesmos resultados.

```
metaHora        = floor(60 / tpOperacao)
metaIndividual  = floor(minutosTurno / tpOperacao)
metaGrupo       = floor((funcionariosAtivos × minutosTurno) / tpProduto)
tpProduto       = soma dos T.P. das operações vigentes do roteiro
eficiencia      = (quantidadeProduzida × tpOperacao / minutosTrabalhados) × 100
```

**Fonte:** PRD principal §6; `lib/utils/producao.ts`

---

### INV-ME-02 — Valores reais de turno nunca vêm de fallback

**Regra:** Em produção, `minutos_turno`, `funcionarios_ativos` e `produto_id` vêm sempre de `configuracao_turno` ou `turnos` do dia. `MINUTOS_TURNO_PADRAO = 540` é apenas fallback de desenvolvimento.

**Fonte:** CLAUDE.md §7; PRD principal

---

## 12. Permissões e Auth

### INV-AU-01 — `pode_revisar_qualidade` só é `true` quando formulário envia explicitamente `"true"`

**Regra:** Qualquer outro valor (`"on"`, ausente, `"1"`) resulta em `false`. Permissão não é concedida por omissão.

**Fonte:** `lib/utils/usuarios-sistema-permissoes.test.ts`

---

### INV-AU-02 — Defeitos têm classificação restrita a 4 valores

**Regra:** `classificacao` de `qualidade_defeitos` aceita apenas: `maquina`, `operador`, `processo`, `materia_prima`. Qualquer outro valor é recusado.

**Fonte:** `lib/utils/qualidade-defeitos.test.ts` — "recusa classificacao invalida de tipo de defeito"

---

## 13. Checklist de paridade para testes Django

Para cada invariante acima, o backend Django deve ter:

- [ ] **INV-OP-01** — Service recusa nova raiz com saldo pendente
- [ ] **INV-OP-02** — Service recusa OP concluída
- [ ] **INV-OP-03** — Service permite carry-over com origem informada
- [ ] **INV-SF-01** — Service recusa apontamento acima do saldo físico
- [ ] **INV-SF-02** — Saldo físico considera linhagem completa da OP
- [ ] **INV-SF-03** — Revisão de qualidade valida saldo físico (apenas aprovadas)
- [ ] **INV-CO-01** — Carry-over usa menor realizado entre setores
- [ ] **INV-CO-02** — Setor concluído herda total, não reabre produção
- [ ] **INV-CO-03** — Carry-over consecutivo preserva parcelamento
- [ ] **INV-CO-04** — Liberação herdada propagada quando sem apontamento intermediário
- [ ] **INV-CO-05** — Montagem liberada quando Frente e Costa concluídas
- [ ] **INV-RV-01** — Novos turnos usam apenas roteiro vigente
- [ ] **INV-RV-02** — Alteração de roteiro não afeta turnos já derivados
- [ ] **INV-RV-03** — Versão incremental, histórico preservado
- [ ] **INV-QU-01** — Revisão exige ao menos uma peça
- [ ] **INV-QU-02** — Revisão não ultrapassa pendência
- [ ] **INV-QU-03** — Aprovadas consomem pendência; reprovadas não
- [ ] **INV-QU-04** — Defeitos obrigatórios quando reprovadas > 0
- [ ] **INV-QU-05** — Par operação+defeito único por revisão
- [ ] **INV-QU-06** — Permissão `pode_revisar_qualidade` obrigatória
- [ ] **INV-QU-07** — Qualidade permanece no fluxo ativo
- [ ] **INV-FS-01** — Setor bloqueado sem liberação do anterior
- [ ] **INV-FS-02** — Snapshot de parcelamento correto
- [ ] **INV-FP-01** — Grafo de fluxo paralelo correto
- [ ] **INV-FP-02** — Preparação libera teto independente para Frente e Costa
- [ ] **INV-CA-01** — Capacidade = operadores × minutos
- [ ] **INV-CA-02** — Diagnóstico de capacidade correto
- [ ] **INV-CA-03** — Dimensionamento usa setores pendentes reais no carry-over
- [ ] **INV-CA-04** — Operações inválidas ignoradas no dimensionamento
- [ ] **INV-PO-01** — Progresso ponderado por T.P.
- [ ] **INV-PO-02** — Carga realizada limitada ao planejado
- [ ] **INV-ME-01** — Fórmulas de meta e eficiência corretas
- [ ] **INV-ME-02** — Valores reais de turno, nunca fallback
- [ ] **INV-AU-01** — Permissão de qualidade só por `"true"` explícito
- [ ] **INV-AU-02** — Classificação de defeito restrita a 4 valores
