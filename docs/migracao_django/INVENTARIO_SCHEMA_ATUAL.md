# INVENTARIO_SCHEMA_ATUAL.md — MDJ-1.1

> Inventario inicial de tabelas, views e relacionamentos da aplicacao atual.
> Fonte principal: `types/supabase.ts` e scripts SQL em `scripts/`.
> Escopo desta HU: estrutura de dados. RPCs, triggers, Server Actions e queries entram nas HUs MDJ-1.2 e MDJ-1.3.

---

## 1. Estado da leitura

Este inventario foi produzido sem executar SQL remoto e sem alterar dados.

Fontes usadas:

- `types/supabase.ts`
- `scripts/sprint1_schema.sql`
- `scripts/sprint6_*.sql`
- `scripts/sprint7_turnos_schema.sql`
- `scripts/sprint8_apontamento_v2.sql`
- `scripts/sprint9_apontamento_atomico_v2.sql`
- `scripts/sprint12_turno_setores_refactor.sql`
- `scripts/sprint13_maquinas_dominio_patrimonial.sql`
- `scripts/sprint24_meta_mensal.sql`
- `scripts/sprint36_qualidade_schema.sql`
- `scripts/sprint49_quantidade_herdada_setor.sql`
- `scripts/sprint50_saldo_fisico_op.sql`
- `scripts/sprint51_*.sql`
- `scripts/sprint52_versionamento_roteiro_produto.sql`

Observacao importante:

- `types/supabase.ts` ainda lista `qualidade_lotes`, `qualidade_registros.qualidade_lote_id` e a RPC `registrar_revisao_lote_qualidade`.
- A documentacao da Sprint 51.12 e `scripts/sprint51_remover_fluxo_lotes_qualidade.sql` registram que esses objetos foram removidos remotamente.
- Portanto, `qualidade_lotes` deve ser tratado como **objeto divergente a validar no Supabase remoto** antes de gerar models Django definitivos.

---

## 2. Resumo quantitativo pelo type local

Pelo `types/supabase.ts` local:

- 23 tabelas em `public.Tables`
- 3 views em `public.Views`
- 8 funcoes tipadas em `public.Functions`
- nenhum enum gerado
- nenhum composite type gerado

As 23 tabelas incluem objetos legados e possivelmente defasados. O backend Django nao deve copiar cegamente esse estado; deve primeiro confirmar o schema remoto durante MDJ-2.

---

## 3. Entidades por dominio

### 3.1 Cadastros estruturais

| Tabela | Papel atual | Relacoes principais | Prioridade Django |
|---|---|---|---|
| `setores` | Cadastro dos setores fisicos e modo de apontamento (`producao_padrao` ou `revisao_qualidade`). | Referenciada por `operacoes`, `turno_operadores`, `turno_setores`, `turno_setor_demandas`, `turno_setor_ops`, `turno_setor_operacoes`, qualidade. | Alta |
| `operadores` | Cadastro dos operadores do chao de fabrica, QR do cracha e status. | Referenciada por `turno_operadores` e `registros_producao`. | Alta |
| `maquinas` | Cadastro patrimonial e QR da maquina; nao dirige o fluxo operacional V2. | Referenciada por `operacoes.maquina_id` e `registros_producao.maquina_id`. | Media |
| `tipos_maquina` | Cadastro legado de tipo de maquina. | Referenciada por `operacoes.tipo_maquina_codigo`; dominio operacional atual prefere `maquina_id`. | Baixa/legado |
| `operacoes` | Cadastro tecnico das operacoes com T.P., setor, maquina e imagem. | Referencia `setores`, `maquinas`, `tipos_maquina`; referenciada por roteiro, apontamentos e qualidade. | Alta |
| `produtos` | Cadastro de produto, imagens, descricao e T.P. vigente. | Referenciada por roteiro, configuracao de turno, turnos e registros. | Alta |
| `produto_operacoes` | Roteiro versionado do produto. | Referencia `produtos` e `operacoes`; preserva `versao_roteiro`, `vigente`, `substituido_em`. | Alta |

Notas de migracao:

- `produto_operacoes.vigente = true` e a regra central para novos planejamentos.
- Roteiros antigos precisam ser preservados porque `turno_setor_operacoes.produto_operacao_id` aponta para a versao usada no turno derivado.
- `tipos_maquina` e `operacoes.tipo_maquina_codigo` devem ser avaliados como legado: o dominio atual usa maquinas patrimoniais e `maquina_id`.

### 3.2 Usuarios, auth e permissoes

| Tabela | Papel atual | Relacoes principais | Prioridade Django |
|---|---|---|---|
| `usuarios_sistema` | Perfil interno do usuario autenticado no Supabase Auth. Guarda papel, status e permissao de revisar Qualidade. | `auth_user_id` referencia `auth.users`; referenciada por producao, qualidade e cancelamentos legados. | Alta |

Notas de migracao:

- O backup de banco `public` nao basta para recriar auth: e preciso mapear Supabase Auth separadamente.
- No Django, esta tabela tende a virar extensao de `User` ou um perfil de dominio vinculado ao usuario Django.
- `pode_revisar_qualidade` e permissao operacional real e nao deve se perder na migracao.

### 3.3 Configuracao diaria e meta legado

| Tabela | Papel atual | Relacoes principais | Prioridade Django |
|---|---|---|---|
| `configuracao_turno` | Modelo inicial de configuracao diaria com funcionarios, minutos, produto, T.P. e meta grupo. | Referencia `produtos`; referenciada por blocos e leituras legadas. | Media/legado |
| `configuracao_turno_blocos` | Blocos planejados do modelo multi-produto anterior. | Referencia `configuracao_turno` e `produtos`; referenciada por `registros_producao`. | Baixa/legado |
| `metas_mensais` | Meta gerencial mensal da fabrica. | Sem FK direta no type local. | Alta |

Notas de migracao:

- `configuracao_turno` ainda aparece em scanner, relatorios e dashboard legado. Deve ser preservada mesmo que o fluxo V2 use `turnos`.
- `metas_mensais` e pequena, mas tem valor gerencial e deve migrar cedo para leituras read-only.

### 3.4 Turno operacional V2

| Tabela | Papel atual | Relacoes principais | Prioridade Django |
|---|---|---|---|
| `turnos` | Cabecalho do turno V2: status, operadores disponiveis, minutos, abertura/encerramento. | Pai de operadores, OPs, setores, demandas, registros e qualidade. | Critica |
| `turno_operadores` | Operadores disponiveis/alocados no turno. | Referencia `turnos`, `operadores`, `setores`. | Alta |
| `turno_ops` | OP planejada dentro do turno; guarda quantidade fisica, status e origem de carry-over. | Referencia `turnos`, `produtos` e opcionalmente outra `turno_ops`. | Critica |
| `turno_setores` | Setor fisico ativo no turno; QR operacional por `turno + setor`. | Referencia `turnos`, `setores`; pai de demandas. | Critica |
| `turno_setor_demandas` | Demanda interna de OP/produto dentro de um setor do turno. | Referencia `turno_setores`, `turnos`, `turno_ops`, `produtos`, `setores` e opcionalmente `turno_setor_ops`. | Critica |
| `turno_setor_ops` | Estrutura historica `turno + OP + setor`, hoje usada como camada de compatibilidade. | Referencia `turnos`, `turno_ops`, `setores`; espelha/ancora demandas. | Alta/compatibilidade |
| `turno_setor_operacoes` | Operacoes atomicas planejadas por setor/demanda/OP no turno. | Referencia `turnos`, `turno_ops`, `turno_setor_ops`, `turno_setores`, `turno_setor_demandas`, `produto_operacoes`, `operacoes`, `setores`. | Critica |

Notas de migracao:

- O modelo alvo de dominio e `turno + setor + demanda + operacao`.
- `turno_setor_ops` nao deve ser descartada sem estudo: ainda aparece em scanner, relatorios, registros e compatibilidade historica.
- `turno_setor_demandas.quantidade_herdada_setor`, `quantidade_liberada_setor` e `quantidade_realizada` separam progresso herdado, saldo executavel e producao do turno.
- `turno_ops.turno_op_origem_id` e `quantidade_planejada_remanescente` sustentam carry-over e continuidade entre turnos.

### 3.5 Producao

| Tabela | Papel atual | Relacoes principais | Prioridade Django |
|---|---|---|---|
| `registros_producao` | Fonte de verdade dos apontamentos produtivos fisicos. | Referencia operadores, maquinas, operacoes, produtos, configuracao/blocos, turno, OP, setor, demanda, operacao atomica e usuario. | Critica |

Notas de migracao:

- Esta tabela mistura registros legados e V2. Os campos opcionais indicam o nivel estrutural do apontamento.
- Para Django, ela deve ser migrada preservando linhagem e origem (`origem_apontamento`).
- Regras de saldo fisico e concorrencia devem migrar como services transacionais, nao apenas como constraints passivas.

### 3.6 Qualidade

| Tabela | Papel atual | Relacoes principais | Prioridade Django |
|---|---|---|---|
| `qualidade_defeitos` | Catalogo mestre de defeitos. | Referenciada por `qualidade_detalhes`. | Alta |
| `qualidade_registros` | Historico das revisoes de Qualidade. | Referencia revisor, turno, OP, setor/operacao de qualidade e possivel lote legado. | Critica |
| `qualidade_detalhes` | Ocorrencias de defeitos por operacao produtiva analisada. | Referencia `qualidade_registros`, `qualidade_defeitos`, `turno_setor_operacoes`, `operacoes`, `setores`. | Critica |
| `qualidade_lotes` | Fila paralela por lotes da interpretacao intermediaria da Sprint 51. | No type local, referencia producao, turnos, OPs, produtos, operacoes, setores e usuarios. | Divergente/validar |

Notas de migracao:

- O contrato atual documentado apos Sprint 51.12 e operar exclusivamente sobre `qualidade_registros` + `qualidade_detalhes`, com Qualidade como etapa final operacional.
- `qualidade_lotes` aparece no type local, mas a migracao remota documentada removeu a tabela e a RPC correspondente. Confirmar no banco antes de modelar.
- Defeitos sao ocorrencias operacionais, nao rastreio unitario por peca; a soma de defeitos pode ser maior que `quantidade_reprovada`.

---

## 4. Views atuais

| View | Papel | Status para migracao |
|---|---|---|
| `vw_producao_hoje` | Leitura legada de producao por operador hoje com eficiencia. | Recriar como query/read model Django se ainda houver consumo em frontend legado. |
| `vw_producao_por_hora` | Leitura legada de producao por hora. | Recriar em selector/read model; comparar com dashboard V2 antes de manter. |
| `vw_status_maquinas` | Status patrimonial/uso de maquinas. | Baixa criticidade operacional, mas preservar para telas antigas e auditoria. |

Nota:

- Views nao devem ser copiadas automaticamente para o banco Django. A preferencia alvo e mover leituras para selectors/read models testaveis, mantendo views apenas quando simplificarem relatorios pesados.

---

## 5. Relacionamentos estruturais principais

### 5.1 Cadastros e roteiro

```text
produtos
  -> produto_operacoes
      -> operacoes
          -> setores
          -> maquinas
          -> tipos_maquina (legado)
```

Contrato critico:

- `produto_operacoes` e versionada.
- Novos turnos leem apenas linhas `vigente = true`.
- Turnos ja derivados apontam para a linha de roteiro usada naquele momento.

### 5.2 Turno V2

```text
turnos
  -> turno_operadores -> operadores / setores
  -> turno_ops -> produtos
      -> turno_setor_ops -> setores
      -> turno_setores -> setores
          -> turno_setor_demandas -> turno_ops / produtos / setores
              -> turno_setor_operacoes -> produto_operacoes / operacoes
```

Contrato critico:

- A estrutura fisica visivel e `turno_setores`.
- Demandas internas conectam OP/produto ao setor fisico.
- Operacoes atomicas carregam snapshot de T.P. e roteiro usado.

### 5.3 Apontamento produtivo

```text
registros_producao
  -> operadores
  -> operacoes
  -> produtos
  -> maquinas (opcional/patrimonial)
  -> turnos / turno_ops / turno_setores / turno_setor_demandas / turno_setor_operacoes
  -> usuarios_sistema (quando lancamento autenticado)
```

Contrato critico:

- `registros_producao` e a fonte de verdade de producao fisica.
- Registros legados podem nao possuir todos os vinculos V2.
- A migracao precisa preservar registros parciais sem tentar "corrigir" historico automaticamente.

### 5.4 Qualidade

```text
qualidade_registros
  -> usuarios_sistema (revisor)
  -> turnos
  -> turno_ops
  -> turno_setor_operacoes (operacao de qualidade, quando aplicavel)
  -> turno_setor_ops (compatibilidade)

qualidade_detalhes
  -> qualidade_registros
  -> qualidade_defeitos
  -> turno_setor_operacoes (operacao produtiva de origem)
  -> operacoes
  -> setores
```

Contrato critico:

- Qualidade revisa saldo recebido da etapa final produtiva.
- Aprovadas/reprovadas nao podem duplicar producao fisica.
- Defeitos sao rastreabilidade analitica e nao devem alterar KPIs produtivos.

---

## 6. Constraints e indices que precisam virar contrato Django

### 6.1 Unicidade e identidade

| Objeto | Regra identificada |
|---|---|
| `turnos` | Indice unico parcial para haver apenas um turno aberto. |
| `turno_ops` | Historicamente `UNIQUE(turno_id, numero_op)`; dominio atual tambem trata `numero_op` como container fisico finito. |
| `turno_operadores` | `UNIQUE(turno_id, operador_id)`. |
| `turno_setores` | `UNIQUE(turno_id, setor_id)`. |
| `turno_setor_demandas` | `UNIQUE(turno_setor_id, turno_op_id)` e vinculo unico opcional com `turno_setor_op_legacy_id`. |
| `turno_setor_operacoes` | `UNIQUE(turno_setor_op_id, operacao_id)` e `UNIQUE(turno_setor_op_id, sequencia)`. |
| `produto_operacoes` | Unicidade por produto, versao e sequencia; unicidade parcial para roteiro vigente por produto e sequencia. |
| `usuarios_sistema` | `auth_user_id` unico. |
| `configuracao_turno_blocos` | Unicidade por configuracao e sequencia; unico bloco ativo por configuracao. |
| `qualidade_registros` | Type local ainda mostra unicidade opcional por lote; validar se foi removida remotamente. |

### 6.2 Checks de dominio

| Tema | Regra identificada |
|---|---|
| Quantidades | Planejado > 0 nos objetos planejados; realizado >= 0; em varios pontos realizado <= planejado. |
| Turno | Status principal `aberto` ou `encerrado`. |
| OP e setor | Status como `planejada`, `aberta`, `em_andamento`, `concluida`, `encerrada_manualmente`. |
| Origem de apontamento | `operador_qr`, `operador_manual`, `supervisor_manual` aparecem nos scripts mais recentes. |
| Setor | `modo_apontamento` em `producao_padrao` ou `revisao_qualidade`. |
| Usuarios | `papel` em `admin` ou `supervisor`. |
| Qualidade | Defeitos com classificacao `maquina`, `operador`, `processo`, `materia_prima`; quantidades nao negativas e defeito > 0. |
| Metas | `meta_pecas > 0`, `dias_produtivos` entre 1 e 31. |

### 6.3 Indices relevantes

Os scripts indicam indices por:

- turno em `turno_ops`, `turno_setores`, `turno_setor_demandas`, `turno_setor_ops`, `turno_setor_operacoes`
- setor em `turno_setores`, `turno_setor_demandas`, `turno_setor_ops`
- operacao em `turno_setor_operacoes` e `registros_producao`
- operador/data/hora em `registros_producao`
- roteiro vigente em `produto_operacoes`
- competencia em `metas_mensais`
- auth user em `usuarios_sistema`
- defeitos ativos/ordem em `qualidade_defeitos`

No Django, esses indices devem virar `Meta.indexes` e constraints explicitas, nao apenas depender de queries otimizadas no codigo.

---

## 7. Objetos legados e de compatibilidade

| Objeto | Motivo para preservar inicialmente |
|---|---|
| `configuracao_turno` | Ainda aparece em queries de scanner, relatorios e dashboard legado. |
| `configuracao_turno_blocos` | Historico do modelo multi-produto/blocos e relatorios antigos. |
| `turno_setor_ops` | Camada de compatibilidade ainda referenciada por scanner, registros, qualidade e relatorios. |
| `tipos_maquina` | Ligacao antiga ainda existe em `operacoes.tipo_maquina_codigo`. |
| Campos opcionais em `registros_producao` | Preservam coexistencia entre legado e V2. |
| `qualidade_lotes` | Deve ser validado remotamente; se existir, tratar como residuo de migracao de qualidade e nao como alvo funcional. |

Regra:

- Legado nao deve ser apagado no primeiro desenho Django. Primeiro migrar, identificar consumidores reais, depois planejar limpeza em sprint propria.

---

## 8. Prioridade de modelagem Django

### Critica

- `turnos`
- `turno_ops`
- `turno_setores`
- `turno_setor_demandas`
- `turno_setor_operacoes`
- `registros_producao`
- `qualidade_registros`
- `qualidade_detalhes`
- `produtos`
- `produto_operacoes`
- `operacoes`
- `setores`

### Alta

- `operadores`
- `usuarios_sistema`
- `qualidade_defeitos`
- `metas_mensais`
- `turno_operadores`
- `turno_setor_ops`

### Media

- `maquinas`
- `configuracao_turno`
- `vw_producao_hoje`
- `vw_producao_por_hora`
- `vw_status_maquinas`

### Baixa ou legado

- `tipos_maquina`
- `configuracao_turno_blocos`
- `qualidade_lotes` se ainda existir no remoto

---

## 9. Lacunas para as proximas HUs

MDJ-1.2 deve aprofundar:

- funcoes SQL ativas
- triggers ativos
- quais RPCs ainda sao chamadas pelo codigo
- quais funcoes documentadas foram removidas remotamente

MDJ-1.3 deve aprofundar:

- quais `lib/actions` escrevem em cada tabela
- quais `lib/queries` leem cada tabela/view
- quais telas dependem de views legadas
- como substituir cada chamada por API Django

MDJ-2 deve validar no Supabase remoto:

- existencia real de `qualidade_lotes`
- existencia real de `registrar_revisao_lote_qualidade`
- estado real de constraints e indices apos as migrations aplicadas
- contagens por tabela antes do backup

---

## 10. Conclusao da HU MDJ-1.1

A estrutura atual e madura, mas carrega coexistencia historica de varias fases:

- legado inicial por `configuracao_turno`
- V2 por `turnos`
- refatoracao para `turno + setor`
- apontamento atomico por operacao
- carry-over com progresso herdado
- qualidade operacional restaurada
- roteiro versionado por vigencia futura

Para Django, a decisao correta e modelar primeiro o dominio V2 atual e preservar os objetos legados como historico/compatibilidade ate que os consumidores sejam mapeados nas HUs seguintes.
