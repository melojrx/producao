# MDJ_PRE_MDJ9_IMPORTACAO_REAL.md — Importacao real local antes da MDJ-9

> Evidencia da importacao do restore Supabase para o banco Django local.
> Data: `2026-06-05`.

---

## Escopo executado

Foi executada a importacao real local descrita em `PLANO_IMPORTACAO_DADOS_REAIS.md`.

Origem:

```text
container: pcp-postgres-restore
database: supabase_restore_test
porta: 5433
```

Destino:

```text
container: producao-db-1
database: pcp_db
backend: producao-backend-1
```

Nao houve:

- escrita no Supabase remoto;
- alteracao no frontend Next.js;
- cutover de Server Actions ou queries;
- mutacao operacional Django.

---

## Comando de importacao

Dry-run:

```bash
docker compose -f docker-compose.dev.yml exec -T backend \
  python manage.py import_supabase_restore --flush --dry-run
```

Execucao persistida no banco Django local:

```bash
docker compose -f docker-compose.dev.yml exec -T backend \
  python manage.py import_supabase_restore --flush
```

---

## Resultado importado

| Entidade | Registros Django |
|---|---:|
| usuarios_sistema (`accounts.User`) | 3 |
| setores | 6 |
| tipos_maquina | 7 |
| maquinas | 16 |
| operacoes | 207 |
| operadores | 33 |
| produtos | 38 |
| produto_operacoes | 1163 |
| turnos | 58 |
| turno_ops | 171 |
| turno_setores | 274 |
| turno_setor_ops | 850 |
| turno_setor_demandas | 850 |
| turno_setor_operacoes | 5083 |
| registros_producao | 1321 |
| qualidade_defeitos | 9 |
| qualidade_registros | 68 |
| qualidade_detalhes | 19 |
| metas_mensais | 1 |

---

## Diferencas controladas

| Item | Restore Supabase | Django local | Decisao |
|---|---:|---:|---|
| `turno_setor_demandas` | 848 | 850 | +2 demandas sinteticas para preservar 2 operacoes setoriais legadas referenciadas por producao/qualidade |
| `qualidade_defeitos` | 8 | 9 | +1 defeito sintetico `Defeito nao informado (legado)` para preservar 12 detalhes antigos com `qualidade_defeito_id` nulo |
| `registros_producao` | 1323 | 1321 | 2 registros antigos sem `operacao_id` foram bloqueados como estruturalmente invalidos para o model Django |

Os 78 avisos de operador com `setor` textual legado foram aceitos como lacuna de modelagem ja prevista: o Django atual nao possui FK de setor no operador, e `maquina_preferida` nao deve ser preenchida por inferencia.

---

## Validacoes executadas

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py check
```

Resultado:

```text
System check identified no issues (0 silenced).
```

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run
```

Resultado:

```text
No changes detected
```

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test pcp_project
```

Resultado:

```text
Ran 1 test in 0.010s
OK
```

FKs criticas verificadas no banco Django local:

| Check | Resultado |
|---|---:|
| `turnos_turnosetoroperacao.turno_setor_demanda_id IS NULL` | 0 |
| `turnos_turnosetoroperacao.turno_setor_id IS NULL` | 0 |
| `producao_registroproducao.operacao_id IS NULL` | 0 |
| `producao_registroproducao.operador_id IS NULL` | 0 |
| `qualidade_qualidaderegistro.revisor_id IS NULL` | 0 |
| `qualidade_qualidadedetalhe.defeito_id IS NULL` | 0 |

Endpoints read-only validados apos importacao:

```text
GET /health/ -> {"status": "ok"}
GET /api/v1/turnos/ -> retorna dados reais importados
GET /api/v1/cadastros/setores/ -> retorna setores reais importados
GET /api/v1/qualidade/defeitos/ -> retorna catalogo real + defeito legado sintetico
GET /api/v1/relatorios/dashboard/ -> retorna turno aberto importado
POST /api/v1/turnos/ -> 405
```

---

## Conclusao

A base Django local agora possui dados reais restaurados suficientes para validar payloads read-only e preparar a MDJ-9.

Antes de abrir uma mutacao, ainda e obrigatorio:

1. escolher uma mutacao nao critica;
2. criar service transacional Django para essa mutacao;
3. manter feature flag desligada por padrao;
4. comparar comportamento com o fluxo atual Supabase;
5. preservar rollback local e nao tocar no Supabase remoto sem aprovacao explicita.
