# MDJ8_VALIDACAO_PARIDADE.md — Turnos, dashboard e qualidade

> Validacao documental e tecnica da Sprint MDJ-8.
> Data de fechamento: `2026-06-05`.

---

## Escopo

A MDJ-8 validou a API Django read-only para dominios operacionais que dependem de turnos, producao, qualidade e dashboard.

Foi validado:

- selectors read-only para turnos e producao;
- ViewSets read-only para turnos, OPs, setores, demandas, operacoes e operadores do turno;
- selectors e ViewSets read-only para qualidade;
- selectors e endpoint de dashboard operacional;
- comparacao de schema e contagens contra o restore Supabase local.

Nao foi feito:

- importacao de dados reais no banco operacional Django;
- alteracao no Supabase remoto;
- alteracao no frontend Next.js;
- mutacao Django;
- cutover de actions ou queries Supabase.

---

## Ambientes usados

Banco Django operacional local:

```text
compose: docker-compose.dev.yml
service: db
database: pcp_db
volume: producao_postgres_data
```

Restore Supabase read-only:

```text
compose: docker-compose.restore.yml
service: postgres_restore
database: supabase_restore_test
porta: 5433
volume: producao_postgres_restore_data
```

Backend Django:

```text
service: backend
porta: 8001 -> 8000
healthcheck: GET /health/
```

---

## Endpoints read-only validados

Turnos:

```text
GET /api/v1/turnos/
GET /api/v1/turnos/aberto/
GET /api/v1/turnos/<uuid>/
GET /api/v1/turnos-ops/
GET /api/v1/turnos-setores/
GET /api/v1/turnos-demandas/
GET /api/v1/turnos-operacoes/
GET /api/v1/turnos-operadores/
```

Producao:

```text
GET /api/v1/producao/registros/
GET /api/v1/producao/registros/<uuid>/
```

Qualidade:

```text
GET /api/v1/qualidade/registros/
GET /api/v1/qualidade/registros/<uuid>/
GET /api/v1/qualidade/detalhes/
GET /api/v1/qualidade/defeitos/
GET /api/v1/qualidade/defeitos/<uuid>/
```

Dashboard:

```text
GET /api/v1/relatorios/dashboard/
GET /api/v1/relatorios/dashboard/producao_diaria/
GET /api/v1/relatorios/dashboard/indicadores_qualidade/
GET /api/v1/relatorios/dashboard/<uuid>/indicadores/
```

Todos os endpoints desta sprint permanecem read-only. POST/PUT/PATCH/DELETE continuam fora do escopo.

---

## Contagens de paridade

Dados reais disponiveis no restore Supabase:

| Tabela Supabase | Registros |
|---|---:|
| turnos | 58 |
| turno_ops | 171 |
| turno_setores | 274 |
| turno_setor_demandas | 848 |
| turno_setor_operacoes | 5083 |
| registros_producao | 1323 |
| qualidade_registros | 68 |
| qualidade_detalhes | 19 |
| qualidade_defeitos | 8 |

Estado atual do banco Django operacional:

| Modelo Django | Registros |
|---|---:|
| turnos.Turno | 0 |
| producao.RegistroProducao | 0 |
| qualidade.QualidadeRegistro | 0 |

Conclusao:

- a API Django esta funcional;
- a comparacao completa de payloads ainda nao pode ser considerada paridade funcional com dados reais;
- a proxima etapa tecnica deve importar o snapshot real do restore para o banco Django local, com mapeamento explicito e rollback local.

---

## Divergencias operacionais mapeadas

| Dominio | Django | Supabase restore | Decisao para importacao |
|---|---|---|---|
| Turno | `data_hora_abertura` | `iniciado_em` | importar `iniciado_em` para `data_hora_abertura` |
| Turno | `data_hora_encerramento` | `encerrado_em` | importar `encerrado_em` para `data_hora_encerramento` |
| Turno | `operadores_disponiveis` | `operadores_disponiveis` ou equivalente historico | exigir mapeamento com fallback controlado somente se campo ausente |
| Turno | `meta_grupo` | ausente em parte do historico | recalcular apenas quando houver dados suficientes ou manter `NULL` |
| Producao | `turno` FK | `turno` varchar legado | resolver FK por contexto operacional moderno antes de importar |
| Producao | `turno_op` FK | derivado por contexto setorial | resolver via `turno_setor_operacao` quando disponivel |
| QualidadeRegistro | `revisor` FK | `revisor_usuario_id` | mapear para `accounts.User` por usuario restaurado |
| QualidadeRegistro | `hora_revisao` | `created_at` ou timestamp de revisao | preservar timestamp real de revisao quando existir; fallback documentado para `created_at` |
| QualidadeRegistro | sem `quantidade_revisada` | `quantidade_revisada` | nao importar como campo proprio; derivar de aprovadas + reprovadas quando necessario |
| QualidadeRegistro | sem `origem_lancamento` | `origem_lancamento` | preservar em observacao/metadado apenas se for necessario para auditoria futura |

---

## Criterios de aceite da MDJ-8

A MDJ-8 fica aceita porque:

- o backend Django sobe e responde healthcheck;
- os endpoints read-only de turnos, producao, qualidade e dashboard existem;
- as leituras nao expoem mutacoes;
- os dados reais do restore foram identificados e comparados em alto nivel;
- as divergencias que impedem importacao direta foram registradas;
- a continuacao foi encaminhada para `PLANO_IMPORTACAO_DADOS_REAIS.md`.

---

## Pendencia deliberada

Antes de abrir MDJ-9, executar uma etapa tecnica de importacao local real:

1. limpar ou recriar o banco Django local;
2. importar cadastros e produtos;
3. importar turnos e encadeamentos operacionais;
4. importar producao e qualidade;
5. comparar contagens e payloads contra o restore;
6. manter rollback local sem tocar no Supabase remoto.
