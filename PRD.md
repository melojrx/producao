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

## 4. MODELO FÍSICO — OS 3 OBJETOS DO SISTEMA

O sistema inteiro gira em torno de 3 tipos de objetos físicos impressos e plastificados. Nenhum operador precisa digitar nada.

### 4.1 Crachá do Operador

- **O que é:** cartão plastificado com QR Code e nome do operador
- **Onde fica:** pendurado no pescoço do operador, o dia todo
- **Quando é usado:** uma única vez ao chegar no trabalho
- **Quem controla:** o próprio operador (é dele, como um crachá de acesso)
- **Quantidade:** 1 por operador
- **Reimpressão:** apenas se o operador for desligado ou o crachá for perdido
- **Tamanho sugerido:** cartão de visita (85mm × 54mm)
- **Conteúdo impresso:** nome completo, função, foto (opcional), QR Code

### 4.2 Etiqueta da Máquina

- **O que é:** etiqueta adesiva plastificada com QR Code e identificação da máquina
- **Onde fica:** colada permanentemente na lateral da máquina, em posição visível
- **Quando é usado:** uma única vez ao chegar no trabalho (ou ao trocar de máquina)
- **Quem controla:** fixo — nunca sai da máquina
- **Quantidade:** 1 por máquina
- **Reimpressão:** apenas se a etiqueta for danificada ou a máquina for substituída
- **Tamanho sugerido:** 60mm × 60mm
- **Conteúdo impresso:** código da máquina, tipo, QR Code

### 4.3 Cartão de Operação

- **O que é:** cartão plastificado com QR Code e descrição da operação de costura
- **Onde fica:** sobre a bancada do operador, ao lado da máquina
- **Quando é usado:** a cada lote produzido (scan rápido, segundos)
- **Quem controla:** o SUPERVISOR — ele troca os cartões conforme o lote muda
- **Quantidade:** 1 por operação cadastrada no sistema (reutilizáveis)
- **Reimpressão:** quando uma nova operação for cadastrada
- **Tamanho sugerido:** cartão de visita (85mm × 54mm) ou A6 (148mm × 105mm)
- **Conteúdo impresso:** descrição da operação, tipo de máquina, T.P, meta/hora, QR Code

**Exemplo prático com 20 operadores, 20 máquinas, 40 operações:**
- 20 crachás (impressos uma vez)
- 20 etiquetas (coladas uma vez)
- 40 cartões de operação (reutilizados conforme o lote do dia)
- Total: 80 itens fixos + 40 cartões reutilizáveis

---

## 5. FLUXO COMPLETO DO OPERADOR

### 5.1 Momento 1 — Chegada ao trabalho (feito uma única vez)

```
Operador chega → pega o celular → abre o sistema (/scanner)

[Passo 1] Aponta o celular para o próprio crachá
          → Sistema exibe: foto + nome + "Olá, Pedro!"
          → Operador fica em memória na sessão

[Passo 2] Aponta o celular para a etiqueta da sua máquina
          → Sistema exibe: tipo + código + status
          → Se status = "manutenção": exibe bloqueio com mensagem
          → Máquina fica em memória na sessão

Resultado: sistema sabe QUEM está em QUAL máquina.
Operador e máquina ficam salvos — não precisam ser escaneados de novo.
```

### 5.2 Momento 2 — Registrando produção (repetido a cada lote)

```
Operador termina um lote de peças

[Passo 3] Aponta o celular para o cartão de operação na bancada
          → Sistema exibe: descrição + meta individual do dia + meta/hora

[Passo 4] Informa a quantidade produzida
          → Tela mostra botões − e + com número grande
          → Padrão = 1 peça
          → Pode ajustar se costurou mais de 1 de vez

[Passo 5] Toca no botão verde "Registrar"
          → Feedback: tela pisca verde + vibração do celular
          → Registro salvo no banco
          → Dashboard do supervisor atualiza em tempo real
          → Volta automaticamente ao passo 3
```

### 5.3 Momento 3 — Troca de operação ou máquina

```
Supervisor decide mudar o operador de operação ou máquina

TROCA DE OPERAÇÃO (mais comum):
  → Supervisor vai até a bancada e troca o cartão de operação
  → Operador não faz nada diferente — apenas escaneia o novo cartão
  → Sistema registra a nova operação automaticamente

TROCA DE MÁQUINA:
  → Operador vai até a nova máquina
  → Aponta o celular para a etiqueta da nova máquina (refaz o Passo 2)
  → Sistema atualiza qual máquina está em uso
  → Continua registrando normalmente
```

---

## 6. METAS DE PRODUÇÃO

### 6.1 Dois tipos de tempo padrão

| Tipo | O que é | Onde vive |
|---|---|---|
| **T.P Operação** | Tempo padrão de uma operação isolada em minutos | `operacoes.tempo_padrao_min` |
| **T.P Produto** | Soma dos T.P de todas as operações do roteiro | Calculado a partir de `produto_operacoes` |

### 6.2 Dois tipos de meta

**Meta Individual** — quanto cada operador deve produzir na SUA operação durante o turno:

```
Meta Individual = minutos_turno ÷ T.P_operacao
```

Exemplo: operação "unir etiquetas" (T.P = 0.28 min), turno de 540 min:
`540 ÷ 0.28 = 1.928 peças`

---

**Meta Grupo** — quantos produtos COMPLETOS a linha deve entregar no dia:

```
Meta Grupo = (funcionarios_ativos × minutos_turno) ÷ T.P_produto
```

Exemplo: 20 funcionários, 540 min de turno, produto com T.P total de 13.89 min:
`(20 × 540) ÷ 13.89 = 777 produtos/dia`

### 6.3 Configuração diária do turno

O supervisor preenche **3 campos** no início de cada turno. Esses valores alimentam todas as metas do dia.

| Campo | Descrição | Exemplo |
|---|---|---|
| `funcionarios_ativos` | Quantos operadores presentes hoje | 18 |
| `minutos_turno` | Minutos efetivos de trabalho do dia | 480 |
| `produto_id` | Qual produto está sendo produzido hoje | ref. 31040050 |

- O sistema calcula automaticamente o `T.P Produto` ao selecionar o produto (soma das operações do roteiro)
- O sistema calcula automaticamente a `Meta Grupo` ao salvar a configuração
- Só é permitida **uma configuração por dia** (UNIQUE por data)
- Se não houver configuração para hoje, o dashboard exibe um modal solicitando o preenchimento antes de mostrar os dados

### 6.4 Onde as metas aparecem

| Local | Meta exibida |
|---|---|
| **Dashboard — card KPI** | Meta Grupo do dia e progresso em % |
| **Dashboard — ranking operadores** | Eficiência individual de cada operador |
| **Tela do operador — após scan** | Meta Individual da operação escaneada |
| **Cartão de operação (físico impresso)** | Meta/hora da operação |

---

## 7. FLUXO DO SUPERVISOR

```
Supervisor abre o dashboard em TV ou tablet (/dashboard)

AO ABRIR (se não houver configuração para hoje):
  → Modal solicita os 3 campos: funcionários ativos, minutos do turno, produto do dia
  → Ao salvar, dashboard carrega com as metas calculadas

VISÃO EM TEMPO REAL:
  → Meta Grupo do dia + progresso atual (%)
  → Peças produzidas no dia (contador ao vivo)
  → Eficiência média da linha
  → Ranking de operadores por eficiência
  → Status de cada máquina (ativa / parada / em manutenção)
  → Gráfico de produção por hora

ALERTAS AUTOMÁTICOS:
  → Máquina sem registro há mais de 15 minutos → card vermelho piscando
  → Operador com eficiência < 70% → destaque amarelo no ranking
  → Operador com eficiência < 50% → destaque vermelho

AÇÃO DO SUPERVISOR:
  → Identifica o gargalo no dashboard
  → Vai fisicamente até o operador ou máquina
  → Intervém (ajuda técnica, troca de operação, aciona manutenção)
```

---

## 8. MÓDULOS DO SISTEMA

### 8.1 Scanner (/scanner) — mobile
Interface exclusiva para operadores. Prioridade: velocidade e simplicidade.
- Câmera ativa para leitura de QR Code
- Estado visual claro do que foi escaneado (operador, máquina, operação)
- Exibe meta individual da operação após o scan
- Botão de quantidade com toque fácil em tela touchscreen
- Botão de registro grande e verde
- Feedback visual e háptico no sucesso

### 8.2 Dashboard (/admin/dashboard) — TV/tablet
Interface para supervisores em tempo real.
- Modal de configuração do turno (abre automaticamente se não configurado)
- KPIs: meta grupo, progresso %, peças/dia, eficiência média
- Gráfico de produção por hora (linha)
- Ranking de operadores com eficiência colorida
- Grid de status das máquinas
- Alertas visuais de gargalos

### 8.3 Cadastro de Operadores (/admin/operadores)
- Listagem com busca e filtros
- Criar/editar operador (nome, matrícula, setor, função, status, foto)
- Geração automática do QR Code ao salvar
- Download do QR Code como PNG para impressão do crachá

### 8.4 Cadastro de Máquinas (/admin/maquinas)
- Listagem com busca e filtros por tipo/status
- Criar/editar máquina (código, tipo, modelo, patrimônio, setor)
- Troca de status com um clique (ativa / parada / manutenção)
- Geração automática do QR Code
- Download do QR Code como PNG para impressão da etiqueta

### 8.5 Cadastro de Operações (/admin/operacoes)
- Campos: código, descrição, tipo de máquina, T.P Operação
- Meta/hora calculada automaticamente ao digitar T.P
- Geração automática do QR Code
- Download do QR Code como PNG para impressão do cartão

### 8.6 Cadastro de Produtos (/admin/produtos)
- Campos: referência, nome, imagem
- Associação de operações em sequência (roteiro)
- T.P Produto calculado automaticamente (soma dos T.P das operações)
- T.P Produto exibido em destaque (usado para calcular Meta Grupo)

### 8.7 Relatórios (/admin/relatorios)
- Produção por operador (dia, semana, período)
- Produção por máquina
- Eficiência por operação
- Comparativo meta grupo vs realizado por dia
- Exportação em CSV

---

## 9. REGRAS DE NEGÓCIO

1. Um registro de produção exige sempre: operador + máquina + operação + quantidade
2. Operador e máquina ficam em memória na sessão do scanner — só operação e quantidade são informados a cada registro
3. Máquina com status "manutenção" bloqueia o registro — exibe mensagem ao operador
4. QR Code inválido (token não encontrado) exibe erro sem travar o fluxo
5. **Meta Individual** = `Math.floor(minutos_turno / tp_operacao)` — usa os minutos do turno do dia
6. **Meta Grupo** = `Math.floor((funcionarios_ativos × minutos_turno) / tp_produto)` — calculada ao salvar a configuração do turno
7. **T.P Produto** = soma dos `tempo_padrao_min` de todas as operações do roteiro do produto
8. Eficiência individual = `(qtd_produzida × tp_operacao / minutos_trabalhados) × 100`
9. Máquina sem registro por mais de `ALERTA_MAQUINA_PARADA` minutos gera alerta visual
10. Operador com eficiência abaixo de `ALERTA_EFICIENCIA_BAIXA` gera destaque amarelo
11. O dashboard atualiza em tempo real via Supabase Realtime — sem refresh manual
12. Apenas uma configuração de turno por dia (UNIQUE por data) — pode ser editada pelo supervisor
13. Se não houver configuração para o dia, o dashboard bloqueia com modal de preenchimento
14. Apenas usuários com role "admin" ou "supervisor" acessam rotas `/admin/*`
15. A rota `/scanner` é acessível sem autenticação — o QR do crachá é a identificação

---

## 10. FORA DO ESCOPO (MVP)

- Folha de ponto ou controle de jornada
- Pagamento por produção ou comissões
- Integração com ERP ou sistema contábil
- App nativo (iOS/Android) — PWA é suficiente para o MVP
- Múltiplas fábricas ou filiais
- Histórico de manutenção de máquinas
- Múltiplos produtos por dia (MVP assume 1 produto por configuração de turno)
