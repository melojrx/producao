# MDJ11_VALIDACAO_REVISAO_QUALIDADE.md

> Validacao da mutacao critica de revisao operacional de Qualidade no backend Django.

Data: `2026-06-15`

## Escopo

Mutacao validada:

- revisao operacional de Qualidade por `TurnoSetorOperacao`
- endpoint isolado `POST /api/v1/qualidade/revisoes/`

Fora do escopo:

- Supabase remoto
- frontend Next.js
- scanner/Next.js
- auth/JWT
- abertura, edicao ou fechamento de turno
- carry-over completo
- storage e deploy

## Cenario real usado

O banco Django local `pcp_db` continha dados reais importados na micro-etapa pre-MDJ-9, registrada em `MDJ_PRE_MDJ9_IMPORTACAO_REAL.md`.

Baseline antes da validacao:

| Item | Contagem |
|---|---:|
| `qualidade_registros` | 68 |
| `qualidade_detalhes` | 19 |
| `qualidade_defeitos` ativos | 9 |
| revisores com `pode_revisar_qualidade` | 3 |

Contexto real usado:

| Campo | Valor |
|---|---|
| turno aberto | `375b4808-7850-4536-a234-709a9a8c6982` |
| `turno_setor_operacao` Qualidade | `53a0917a-7781-44a9-9abd-cfc46209150b` |
| operacao produtiva de origem | `c8d5cd97-3f7d-4394-bb78-bfba4aa1094b` |
| revisor | `65a08825-2472-4a6f-9e2f-06ad694a4160` |
| defeito ativo | `4059a5b8-a18b-458f-afd8-f5ec47e04b1b` |
| pendencia de aprovacao antes | `1305` |
| `quantidade_realizada` antes | `0` |

## Procedimento

A validacao principal foi executada dentro de `transaction.atomic()` e encerrada com `transaction.set_rollback(True)`, para provar a escrita critica sem deixar residuo permanente no banco local.

Comando executado:

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell -c '<script de validacao transacional MDJ-11.4>'
```

Operacoes validadas no service:

- `registrar_revisao_qualidade_operacional()` com `1` aprovada e `1` reprovada
- criacao local de `QualidadeRegistro` e `QualidadeDetalhe`
- incremento local de `TurnoSetorOperacao.quantidade_realizada` apenas pelas aprovadas
- tentativa acima da pendencia de aprovacao
- tentativa com reprovadas sem defeito
- rollback transacional

Resultado antes do rollback:

```json
{
  "registro_id": "6f9a1c39-5e2e-442f-b8c6-39ffdce9898d",
  "before_realizada": 0,
  "after_realizada_before_rollback": 1,
  "before_registros": 68,
  "after_registros_before_rollback": 69,
  "before_detalhes": 19,
  "after_detalhes_before_rollback": 20,
  "above_pendencia_status": 400,
  "no_defeito_status": 400
}
```

Validacao complementar de API:

- `POST /api/v1/qualidade/revisoes/` via HTTP interno do container retornou `201`
- tentativa acima da pendencia retornou `400`
- observacao: chamadas HTTP fora do `transaction.atomic()` do shell nao participam do rollback; qualquer residuo acidental foi removido manualmente antes da homologacao final

## Rollback local

Confirmacao apos rollback:

```text
{'registros': 68, 'detalhes': 19, 'realizada': 0}
```

## Conclusao

A mutacao critica de revisao operacional de Qualidade foi validada com dados reais importados e rollback local:

- service criou revisao com aprovadas/reprovadas e detalhes de defeito
- consolidacao consumiu apenas aprovadas na operacao de Qualidade
- bloqueio acima da pendencia de aprovacao retornou erro de dominio
- bloqueio de reprovadas sem defeito retornou erro de dominio
- rollback removeu o registro temporario e restaurou o progresso da operacao
- Supabase remoto e frontend nao foram alterados
