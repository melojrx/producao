Módulo de qualidade

O sistema deve funcionar em fluxo contínuo de produção e qualidade paralela.

CONCEITO:
A produção não espera a OP terminar completamente para iniciar a qualidade.

Exemplo:
Uma OP possui 1000 peças.
Quando um setor concluir parcialmente 100 peças, essas peças já devem entrar automaticamente na fila de revisão da qualidade.

A produção continua enquanto a qualidade revisa os lotes produzidos.

OBJETIVO:
Criar rastreabilidade contínua da qualidade em tempo real sem travar o fluxo operacional da fábrica.

FLUXO:

1. Produção conclui parcialmente uma operação.
Exemplo:
- Frente concluiu 100 peças.

2. Sistema cria automaticamente um lote de revisão contendo:
- OP
- Operação
- Quantidade
- Horário
- Operadores envolvidos
- Setor origem

3. O setor qualidade possui uma fila contínua de revisão.

4. O revisor abre o lote e informa:
- Quantidade aprovada
- Quantidade reprovada

5. Caso existam peças reprovadas:
Abrir fluxo de defeitos.

6. Fluxo de defeitos:
- Selecionar operação
- Selecionar defeito pré-definido
- Informar quantidade afetada
- Adicionar observação opcional

DEFEITOS:
- Ponto falho
- Costura caindo
- Borda larga
- Altura de ponta
- Borda estourando
- Costura torta
- Faltando costura ou parte da peça
- Etiqueta trocada ou danificada

7. Cada defeito deve possuir classificação interna:
- Máquina
- Operador
- Processo
- Matéria-prima

8. Após salvar:
- Registrar histórico da revisão
- Finalizar revisão do lote
- Não criar fluxo interno de retrabalho
- Não travar produção
- Não criar dependência operacional

IMPORTANTE:
O sistema não deve controlar o retrabalho.

Na prática operacional:
- A peça reprovada retorna fisicamente ao operador
- Após correção, retorna novamente para qualidade
- O retorno deve entrar como novo lote de revisão
- Como se nunca tivesse sido revisado anteriormente

REQUISITOS IMPORTANTES:
- Fluxo contínuo em tempo real
- Aprovação parcial
- Reprovação parcial
- Controle por lotes
- Sistema extremamente rápido
- Sem bloqueios operacionais
- Sem workflows complexos
- Tablet e celular
- Registro por hora
- Histórico completo

INDICADORES FUTUROS:
- Taxa de aprovação
- Incidência de defeitos
- Ranking de defeitos
- Ranking de operadores
- Ranking de máquinas
- Eficiência por setor
- Histórico por OP
- Histórico por cliente/modelo

O sistema deve funcionar como uma plataforma industrial de qualidade preventiva em tempo real, priorizando simplicidade operacional, velocidade e rastreabilidade.