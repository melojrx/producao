# Fluxo Continuo de Qualidade Design

## Objetivo

Implementar a Sprint 51 como evolucao aditiva da Qualidade: cada lote parcial produzido deve entrar automaticamente em uma fila continua de revisao, permitindo que a Qualidade acompanhe o chao de fabrica em tempo real sem travar a producao.

## Decisoes De Dominio

- `registros_producao` continua sendo a fonte de verdade da producao fisica.
- `qualidade_lotes` representa a fila operacional de revisao.
- `qualidade_registros` continua representando a revisao realizada.
- `qualidade_detalhes` continua representando defeitos atribuidos a operacoes produtivas de origem.
- Criar lote de qualidade nao altera producao, capacidade, FIFO, disponibilidade, saldo fisico, progresso operacional ou KPIs do turno.
- Revisar lote nao cria retrabalho interno.
- Peca reprovada retorna fisicamente ao operador; quando volta corrigida, entra como novo lote de revisao.
- O novo lote de retorno nao duplica producao fisica da OP.

## Modelo

`qualidade_lotes` nasce de apontamentos produtivos parciais. No primeiro contrato, cada `registro_producao` pode gerar no maximo um lote de qualidade.

Estados:
- `pendente`: criado e aguardando revisor.
- `em_revisao`: aberto por revisor.
- `revisado`: finalizado com aprovadas/reprovadas.
- `cancelado`: invalidado por ajuste administrativo excepcional.

`qualidade_defeitos` fornece catalogo estruturado para os defeitos usados em `qualidade_detalhes`.

Classificacoes:
- `maquina`
- `operador`
- `processo`
- `materia_prima`

## Fluxo

1. Operador ou supervisor registra producao em uma operacao.
2. A gravacao produtiva segue o fluxo atual e atualiza os consolidados atuais.
3. O sistema cria um lote pendente em `qualidade_lotes` com OP, produto, turno, setor origem, operacao origem, quantidade e registro produtivo de origem.
4. Revisor abre a fila de Qualidade.
5. Revisor informa aprovadas e reprovadas.
6. Se houver reprovadas, revisor seleciona defeitos do catalogo, informa operacao de origem, quantidade e observacao opcional.
7. Sistema cria `qualidade_registros`, `qualidade_detalhes` e marca o lote como `revisado`.

## Guardrails

- Nao bloquear producao por falta de revisao.
- Nao bloquear scanner/apontamentos por saldo visual, capacidade, FIFO ou disponibilidade.
- Nao criar lote duplicado para o mesmo `registro_producao`.
- Nao permitir revisar duas vezes o mesmo lote.
- Nao permitir que aprovadas + reprovadas seja diferente da quantidade do lote no primeiro contrato.
- Nao usar defeitos como rastreio unitario por peca.
- Nao somar indicadores de qualidade aos KPIs produtivos.

## Implementacao Em Fatias

1. Documentacao e contrato de dominio.
2. Schema aditivo e utilitarios puros.
3. Geracao automatica de lotes apos apontamento produtivo.
4. Fila de revisao e revisao de lote.
5. Indicadores de qualidade separados da producao.

## Validacao

- Testes puros para status e revisao de lote.
- `npx tsc --noEmit` apos alteracoes TypeScript.
- `git diff --check`.
- SQL remoto somente apos aprovacao explicita.
