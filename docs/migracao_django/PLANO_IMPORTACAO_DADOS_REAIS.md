# PLANO_IMPORTACAO_DADOS_REAIS.md — Supabase restore para Django local

> Plano tecnico para importar o snapshot real restaurado do Supabase para o banco operacional Django local.
> Este plano deve ser executado antes de abrir qualquer mutacao MDJ-9.

---

## Objetivo

Carregar dados reais do restore Supabase no banco Django local para permitir paridade funcional de payloads e preparar a primeira mutacao segura.

O plano nao muda a fonte operacional de producao. O Supabase remoto continua intacto ate cutover aprovado.

---

## Escopo permitido

Permitido:

- ler o banco `supabase_restore_test` do container `postgres_restore`;
- escrever somente no banco Django local `pcp_db`;
- recriar o volume local Django quando necessario;
- criar comando Django de importacao idempotente ou script local versionado;
- validar contagens, FKs e payloads por endpoint read-only;
- documentar divergencias que nao puderem ser resolvidas automaticamente.

Proibido:

- escrever no Supabase remoto;
- alterar Server Actions ou queries Next.js;
- fazer cutover do frontend;
- importar dados sem backup/restore healthy;
- iniciar mutacoes Django antes da paridade read-only com dados reais.

---

## Ordem de importacao

1. Usuarios e auth auxiliar
2. Cadastros base
3. Produtos e roteiro versionado
4. Turnos e estrutura operacional
5. Producao
6. Qualidade
7. Metas
8. Auditoria final de contagens e endpoints

A ordem deve respeitar FKs Django e manter IDs UUID originais quando eles existirem no Supabase, para facilitar auditoria e comparacao.

---

## Mapeamentos decididos

### Produtos

| Supabase | Django | Regra |
|---|---|---|
| `produtos.id` | `Produto.id` | preservar UUID original |
| `produtos.referencia` | `Produto.codigo` | mapeamento canonico aprovado para importacao |
| `produtos.nome` | `Produto.nome` | copiar direto |
| `produtos.descricao` | sem campo atual | nao descartar silenciosamente; registrar lacuna para migration futura ou preservar em metadado se aprovado |
| `produtos.ativo` | `Produto.ativo` | copiar direto |
| `produtos.imagem_url` legado | `imagem_frente_url` ou `imagem_costa_url` | manter vazio se nao houver classificacao confiavel; preservar URL em relatorio de lacuna |
| `produtos.imagem_frente_url` | `Produto.imagem_frente_url` | copiar direto quando existir |
| `produtos.imagem_costa_url` | `Produto.imagem_costa_url` | copiar direto quando existir |
| `produtos.tp_produto_min` | `Produto.tp_produto_min` | copiar snapshot vigente |

Decisao:

- o modelo Django mantem `codigo` como nome interno;
- durante importacao, `codigo = referencia`;
- antes do cutover frontend, decidir se a API Django precisa expor tambem alias `referencia` para compatibilidade do Next.js.

### Setores

| Supabase | Django | Regra |
|---|---|---|
| `setores.id` | `Setor.id` | preservar UUID original |
| `setores.codigo` INTEGER | `Setor.codigo` VARCHAR(20) | converter para string |
| `setores.nome` | `Setor.nome` | copiar direto |
| `setores.ativo` BOOLEAN | `Setor.situacao` | `true -> ativo`, `false -> inativo` |
| `setores.modo_apontamento` | `Setor.modo_apontamento` | copiar quando existir; fallback `producao_padrao` |
| `setores.sequencia_fluxo` | `Setor.sequencia_fluxo` | copiar quando existir; fallback `0` |

Decisao:

- Django preserva `situacao` como contrato interno;
- importacao resolve `ativo -> situacao`;
- qualquer setor `Qualidade` deve manter `modo_apontamento = revisao_qualidade`.

### Operacoes

| Supabase | Django | Regra |
|---|---|---|
| `operacoes.id` | `Operacao.id` | preservar UUID original |
| `operacoes.codigo` | `Operacao.codigo` | copiar direto |
| `operacoes.descricao` | `Operacao.descricao` | copiar direto |
| `operacoes.tipo_maquina_codigo` | `Operacao.tipo_maquina` FK | resolver por `TipoMaquina.codigo` |
| `operacoes.setor_id` | `Operacao.setor` FK | resolver por UUID do setor importado |
| `operacoes.maquina_id` | `Operacao.maquina` FK | resolver por UUID da maquina importada |
| `operacoes.tempo_padrao_min` | `Operacao.tempo_padrao_min` | copiar direto |
| `operacoes.ativa` ou `ativo` | `Operacao.situacao` | `true -> ativa`, `false -> inativa` |

Decisao:

- FKs Django sao mantidas;
- linhas sem FK resolvivel devem ir para relatorio de bloqueio, nao para importacao parcial silenciosa.

### Operadores

| Supabase | Django | Regra |
|---|---|---|
| `operadores.id` | `Operador.id` | preservar UUID original |
| `operadores.nome` | `Operador.nome` | copiar direto |
| `operadores.matricula` | `Operador.matricula` | copiar direto |
| `operadores.status` | `Operador.status` | copiar direto |
| `operadores.qr_code_token` | `Operador.qr_code_token` | copiar direto |
| `operadores.setor` | sem FK atual | registrar lacuna; nao inventar FK sem regra aprovada |
| `maquina_preferida` Django | sem origem direta confiavel | manter `NULL` |

Decisao:

- operador nao deve ganhar `maquina_preferida` por inferencia;
- se o vinculo setorial do operador voltar a ser necessario, abrir migration propria antes da importacao final.

### Turnos

| Supabase | Django | Regra |
|---|---|---|
| `turnos.id` | `Turno.id` | preservar UUID original |
| `turnos.status` | `Turno.status` | copiar direto quando valores forem compativeis |
| `turnos.iniciado_em` | `Turno.data_hora_abertura` | copiar direto |
| `turnos.encerrado_em` | `Turno.data_hora_encerramento` | copiar direto |
| `turnos.operadores_disponiveis` | `Turno.operadores_disponiveis` | copiar direto; bloquear se ausente |
| `turnos.minutos_turno` | `Turno.minutos_turno` | copiar direto; bloquear se ausente |
| `turnos.meta_grupo` | `Turno.meta_grupo` | copiar se existir; caso contrario manter `NULL` |
| `turnos.observacao` | `Turno.observacao` | copiar direto quando existir |

Decisao:

- `status=aberto` deve respeitar a constraint de um unico turno aberto;
- se o snapshot tiver mais de um aberto, importacao deve bloquear e exigir decisao de negocio.

### Producao

| Supabase | Django | Regra |
|---|---|---|
| `registros_producao.id` | `RegistroProducao.id` | preservar UUID original |
| `operador_id` | `operador` FK | resolver por UUID |
| `maquina_id` | `maquina` FK | resolver por UUID ou `NULL` |
| `operacao_id` | `operacao` FK | resolver por UUID |
| `produto_id` | `produto` FK | resolver por UUID ou `NULL` |
| `quantidade` | `quantidade` | copiar direto |
| `hora_registro` | `hora_registro` | copiar direto |
| `usuario_sistema_id` | `usuario_sistema` FK | resolver por usuario importado ou `NULL` |
| `turno` varchar legado | `turno` FK | resolver por contexto moderno antes de importar |
| `turno_op_id` | `turno_op` FK | resolver por UUID quando existir |
| `turno_setor_id` | `turno_setor` FK | resolver por UUID quando existir |
| `turno_setor_demanda_id` | `turno_setor_demanda` FK | resolver por UUID quando existir |
| `turno_setor_operacao_id` | `turno_setor_operacao` FK | resolver por UUID quando existir |

Decisao:

- o campo legado `turno` varchar nao deve virar texto em Django;
- quando houver IDs V2, eles sao fonte principal para resolver FKs;
- registros sem contexto operacional suficiente devem ser preservados em relatorio de lacuna antes de qualquer descarte.

### Qualidade

| Supabase | Django | Regra |
|---|---|---|
| `qualidade_registros.id` | `QualidadeRegistro.id` | preservar UUID original |
| `turno_id` | `turno` FK | resolver por UUID |
| `turno_setor_operacao_id` | `turno_setor_operacao` FK | resolver por UUID |
| `revisor_usuario_id` | `revisor` FK | resolver por usuario importado |
| `quantidade_aprovada` | `quantidade_aprovada` | copiar direto |
| `quantidade_reprovada` | `quantidade_reprovada` | copiar direto |
| `quantidade_revisada` | sem campo proprio | validar como `aprovada + reprovada`; nao persistir duplicado |
| `origem_lancamento` | sem campo proprio | registrar lacuna para auditoria; nao criar campo sem HU |
| `created_at` ou timestamp de revisao | `hora_revisao` | usar timestamp de revisao quando existir; fallback `created_at` documentado |

Decisao:

- qualidade continua operacional, sem `qualidade_lotes`;
- aprovacoes baixam pendencia; reprovacoes permanecem no fluxo conforme PRD principal;
- qualquer divergencia de saldo deve bloquear a importacao de qualidade ate reconciliacao.

---

## Validacoes obrigatorias

Antes de considerar a importacao aceita:

1. `python manage.py check` sem issues.
2. `python manage.py makemigrations --check --dry-run` sem mudancas.
3. Contagens Django iguais ao restore para tabelas importadas, exceto lacunas documentadas.
4. Nenhuma FK quebrada no banco Django.
5. Endpoints read-only retornam dados reais.
6. `POST` em endpoints read-only continua retornando `405`.
7. Comparacao de payloads registra divergencias aceitas e divergencias bloqueantes.
8. `git diff --check` sem saida.

---

## Estrategia de rollback local

Como a importacao escreve apenas no banco Django local:

1. parar backend se necessario;
2. recriar volume `producao_postgres_data`;
3. rodar migrations Django novamente;
4. manter restore Supabase intacto;
5. repetir importacao apos corrigir mapeamentos.

Nenhuma etapa deste plano requer rollback do Supabase remoto.

---

## Saida esperada

Ao final da importacao real:

- banco Django local contem os dados reais restaurados;
- endpoints MDJ-7 e MDJ-8 deixam de responder apenas dados de teste/vazio;
- paridade de contagens fica documentada;
- divergencias de payload ficam classificadas entre aceitas e bloqueantes;
- MDJ-9 pode ser aberta com uma mutacao nao critica sobre uma base local real.
