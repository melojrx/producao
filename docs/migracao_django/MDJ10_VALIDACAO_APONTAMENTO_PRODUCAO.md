# MDJ10_VALIDACAO_APONTAMENTO_PRODUCAO.md

> Validacao da primeira mutacao critica de producao no backend Django.

Data: `2026-06-06`

## Escopo

Mutacao validada:

- apontamento produtivo atomico por `TurnoSetorOperacao`
- endpoint isolado `POST /api/v1/producao/apontamentos/`

Fora do escopo:

- Supabase remoto
- frontend Next.js
- apontamento supervisor em lote
- revisao operacional de qualidade
- abertura, edicao ou fechamento de turno
- carry-over completo

## Cenario real usado

O banco Django local `pcp_db` continha dados reais importados na micro-etapa pre-MDJ-9.

Contexto encontrado:

| Campo | Valor |
|---|---|
| operador ativo | `066d4d31-17d0-497c-b6c1-d8392cdff4d5` |
| `turno_setor_operacao` | `36793932-1dae-4eca-8922-74381762d07f` |
| turno | `375b4808-7850-4536-a234-709a9a8c6982` |
| `turno_op` | `a1f75258-1bd0-44dc-8175-806075f6e933` |
| operacao | `dac9e954-d31c-4a5f-a4ae-12dd890e0a08` |
| saldo fisico antes | `350` |
| realizado antes na operacao do turno | `0` |
| registros de producao antes | `1321` |

## Procedimento

A validacao foi executada dentro de `transaction.atomic()` e encerrada com `transaction.set_rollback(True)`, para provar a escrita critica sem deixar residuo permanente no banco local.

Comando executado:

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py shell -c '<script de validacao transacional MDJ-10.5>'
```

Operacoes validadas:

- `POST /api/v1/producao/apontamentos/` com quantidade `1`
- incremento local de `TurnoSetorOperacao.quantidade_realizada`
- criacao local de `RegistroProducao`
- tentativa acima do saldo fisico real
- rollback transacional

Resultado antes do rollback:

```json
{
  "above_saldo_status": 400,
  "after_realizada_before_rollback": 1,
  "after_registros_before_rollback": 1322,
  "before_realizada": 0,
  "before_registros": 1321,
  "post_status": 201,
  "registro_id": "36f562a4-78b5-4333-8bf1-41739765a253",
  "saldo_antes": 350
}
```

## Rollback local

Confirmacao apos rollback:

```text
{'registros': 1321, 'tso_realizada': 0, 'registro_temp': 0}
```

## Conclusao

A primeira mutacao critica de producao foi validada com dados reais importados e rollback local:

- endpoint isolado criou apontamento atomico com HTTP `201`
- service consolidou progresso local dentro da transacao
- tentativa acima do saldo fisico real retornou HTTP `400`
- rollback removeu o registro temporario e restaurou o progresso da operacao
- Supabase remoto e frontend nao foram alterados
