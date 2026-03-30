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

### 4.2 QR Operacional do Setor/OP

- **O que é:** QR temporário gerado no momento da abertura do turno para um contexto específico de `setor + OP`
- **Onde fica:** impresso pelo supervisor e deixado no setor correspondente
- **Quando é usado:** durante aquele turno, para abrir a seção operacional do setor
- **Quem controla:** o supervisor
- **Quantidade:** 1 por combinação `turno + OP + setor`
- **Reimpressão:** quando o turno for recriado, a OP for alterada ou o QR físico se perder
- **Conteúdo lógico:** identifica o setor, a OP e o turno atual

### 4.3 Etiqueta da Máquina

- **O que é:** etiqueta patrimonial permanente da máquina
- **Onde fica:** colada na máquina
- **Quando é usada:** para rastreabilidade, apoio de auditoria e futuras evoluções
- **Quem controla:** a empresa
- **Quantidade:** 1 por máquina
- **Observação:** a máquina continua importante no domínio, mas deixa de ser obrigatória no apontamento operacional da V2

---

## 5. FLUXO OPERACIONAL DO DIA

### 5.1 Pré-condição — cadastro estrutural pronto

Antes de abrir um turno, o sistema precisa ter:
- operações cadastradas com `tempo padrão`, `situação` e `setor`
- produtos cadastrados com roteiro completo
- setores cadastrados
- operadores cadastrados
- máquinas cadastradas por setor

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
          → cria as seções operacionais do turno
          → gera um QR temporário para cada combinação setor + OP
```

Resultado:
- o planejamento do dia nasce do cadastro mestre do produto
- o supervisor informa apenas a demanda do dia
- o sistema deriva automaticamente a estrutura operacional necessária

### 5.3 Execução no chão de fábrica

```
Operador ou supervisor abre o scanner no celular

[Passo 1] Escaneia o QR do operador
          → sistema identifica quem está usando a sessão

[Passo 2] Escaneia o QR operacional do setor/OP
          → sistema identifica:
            - turno
            - OP
            - produto
            - setor
            - operações previstas naquele setor
            - quantidade planejada

[Passo 3] Durante o dia, o supervisor passa nos setores
          → verifica o envelope, folha ou apontamento físico do setor
          → registra quantas unidades cada operador concluiu em cada operação daquele setor
          → salva um ou mais lançamentos incrementais no contexto da seção
          → cada lançamento identifica:
            - operador executor
            - operação executada
            - seção `setor + OP`
            - quantidade incremental
            - autoria do lançamento (`supervisor_manual` ou `operador_qr`)

[Passo 4] Sistema confronta o apontamento com o planejamento
          → atualiza o realizado da operação dentro da seção
          → recalcula o realizado consolidado da seção
          → recalcula o andamento da OP
          → recalcula o andamento do turno em tempo real
          → bloqueia qualquer lançamento que ultrapasse a quantidade planejada
```

### 5.4 Encerramentos

Encerramento do setor:
- automático quando todas as operações obrigatórias daquele `setor + OP` atingirem a quantidade planejada
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
- quantidade planejada versus realizada
- pendências e seções encerradas

---

## 6. PLANEJAMENTO E MÉTRICAS

### 6.1 Cadeia de derivação do planejamento

O planejamento diário segue esta ordem lógica:

1. **Operações** definem o trabalho atômico
2. **Setores** agrupam as operações
3. **Produtos** agrupam operações em um roteiro
4. **Turno** define a capacidade do dia
5. **OPs do turno** definem a demanda do dia
6. **Seções setor + OP do turno** definem o que precisa ser executado no chão

### 6.2 O que o sistema deriva automaticamente

Ao informar `OP + produto + quantidade planejada`, o sistema precisa derivar:
- quais setores participam da confecção do produto
- quais operações serão executadas em cada setor
- quantas seções `setor + OP` serão abertas
- quais QRs operacionais precisam ser gerados

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
- a quantidade planejada de cada **setor + OP** é a mesma quantidade planejada total da OP
- a quantidade planejada de cada **operação derivada da seção** também é a mesma quantidade planejada total da OP
- o sistema acompanha o realizado por operação, por setor e por OP
- um lançamento nunca pode fazer o realizado da operação ultrapassar o planejado

### 6.5 Semântica do apontamento

A unidade lançada na V2 não representa produto acabado e também não pode ser a soma cega das operações do setor.

Ela passa a significar:

- **registro de produção**: quantas unidades um operador concluiu em uma operação específica da seção
- **realizado da operação da seção**: soma dos lançamentos daquela operação
- **realizado da seção `setor + OP`**: menor realizado entre as operações obrigatórias daquele setor
- **realizado da OP**: menor realizado entre as seções obrigatórias da OP
- **realizado do turno**: soma do realizado consolidado das OPs do turno

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

Progresso da operação da seção = quantidade_realizada_turno_setor_operacao / quantidade_planejada

Realizado da seção = MIN(quantidade_realizada_turno_setor_operacao obrigatória)

Realizado da OP = MIN(quantidade_realizada_turno_setor_op obrigatória)

Realizado do turno = SUM(quantidade_realizada_turno_op)
```

Regra de consolidação:
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
  → sistema cria automaticamente as seções por setor
  → sistema gera os QRs operacionais setor + OP

AO LONGO DO DIA:
  → acompanha o progresso por OP e por setor
  → passa pelos setores e abre a tela de apontamentos
  → registra lançamentos incrementais por operador e operação dentro de cada seção
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
- acompanhar OPs e setores em tempo real
- encerrar turno, OPs e setores
- visualizar planejado x realizado

### 8.2 Scanner (/scanner)

Interface operacional individual ou híbrida de apontamento.
- scan do operador
- scan do QR operacional `setor + OP`
- identificação da seção operacional aberta
- input de quantidade executada na operação selecionada
- bloqueio de excesso sobre a quantidade planejada
- feedback visual de sucesso e erro

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
- setor
- situação
- QR patrimonial

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
- setor
- situação
- QR patrimonial

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
- OP
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
3. O QR operacional é sempre da combinação `turno + OP + setor`.
4. O QR operacional muda a cada novo turno.
5. Um apontamento de produção registra unidades concluídas por um operador em uma operação específica da seção.
6. Máquina não é obrigatória no apontamento da V2, mas continua relevante no cadastro e em relatórios.
7. Operador pode ser alocado dinamicamente por turno.
8. Uma OP pode atravessar mais de um turno e mais de um dia.
9. A quantidade realizada de cada operação da seção nunca pode ultrapassar a quantidade planejada.
10. A quantidade realizada consolidada de `setor + OP` é o menor realizado entre as operações obrigatórias daquela seção.
11. A quantidade realizada consolidada da OP é o menor realizado entre as seções obrigatórias da OP.
12. O realizado do turno é a soma do realizado consolidado das OPs do turno.
13. O encerramento automático do setor ocorre quando todas as operações obrigatórias daquele setor atingem o planejado.
14. O encerramento automático da OP ocorre quando todos os setores obrigatórios forem concluídos.
15. O QR do operador deve continuar identificando o executor real da produção para sustentar rastreabilidade e relatórios por operador.
16. O sistema deve persistir quem lançou o apontamento e a origem do lançamento (`operador_qr` ou `supervisor_manual`).
17. O encerramento do turno pode ser manual ou automático na abertura do próximo turno.
18. Encerramentos automáticos podem ser ajustados manualmente por supervisor ou admin.
19. A dashboard deve atualizar em tempo real sem refresh manual.
20. Apenas usuários com papel `admin` ou `supervisor` acessam a área administrativa.
21. O primeiro usuário `admin` é criado por bootstrap técnico diretamente no banco.
22. Em desenvolvimento, o cadastro com senha inicial pode ser usado apenas como mecanismo interno temporário.
23. Em produção, o `admin` não deve conhecer a senha final de outros usuários.
24. Em produção, após o bootstrap, o cadastro de novos `admins` e `supervisores` deve acontecer pela tela `/admin/usuarios` com convite e ativação por email.
25. Apenas usuários com papel `admin` podem criar, editar ou inativar usuários do sistema.

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
