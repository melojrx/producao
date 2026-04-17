# PRD.md — Product Requirements Document

> Documento estável de produto. Define o quê e o porquê.
> Não contém código — contém comportamento, fluxos e regras de negócio.

---

## 1. PROBLEMA

Donos de confecção não conseguem medir em tempo real a produtividade da sua linha de produção. As metas existem (tempo padrão por operação, meta/hora por máquina), mas a comparação com o realizado só acontece manualmente no final do dia — quando já é tarde para corrigir gargalos, realocar operadores ou identificar máquinas paradas.

**Consequências diretas:**
- Gargalos invisíveis até o fim do turno
- Operadores abaixo da meta sem intervenção imediata
- Máquinas paradas sem alerta para o supervisor
- Decisões baseadas em estimativa, não em dados

---

## 2. SOLUÇÃO

Sistema web de coleta e monitoramento de produção via QR Code que transforma dados em tempo real em ação imediata para o supervisor.

**Princípio central:** simplicidade extrema para o operador, riqueza de informação para o supervisor.

---

## 3. USUÁRIOS

| Perfil | Dispositivo | Responsabilidade |
|---|---|---|
| **Operador** | Celular (câmera) | Registrar peças produzidas após cada lote |
| **Supervisor** | TV na parede ou tablet | Monitorar dashboard, configurar turno e atuar nos gargalos |
| **Administrador** | Desktop | Cadastros, configurações e relatórios |

---

## 4. MODELO OPERACIONAL — OBJETOS FÍSICOS E CONTEXTO DE CHÃO

O sistema passa a girar em torno de dois QRs operacionais e um cadastro estrutural forte. O operador não precisa interpretar roteiro, OP ou sequência de produção: o sistema deriva isso a partir do produto planejado no turno.

### 4.1 Crachá do Operador

- **O que é:** cartão plastificado com QR Code e identificação do operador
- **Onde fica:** com o operador durante todo o expediente
- **Quando é usado:** para abrir ou trocar a sessão de scanner
- **Quem controla:** o próprio operador
- **Quantidade:** 1 por operador
- **Reimpressão:** quando houver perda, troca de cadastro ou desligamento
- **Conteúdo impresso:** matrícula, nome, função, QR Code

### 4.2 QR Operacional do Setor

- **O que é:** QR temporário gerado no momento da abertura do turno para um contexto específico de `turno + setor`
- **Onde fica:** impresso pelo supervisor e deixado no setor correspondente
- **Quando é usado:** durante aquele turno, para abrir a seção operacional do setor
- **Quem controla:** o supervisor
- **Quantidade:** 1 por combinação `turno + setor`
- **Reimpressão:** quando o turno for recriado, um novo setor entrar no turno ou o QR físico se perder
- **Conteúdo lógico:** identifica o setor e o turno atual; a OP/produto é escolhida depois que o setor já foi aberto no scanner

### 4.2.1 Decisão complementar de modelagem

Esta é uma regra de negócio obrigatória para a V2:

- a estrutura física reaproveitável da fábrica é o **setor**, não a combinação `setor + OP`
- ao incluir uma nova OP em um turno já aberto, o sistema deve reaproveitar os setores que já participam daquele turno
- a nova OP **não** pode duplicar visualmente setores, operações e QRs que já existem no turno
- um novo QR operacional só deve nascer quando a nova OP exigir um setor que ainda não participa do turno atual
- quando mais de uma OP compartilhar o mesmo setor no mesmo turno, a dashboard deve mostrar um único contexto daquele setor, preservando o detalhamento interno por OP/produto
- no scanner, após abrir o setor e identificar o operador, o supervisor deve escolher também qual OP/produto está apontando dentro daquele setor

### 4.3 Etiqueta da Máquina

- **O que é:** etiqueta patrimonial permanente da máquina
- **Onde fica:** colada na máquina
- **Quando é usada:** para rastreabilidade, apoio de auditoria e futuras evoluções
- **Quem controla:** a empresa
- **Quantidade:** 1 por máquina
- **Observação:** a máquina continua importante no domínio, mas deixa de ser obrigatória no apontamento operacional da V2

### 4.3.1 Decisão complementar de domínio — simplificação de máquinas

Esta é uma decisão explícita de domínio para a continuidade da V2:

- `maquinas` deixa de ser uma entidade operacional do fluxo diário
- a derivação operacional do turno passa a depender de `produto -> operação -> setor`, sem usar máquina
- o scanner V2 não lê máquina e a dashboard V2 não depende de máquina para abrir, consolidar ou encerrar setores
- por isso, `tipo_maquina` e a vinculação direta da máquina a `setor` deixam de fazer parte do contrato alvo da entidade `maquinas`
- a máquina passa a existir como cadastro patrimonial e de auditoria, preservando identificação física e QR patrimonial
- `operacoes` continuam podendo carregar a semântica técnica necessária para produção; a simplificação vale apenas para o domínio de `maquinas`

Consequência esperada:

- a futura refatoração de código e schema deve remover `tipo_maquina` e a vinculação com `setor` da tabela `maquinas`
- o cadastro de máquinas deve permanecer enxuto, sem influenciar planejamento, scanner, dashboard ou derivação setorial do turno

---

## 5. FLUXO OPERACIONAL DO DIA

### 5.1 Pré-condição — cadastro estrutural pronto

Antes de abrir um turno, o sistema precisa ter:
- operações cadastradas com `tempo padrão`, `situação` e `setor`
- produtos cadastrados com roteiro completo
- setores cadastrados
- operadores cadastrados
- máquinas cadastradas apenas para patrimônio e rastreabilidade, sem participação na derivação operacional do turno

O ponto central é este:
- um **produto** possui várias **operações**
- cada **operação** pertence a um **setor**
- então o roteiro do produto informa automaticamente **quais setores precisam atuar**

### 5.2 Abertura do turno

```
Supervisor chega → abre a dashboard → vê os dados do turno anterior ou do turno ainda aberto

[Passo 1] Clica em "Novo Turno"

[Passo 2] Informa o cabeçalho do turno
          → data/hora (automática)
          → operadores disponíveis no dia
          → minutos do turno

[Passo 3] Adiciona uma ou mais OPs ao turno
          → número da OP
          → produto
          → quantidade planejada de peças

[Passo 4] Sistema expande automaticamente cada OP
          → lê o roteiro do produto
          → identifica os setores envolvidos
          → identifica as operações previstas em cada setor
          → ativa ou reaproveita os setores do turno
          → deriva as operações planejadas dentro de cada setor
          → gera um QR temporário apenas para cada setor participante do turno
          → calcula uma prévia da quantidade sugerida de pessoas por setor
```

Resultado:
- o planejamento do dia nasce do cadastro mestre do produto
- o supervisor informa apenas a demanda do dia
- o sistema deriva automaticamente a estrutura operacional necessária sem duplicar setores já ativos no turno
- o sistema pode sugerir o dimensionamento de pessoas por setor antes da confirmação do turno
- nesta primeira etapa, o dimensionamento por setor é apenas uma prévia operacional e não altera a gravação do turno
- após salvar um novo turno, a navegação deve levar o supervisor para o relatório operacional de QR Codes do turno recém-aberto, onde ele escolhe como imprimir os QRs antes de voltar ao monitoramento da dashboard

### 5.2.1 Prévia de pessoas por setor

Durante a abertura do turno, o sistema deve calcular uma sugestão de quantidade de pessoas por setor para apoiar a distribuição da equipe disponível no dia.

Objetivos:
- transformar a carga pendente real das OPs em leitura operacional por setor
- indicar quantas pessoas seriam necessárias em cada setor para cumprir o planejado do turno respeitando o estágio real de cada OP
- sinalizar taxativamente quando a demanda que está entrando no turno estiver desconforme com a capacidade produtiva disponível
- apoiar a tomada de decisão do supervisor sem bloquear a abertura do turno nesta primeira versão

Entradas obrigatórias:
- `operadoresDisponiveis` informados no cabeçalho do turno
- `minutosTurno` informados no cabeçalho do turno
- lista de `turno_ops` planejadas com `quantidadePlanejada`
- roteiro do produto com operações válidas e setor vinculado
- `tempoPadraoMin` de cada operação
- estado real de continuidade de cada OP reaproveitada no carry-over
- setores já concluídos, setor atual em andamento e saldo efetivamente pendente por setor da OP

Base de cálculo:

```text
tp_total_setor_produto = SUM(tempoPadraoMin das operações do produto naquele setor)

capacidade_min_setor = operadores_alocados_setor × minutosTurno

carga_pendente_real_setor_min =
  SUM(quantidade_pendente_real_no_setor_da_OP × tp_total_setor_produto)

eficiencia_requerida_setor =
  (carga_pendente_real_setor_min / capacidade_min_setor) × 100
```

Quando o setor estiver processando uma única OP/produto, a leitura em peças pode ser exibida assim:

```text
capacidade_pecas_setor = FLOOR(capacidade_min_setor / tp_total_setor_produto)
```

Exemplo:

```text
tp_total_setor_produto = 5 min
operadores_alocados_setor = 7
minutos_turno = 510 min

capacidade_min_setor = 7 × 510
                     = 3570 min

capacidade_pecas_setor = FLOOR(3570 / 5)
                       = 714 peças
```

Regras obrigatórias:
- o cálculo deve usar o `minutosTurno` efetivamente informado na abertura do turno, e não um valor fixo hardcoded
- quando houver múltiplas OPs no mesmo turno, o cálculo do setor deve somar apenas a carga pendente real das OPs que ainda precisam passar por aquele setor
- OPs reaproveitadas por carry-over não podem voltar a consumir carga em setores já concluídos
- se uma OP já concluiu `Preparação` e `Frente`, sua carga pendente do novo turno deve começar em `Costa`, ou no setor efetivamente pendente mais avançado
- se houver produção parcial em um setor, a prévia deve considerar apenas o saldo realmente pendente naquele setor e a continuidade liberada para os setores seguintes
- o arredondamento deve ser sempre para cima com `CEIL`, porque fração de pessoa representa necessidade adicional de capacidade
- o cálculo deve ser exibido como sugestão operacional e não como restrição rígida nesta primeira etapa
- a soma das pessoas sugeridas por setor pode ultrapassar `operadoresDisponiveis`; quando isso acontecer, a UI deve sinalizar déficit de capacidade sem impedir a abertura do turno
- quando `eficiencia_requerida_setor > 100%`, ou quando a carga pendente exigir mais minutos do que a capacidade disponível do setor, a UI deve exibir um alerta taxativo de desconformidade entre demanda e capacidade
- a leitura de desconformidade deve existir tanto no nível do setor quanto no resumo geral do turno em abertura
- a persistência do dimensionamento por setor no banco fica fora do escopo inicial
- nesta primeira etapa, a abertura e gravação do turno continuam exatamente com o contrato atual

Evolução obrigatória homologada após a Sprint 29:

- a capacidade setorial deixa de ser apenas alerta visual e passa a limitar a quantidade que cada setor pode aceitar no turno
- uma OP nova não pode mais injetar automaticamente sua quantidade total em todos os setores futuros do mesmo turno
- para o setor inicial do roteiro, o sistema pode aceitar no turno no máximo o que couber na capacidade daquele setor para o dia
- para setores seguintes, o sistema pode aceitar no turno no máximo a menor quantidade entre:
  - saldo pendente real já existente naquele setor
  - quantidade realmente concluída no setor anterior e transferível
  - capacidade disponível daquele setor no turno
- o excedente que não couber na capacidade do setor não desaparece, não é perdido e não pode ser tratado como liberado; ele permanece como backlog setorial para turnos futuros
- se um setor aceitar uma quantidade no turno, mas não concluir tudo, o saldo aceito e não concluído também compõe o backlog setorial do próximo turno
- o carry-over passa a ser obrigatoriamente setorial e parcelado, nunca apenas um saldo genérico da OP

Fórmulas obrigatórias da evolução:

```text
backlog_setor_turno =
  saldo_nao_aceito_do_setor +
  saldo_aceito_e_nao_concluido_do_setor

capacidade_pecas_setor =
  FLOOR((operadores_alocados_setor × minutosTurno) / tp_total_setor_produto)

quantidade_aceita_turno_setor =
  MIN(backlog_setor_turno, capacidade_pecas_setor)

saldo_nao_aceito_turno_setor =
  backlog_setor_turno - quantidade_aceita_turno_setor

saldo_carry_over_setor_proximo_turno =
  saldo_nao_aceito_turno_setor +
  (quantidade_aceita_turno_setor - quantidade_concluida_turno_setor)
```

Exemplo obrigatório:

```text
demanda original da OP = 1000 peças
capacidade do setor no turno = 501 peças
quantidade aceita no turno = 501 peças
quantidade concluída no turno = 401 peças

saldo carry-over do setor no próximo turno =
  (1000 - 501) + (501 - 401)
  499 + 100
  599 peças
```

### 5.2.2 Edição do turno aberto

Durante a execução do dia, o supervisor ou admin pode precisar incluir uma nova OP sem encerrar o turno atual.

Fluxo alvo:
- supervisor abre a dashboard do turno ainda `aberto`
- acessa a ação `Editar turno`
- adiciona uma nova OP com:
  - número da OP
  - produto
  - quantidade planejada
- sistema valida a nova demanda e deriva imediatamente:
  - a nova linha em `turno_ops`
  - as operações adicionais dentro dos setores já ativos do turno
  - os novos setores e QRs operacionais apenas quando o produto exigir um setor ainda ausente no turno
  - a nova disponibilidade da OP no scanner e nos apontamentos do setor reutilizado
- dashboard, scanner, apontamentos e relatórios passam a enxergar a nova OP sem exigir fechamento do turno

Objetivo:
- permitir ajuste operacional realista durante o turno
- evitar fechamento artificial do turno apenas para incluir nova demanda
- preservar a continuidade do monitoramento em tempo real

Restrições obrigatórias:
- apenas turnos com status `aberto` podem receber novas OPs
- o `numero_op` deve continuar único dentro do turno
- o produto da nova OP precisa estar ativo e com roteiro/setores válidos
- a inclusão de nova OP não pode alterar nem apagar produção já registrada de outras OPs do turno
- a edição de uma OP já existente só pode alterar `produto` ou `quantidade_planejada` se ainda não houver produção apontada naquela OP
- se a OP já tiver produção, ela pode no máximo receber ajustes administrativos não estruturais, nunca regeração destrutiva da cadeia derivada
- a inclusão de uma nova OP no turno aberto não pode mais liberar sua quantidade integral em todos os setores do roteiro no mesmo dia
- o primeiro setor elegível da nova OP deve respeitar a capacidade daquele turno
- setores seguintes só podem receber quantidade efetivamente transferida do setor anterior, também respeitando sua própria capacidade diária
- qualquer excedente acima da capacidade do setor deve permanecer como backlog setorial parcelado para turnos seguintes

Impacto esperado:
- o turno continua o mesmo
- o planejamento total do turno aumenta
- setores já ativos são reaproveitados e recebem demanda adicional sem duplicação visual
- novos QRs só precisam ficar disponíveis quando houver entrada de um setor novo no turno
- scanner e `/admin/apontamentos` passam a aceitar lançamentos para a nova OP assim que ela for salva

### 5.2.3 Relatório operacional de QR Codes

Como a dashboard ficará exposta continuamente em uma TV no chão de fábrica, os QRs operacionais não devem permanecer visíveis nela.

Fluxo alvo:
- supervisor cria um novo turno
- sistema deriva os setores ativos e gera os QRs temporários do turno
- ao concluir a abertura, o sistema redireciona o supervisor para `/admin/qrcodes`
- nessa página, o supervisor escolhe o layout de impressão dos QRs
- depois da impressão, o supervisor retorna para `/admin/dashboard`

Regras obrigatórias:
- a dashboard V2 não deve exibir cards de QR operacional
- a página `/admin/qrcodes` é a fonte operacional para visualização e impressão dos QRs do turno
- a impressão deve permitir presets objetivos como `1`, `2`, `4`, `6`, `8` ou `12` QRs por página
- o QR continua pertencendo ao contexto `turno + setor`; a mudança é apenas de superfície de visualização/impressão
- a geração do QR não muda de contrato nem de token por causa da impressão
- o supervisor deve poder reabrir o relatório de QRs depois, sem precisar recriar o turno
- a página de impressão deve priorizar legibilidade do QR e identificação clara do setor

### 5.3 Execução no chão de fábrica

```
Supervisor ou operador abre o scanner no celular

[Passo 1] Escaneia o QR operacional do setor
          → sistema identifica:
            - turno
            - setor
            - OPs/produtos planejados naquele setor
            - operações previstas naquele setor
            - saldo planejado por OP dentro do setor

[Passo 2] Escaneia o QR do operador
          → sistema identifica o executor do apontamento produtivo

[Passo 3] Scanner lista as OPs/produtos ativos naquele setor
          → supervisor escolhe qual OP/produto será apontado
          → sistema lista as operações planejadas daquela OP dentro do setor
          → supervisor escolhe qual operação será apontada
          → sistema mostra realizado e saldo da operação

[Passo 4] Supervisor informa a quantidade incremental
          → quantidade concluída pelo operador naquela operação
          → lançamento sempre incremental, nunca total acumulado

[Passo 5] Sistema registra o apontamento atômico
          → cada lançamento identifica:
            - operador executor
            - OP/produto selecionado dentro do setor
            - operação executada
            - setor do turno
            - quantidade incremental
            - autoria do lançamento (`supervisor_manual` ou `operador_qr`)

[Passo 6] Sistema confronta o apontamento com o planejamento
          → atualiza o realizado da operação dentro da seção
          → recalcula o realizado consolidado da seção
          → recalcula o andamento da OP
          → recalcula o andamento do turno em tempo real
          → bloqueia qualquer lançamento que ultrapasse a quantidade planejada
```

Regra operacional:
- a quantidade registrada no scanner é atribuída ao `operador_id` do QR escaneado
- se o scanner estiver em sessão autenticada de supervisor, o sistema também deve auditar `usuario_sistema_id`
- o executor da produção e o usuário que lançou o dado não são o mesmo conceito

Saídas após cada registro:
- nova quantidade na mesma operação
- trocar operação mantendo a mesma seção e o mesmo operador
- trocar operador mantendo a mesma seção
- reiniciar tudo para abrir outra seção

### 5.4 Encerramentos

Encerramento do setor:
- automático quando todas as demandas planejadas daquele setor no turno estiverem concluídas
- pode ser ajustado manualmente pelo supervisor/admin

Encerramento da OP:
- automático quando todos os setores obrigatórios da OP forem concluídos
- pode ser ajustado manualmente pelo supervisor/admin

Encerramento do turno:
- manual pelo supervisor/admin
- automático na abertura de um novo turno posterior, se o turno anterior ainda estiver aberto

### 5.5 Comportamento da dashboard

Ao abrir a dashboard, o supervisor deve ver:
- a aba gerencial `Visão Geral` do mês corrente, independente de existir turno ativo
- o turno aberto atual, se existir
- ou os dados consolidados do último turno encerrado

Organização obrigatória das abas:
- `Visão Geral` passa a ser a superfície gerencial de meta mensal global da fábrica
- `Visão Operacional` passa a concentrar o conteúdo que hoje representa o monitoramento do turno, das OPs, dos setores e da projeção por hora
- `Operadores` passa a concentrar a leitura de eficiência por hora por operador/operação e a eficiência do dia por operador
- a aba `Visão Geral` não pode depender da existência de turno aberto para carregar
- a aba `Visão Operacional` continua dependente do turno aberto atual ou do último turno encerrado, preservando o comportamento operacional já homologado
- a aba `Operadores` continua dependente do turno aberto atual ou do último turno encerrado, preservando o comportamento operacional já homologado

Durante a execução, a dashboard acompanha em tempo real:
- andamento do turno
- andamento por OP
- andamento por setor
- andamento por operação dentro da seção quando necessário
- progresso operacional ponderado por T.P. e quantidade concluída, sem misturar as duas métricas no mesmo KPI
- eficiência por hora por operador/operação e eficiência do dia por operador, em blocos próprios e sem misturar esses indicadores com o progresso operacional da OP
- pendências e seções encerradas
- setores apresentados na ordem estrutural do fluxo, usando `setor.codigo` crescente como referência visual principal
- sem exibir os QRs operacionais como cards permanentes, já que a dashboard é uma superfície pública de monitoramento contínuo na TV

Kanban operacional obrigatório na `Visão Operacional`:
- a dashboard deve exibir um componente em estilo kanban com uma coluna por setor, seguindo a ordem oficial do fluxo fabril
- as colunas devem respeitar a sequência obrigatória `Preparação -> Frente -> Costa -> Montagem -> Final`
- cada card deve representar a OP ou o lote exatamente no setor em que ele se encontra naquele momento
- uma mesma OP não pode aparecer simultaneamente em duas colunas, exceto quando houver fracionamento real por quantidade; nesse caso, cada lote deve aparecer como card independente
- o card deve deixar claro se a OP/lote está `em fila`, `liberada`, `em produção`, `parcial` ou `concluída no setor`
- a coluna do setor deve exibir posição FIFO, capacidade consumida, capacidade restante em minutos e alerta visual de gargalo
- toda atualização do kanban deve ser em tempo real, sem refresh manual

Com edição de turno aberto, a dashboard também precisa:
- permitir incluir novas OPs sem perder o contexto do turno atual
- recalcular imediatamente os agregados do turno após cada inclusão
- destacar visualmente as OPs recém-adicionadas até a primeira produção
- expor novos QRs apenas para setores novos; setores já existentes devem ser reaproveitados

---

## 6. PLANEJAMENTO E MÉTRICAS

### 6.1 Cadeia de derivação do planejamento

O planejamento diário segue esta ordem lógica:

1. **Operações** definem o trabalho atômico
2. **Setores** agrupam as operações
3. **Produtos** agrupam operações em um roteiro
4. **Turno** define a capacidade do dia
5. **OPs do turno** definem a demanda do dia
6. **Setores ativos do turno** definem a estrutura operacional visível do chão
7. **OPs dentro de cada setor** definem a demanda planejada que será escolhida no scanner e nos apontamentos

### 6.2 O que o sistema deriva automaticamente

Ao informar `OP + produto + quantidade planejada`, o sistema precisa derivar:
- quais setores participam da confecção do produto
- quais operações serão executadas em cada setor
- quais setores já ativos do turno devem ser reaproveitados
- quais novos setores precisam ser abertos no turno
- quais QRs operacionais realmente precisam ser gerados

### 6.3 Tempos padrão

| Tipo | O que é | Onde vive |
|---|---|---|
| **T.P Operação** | Tempo padrão da operação em minutos | `operacoes.tempo_padrao_min` |
| **T.P Produto** | Soma dos tempos padrão das operações do roteiro | `produtos.tp_produto_min` |

Fórmula:

```text
T.P Produto = soma(tempo_padrao_min das operações do roteiro)
```

### 6.4 Quantidades planejadas

Regras:
- a quantidade planejada da **OP** é informada pelo supervisor
- cada setor recebe a demanda das OPs que passam por ele, preservando o detalhamento por OP/produto
- a quantidade planejada das operações derivadas dentro do setor continua vinculada à OP/produto selecionado
- o sistema acompanha o realizado por operação, por setor e por OP
- um lançamento nunca pode fazer o realizado da operação ultrapassar o planejado

### 6.5 Semântica do apontamento

A unidade lançada na V2 não representa produto acabado e também não pode ser a soma cega das operações do setor.

Ela passa a significar:

- **registro de produção**: quantas unidades um operador concluiu em uma operação específica de uma OP/produto dentro do setor
- **realizado da operação da seção**: soma dos lançamentos daquela operação dentro da OP/produto escolhida
- **setor do turno**: estrutura física reaproveitada, que pode concentrar mais de uma OP/produto ao mesmo tempo
- **quantidade concluída da OP**: menor realizado entre os setores obrigatórios da OP, usado para medir peças completas
- **progresso operacional da OP**: avanço contínuo do trabalho executado para entregar a OP, calculado a partir das operações e ponderado pelo `tempo_padrao_min`
- **quantidade concluída do turno**: soma das quantidades concluídas das OPs do turno
- **progresso operacional do turno**: composição do progresso operacional das OPs ativas do turno

Exemplo:

- Preparação / OP-123
- Operação A = `20`
- Operação B = `15`

Então:

- realizado da operação A = `20`
- realizado da operação B = `15`
- realizado da seção Preparação = `15`
- não `35`

Essa regra evita supercontagem e preserva a leitura correta do funil produtivo.

### 6.6 Capacidade e progresso

Indicadores base:

```text
Capacidade nominal do turno = operadores_disponiveis × minutos_turno

Meta do Grupo V2 = floor((operadores_disponiveis × minutos_turno) / media_tp_produto_turno)

Carga pendente real do setor no turno = SUM(quantidade_pendente_real_no_setor_da_OP × tp_total_setor_produto)

Pessoas necessárias no setor = ceil(carga_pendente_real_setor_min / minutos_turno)

Capacidade do setor em minutos (capacidade_min_setor) = operadores_alocados_setor × minutos_turno

Carga pendente real do setor = SUM(quantidade_pendente_real_no_setor_da_OP × tp_total_setor_produto)

Eficiência requerida do setor = (carga_pendente_real_setor_min / capacidade_min_setor) × 100

Progresso da operação da seção = quantidade_realizada_turno_setor_operacao / quantidade_planejada

Realizado da seção = MIN(quantidade_realizada_turno_setor_operacao obrigatória)

Realizado da OP = MIN(quantidade_realizada_turno_setor_op obrigatória)

Realizado do turno = SUM(quantidade_realizada_turno_op)
```

Regra obrigatória da Meta do Grupo V2:
- a KPI gerencial da dashboard V2 não deve somar metas por OP, produto, bloco ou setor
- para um turno com múltiplas `turno_ops`, o sistema deve calcular a média simples do `tp_produto_min` dos produtos planejados naquele turno
- a média deve considerar uma entrada por `turno_op`, usando o `tp_produto_min` do produto vinculado a cada OP planejada
- a `Meta do Grupo` do turno deve ser calculada assim:

```text
media_tp_produto_turno = AVG(tp_produto_min dos produtos vinculados às turno_ops do turno)

meta_grupo_turno = floor((operadores_disponiveis × minutos_turno) / media_tp_produto_turno)
```

Restrições:
- a regra acima vale especificamente para a KPI consolidada da dashboard V2
- a Meta do Grupo V2 não pode ser derivada pela soma das metas de cada produto
- a Meta do Grupo V2 não pode ser derivada pela soma das metas de blocos legados
- a Meta do Grupo V2 deve permanecer coerente quando o turno tiver uma ou várias OPs/produtos planejados

Regra obrigatória da prévia de pessoas por setor:
- a prévia de pessoas por setor pertence ao fluxo de abertura do turno, não à KPI gerencial consolidada da dashboard
- a prévia deve ser calculada por setor a partir da carga pendente real das OPs selecionadas
- a prévia deve somar a carga de múltiplas OPs quando elas compartilharem o mesmo setor e ainda dependerem dele no fluxo sequencial
- a prévia não pode tratar uma OP de carry-over como se ela reiniciasse em todos os setores
- setores já finalizados da OP devem contribuir com carga zero na prévia do novo turno
- a prévia deve exibir desconformidade taxativa quando a carga pendente do setor exigir mais minutos do que a capacidade disponível
- a prévia deve usar `ceil` para o arredondamento final por setor
- a prévia não substitui a `Meta do Grupo V2`
- a prévia não deve alterar o payload salvo do turno nesta primeira etapa

Regra obrigatória da capacidade setorial operacional:
- a leitura de capacidade do setor na dashboard operacional deve distinguir claramente:
  - backlog total do setor
  - quantidade aceita no turno
  - quantidade concluída no turno
  - saldo excedente para turnos futuros
- o sistema não pode usar a capacidade setorial apenas como alerta enquanto continuar liberando ao setor mais peças do que ele consegue aceitar no turno
- quando houver diferença entre backlog total e quantidade aceita no turno, o setor deve sinalizar parcelamento obrigatório da produção
- setor inicial do roteiro pode nascer com backlog total da OP, mas só com a quantidade aceita do turno liberada para processamento
- setores seguintes não podem nascer com a quantidade total da OP se ainda não receberam transferência real do setor anterior

Gráfico obrigatório da Meta do Grupo V2:
- a dashboard V2 deve exibir um gráfico de `Projeção do planejado x Alcançado por hora`
- a curva de projeção deve partir da `meta_grupo_turno` calculada para o turno aberto
- a curva de alcançado deve usar os apontamentos consolidados do turno ao longo das horas
- o objetivo do gráfico é mostrar se o turno está acima, dentro ou abaixo da projeção horária da meta coletiva

Indicadores obrigatórios de eficiência do operador:

- a dashboard V2 deve expor o KPI `Eficiência por hora` por `hora + operador + operação`
- a dashboard V2 deve expor o KPI `Eficiência do dia` agregado por operador no escopo do turno exibido
- esses KPIs medem conversão de tempo padrão produzido em relação ao tempo disponível
- esses KPIs pertencem ao domínio de produtividade do operador e não podem ser misturados com o progresso operacional da OP
- o cálculo deve usar `tempo_padrao_min_snapshot` da operação no turno, nunca o `tempo_padrao_min` atual da operação fora do snapshot
- o cálculo deve usar `minutos_turno` do turno consultado, nunca um valor fixo como `510` em produção

Contrato do KPI `Eficiência por hora`:

- granularidade: uma linha por `hora + operador + operação`
- colunas mínimas da consulta/tabela: `Hora | Operador | Operação | T.P. | Meta/hora | Realizado | Efic%`
- `Hora` deve ser agrupada por `DATE_TRUNC('hour', hora_registro)` no timezone operacional do turno
- `T.P.` deve refletir `tempo_padrao_min_snapshot`
- `Meta/hora` é uma referência visual operacional e deve ser exibida como `floor(60 / tempo_padrao_min_snapshot)`
- `Realizado` é a soma das quantidades lançadas naquele bucket de `hora + operador + operação`
- `Efic%` deve ser calculada por minutos padrão produzidos na hora, não por arredondamento de meta visual

Fórmulas do KPI `Eficiência por hora`:

```text
meta_hora_visual = floor(60 / tempo_padrao_min_snapshot)

minutos_padrao_realizados_hora =
  SUM(quantidade_lancada * tempo_padrao_min_snapshot) no bucket de hora + operador + operação

eficiencia_hora_pct =
  (minutos_padrao_realizados_hora / 60) * 100
```

Regra obrigatória quando o operador trocar de operação dentro da mesma hora:

- o sistema não deve tentar escolher uma única operação dominante da hora
- a mesma hora pode gerar múltiplas linhas para o mesmo operador, uma para cada operação trabalhada
- cada linha continua usando `60` minutos como denominador da eficiência horária daquela operação
- a eficiência horária agregada do operador naquela hora é a soma das `eficiencia_hora_pct` das linhas daquela mesma `hora + operador`
- não deve existir rateio manual de minutos por operação; o consumo de tempo é inferido pelos `minutos padrão realizados`
- se o operador não produzir nada em uma operação dentro daquela hora, não deve existir linha artificial com `0`

Contrato do KPI `Eficiência do dia`:

- granularidade: uma linha por `data + operador` no escopo do turno exibido na dashboard
- colunas mínimas do resumo: `Data | Operador | Efic%`
- no contexto da dashboard V2, `Data` representa o turno carregado e o denominador é `turno.minutos_turno`
- em consultas históricas que cruzem mais de um turno no mesmo dia, o denominador deve ser a soma dos `minutos_turno` dos turnos efetivamente considerados
- o KPI diário deve ser matematicamente compatível com a soma das eficiências horárias

Fórmulas do KPI `Eficiência do dia`:

```text
minutos_padrao_realizados_dia =
  SUM(quantidade_lancada * tempo_padrao_min_snapshot) no escopo do operador e do turno

eficiencia_dia_pct =
  (minutos_padrao_realizados_dia / minutos_turno) * 100

equivalencia_operacional:
eficiencia_dia_pct =
  SUM(eficiencia_hora_pct das linhas do operador) / (minutos_turno / 60)
```

Regras obrigatórias de apresentação:

- `Eficiência por hora` e `Eficiência do dia` devem aparecer em uma área própria da dashboard V2
- essa área deve ficar separada visualmente da área de progresso operacional da OP, do setor e do turno
- nenhum card, tabela ou modal pode usar `Eficiência` como sinônimo de `progresso operacional`
- `Meta/hora` pode ser exibida como apoio visual ao operador, mas o percentual de eficiência deve continuar sendo calculado a partir de `tempo_padrao_min_snapshot`

Regra de consolidação:
- a dashboard não pode duplicar setores quando mais de uma OP usar o mesmo setor no turno
- a leitura setorial do turno deve consolidar o setor reaproveitado, preservando o detalhamento interno por OP/produto
- onde a UI listar setores do fluxo operacional, a ordenação visual deve seguir `setor.codigo` em ordem crescente; se houver empate ou ausência de código, usar `setor.id` como fallback
- o progresso de uma seção não deve ser calculado pela soma simples das operações do setor
- o progresso de uma OP não deve ser calculado pela soma simples dos registros de todos os setores
- a seção só é considerada concluída quando todas as operações obrigatórias do setor tiverem atingido sua quantidade planejada
- a OP só é considerada concluída quando todos os setores obrigatórios tiverem atingido sua quantidade planejada

### 6.7 Onde os números aparecem

| Local | Informação principal |
|---|---|
| **Dashboard** | turno aberto, OPs em andamento, realizado vs planejado, status por setor |
| **Apontamentos** | lançamentos incrementais por operador + operação + seção |
| **Scanner** | operador ativo, seção ativa e lançamento individual no contexto operacional |
| **Relatórios** | histórico por turno, OP, setor, operador, produto |
| **QR operacional** | contexto temporário de execução do turno |

---

## 7. FLUXO DO SUPERVISOR

```
Supervisor abre a dashboard

SE HOUVER TURNO ABERTO:
  → continua monitorando o turno atual

SE NÃO HOUVER TURNO ABERTO:
  → vê os dados consolidados do último turno
  → clica em "Novo Turno"

NO NOVO TURNO:
  → informa capacidade do dia
  → adiciona as OPs do dia
  → sistema ativa automaticamente os setores envolvidos
  → sistema gera os QRs operacionais dos setores do turno

AO LONGO DO DIA:
  → acompanha o progresso por OP e por setor
  → passa pelos setores e abre a tela de apontamentos
  → registra lançamentos incrementais por operador, OP/produto e operação dentro de cada setor
  → corrige encerramentos e ajustes quando necessário
```

Responsabilidades principais do supervisor:
- abrir e encerrar turno
- informar a demanda diária em forma de OPs
- imprimir e distribuir os QRs operacionais do turno
- acompanhar o realizado em tempo real
- registrar apontamentos incrementais por setor, operação e operador
- corrigir exceções operacionais

---

## 8. MÓDULOS DO SISTEMA

### 8.0 Governança visual do sistema administrativo

O sistema administrativo deve seguir uma linguagem visual profissional, semântica e consistente, usando `docs/DESIGN_PROPOSAL.md` como direção oficial de design.

Estado documental em `2026-04-05`:

- o `DESIGN_PROPOSAL` permanece homologado como norte visual futuro do admin
- a tentativa inicial de migração visual ampla foi revertida para restaurar o baseline anterior do frontend administrativo
- portanto, esta seção registra a direção desejada de produto, e não o estado atualmente implementado no código
- a futura migração de frontend continua prevista, mas a estratégia técnica de execução ainda precisa ser alinhada documentalmente antes de abrir nova sprint de implementação visual

Decisão de produto:

- `docs/DESIGN_PROPOSAL.md` define o norte visual do admin e da dashboard, mas não deve ser tratado como plano literal de implementação por arquivo
- a futura consolidação visual do admin deve ser cirúrgica e orientada por superfícies reais do sistema, não por redesign aberto
- o objetivo principal continua sendo garantir semântica visual profissional, dashboard consistente e reaproveitamento de componentes-base
- para `/admin/dashboard` e para o shell administrativo, as referências visuais homologadas pelo usuário seguem como benchmark canônico de execução futura, inclusive em light mode e dark mode
- para essas superfícies, o objetivo futuro deixa de ser apenas "aproximar" o `DESIGN_PROPOSAL`; o objetivo passa a ser atingir o mesmo padrão de composição, contraste, hierarquia, presença de sidebar, uso de cor e comportamento percebido da referência homologada
- soluções excessivamente neutras, wireframe-like, predominantemente brancas/pretas ou com blocos todos do mesmo peso visual devem ser consideradas incorretas como direção futura, mesmo quando respeitarem tokens e tipografia
- a migração técnica do frontend administrativo ainda não está fechada; antes de qualquer nova implementação visual, os passos técnicos, a ordem das superfícies e os critérios de homologação precisam estar explicitamente alinhados em sprint oficial aberta

Princípios obrigatórios do admin:

- tokens centralizados em `app/globals.css` para superfícies, texto, bordas, semânticas e tipografia
- sidebar escura como assinatura visual do sistema administrativo
- tipografia separando interface e dados:
  - `Outfit` para labels, navegação, títulos e textos de interface
  - `DM Mono` para KPIs, números, métricas e leituras operacionais
- acento principal âmbar como linguagem de destaque do sistema
- `info`, `success`, `warning` e `error` continuam existindo como semânticas de apoio; não devem competir com o acento principal como identidade visual
- dashboard, CRUDs, relatórios, apontamentos e QR Codes administrativos devem compartilhar o mesmo vocabulário visual de cards, badges, inputs, tabelas e estados

Critérios explícitos para dashboard e shell administrativo:

- a sidebar deve seguir o mesmo padrão de presença visual da referência homologada: fundo slate escuro consistente, navegação com peso, item ativo forte, recolhimento profissional e ícones semanticamente claros com tamanho dominante
- a dashboard deve seguir o mesmo padrão estrutural da referência homologada: barra superior de turno com status e ações, primeira linha de KPIs prioritários, gráfico principal em largura dominante e blocos operacionais subsequentes com pesos distintos
- a paleta percebida deve seguir o mesmo padrão da referência homologada: sidebar escura, superfícies claras ou escuras com contraste correto, accent âmbar quente para ação e progresso, verde para sucesso, cinza neutro para metas/base, sem cair em página lavada de preto e branco
- a diferença entre blocos prioritários e secundários deve ser perceptível em um único olhar; se todos os cards parecerem iguais, a execução visual está incorreta
- a implementação pode adaptar conteúdo e nomenclatura ao domínio real do produto, mas não pode descaracterizar o padrão visual homologado de composição, contraste, cores e hierarquia

Regra de exceção deliberada:

- o scanner permanece temporariamente fora desta consolidação visual do admin
- a linguagem visual do scanner pode continuar própria durante esta fase
- qualquer revisão visual do scanner deve acontecer em sprint específica, sem bloquear a consistência do admin

### 8.1 Dashboard (/admin/dashboard)

Interface principal do supervisor e do administrador.
- visualizar a aba `Visão Geral` com acompanhamento mensal global da fábrica
- acompanhar meta mensal, alcançado, saldo, percentual de atingimento e meta diária média
- acompanhar evolução diária e semanal da meta mensal
- visualizar a aba `Visão Operacional` com o conteúdo atual de turno
- visualizar a aba `Operadores` com a eficiência operacional do turno carregado
- visualizar turno aberto ou último turno encerrado
- abrir novo turno
- editar turno aberto
- acompanhar OPs e setores em tempo real
- encerrar turno, OPs e setores
- visualizar planejado x realizado
- visualizar a KPI `Meta do Grupo` do turno aberto
- acompanhar o gráfico `Projeção do planejado x Alcançado por hora`
- visualizar uma área própria de `Eficiência operacional` sem misturar esse domínio com o progresso operacional da OP

#### 8.1.1 Meta mensal e reorganização das abas da dashboard

Objetivo:
- transformar a aba `Visão Geral` na leitura gerencial principal do sistema
- acompanhar o atingimento da meta mensal global da fábrica sem depender de turno ativo
- deslocar o conteúdo operacional atual para a aba `Visão Operacional`, preservando sua semântica existente

Contrato de domínio:
- a meta mensal é sempre global da fábrica
- deve existir no máximo uma meta mensal por competência (`mês/ano`)
- o cadastro da meta mensal deve registrar no mínimo:
  - competência
  - meta mensal em peças
  - quantidade de dias produtivos daquele mês
  - observação opcional
- o supervisor/admin deve conseguir criar e editar a meta mensal da competência corrente em `/admin/apontamentos`

Contrato de cálculo:
- `meta_diaria_media = meta_mensal / dias_produtivos`
- `realizado_dia` é a soma da quantidade concluída consolidada por `OP/dia`
- `realizado_acumulado` é a soma dos `realizado_dia` dentro da competência
- `atingimento_mensal_pct = (realizado_acumulado / meta_mensal) * 100`
- `saldo_mensal = max(meta_mensal - realizado_acumulado, 0)`

Contrato de visualização:
- `Visão Geral` deve abrir por padrão na dashboard
- a `Visão Geral` deve abrir por padrão na competência do mês corrente
- a dashboard deve permitir navegar entre competências mensais para trás e para frente sem depender da abertura de turno
- o lançamento e a edição da meta mensal devem atuar sempre sobre a competência atualmente selecionada em `/admin/apontamentos`
- mesmo sem turno ativo, a `Visão Geral` deve continuar carregando a meta mensal da competência selecionada
- quando não existir meta mensal cadastrada para a competência, a aba deve mostrar estado vazio com CTA para `/admin/apontamentos`
- a aba deve exibir pelo menos os KPIs:
  - Meta mensal
  - Alcançado no mês
  - Saldo
  - Atingimento %
  - Meta diária média
- a aba deve exibir um gráfico principal de `Meta Mensal x Alcançado` com leitura acumulada ao longo do mês
- a aba deve exibir a evolução diária do mês
- a aba deve exibir a evolução semanal agrupada pelas semanas do calendário daquele mês

### 8.3.1 Gestão administrativa da meta mensal (/admin/apontamentos)

Regras de superfície:
- o cadastro e a edição da meta mensal pertencem à página `/admin/apontamentos`
- essa gestão administrativa deve continuar disponível mesmo sem turno aberto
- a competência de trabalho deve ser navegável por mês também em `/admin/apontamentos`
- ao salvar a meta mensal, `/admin/apontamentos` e `/admin/dashboard` devem refletir imediatamente o novo valor da competência selecionada
- a dashboard permanece como superfície de leitura gerencial; a mutação administrativa da meta não acontece mais dentro da aba `Visão Geral`

Regra explícita desta primeira versão:
- como o lançamento mensal informa a quantidade de `dias produtivos` do mês, e não um calendário produtivo detalhado por data, a `meta_diaria_media` deve ser tratada como uma referência gerencial média para a curva esperada diária e semanal
- a evolução semanal deve respeitar as semanas do calendário do mês, sem usar blocos móveis de 7 dias
- enquanto não existir um calendário produtivo detalhado por data, a curva esperada não distingue automaticamente feriados, sábados, domingos ou paradas planejadas dentro da competência; ela representa apenas a média gerencial derivada de `dias_produtivos`

Reorganização obrigatória da dashboard:
- a aba que hoje concentra o conteúdo operacional passa a se chamar `Visão Operacional`
- `Meta do Grupo`, `Projeção do planejado x Alcançado por hora`, leitura de OPs, setores, progresso operacional e eficiência operacional continuam existindo, mas dentro da `Visão Operacional`
- a troca de nomenclatura de abas não pode alterar o contrato dos indicadores operacionais já homologados

#### 8.1.2 UX alvo para edição do turno aberto

Quando existir um turno `aberto`, a dashboard deve expor:
- CTA `Editar turno`
- ação `Adicionar OP`
- listagem das OPs já planejadas com status, planejado, realizado e saldo
- KPI consolidada de `Meta do Grupo` calculada pela média simples do `tp_produto_min` das `turno_ops`
- gráfico horário comparando projeção da meta coletiva com o realizado do turno
- bloco separado `Eficiência operacional`

Contrato visual mínimo do bloco `Eficiência operacional`:

- tabela `Eficiência por hora` com colunas `Hora | Operador | Operação | T.P. | Meta/hora | Realizado | Efic%`
- resumo `Eficiência do dia por operador` com colunas `Data | Operador | Efic%`
- o bloco deve ser apresentado como leitura de produtividade individual, não como leitura de avanço da OP
- o bloco não pode reutilizar o mesmo card ou a mesma barra do KPI de progresso operacional da OP
- se um operador trocar de operação dentro da mesma hora, a tabela deve mostrar mais de uma linha naquela hora para o mesmo operador
- o resumo diário do operador deve consolidar todas as operações trabalhadas no turno com base em `tempo_padrao_min_snapshot`

Fluxo mínimo da edição:
- abrir modal ou drawer de edição do turno atual
- mostrar o cabeçalho do turno como somente leitura:
  - iniciado em
  - operadores disponíveis
  - minutos do turno
- permitir incluir uma ou mais novas OPs
- permitir editar OP existente apenas quando ela ainda não tiver produção
- ao salvar, recarregar o planejamento do turno e destacar o que foi incluído

Campos mínimos por nova OP:
- número da OP
- produto
- quantidade planejada

Saídas obrigatórias após salvar:
- confirmação de que a OP entrou no turno atual
- atualização imediata da dashboard
- reaproveitamento dos QRs dos setores já ativos e geração de novos QRs apenas para setores inéditos no turno
- nova OP visível no scanner e em `/admin/apontamentos`

Mensagens de bloqueio obrigatórias:
- turno encerrado não pode ser editado
- OP duplicada no mesmo turno
- produto sem roteiro/setores válidos
- OP existente com produção não pode ter produto ou quantidade alterados

### 8.2 Scanner (/scanner)

Interface operacional individual ou híbrida de apontamento.
- scan do QR operacional do `setor` no turno
- scan do operador
- identificação do setor operacional aberto
- escolha da OP/produto dentro do setor
- listagem das operações planejadas daquela OP dentro do setor
- seleção da operação a apontar
- input de quantidade executada na operação selecionada
- bloqueio de excesso sobre a quantidade planejada
- feedback visual de sucesso e erro

#### 8.2.1 Máquina de estados alvo do scanner

Estados obrigatórios:
- `scan_secao`
- `scan_operador`
- `selecionar_operacao`
- `informar_quantidade`
- `registrar`
- `trocar_operador`
- `reiniciar_total`

Transições:
- `scan_secao -> scan_operador`
- `scan_operador -> selecionar_operacao`
- `selecionar_operacao -> informar_quantidade`
- `informar_quantidade -> registrar`
- `registrar -> informar_quantidade`
  quando o supervisor quiser repetir nova quantidade na mesma operação
- `registrar -> selecionar_operacao`
  quando o supervisor quiser trocar de operação mantendo o mesmo operador
- `registrar -> trocar_operador -> scan_operador`
  quando o supervisor quiser trocar de operador mantendo a mesma seção
- qualquer estado -> `reiniciar_total -> scan_secao`

#### 8.2.2 Payload da action do scanner

Payload alvo:
- `operadorId`
- `turnoSetorOperacaoId`
- `quantidade`
- `origemApontamento`
- `usuarioSistemaId?`
- `observacao?`

Regras:
- `operadorId` é sempre o operador do QR escaneado
- `turnoSetorOperacaoId` é a operação escolhida dentro da seção já aberta
- `quantidade` é sempre incremental e inteira
- `origemApontamento` deve sair como `operador_qr` no scanner
- `usuarioSistemaId` só é enviado quando houver sessão autenticada do supervisor

#### 8.2.3 Layout alvo das telas

Tela `scan_secao`:
- leitor de QR
- card fixo explicando o setor esperado
- feedback claro de QR inválido

Tela `scan_operador`:
- leitor de QR
- card fixo com contexto do setor já aberto
- feedback claro de operador inválido ou inelegível

Tela `selecionar_operacao`:
- cabeçalho com setor, OP, produto e operador
- lista das operações derivadas da OP selecionada dentro do setor
- cada operação mostra realizado, saldo, status e sequência

Tela `informar_quantidade`:
- resumo da seção
- resumo do operador
- operação selecionada em destaque
- input de quantidade incremental
- CTA de registrar

Tela pós-registro:
- feedback visual de sucesso
- CTA `Nova quantidade`
- CTA `Trocar operação`
- CTA `Trocar operador`
- CTA `Reiniciar tudo`

#### 8.2.4 Reaproveitamento e remoção

Reaproveitar do código atual:
- leitura de QR
- validação de tipos de QR
- feedback visual de sucesso e erro
- action transacional V2
- busca do contexto da seção do turno

Remover ou evoluir como legado:
- fluxo que registra apenas `seção + operador + quantidade`
- tela de confirmação sem seleção explícita da operação
- botão `Reiniciar` como única saída operacional

O scanner híbrido não substitui a tela `/admin/apontamentos`; ele passa a ser a opção móvel especializada para o chão de fábrica, enquanto `/admin/apontamentos` continua como rota administrativa segura para supervisão e contingência.

### 8.3 Apontamentos do Supervisor (/admin/apontamentos)

Interface administrativa de captura incremental da produção.
- a página deve ser organizada em duas abas:
  - `Gestão Mensal`
  - `Operação do Turno`
- `Gestão Mensal` concentra o cadastro, a edição e a navegação por competência da meta mensal
- `Operação do Turno` concentra a abertura/edição/encerramento do turno e os lançamentos incrementais do supervisor
- turno aberto fixo como contexto
- filtros por OP, setor e produto, sempre limitados a pendências realmente acionáveis do contexto atual
- a aba operacional deve priorizar o lançamento direto e não uma prévia expandida de todas as seções antes do formulário
- OPs totalmente concluídas não devem aparecer como opção de filtro operacional
- ao selecionar uma OP, o filtro de setor deve listar apenas setores daquela OP que ainda possuam saldo pendente
- operações totalmente concluídas dentro do recorte filtrado não devem aparecer como opção de lançamento
- quando o recorte filtrado resultar em um único contexto elegível, a interface deve abrir diretamente o formulário correspondente
- o bloco principal da tela deve ser o formulário acionável do recorte atual, com resumo contextual enxuto em vez de uma lista longa de previews
- cada linha de lançamento contém operador, operação e quantidade
- a quantidade inicial sugerida deve vir pré-preenchida com o saldo remanescente da operação selecionada, sempre respeitando o teto do saldo pendente
- múltiplas linhas no mesmo envio continuam permitidas apenas quando fizerem sentido dentro do mesmo recorte operacional escolhido
- gravação transacional dos lançamentos
- atualização imediata da operação, seção, OP, turno, dashboard e relatórios
- após cada gravação, a interface deve recalcular o recorte atual e permanecer no próximo estado acionável: manter o formulário se ainda houver saldo ou retirar do fluxo o item que foi concluído
- quando o supervisor abrir um novo turno a partir desta rota, o pós-save deve redirecionar para `/admin/qrcodes` para imprimir os QRs operacionais antes de retornar ao monitor da TV

Fluxo alvo da aba `Operação do Turno`:
1. supervisor abre a aba operacional com o turno aberto como contexto fixo
2. sistema oferece apenas OPs com pendências reais de apontamento
3. ao escolher a OP, sistema reduz os filtros seguintes para apenas setores, produtos e operações ainda pendentes naquele recorte
4. a tela deixa de abrir uma vitrine de todas as seções da OP e passa a mostrar diretamente o formulário acionável do recorte escolhido
5. o supervisor escolhe o operador e confirma ou ajusta a quantidade já sugerida pelo saldo remanescente da operação
6. ao registrar, a UI atualiza imediatamente o saldo e conduz o supervisor para a próxima pendência elegível, sem reintroduzir OPs, setores ou operações já encerrados

### 8.4 Cadastro de Setores (/admin/setores)

Novo CRUD obrigatório.
- código sequencial automático
- nome
- situação

Setores iniciais:
- Preparação
- Frente
- Costa
- Montagem
- Finalização

### 8.5 Cadastro de Operações (/admin/operacoes)

- código manual livre
- descrição
- máquina específica cadastrada
- setor
- situação
- tempo padrão manual
- QR de cadastro

Regras obrigatórias:
- `operacoes` não deve mais depender de `tipo_maquina`
- cada operação aponta para uma `maquina` específica já cadastrada no sistema
- o vínculo oficial persistido no schema deve ser `operacoes.maquina_id UUID REFERENCES maquinas(id)`
- o vínculo persistido da operação com a máquina deve usar a identidade da máquina cadastrada, e não apenas texto solto do modelo
- na UI do CRUD de operações, a seleção de máquina deve exibir o campo `modelo` da máquina como referência principal de escolha
- o `codigo` da operação deixa de ser gerado automaticamente e passa a ser preenchido manualmente pelo usuário
- o `codigo` continua obrigatório e único no cadastro de operações

### 8.6 Cadastro de Produtos (/admin/produtos)

- referência
- nome
- URL da imagem
- situação
- T.P Produto calculado automaticamente

Contrato da UX:
- o cadastro continua salvando o roteiro do produto como uma lista linear de operações com `sequencia`
- a montagem do roteiro deixa de ser uma lista única de operações e passa a ser guiada por setores
- a ordem dos setores no roteiro é sempre a ordem oficial do fluxo fabril, derivada de `setor.codigo`
- o usuário não pode reordenar setores manualmente no cadastro do produto
- dentro de um mesmo setor, a ordem das operações segue exatamente a ordem em que o usuário as selecionou
- o usuário primeiro informa `referência` e `nome`
- `URL da imagem` permanece temporariamente oculta no modal por decisão de produto, até a futura entrega de inclusão real da imagem
- abaixo desses campos, o modal exibe o `T.P Produto` como informação de apoio visual, menos evidente que os campos principais, sendo atualizado automaticamente conforme as operações são selecionadas
- o CRUD deve permitir `duplicar produto` a partir de um cadastro existente, reaproveitando o mesmo modal de produto em modo de criação pré-carregado
- ao duplicar, o sistema deve carregar `nome`, `roteiro` e `setores` do produto de origem, mas continuar tratando o salvamento como um novo produto
- em seguida, o usuário busca e adiciona os setores que farão parte do produto, respeitando o limite de setores existentes no sistema
- ao selecionar um setor, o modal passa a exibir apenas as operações disponíveis naquele setor para escolha
- finalizada a seleção das operações de um setor, o usuário segue para o próximo setor até concluir o roteiro completo do produto
- o roteiro final exibido ao usuário deve deixar evidente a composição `setor -> operações`, mas o payload persistido continua compatível com a estrutura atual baseada em `operacaoId + sequencia`

Regras:
- o `T.P Produto` continua sendo a soma dos `tempo_padrao_min` das operações selecionadas
- a UI deve ser enxuta, orientada ao momento do cadastro e sem poluição visual com informações secundárias
- se necessário para manter a UX clara e intuitiva, o modal pode aumentar de largura ou reorganizar o layout
- a ampliação visual do modal não pode transformar a tela em um configurador denso; o foco deve permanecer apenas nas decisões necessárias para montar o produto
- a busca e a seleção de operações devem respeitar o vínculo estrutural existente entre `operação` e `setor`
- a duplicação deve exigir revisão da `referência`, porque o novo cadastro não pode reutilizar a referência original

Contrato de ciclo de vida:
- o produto deve ter duas ações distintas de ciclo de vida: `arquivar/desativar` e `excluir permanentemente`
- `arquivar/desativar` remove o produto das listas ativas de uso operacional futuro, mas preserva integralmente o histórico já produzido
- `excluir permanentemente` só pode existir para produto sem uso operacional nem histórico
- produto presente em `turno aberto` não pode ser arquivado nem excluído
- produto com qualquer histórico em `turno_ops`, `configuracao_turno` ou `registros_producao` não pode ser excluído permanentemente
- produto com histórico deve ser tratado por `arquivar/desativar`, nunca por remoção física
- a remoção física, quando permitida, pode apagar apenas o cadastro atual do produto e seu roteiro derivado em `produto_operacoes`
- a produção passada não pode ser apagada por uma ação de CRUD de produto

### 8.7 Cadastro de Máquinas (/admin/maquinas)

- código sequencial automático
- modelo
- marca
- patrimônio
- situação
- QR patrimonial

Regra de domínio:
- este cadastro não participa do fluxo operacional da V2
- `tipo_maquina` e vínculo direto com `setor` não fazem parte do contrato alvo de `maquinas`
- a máquina existe para inventário, auditoria e rastreabilidade física

### 8.8 Cadastro de Operadores (/admin/operadores)

- matrícula sequencial automática
- nome
- função
- status
- carga horária em minutos
- QR do operador

### 8.9 Cadastro de Usuários do Sistema (/admin/usuarios)

Novo CRUD obrigatório.
- vínculo com autenticação
- nome
- email
- papel: `admin` ou `supervisor`
- situação

Regras:
- o primeiro `admin` entra por bootstrap técnico no banco
- em desenvolvimento, o cadastro com `senha inicial` pode existir apenas como bootstrap interno e apoio operacional temporário
- em produção, o fluxo alvo não deve expor senha ao `admin`
- depois disso, novos `admins` e `supervisores` são cadastrados pela interface
- apenas usuários com papel `admin` podem gerenciar `/admin/usuarios`

Fluxo profissional de produção:
- `admin` informa apenas nome, email e papel
- o sistema cria o usuário com status `pendente_ativacao`
- o sistema envia convite ou link de definição/recuperação de senha para o email informado
- o próprio usuário define sua senha no primeiro acesso
- o `admin` nunca visualiza nem escolhe a senha final do usuário
- o sistema deve permitir reenviar convite enquanto o usuário estiver pendente
- após a definição da senha e primeiro acesso válido, o status muda para `ativo`

### 8.10 Relatórios (/admin/relatorios)

- produção por turno
- produção por OP
- produção por setor
- produção por operação dentro do setor
- produção por operador
- comparativo planejado x realizado
- encerramentos manuais e automáticos

---

## 9. ENTIDADES E REGRAS DE NEGÓCIO

### 9.1 Entidades principais

`setores`
- código sequencial
- nome
- situação

`operacoes`
- código manual livre
- máquina específica cadastrada (`maquina_id`)
- descrição
- situação
- tempo padrão
- setor
- QR de cadastro

`produtos`
- referência
- nome
- situação
- T.P Produto

`produto_operacoes`
- produto
- operação
- sequência

`maquinas`
- código sequencial
- modelo
- marca
- patrimônio
- situação
- QR patrimonial

Decisão de domínio:
- `maquinas` não participa da derivação operacional do turno
- `maquinas` não deve carregar `tipo_maquina` nem vinculação direta com `setor` no contrato alvo
- o contexto operacional da V2 nasce de `operacoes`, `setores`, `turno_setores` e `turno_setor_demandas`
- isso não impede que `operacoes` referenciem uma máquina específica cadastrada para fins de cadastro técnico, exibição e rastreabilidade administrativa
- o campo exibido para escolha dessa máquina no CRUD de operações deve usar o `modelo` da tabela `maquinas`, preservando o vínculo técnico por `id`

`operadores`
- matrícula sequencial
- nome
- função
- status
- carga horária em minutos
- QR do operador

`usuarios_sistema`
- usuário autenticado
- nome
- email
- papel
- situação
- somente `admin` gerencia usuários do sistema
- em produção, a credencial final é definida pelo próprio usuário via convite/ativação

`turnos`
- data/hora de abertura
- data/hora de encerramento
- operadores disponíveis
- minutos do turno
- status

`turno_ops`
- turno
- número da OP
- produto
- quantidade planejada
- status

`turno_setor_ops`
- turno
- setor
- quantidade planejada
- quantidade realizada
- status
- QR operacional temporário

`turno_setor_operacoes`
- turno
- OP
- seção `setor + OP`
- produto_operacao
- operação
- setor
- sequência
- tempo padrão snapshot
- quantidade planejada
- quantidade realizada
- status

`registros_producao`
- turno
- OP
- setor
- operação da seção
- operador
- máquina opcional
- quantidade
- data/hora do lançamento
- autoria do lançamento
- origem do lançamento (`operador_qr` ou `supervisor_manual`)

### 9.2 Regras obrigatórias

1. O roteiro do produto é a fonte de verdade para descobrir os setores e operações envolvidos.
2. O supervisor informa a demanda diária; o sistema deriva a estrutura operacional do turno.
3. O QR operacional é sempre da combinação `turno + setor`.
4. O QR operacional muda a cada novo turno.
5. Ao incluir nova OP em turno aberto, setores já ativos devem ser reaproveitados sem duplicação visual.
6. Novo QR operacional só nasce quando a nova OP introduz um setor ainda ausente no turno.
7. No scanner, depois de abrir o setor e identificar o operador, o supervisor deve escolher a OP/produto que será apontada naquele setor.
8. Um apontamento de produção registra unidades concluídas por um operador em uma operação específica da seção.
9. Máquina não é obrigatória no apontamento da V2, mas continua relevante no cadastro e em relatórios.
10. Operador pode ser alocado dinamicamente por turno.
11. Uma OP pode atravessar mais de um turno e mais de um dia.
12. A quantidade realizada de cada operação da seção nunca pode ultrapassar a quantidade planejada.
13. A quantidade realizada consolidada da OP é o menor realizado entre as seções obrigatórias da OP.
14. O realizado do turno é a soma do realizado consolidado das OPs do turno.
15. O encerramento automático do setor ocorre quando todas as demandas planejadas daquele setor no turno estiverem concluídas.
16. O encerramento automático da OP ocorre quando todos os setores obrigatórios forem concluídos.
17. O QR do operador deve continuar identificando o executor real da produção para sustentar rastreabilidade e relatórios por operador.
18. O sistema deve persistir quem lançou o apontamento e a origem do lançamento (`operador_qr` ou `supervisor_manual`).
19. O encerramento do turno pode ser manual ou automático na abertura do próximo turno.
20. Encerramentos automáticos podem ser ajustados manualmente por supervisor ou admin.
21. A dashboard deve atualizar em tempo real sem refresh manual.
22. Apenas usuários com papel `admin` ou `supervisor` acessam a área administrativa.
23. O primeiro usuário `admin` é criado por bootstrap técnico diretamente no banco.
24. Em desenvolvimento, o cadastro com senha inicial pode ser usado apenas como mecanismo interno temporário.
25. Em produção, o `admin` não deve conhecer a senha final de outros usuários.
26. Em produção, após o bootstrap, o cadastro de novos `admins` e `supervisores` deve acontecer pela tela `/admin/usuarios` com convite e ativação por email.
27. Apenas usuários com papel `admin` podem criar, editar ou inativar usuários do sistema.

### 9.3 Refatoração estrutural prioritária do modelo operacional

Esta refatoração passa a ser a direção oficial do produto para as próximas entregas.

#### 9.3.1 Problema que precisa ser corrigido

O modelo atual ainda carrega uma leitura operacional centrada em `setor + OP` como unidade visível do turno.

Na prática do chão de fábrica isso gera uma distorção:

- quando uma nova OP entra no turno, o sistema duplica setores já existentes
- a dashboard passa a mostrar múltiplos blocos do mesmo setor
- novos QRs aparecem mesmo quando a estrutura física da fábrica não mudou
- o scanner fica preso a uma seção já amarrada a uma única OP
- o acompanhamento do realizado fica visualmente poluído e difícil de operar

#### 9.3.2 Novo modelo alvo

A estrutura operacional visível do turno passa a ser:

1. `turno`
2. `turno_setores`
3. `turno_setor_demandas`
4. `turno_setor_operacoes`
5. `registros_producao`

Semântica:

- `turno`: contêiner do período de trabalho
- `turno_setores`: um registro por setor ativo naquele turno; esta passa a ser a unidade física visível da operação
- `turno_setor_demandas`: relação entre um setor do turno e cada `turno_op` que passa por ele
- `turno_setor_operacoes`: operações executáveis daquele `turno_setor_demanda`, preservando sequência, saldo e realizado
- `registros_producao`: lançamentos atômicos por operador + operação + demanda do setor

Objetivo explícito:

- o setor é aberto uma única vez no turno
- o QR operacional nasce no nível do setor do turno
- a OP deixa de duplicar o setor e passa a alimentar a demanda interna daquele setor

#### 9.3.3 Novo conceito de QR operacional

Regra nova:

- o QR operacional identifica `turno + setor`
- só existe um QR por setor ativo no turno
- uma nova OP reutiliza o QR existente se passar por um setor já aberto
- um novo QR só é gerado quando a nova OP introduz um setor ainda ausente no turno

Consequências:

- `Preparação` no turno é um único contexto operacional
- dentro desse contexto podem coexistir múltiplas OPs/produtos
- a dashboard não pode mostrar dois cards de `Preparação` apenas porque há duas OPs abertas

#### 9.3.4 Fluxo alvo do scanner

Fluxo operacional prioritário:

1. supervisor escaneia o QR do setor do turno
2. sistema abre o contexto do setor
3. supervisor escaneia o QR do operador
4. sistema lista as OPs/produtos ativos naquele setor
5. supervisor escolhe a OP/produto
6. sistema lista as operações disponíveis daquela OP dentro do setor
7. supervisor escolhe a operação
8. supervisor informa a quantidade
9. sistema registra o apontamento atômico

Regras:

- a troca de operador não deve exigir reler o QR do setor
- a troca de OP/produto dentro do mesmo setor não deve exigir reinício total
- a troca de operação dentro da mesma OP/produto deve ser imediata
- `/admin/apontamentos` continua existindo como contingência administrativa

Observação de UX:

- se a validação de campo mostrar ganho operacional, a ordem entre `operador` e `OP/produto` pode ser ajustada depois sem mudar o contrato estrutural do backend
- porém o backend da próxima sprint deve obrigatoriamente suportar a escolha de `OP/produto` dentro de um setor já aberto

#### 9.3.5 Consolidação operacional dentro do setor

O consolidado deixa de nascer da multiplicação de seções `setor + OP` visíveis na dashboard.

Passa a valer:

- `realizado da operação da demanda setorial` = soma dos lançamentos atômicos daquela operação
- `realizado da demanda setorial` = menor realizado entre as operações obrigatórias daquela OP/produto dentro do setor
- `quantidade concluída do setor na OP` = menor realizado entre as operações obrigatórias daquela OP/produto dentro do setor
- `quantidade concluída da OP no turno` = menor realizado entre os setores obrigatórios da OP
- `quantidade concluída do turno` = soma da quantidade concluída das OPs do turno

Distinção obrigatória entre quantidade concluída e progresso operacional:

- `quantidade concluída` responde quantas peças já atravessaram toda a cadeia obrigatória da OP
- `progresso operacional` responde quanto do trabalho total necessário para entregar a OP já foi executado
- `progresso operacional` mede o avanço rumo ao produto completo, mas não deve ser tratado como sinônimo de estoque de peças finalizadas
- dashboard, modal, scanner e relatórios devem nomear explicitamente essas métricas para evitar ambiguidade

Regra alvo para progresso operacional ponderado por T.P.:

- cada operação obrigatória da OP contribui para o progresso conforme seu `tempo_padrao_min`
- operações com maior `tempo_padrao_min` têm peso maior no progresso da OP e do setor
- o progresso nasce nas operações individuais, compõe o progresso do setor e, em seguida, o da OP
- setores com mais esforço acumulado em `tempo_padrao_min` pesam mais no progresso da OP do que setores com menos esforço

Fórmulas:

```text
carga_planejada_operacao = quantidade_planejada_op * tempo_padrao_min_operacao
carga_realizada_operacao = MIN(quantidade_realizada_operacao, quantidade_planejada_op) * tempo_padrao_min_operacao

progresso_operacional_operacao_pct = (carga_realizada_operacao / carga_planejada_operacao) * 100

progresso_operacional_setor_pct =
  SUM(carga_realizada_operacao do setor) / SUM(carga_planejada_operacao do setor) * 100

peso_setor_na_op =
  SUM(tempo_padrao_min das operações do setor na OP) / SUM(tempo_padrao_min das operações da OP)

progresso_operacional_op_pct =
  SUM(carga_realizada_operacao da OP) / SUM(carga_planejada_operacao da OP) * 100

quantidade_concluida_op =
  MIN(realizado consolidado dos setores obrigatórios da OP)
```

Regras obrigatórias de apresentação:

- a UI não pode usar `quantidade_concluida_op` como rótulo de progresso operacional
- o KPI principal de progresso da OP deve usar `progresso_operacional_op_pct`
- a quantidade concluída da OP deve continuar disponível como métrica separada de peças completas
- dashboard e modal da OP devem exibir a mesma definição de progresso operacional e a mesma definição de quantidade concluída

Regra obrigatória de consistência:

- toda gravação em `turno_setor_operacoes` que altere `quantidade_realizada`, `status`, `iniciado_em` ou `encerrado_em` deve propagar a consolidação para `turno_setor_demandas`
- após recalcular a demanda setorial, o sistema deve recalcular `turno_setores`
- após recalcular as demandas da OP, o sistema deve recalcular `turno_ops`
- dashboard, scanner, apontamentos e relatórios V2 não podem depender de valores divergentes entre `turno_setor_operacoes`, `turno_setor_demandas`, `turno_setores` e `turno_ops`
- quando houver divergência, o sistema deve tratar isso como defeito de consistência estrutural, nunca como comportamento esperado da UI

Regra de leitura:

- a dashboard principal consolida por setor
- o detalhe do setor expõe as OPs/produtos que estão sendo trabalhados ali
- o detalhe da OP continua mostrando por quais setores ela está passando
- relatórios e filtros não podem supercontar produção ao somar setores compartilhados por múltiplas OPs

Impacto funcional da consistência:

- o KPI de progresso da OP na dashboard e no modal de detalhe deve refletir o mesmo `progresso_operacional_op_pct`
- a leitura de peças completas deve refletir a mesma `quantidade_concluida_op`
- o status de uma demanda no scanner deve permanecer coerente com o andamento real das operações daquela demanda
- relatórios V2 e saldos operacionais não podem exibir `0%` de progresso operacional quando já houver produção consolidada nas operações da mesma demanda

#### 9.3.6 Modelo sequencial de capacidade e fila por setor

O domínio operacional oficial passa a ser sequencial por capacidade, fila e transferência real de lotes.

Fluxo obrigatório:

1. `Preparação`
2. `Frente`
3. `Costa`
4. `Montagem`
5. `Final`

Regras obrigatórias:

- a produção não ocorre simultaneamente em todos os setores da OP
- uma OP só pode existir em um setor por vez
- a única exceção é o fracionamento real por quantidade, originado pelo apontamento real
- quando houver fracionamento, cada lote vira uma unidade operacional independente, sem duplicar quantidade
- a soma dos lotes de uma OP nunca pode ultrapassar a quantidade total planejada ou remanescente
- a movimentação entre setores deve sempre reduzir a quantidade do setor de origem e adicionar a mesma quantidade ao próximo setor
- cada setor opera como fila FIFO
- entrar na fila não significa iniciar produção automaticamente
- um setor pode processar mais de uma OP ou lote ao mesmo tempo, desde que a soma da carga em minutos respeite sua capacidade produtiva disponível no turno
- a métrica principal do sistema é `peças finalizadas` no setor `Final`; produções intermediárias não representam resultado final da fábrica

Fórmulas obrigatórias:

```text
capacidade_minutos_setor = operadores_alocados_setor × minutos_turno

carga_lote_setor_min = quantidade_lote × tp_total_setor_produto

capacidade_restante_setor_min =
  capacidade_minutos_setor - SUM(carga_realizada_ou_reservada_dos_lotes_no_setor)

capacidade_pecas_setor =
  FLOOR(capacidade_minutos_setor / tp_total_setor_produto)
```

Contrato mínimo sugerido para a implementação:

- `turno_setores` deve passar a refletir `ordem_fluxo`, `operadores_alocados`, `capacidade_minutos_total`, `capacidade_minutos_consumida` e `capacidade_minutos_restante`
- `turno_setor_demandas` deve conseguir refletir `posicao_fila`, `status_fila`, `quantidade_backlog_setor`, `quantidade_aceita_turno`, `quantidade_nao_aceita_turno`, `quantidade_em_producao_setor`, `quantidade_concluida_setor` e `quantidade_transferida_proximo_setor`
- `turno_ops` deve conseguir refletir `setor_fluxo_atual_id`, `quantidade_finalizada` e a continuidade entre turnos sem perder rastreabilidade do saldo
- o contrato do backend deve tratar minutos como base da capacidade real do setor; leitura em peças é apenas derivação contextual

#### 9.3.7 Regra de carry-over entre turnos

O turno continua podendo ser encerrado manualmente, mas a produção não concluída precisa atravessar a troca de turno.

Regra alvo:

- ao encerrar um turno com OPs incompletas, o sistema calcula o saldo remanescente de cada OP
- ao abrir o próximo turno, o supervisor deve conseguir partir desse saldo pendente
- a nova carga do turno seguinte pode combinar:
  - saldo remanescente do turno anterior
  - novas OPs do dia
- o histórico do turno anterior permanece fechado e íntegro
- o novo turno recebe apenas o saldo faltante, nunca o total original já parcialmente produzido
- o carry-over deve reabrir cada OP exatamente no setor pendente em que ela ficou, sem reintroduzir carga nos setores já concluídos
- se uma OP estiver fracionada no encerramento do turno, cada lote pendente deve manter sua posição de fila e seu setor corrente na continuidade do novo turno
- a prévia do novo turno deve usar o estado real do carry-over como fonte de verdade para a carga pendente por setor
- o carry-over do setor passa a ser calculado pela soma de:
  - saldo que o setor ainda não conseguiu aceitar no turno anterior por falta de capacidade
  - saldo que o setor aceitou no turno anterior, mas não concluiu
- se o setor anterior concluiu mais peças do que o próximo setor conseguiu aceitar no turno, esse excedente deve abrir como backlog do próximo setor no turno seguinte, sem reabrir o setor anterior
- o parcelamento da OP entre turnos pode se repetir quantas vezes forem necessárias até o backlog setorial zerar

Contrato mínimo sugerido:

- `turno_ops.turno_op_origem_id` para rastrear continuidade entre turnos
- `quantidade_planejada_original`
- `quantidade_planejada_remanescente`
- snapshot do `setor_fluxo_atual_id` e do saldo pendente por setor/lote
- ação explícita de `carregar pendências do turno anterior` na abertura do novo turno

#### 9.3.8 Liberdade administrativa

Como o contexto fabril muda durante o dia, o sistema precisa oferecer edição administrativa ampla, com auditoria.

Diretriz:

- supervisor/admin devem conseguir ajustar manualmente demandas, setores ativos e continuidade operacional
- alterações destrutivas sobre produção já apontada continuam exigindo regra e auditoria
- o produto deve priorizar operação realista do chão, não rigidez excessiva de modelagem

#### 9.3.9 Estratégia de refatoração

Para reduzir regressão:

1. introduzir a nova estrutura setorial do turno sem apagar o histórico existente
2. formalizar o contrato de capacidade/fila por setor antes de propagar a mudança para UI
3. corrigir a prévia da abertura do turno para usar apenas a carga pendente real por setor
4. migrar QR, dashboard e scanner para `turno + setor` com fila sequencial explícita
5. manter compatibilidade temporária de relatórios durante a transição
6. homologar o novo fluxo no chão antes de remover a leitura antiga
7. só depois consolidar a limpeza de entidades e telas residuais

---

## 10. FORA DO ESCOPO (V2)

- folha de ponto ou controle de jornada
- pagamento por produção ou comissão
- integração com ERP ou sistema contábil
- múltiplas fábricas ou filiais
- app nativo iOS/Android
- planejamento simultâneo multi-linha com balanceamento automático entre células
- otimização automática de alocação de operadores por setor
- APS/MRP avançado ou sequenciamento automático de ordens
