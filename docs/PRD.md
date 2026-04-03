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
- após salvar um novo turno a partir de `/admin/apontamentos`, a navegação deve retornar o usuário para `/admin/dashboard`, que é o ponto primário de monitoramento do turno recém-aberto

### 5.2.1 Prévia de pessoas por setor

Durante a abertura do turno, o sistema deve calcular uma sugestão de quantidade de pessoas por setor para apoiar a distribuição da equipe disponível no dia.

Objetivos:
- transformar a carga planejada das OPs em leitura operacional por setor
- indicar quantas pessoas seriam necessárias em cada setor para cumprir o planejado do turno
- apoiar a tomada de decisão do supervisor sem bloquear a abertura do turno nesta primeira versão

Entradas obrigatórias:
- `operadoresDisponiveis` informados no cabeçalho do turno
- `minutosTurno` informados no cabeçalho do turno
- lista de `turno_ops` planejadas com `quantidadePlanejada`
- roteiro do produto com operações válidas e setor vinculado
- `tempoPadraoMin` de cada operação

Fórmula por setor:

```text
tp_total_setor_produto = SUM(tempoPadraoMin das operações do produto naquele setor)

carga_min_setor = SUM(quantidadePlanejada da OP × tp_total_setor_produto)

pessoas_necessarias_setor = CEIL(carga_min_setor / minutosTurno)
```

Exemplo:

```text
tp_total_setor_produto = 8 min
meta_planejada = 637 peças
minutos_turno = 510 min

pessoas_necessarias_setor = CEIL((8 × 637) / 510)
                           = CEIL(9.99)
                           = 10
```

Regras obrigatórias:
- o cálculo deve usar o `minutosTurno` efetivamente informado na abertura do turno, e não um valor fixo hardcoded
- quando houver múltiplas OPs no mesmo turno, o cálculo do setor deve somar a carga de todas as OPs que passam por ele
- o arredondamento deve ser sempre para cima com `CEIL`, porque fração de pessoa representa necessidade adicional de capacidade
- o cálculo deve ser exibido como sugestão operacional e não como restrição rígida nesta primeira etapa
- a soma das pessoas sugeridas por setor pode ultrapassar `operadoresDisponiveis`; quando isso acontecer, a UI deve sinalizar déficit de capacidade sem impedir a abertura do turno
- a persistência do dimensionamento por setor no banco fica fora do escopo inicial
- nesta primeira etapa, a abertura e gravação do turno continuam exatamente com o contrato atual

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

Impacto esperado:
- o turno continua o mesmo
- o planejamento total do turno aumenta
- setores já ativos são reaproveitados e recebem demanda adicional sem duplicação visual
- novos QRs só precisam ficar disponíveis quando houver entrada de um setor novo no turno
- scanner e `/admin/apontamentos` passam a aceitar lançamentos para a nova OP assim que ela for salva

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
- o turno aberto atual, se existir
- ou os dados consolidados do último turno encerrado

Durante a execução, a dashboard acompanha em tempo real:
- andamento do turno
- andamento por OP
- andamento por setor
- andamento por operação dentro da seção quando necessário
- progresso operacional ponderado por T.P. e quantidade concluída, sem misturar as duas métricas no mesmo KPI
- eficiência por hora por operador/operação e eficiência do dia por operador, em blocos próprios e sem misturar esses indicadores com o progresso operacional da OP
- pendências e seções encerradas
- setores apresentados na ordem estrutural do fluxo, usando `setor.codigo` crescente como referência visual principal

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

Carga planejada do setor no turno = SUM(quantidadePlanejada da OP × tp_total_setor_produto)

Pessoas necessárias no setor = ceil(carga_planejada_setor_min / minutos_turno)

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
- a prévia deve ser calculada por setor a partir da carga planejada das OPs selecionadas
- a prévia deve somar a carga de múltiplas OPs quando elas compartilharem o mesmo setor
- a prévia deve usar `ceil` para o arredondamento final por setor
- a prévia não substitui a `Meta do Grupo V2`
- a prévia não deve alterar o payload salvo do turno nesta primeira etapa

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

### 8.1 Dashboard (/admin/dashboard)

Interface principal do supervisor e do administrador.
- visualizar turno aberto ou último turno encerrado
- abrir novo turno
- editar turno aberto
- acompanhar OPs e setores em tempo real
- encerrar turno, OPs e setores
- visualizar planejado x realizado
- visualizar a KPI `Meta do Grupo` do turno aberto
- acompanhar o gráfico `Projeção do planejado x Alcançado por hora`
- visualizar uma área própria de `Eficiência operacional` sem misturar esse domínio com o progresso operacional da OP

#### 8.1.1 UX alvo para edição do turno aberto

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
- turno aberto fixo como contexto
- filtros por OP, setor e produto
- lista de seções com planejado, realizado, saldo e progresso
- detalhe da seção com operações previstas e operadores do turno
- múltiplas linhas de lançamento no mesmo envio
- cada linha contém operador, operação e quantidade
- gravação transacional dos lançamentos
- atualização imediata da operação, seção, OP, turno, dashboard e relatórios
- quando o supervisor abrir um novo turno a partir desta rota, o pós-save deve redirecionar para `/admin/dashboard` para manter o monitoramento no contexto principal

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

- código sequencial automático
- descrição
- máquina ou tipo de máquina
- setor
- situação
- tempo padrão manual
- QR de cadastro

### 8.6 Cadastro de Produtos (/admin/produtos)

- referência
- nome
- situação
- roteiro com múltiplas operações
- T.P Produto calculado automaticamente

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
- código sequencial
- máquina ou tipo de máquina
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

#### 9.3.6 Regra de carry-over entre turnos

O turno continua podendo ser encerrado manualmente, mas a produção não concluída precisa atravessar a troca de turno.

Regra alvo:

- ao encerrar um turno com OPs incompletas, o sistema calcula o saldo remanescente de cada OP
- ao abrir o próximo turno, o supervisor deve conseguir partir desse saldo pendente
- a nova carga do turno seguinte pode combinar:
  - saldo remanescente do turno anterior
  - novas OPs do dia
- o histórico do turno anterior permanece fechado e íntegro
- o novo turno recebe apenas o saldo faltante, nunca o total original já parcialmente produzido

Contrato mínimo sugerido:

- `turno_ops.turno_op_origem_id` para rastrear continuidade entre turnos
- `quantidade_planejada_original`
- `quantidade_planejada_remanescente`
- ação explícita de `carregar pendências do turno anterior` na abertura do novo turno

#### 9.3.7 Liberdade administrativa

Como o contexto fabril muda durante o dia, o sistema precisa oferecer edição administrativa ampla, com auditoria.

Diretriz:

- supervisor/admin devem conseguir ajustar manualmente demandas, setores ativos e continuidade operacional
- alterações destrutivas sobre produção já apontada continuam exigindo regra e auditoria
- o produto deve priorizar operação realista do chão, não rigidez excessiva de modelagem

#### 9.3.8 Estratégia de refatoração

Para reduzir regressão:

1. introduzir a nova estrutura setorial do turno sem apagar o histórico existente
2. migrar QR, dashboard e scanner para `turno + setor`
3. manter compatibilidade temporária de relatórios durante a transição
4. homologar o novo fluxo no chão antes de remover a leitura antiga
5. só depois consolidar a limpeza de entidades e telas residuais

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
