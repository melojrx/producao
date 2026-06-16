# MDJ7_VALIDACAO_PARIDADE.md — Comparacao Django vs Supabase

> Documento de paridade entre schemas Django e dados Supabase restaurados.
> Executado em 2026-06-05.

---

## Metodologia

1. Consultar schema do banco Supabase restaurado (`postgres_restore` porta 5433)
2. Consultar schema do banco Django (`postgres_data` porta 5432)
3. Comparar campos, tipos e nomenclaturas
4. Documentar divergencias

---

## Contagens comparadas

| Tabela | Django (teste) | Supabase (restore) | Status |
|---|---|---|---|
| setores | 2 | 6 | Divergente - dados diferentes |
| operacoes | 1 | 207 | Divergente - dados diferentes |
| maquinas | 1 | 16 | Divergente - dados diferentes |
| tipos_maquina | 1 | 7 | Divergente - dados diferentes |
| operadores | 0 | 33 | Divergente - dados diferentes |
| produtos | 2 | 38 | Divergente - dados diferentes |
| produto_operacoes | 2 | 1163 | Divergente - dados diferentes |

**Nota:** dados diferentes porque banco Django tem dados de teste, nao dados reais do Supabase.

---

## Divergencias de Schema identificadas

### Setor

| Campo | Supabase | Django | Status |
|---|---|---|---|
| codigo | INTEGER | VARCHAR(20) | **DIVERGENTE** - tipo diferente |
| ativo | BOOLEAN | - | **DIVERGENTE** - campo nao existe |
| situacao | - | CharField (choices) | **DIVERGENTE** - nome diferente |
| sequencia_fluxo | - | PositiveIntegerField | OK - existe em Django |

**Acao recomendada:** manter `codigo` como VARCHAR no Django (mais flexivel para QR codes), documentar que Supabase usa inteiro.

### Operacao

| Campo | Supabase | Django | Status |
|---|---|---|---|
| codigo | VARCHAR | VARCHAR | OK |
| descricao | VARCHAR | VARCHAR | OK |
| tipo_maquina_codigo | VARCHAR | - | **DIVERGENTE** - nome diferente |
| tipo_maquina | - | ForeignKey | **DIVERGENTE** - FK vs CHAR |
| setor_id | UUID | - | **DIVERGENTE** - nome diferente |
| setor | - | ForeignKey | **DIVERGENTE** - nome diferente |
| maquina_id | UUID | - | **DIVERGENTE** - nome diferente |
| maquina | - | ForeignKey | **DIVERGENTE** - nome diferente |
| ativo/ativa | BOOLEAN | CharField | **DIVERGENTE** - tipo diferente |

**Acao recomendada:** Django usa FK para tipo_maquina/setor/maquina (melhor pratica), Supabase usa CHAR com sufixo `_codigo`. Manter Django e mapear na importacao.

### Operador

| Campo | Supabase | Django | Status |
|---|---|---|---|
| setor | VARCHAR | - | **DIVERGENTE** - campo nao existe |
| maquina_preferida | - | ForeignKey | **DIVERGENTE** - campo nao existe |
| carga_horaria_min | INTEGER | PositiveIntegerField | OK |
| status | VARCHAR | CharField | OK |

**Acao recomendada:** Supabase usa `setor` como VARCHAR, Django usa `maquina_preferida` como FK. Investigar se operador tem vinculo com setor ou maquina.

### Produto

| Campo | Supabase | Django | Status |
|---|---|---|---|
| referencia | VARCHAR | - | **DIVERGENTE** - nome diferente |
| codigo | - | VARCHAR | **DIVERGENTE** - nome diferente |
| descricao | TEXT | - | Campo extra em Supabase |

**Acao recomendada:** renomear Django `codigo` para `referencia` ou manter `codigo` e mapear na importacao. Manter `referencia` como alias.

### ProdutoOperacao

| Campo | Supabase | Django | Status |
|---|---|---|---|
| produto_id | UUID | ForeignKey | OK |
| operacao_id | UUID | ForeignKey | OK |
| sequencia | INTEGER | PositiveIntegerField | OK |
| versao_roteiro | INTEGER | PositiveIntegerField | OK |
| vigente | BOOLEAN | BooleanField | OK |
| substituido_em | TIMESTAMP | DateTimeField | OK |

**Status:** sem divergencias relevantes.

---

## Conclusoes

1. **Schema Django mais robusto:** usa FKs ao inves de CHAR com sufixo `_codigo`, melhor normalizacao.

2. **Nomenclaturas diferentes:** Django usa `codigo`, Supabase usa `referencia` para produtos. Django usa `situacao`, Supabase usa `ativo`.

3. **Tipos diferentes:** `codigo` em setores e INTEGER no Supabase, VARCHAR no Django. Manter VARCHAR no Django (suporta QR codes alfanumericos).

4. **Importacao de dados:** ao importar dados reais do Supabase para Django, mapear:
   - `referencia` -> `codigo` (produtos)
   - `ativo` -> `situacao` (setores, operacoes, maquinas)
   - `tipo_maquina_codigo` -> `tipo_maquina` (buscar FK)

5. **Validacao de payload:** endpoints Django retornam campos no formato Django. Comparacao com Supabase real pendente execucao com dados importados.

---

## Proximos passos

1. [ ] Definir estrategia de mapeamento para importacao de dados
2. [ ] Validar que endpoints Django retornam campos esperados pelo frontend
3. [ ] Testar comparacao com Supabase real apos importacao de dados