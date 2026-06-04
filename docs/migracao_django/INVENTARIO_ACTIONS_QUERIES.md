# INVENTARIO_ACTIONS_QUERIES.md — MDJ-1.3

> Mapa de Server Actions e Queries Supabase do sistema atual.
> Classifica cada arquivo por domínio, tipo de acesso, criticidade e estratégia de substituição para migração Django.
> Fonte: leitura direta de `lib/actions/` e `lib/queries/`.

---

## 1. Estado da leitura

Este inventário foi produzido sem executar SQL remoto e sem alterar dados ou código de produção.

Fontes usadas:

- `lib/actions/*.ts` (14 arquivos, ~4.800 linhas)
- `lib/queries/*.ts` (24 arquivos, ~7.000 linhas)
- `lib/queries/saldo-fisico-op.ts` (validação transversal usada por actions)

---

## 2. Resumo quantitativo

### 2.1 Server Actions (`lib/actions/`)

| Arquivo | Linhas | Domínio | Tipo | Criticidade |
|---|---:|---|---|---|
| `auth.ts` | 49 | Auth | Escrita (login/logout) | Alta |
| `maquinas.ts` | 199 | Cadastros | CRUD | Baixa |
| `operacoes.ts` | 530+ | Cadastros | CRUD + Storage | Média |
| `operadores.ts` | 183 | Cadastros | CRUD | Baixa |
| `setores.ts` | 117 | Cadastros | CRUD | Baixa |
| `produtos.ts` | 929 | Cadastros/Roteiro | CRUD + Storage + Versionamento | Alta |
| `qualidade-defeitos.ts` | 217 | Qualidade | CRUD catálogo | Baixa |
| `qualidade.ts` | 262 | Qualidade | Escrita transacional (RPC) | Crítica |
| `metas-mensais.ts` | 250 | Metas | CRUD | Média |
| `turno.ts` | 197 | Turno legado | Escrita (configuração diária) | Média/legado |
| `turno-blocos.ts` | 755 | Turno legado | CRUD blocos multi-produto | Média/legado |
| `turnos.ts` | 1484 | Turno V2 | Escrita complexa (abertura, OPs, carry-over) | Crítica |
| `producao.ts` | 379 | Produção | Escrita transacional (RPC) | Crítica |
| `usuarios-sistema.ts` | 216 | Auth/Usuários | CRUD + Supabase Auth Admin | Alta |

### 2.2 Queries (`lib/queries/`)

| Arquivo | Linhas | Domínio | Tipo | Criticidade |
|---|---:|---|---|---|
| `apontamentos.ts` | 20 | Apontamentos | Leitura simples | Baixa |
| `eficiencia-operacional-turno-base.ts` | 410 | Dashboard | Leitura + cálculo | Alta |
| `eficiencia-operacional-turno-client.ts` | 28 | Dashboard | Wrapper client | Baixa |
| `eficiencia-operacional-turno.ts` | 28 | Dashboard | Wrapper server | Baixa |
| `fluxo-sequencial-turno-base.ts` | 415 | Dashboard/Operacional | Leitura + cálculo | Alta |
| `maquinas.ts` | 50 | Cadastros | Leitura | Baixa |
| `meta-grupo-turno-v2-client.ts` | 49 | Dashboard | Leitura client | Média |
| `metas-mensais.ts` | 451 | Metas/Dashboard | Leitura + agregação mensal | Alta |
| `operacoes.ts` | 299 | Cadastros | Leitura + filtros | Baixa |
| `operadores.ts` | 40 | Cadastros | Leitura | Baixa |
| `producao.ts` | 205 | Produção | Leitura | Média |
| `produtos.ts` | 173 | Cadastros | Leitura | Baixa |
| `qrcodes.ts` | 17 | QR Codes | Leitura | Baixa |
| `qualidade-defeitos.ts` | 115 | Qualidade | Leitura catálogo | Baixa |
| `qualidade.ts` | 730 | Qualidade | Leitura + indicadores | Alta |
| `relatorios.ts` | 225 | Relatórios | Leitura legada | Média |
| `relatorios-v2.ts` | 1080 | Relatórios | Leitura + paginação + comparativo | Alta |
| `saldo-fisico-op.ts` | 193 | Produção/Qualidade | Validação transversal | Crítica |
| `scanner.ts` | 853 | Scanner | Leitura client-side (browser) | Alta |
| `setores.ts` | 33 | Cadastros | Leitura | Baixa |
| `turno-blocos.ts` | 117 | Turno legado | Leitura | Média/legado |
| `turno-capacidade-atual-base.ts` | 84 | Dashboard | Leitura | Média |
| `turnos-client.ts` | 829 | Turno V2 | Leitura client (realtime) | Alta |
| `turno-setor-operacoes-base.ts` | 320 | Turno V2 | Leitura base reutilizável | Alta |
| `turnos.ts` | 839 | Turno V2 | Leitura server (planejamento) | Alta |
| `turno.ts` | 49 | Turno legado | Leitura | Baixa |
| `usuarios-sistema.ts` | 80 | Auth/Usuários | Leitura | Média |

---

## 3. Dependências de Supabase por tipo de client

| Client | Uso | Arquivos |
|---|---|---|
| `createAdminClient` (service_role) | Mutações, CRUD admin, RPCs, Auth Admin | Todas as actions exceto `auth.ts` |
| `createClient` (server, cookie-based) | Login/logout, resolver usuário autenticado | `auth.ts`, `producao.ts`, `qualidade.ts` |
| `createClient` (browser) | Leituras client-side, realtime | `scanner.ts`, `turnos-client.ts`, `eficiencia-operacional-turno-client.ts`, `meta-grupo-turno-v2-client.ts` |
| `createClient` (server) | Leituras server-side | Maioria das queries server |

---

## 4. Classificação detalhada por domínio

### 4.1 Auth e Usuários

| Função | Arquivo | Tipo | Dependência Supabase | Estratégia Django |
|---|---|---|---|---|
| `entrarAdmin` | `actions/auth.ts` | Login | `supabase.auth.signInWithPassword` | Django Auth + session/JWT |
| `sairAdmin` | `actions/auth.ts` | Logout | `supabase.auth.signOut` | Django logout view |
| `criarUsuarioSistema` | `actions/usuarios-sistema.ts` | CRUD + Auth | `supabase.auth.admin.createUser` + insert `usuarios_sistema` | Django User + perfil |
| `editarUsuarioSistema` | `actions/usuarios-sistema.ts` | CRUD + Auth | `supabase.auth.admin.updateUserById` + update | Django User update |
| `inativarUsuarioSistema` | `actions/usuarios-sistema.ts` | Status | update `usuarios_sistema` | Django soft-delete |
| `buscarPapelAdminPorAuthUserId` | `queries/usuarios-sistema.ts` | Leitura | select `usuarios_sistema` | Django permission check |

**Nota:** A migração de auth é uma das mais sensíveis. Supabase Auth gerencia tokens, sessões e emails. Django Auth + django-allauth ou similar absorve isso.

### 4.2 Cadastros (Operadores, Máquinas, Setores, Operações)

| Função | Arquivo | Tipo | Estratégia Django |
|---|---|---|---|
| `criarOperador` / `editarOperador` / `excluirOperador` / `desativarOperador` | `actions/operadores.ts` | CRUD | ViewSet DRF + serializer |
| `criarMaquina` / `editarMaquina` / `trocarStatusMaquina` / `excluirMaquina` | `actions/maquinas.ts` | CRUD | ViewSet DRF + serializer |
| `criarSetor` / `editarSetor` / `excluirSetor` | `actions/setores.ts` | CRUD | ViewSet DRF + serializer |
| `criarOperacao` / `editarOperacao` / `desativarOperacao` / `excluirOperacao` | `actions/operacoes.ts` | CRUD + Storage | ViewSet DRF + upload handler |

**Padrão comum:** Todas usam `requireAdminUser` → `createAdminClient` → insert/update/delete direto. Validação de dependências antes de excluir (count registros vinculados). Migração direta para Django REST endpoints.

**Storage:** `operacoes.ts` usa Supabase Storage para imagens de operação (bucket `operacao-imagens`). Precisa de estratégia de storage no Django (S3/volume local).

### 4.3 Produtos e Roteiro Versionado

| Função | Arquivo | Tipo | Estratégia Django |
|---|---|---|---|
| `criarProduto` / `editarProduto` / `arquivarProduto` / `excluirProduto` | `actions/produtos.ts` | CRUD + Storage | ViewSet DRF + upload |
| Roteiro versionado (salvar operações do produto) | `actions/produtos.ts` | Escrita com versionamento | Service Django `ProdutoRoteiroService` |

**Criticidade alta:** O roteiro versionado usa `produto_operacoes` com `vigente`, `versao_roteiro` e `substituido_em`. A lógica de `roteiroVigenteFoiAlterado` e `obterProximaVersaoRoteiro` (de `lib/utils/produto-roteiro-versionamento.ts`) precisa ser portada como service transacional.

**Storage:** Usa bucket `produto-imagens` para frente/costa. Mesma estratégia de storage que operações.

### 4.4 Turno V2 (Crítico)

| Função | Arquivo | Tipo | Estratégia Django |
|---|---|---|---|
| `abrirTurnoV2` | `actions/turnos.ts` | Escrita complexa | `TurnoService.abrir()` com `transaction.atomic()` |
| `adicionarTurnoOpV2` | `actions/turnos.ts` | Escrita | `TurnoService.adicionar_op()` |
| `editarTurnoOpV2` | `actions/turnos.ts` | Escrita | `TurnoService.editar_op()` |
| `encerrarTurnoV2` | `actions/turnos.ts` | Escrita | `TurnoService.encerrar()` |
| `carregarPendenciasTurnoAnterior` | `actions/turnos.ts` | Leitura + carry-over | `TurnoService.carregar_pendencias()` |
| `salvarConfiguracaoTurno` | `actions/turno.ts` | Escrita legada | Manter compatibilidade ou deprecar |
| Blocos multi-produto | `actions/turno-blocos.ts` | CRUD legado | Manter compatibilidade |

**Criticidade máxima:** `turnos.ts` é o arquivo mais complexo (1484 linhas). Orquestra:
- Criação de turno com operadores e OPs
- Derivação de setores via roteiro vigente (`produto_operacoes.vigente = true`)
- Carry-over entre turnos (quantidade remanescente, OP de origem)
- Validação de OP física (`validarNovaOpFisica`)
- Chamadas a utils: `carry-over-turno`, `op-fisica`, `qualidade`

**Não usa RPC** — faz inserts/updates diretos com `createAdminClient`. A migração deve envolver `transaction.atomic()` para garantir atomicidade que hoje depende de triggers.

### 4.5 Produção (Crítico)

| Função | Arquivo | Tipo | RPC chamada | Estratégia Django |
|---|---|---|---|---|
| `registrarProducao` | `actions/producao.ts` | Escrita transacional | `registrar_producao_turno_setor_op` | Compatibilidade legada |
| `registrarProducaoOperacao` | `actions/producao.ts` | Escrita transacional | `registrar_producao_turno_setor_operacao` | `ProducaoService.registrar_apontamento_operacao()` |
| `registrarApontamentosSupervisor` | `actions/producao.ts` | Escrita em lote | `registrar_producao_supervisor_em_lote` | `ProducaoService.registrar_apontamentos_supervisor()` |

**Fluxo crítico:**
1. Validação de entrada (operador, quantidade, turno)
2. Resolução de usuário autenticado (quando supervisor)
3. Validação de saldo físico via `validarConsumoSaldoFisicoOperacoesComClient`
4. Chamada RPC transacional
5. Revalidação de cache Next.js

**Dependência transversal:** `saldo-fisico-op.ts` é usado tanto por produção quanto por qualidade. Consulta linhagem de OPs (raiz + carry-over) para calcular saldo acumulado.

### 4.6 Qualidade (Crítico)

| Função | Arquivo | Tipo | RPC chamada | Estratégia Django |
|---|---|---|---|---|
| `registrarRevisaoQualidade` | `actions/qualidade.ts` | Escrita transacional | `registrar_revisao_qualidade_turno_setor_operacao` | `QualidadeService.registrar_revisao_operacional()` |
| CRUD tipos defeito | `actions/qualidade-defeitos.ts` | CRUD catálogo | Nenhuma | ViewSet DRF |

**Fluxo crítico da revisão:**
1. Validação de quantidades (aprovada + reprovada > 0)
2. Validação de defeitos (obrigatórios quando reprovada > 0, unicidade por operação+tipo)
3. Resolução de revisor autenticado + permissão `pode_revisar_qualidade`
4. Cálculo de pendência/aprovação via `calcularResumoPendenciaAprovacaoQualidade`
5. Validação de saldo físico
6. Chamada RPC transacional com detalhes de defeitos

### 4.7 Metas Mensais

| Função | Arquivo | Tipo | Estratégia Django |
|---|---|---|---|
| `criarMetaMensal` / `editarMetaMensal` | `actions/metas-mensais.ts` | CRUD | ViewSet DRF |
| `buscarMetaMensalResumoDashboard` | `queries/metas-mensais.ts` | Leitura + agregação | Selector Django |

**Sem RPC.** CRUD direto com validação de competência e dias produtivos.

### 4.8 Scanner (Client-side)

| Função | Arquivo | Tipo | Estratégia Django |
|---|---|---|---|
| `buscarOperadorScaneadoPorToken` | `queries/scanner.ts` | Leitura browser | API endpoint read-only |
| `buscarMaquinaScaneadaPorToken` | `queries/scanner.ts` | Leitura browser | API endpoint read-only |
| `buscarTurnoSetorScaneadoPorToken` | `queries/scanner.ts` | Leitura browser (RPC) | API endpoint read-only |
| `buscarDemandasDoSetorScaneado` | `queries/scanner.ts` | Leitura browser | API endpoint read-only |
| `buscarOperacoesParaApontamento` | `queries/scanner.ts` | Leitura browser | API endpoint read-only |

**Nota:** Scanner usa `createClient` browser-side. No Django, esses viram endpoints REST públicos (ou com auth leve por token de operador). São candidatos naturais ao primeiro backend read-only.

### 4.9 Dashboard e Relatórios

| Arquivo | Domínio | Complexidade | Estratégia Django |
|---|---|---|---|
| `turnos.ts` (839L) | Planejamento turno | Alta | Selector complexo |
| `turnos-client.ts` (829L) | Realtime turno | Alta | Selector + polling/SSE |
| `relatorios-v2.ts` (1080L) | Relatórios paginados | Alta | Selector + paginação DRF |
| `eficiencia-operacional-turno-base.ts` (410L) | Eficiência | Alta | Selector + cálculo |
| `fluxo-sequencial-turno-base.ts` (415L) | Fluxo operacional | Alta | Selector |
| `qualidade.ts` (730L) | Indicadores qualidade | Alta | Selector |
| `metas-mensais.ts` (451L) | Meta mensal + evolução | Alta | Selector |

**Padrão:** Queries complexas fazem múltiplos selects Supabase, depois consolidam em memória usando funções de `lib/utils/`. A lógica de consolidação já está em TypeScript puro testado — pode ser portada para Python ou mantida no frontend consumindo dados brutos da API Django.

---

## 5. Dependências de Supabase Storage

| Arquivo | Bucket | Operações |
|---|---|---|
| `actions/operacoes.ts` | `operacao-imagens` | upload, remove, getPublicUrl, listBuckets, createBucket |
| `actions/produtos.ts` | `produto-imagens` | upload, remove, getPublicUrl, listBuckets, createBucket |

**Estratégia:** Migrar para Django + django-storages (S3 ou filesystem local com nginx). URLs públicas precisam ser preservadas ou redirecionadas durante transição.

---

## 6. Dependências de Supabase Auth

| Arquivo | Operação Auth |
|---|---|
| `actions/auth.ts` | `signInWithPassword`, `signOut` |
| `actions/usuarios-sistema.ts` | `auth.admin.createUser`, `auth.admin.updateUserById`, `auth.admin.deleteUser` |
| `actions/producao.ts` | `auth.getUser` (resolver usuário autenticado) |
| `actions/qualidade.ts` | `auth.getUser` (resolver revisor) |
| `lib/auth/require-admin-user.ts` | `auth.getUser` + verificação de papel |

**Estratégia:** Django Auth com sessão ou JWT. Migração de usuários existentes requer exportar `auth.users` do Supabase e importar no Django com senhas hasheadas (ou forçar reset).

---

## 7. Prioridade de migração por camada

### 7.1 Primeira onda — Leituras read-only (candidatas ao backend paralelo)

1. Scanner: `buscarOperadorScaneadoPorToken`, `buscarMaquinaScaneadaPorToken`, `buscarTurnoSetorScaneadoPorToken`
2. Cadastros: operadores, máquinas, setores, operações, produtos
3. Metas mensais (leitura)
4. QR codes

### 7.2 Segunda onda — Leituras complexas (dashboard/relatórios)

1. Planejamento de turno (server)
2. Eficiência operacional
3. Indicadores de qualidade
4. Relatórios paginados
5. Meta mensal com evolução diária

### 7.3 Terceira onda — Mutações não-críticas

1. CRUD cadastros (operadores, máquinas, setores, operações)
2. CRUD produtos (sem roteiro)
3. CRUD tipos de defeito
4. CRUD metas mensais
5. Configuração de turno legada

### 7.4 Quarta onda — Mutações críticas (transacionais)

1. Roteiro versionado de produto
2. Abertura de turno V2 (com derivação de setores/operações)
3. Adição/edição de OP no turno
4. Carry-over entre turnos
5. Apontamento produtivo por operação (`registrar_producao_turno_setor_operacao`)
6. Apontamento supervisor em lote
7. Revisão de qualidade operacional
8. Encerramento de turno

### 7.5 Quinta onda — Auth e Storage

1. Login/logout Django
2. Gestão de usuários do sistema
3. Migração de imagens (operações e produtos)

---

## 8. Padrões observados para informar arquitetura Django

### 8.1 Padrão de Action atual

```
requireAdminUser() → createAdminClient() → validação → insert/update/delete ou .rpc() → revalidatePath()
```

No Django:
```
@permission_required → service/viewset → validação (serializer) → transaction.atomic() → response
```

### 8.2 Padrão de Query atual

```
createClient(server|browser) → .from(tabela).select(campos).eq/in/or → mapear para tipo de domínio
```

No Django:
```
selector function → queryset com select_related/prefetch → serializer de saída
```

### 8.3 Validação de saldo físico (transversal)

Usado por produção e qualidade. Consulta linhagem de OPs (raiz + carry-over) para calcular produção acumulada por operação na OP física. Deve virar domain function testável no Django, chamada por ambos os services.

### 8.4 Consolidação em memória

Queries complexas (dashboard, relatórios, metas) fazem múltiplos selects e consolidam com funções de `lib/utils/`. Opções:
- **Opção A:** Portar consolidação para Python (selectors Django)
- **Opção B:** Manter consolidação no frontend, API Django retorna dados brutos
- **Recomendação:** Opção A para dados que alimentam múltiplos consumidores (dashboard, TV, relatórios). Opção B para consolidações específicas de uma tela.

---

## 9. Riscos identificados

1. **`turnos.ts` sem transação explícita.** Hoje faz múltiplos inserts sequenciais sem RPC. Se um falhar no meio, o turno fica inconsistente. Django deve usar `transaction.atomic()`.
2. **Scanner client-side sem auth.** Usa Supabase anon key. No Django, precisa de estratégia de auth leve (token de sessão do operador ou endpoint público com rate limiting).
3. **Realtime.** `turnos-client.ts` e hooks de realtime dependem de Supabase Realtime (CDC). Django precisará de polling, SSE ou Django Channels em fase posterior.
4. **Storage URLs.** Imagens de produtos e operações têm URLs Supabase persistidas no banco. Migração precisa de redirect ou reescrita de URLs.
5. **Auth Admin API.** `usuarios-sistema.ts` usa `auth.admin.createUser` que não existe em Django. Precisa de management command ou endpoint admin equivalente.

---

## 10. Checklist de paridade para cutover

Para cada action/query migrada, validar:

- [ ] Mesmos campos de entrada aceitos
- [ ] Mesmas validações de negócio aplicadas
- [ ] Mesmo comportamento transacional (atomicidade)
- [ ] Mesmos campos de saída retornados
- [ ] Mesmas regras de permissão
- [ ] Saldo físico respeitado (quando aplicável)
- [ ] Carry-over preservado (quando aplicável)
- [ ] Roteiro vigente usado corretamente (quando aplicável)
- [ ] Revalidação de cache substituída por invalidação adequada no frontend
