# MDJ9_VALIDACAO_MUTACAO_NAO_CRITICA.md

> Validacao da primeira mutacao Django nao critica.

Data: `2026-06-06`

## Escopo

Mutacao validada:

- cadastro de tipos de defeito (`qualidade_defeitos`)

Fora do escopo:

- Supabase remoto
- frontend Next.js
- apontamento produtivo
- abertura, edicao ou fechamento de turno
- saldo fisico
- carry-over
- revisao operacional de qualidade

## Cenario

O banco Django local `pcp_db` ja continha dados reais importados na micro-etapa pre-MDJ-9, registrada em `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`.

Baseline antes da validacao:

| Item | Contagem |
|---|---:|
| `qualidade_defeitos` | 9 |
| `qualidade_detalhes` | 19 |

Defeito real com historico usado para validar bloqueio destrutivo:

```text
a1840e82-6fa5-4b55-b661-e8cd52ee402a
```

## Procedimento

A validacao foi executada dentro de `transaction.atomic()` e encerrada com `transaction.set_rollback(True)`, para provar a escrita sem deixar residuo permanente no banco local.

Comando executado:

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell -c '<script de validacao transacional MDJ-9.4>'
```

Operacoes validadas:

- bloqueio de `excluir_defeito_qualidade_sem_historico` para defeito com historico
- `POST /api/v1/qualidade/defeitos/`
- `PATCH /api/v1/qualidade/defeitos/<id>/`
- `POST /api/v1/qualidade/defeitos/<id>/inativar/`
- `GET /api/v1/qualidade/defeitos/?ativo=false`
- `POST /api/v1/qualidade/defeitos/<id>/reativar/`
- `POST /api/v1/qualidade/registros/` permanecendo bloqueado

Resultado:

```json
{
  "after_defeitos_before_rollback": 10,
  "before_defeitos": 9,
  "before_detalhes": 19,
  "defeito_com_historico": "a1840e82-6fa5-4b55-b661-e8cd52ee402a",
  "exclusao_historico_bloqueada": true,
  "inativar_status": 200,
  "patch_defeito_status": 200,
  "post_defeito_status": 201,
  "post_registros_status": 405,
  "read_inativos_status": 200,
  "read_inativos_total": 2,
  "reativar_status": 200
}
```

## Rollback local

Confirmacao apos rollback:

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell -c 'from qualidade.models import QualidadeDefeito; print({"defeitos": QualidadeDefeito.objects.count(), "mdj9_temp": QualidadeDefeito.objects.filter(nome__icontains="MDJ9 Validacao Rollback").count()})'
```

Resultado:

```text
{'defeitos': 9, 'mdj9_temp': 0}
```

## Conclusao

A primeira mutacao Django nao critica foi validada com dados reais importados e rollback local:

- criação, edição, inativação e reativação do catálogo de defeitos funcionam via API Django
- defeito com histórico real não pode ser excluído destrutivamente
- leitura de defeitos inativos continua funcionando
- `qualidade/registros` permanece sem mutação
- nenhum dado temporário ficou persistido após rollback
- Supabase remoto e frontend não foram alterados
