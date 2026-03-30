# Manual Operacional V2

## Objetivo

Este manual orienta a entrada controlada do fluxo V2 de produção no ambiente publicado.
Ele cobre:

- ativação do scanner V2 por feature flag
- uso operacional da dashboard
- captura incremental pelo supervisor
- uso do scanner em chão
- rollback seguro

## Cutover do Scanner

O scanner V2 fica protegido pela variável pública:

```bash
NEXT_PUBLIC_SCANNER_V2_ENABLED=true
```

Regras:

- `true`, `1` ou `on`: libera a rota `/scanner`
- `false`, `0` ou `off`: bloqueia a rota `/scanner`
- sem valor explícito:
  - em desenvolvimento, o scanner fica liberado
  - em produção, o scanner fica bloqueado até ativação explícita

## Sequência Operacional do Turno

1. O supervisor abre ou revisa o turno em `/admin/dashboard`.
2. O supervisor acompanha seções, OPs e saldo em tempo real.
3. O supervisor registra incrementos administrativos em `/admin/apontamentos` sempre que necessário.
4. Se o scanner V2 estiver ativo, o operador abre `/scanner`, escaneia o QR do operador e depois o QR operacional `setor-op`.
5. O operador informa a quantidade executada e confirma o lançamento.
6. A dashboard e os relatórios devem refletir o avanço sem supercontagem.

## Uso do Supervisor

Na tela `/admin/apontamentos`:

- o turno aberto é o contexto fixo
- filtre por OP, setor ou produto quando necessário
- selecione a seção correta
- registre múltiplas linhas `operador + operação + quantidade`
- confirme o envio em lote

Resultado esperado:

- operação atualizada imediatamente
- seção recalculada por consolidado correto
- OP recalculada
- dashboard atualizada
- relatórios atualizados

## Uso do Scanner

Com a flag ativa, o fluxo esperado em `/scanner` é:

1. escanear o QR do operador
2. escanear o QR operacional da seção
3. revisar o contexto carregado
4. informar a quantidade
5. registrar

Se a flag estiver desligada, a rota mostra a mensagem de bloqueio operacional e redireciona o uso para:

- `/admin/apontamentos`
- `/admin/dashboard`

## Checklist de Homologação

Antes de liberar produção real em um ambiente publicado:

- confirmar `NEXT_PUBLIC_SCANNER_V2_ENABLED=true`
- validar abertura do scanner no celular
- validar leitura do QR do operador
- validar leitura do QR `setor-op`
- validar lançamento bem-sucedido
- validar reflexo na dashboard em tempo real
- validar reflexo em `/admin/relatorios`
- validar fallback com a flag desligada

## Rollback Seguro

Se houver regressão no scanner:

1. definir `NEXT_PUBLIC_SCANNER_V2_ENABLED=false`
2. publicar novamente a aplicação
3. manter o lançamento operacional em `/admin/apontamentos`
4. acompanhar o turno pela dashboard e relatórios

Esse rollback não exige remoção do modelo V2 nem reversão do schema.
