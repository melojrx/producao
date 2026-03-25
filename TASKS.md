# TASKS.md — Especificação Técnica por Sprint

> Este é o arquivo de trabalho da IA.
> Para cada task: executar → validar evidência → marcar [x] → descrever o que foi feito.
> Nunca avançar para a próxima sprint sem todas as tasks marcadas e evidências registradas.
> Ao concluir uma sprint, atualizar o status no BACKLOG.md.

---

## INSTRUÇÃO PARA O AGENTE

Antes de iniciar qualquer sprint, leia na ordem:
1. `CLAUDE.md` — contexto técnico permanente (stack, padrões, convenções)
2. `docs/PRD.md` — contexto de negócio (fluxos, regras, modelo físico dos QR Codes)
3. `docs/TASKS.md` — este arquivo (sprints, tasks, evidências)

Só inicie a execução após confirmar a leitura dos 3 documentos.

Para cada task:
1. Execute o que está especificado
2. Valide a evidência descrita
3. Marque [x] no checkbox
4. Escreva uma linha abaixo descrevendo o que foi feito

Ao concluir todas as tasks de uma sprint:
1. Atualize o status da sprint no `docs/BACKLOG.md`
2. Informe quais evidências foram validadas
3. Aguarde minha confirmação antes de avançar para a próxima sprint

Nunca avance de sprint sem confirmação explícita minha.

---

## SPRINT 0 — Scaffolding e infraestrutura
**Status:** ✅ Concluída
**Objetivo:** Projeto rodando localmente com Supabase conectado.

- [x] **0.1 — Criar projeto Next.js**
  `npm run dev` respondeu em localhost:3000, pronto em 234ms, sem erros de compilação.

- [x] **0.2 — Instalar dependências**
  Instalados: `@supabase/ssr`, `@supabase/supabase-js`, `react-qr-code`, `html5-qrcode`, `recharts`, `framer-motion`, `lucide-react`. `npm run build` completo sem erros.

- [x] **0.3 — Configurar TypeScript strict**
  `tsconfig.json` com `strict`, `noImplicitAny` e `strictNullChecks` habilitados. `npx tsc --noEmit` passa sem erros.

- [x] **0.4 — Criar projeto no Supabase e configurar variáveis**
  `.env.local` criado com URL e anon key. `lib/supabase/client.ts` e `lib/supabase/server.ts` criados.
  ⚠️ `SUPABASE_SERVICE_ROLE_KEY` pendente — usuário ainda não forneceu. Verificação de conexão será validada na Sprint 1.

- [x] **0.5 — Criar estrutura de pastas**
  Todos os diretórios criados conforme CLAUDE.md seção 5. `lib/constants.ts` com todas as constantes. `types/index.ts` com interfaces de domínio.

- [x] **0.6 — Middleware de autenticação**
  `middleware.ts` na raiz + `lib/supabase/middleware.ts` protegendo `/admin/*`. Rotas `/scanner` e `/login` públicas.

- [x] **0.7 — Layout base admin**
  `app/(admin)/layout.tsx` com sidebar responsiva (colapsável em mobile), header e nav com 5 links usando Lucide React e Tailwind. Páginas placeholder criadas para todas as rotas admin.

---

## SPRINT 1 — Banco de dados
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 0 concluída.
**Objetivo:** Schema completo no Supabase com views, configuração de turno e Realtime habilitado.

- [x] **1.1 — Tabela: tipos_maquina**
  ```sql
  CREATE TABLE tipos_maquina (
    codigo VARCHAR(10) PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    descricao TEXT
  );

  INSERT INTO tipos_maquina VALUES
    ('rt',  'Máquina Reta', 'Ponto fixo, costura reta'),
    ('ov',  'Overloque', 'Corta e cose simultaneamente'),
    ('2ag', 'Duas Agulhas', 'Costura paralela dupla'),
    ('gal', 'Galoneira', 'Ponto corrente cobrindo borda'),
    ('man', 'Manual', 'Operação manual sem máquina'),
    ('bot', 'Botoneira', 'Pregar botões'),
    ('cas', 'Caseadeira', 'Fazer casas de botão');
  ```
  **Evidência:** `SELECT * FROM tipos_maquina` retorna 7 registros. ✅ Confirmado via MCP.

- [x] **1.2 — Tabela: operadores**
  ```sql
  CREATE TABLE operadores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    setor VARCHAR(50),
    funcao VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ativo'
      CHECK (status IN ('ativo', 'inativo', 'afastado')),
    qr_code_token VARCHAR(64) UNIQUE NOT NULL
      DEFAULT encode(gen_random_bytes(32), 'hex'),
    foto_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
  **Evidência:** 5 operadores inseridos via seed, `qr_code_token` gerado automaticamente pelo DEFAULT. ✅

- [x] **1.3 — Tabela: maquinas**
  ```sql
  CREATE TABLE maquinas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    tipo_maquina_codigo VARCHAR(10)
      REFERENCES tipos_maquina(codigo),
    modelo VARCHAR(100),
    marca VARCHAR(50),
    numero_patrimonio VARCHAR(50),
    setor VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ativa'
      CHECK (status IN ('ativa', 'parada', 'manutencao')),
    qr_code_token VARCHAR(64) UNIQUE NOT NULL
      DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
  **Evidência:** 5 máquinas inseridas via seed, `qr_code_token` gerado automaticamente. ✅

- [x] **1.4 — Tabela: operacoes**
  ```sql
  CREATE TABLE operacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    descricao VARCHAR(200) NOT NULL,
    tipo_maquina_codigo VARCHAR(10)
      REFERENCES tipos_maquina(codigo),
    tempo_padrao_min DECIMAL(8,6) NOT NULL,
    meta_hora INTEGER,
    meta_dia INTEGER,
    qr_code_token VARCHAR(64) UNIQUE NOT NULL
      DEFAULT encode(gen_random_bytes(32), 'hex'),
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```
  Nota: `meta_hora` e `meta_dia` são calculados na camada de aplicação via
  `calcularMetaHora()` e `calcularMetaDia()` em `lib/utils/producao.ts`
  e persistidos junto ao registro para consulta rápida.
  **Evidência:** 10 operações inseridas via seed, incluindo OP-01 com `tempo_padrao_min = 0.28`. ✅

- [x] **1.5 — Tabelas: produtos e produto_operacoes**
  ```sql
  CREATE TABLE produtos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referencia VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(200) NOT NULL,
    imagem_url TEXT,
    tp_produto_min DECIMAL(10,4),   -- soma dos T.P do roteiro, calculado ao salvar
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE produto_operacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
    operacao_id UUID REFERENCES operacoes(id),
    sequencia INTEGER NOT NULL,
    UNIQUE(produto_id, sequencia)
  );
  ```
  **Evidência:** 2 produtos com roteiros completos (REF-001: 5 ops, REF-002: 6 ops). ✅

- [x] **1.6 — Tabela: configuracao_turno**
  ```sql
  CREATE TABLE configuracao_turno (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    funcionarios_ativos INTEGER NOT NULL
      CHECK (funcionarios_ativos > 0),
    minutos_turno INTEGER NOT NULL
      CHECK (minutos_turno > 0),
    produto_id UUID REFERENCES produtos(id),
    tp_produto_min DECIMAL(10,4),   -- snapshot do T.P no momento da configuração
    meta_grupo INTEGER,              -- (funcionarios_ativos × minutos_turno) / tp_produto_min
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(data)                     -- apenas 1 configuração por dia
  );
  ```
  **Evidência:** Configuração do dia inserida via seed (`meta_grupo = 1888`, 5 funcionários, 540 min). Constraint UNIQUE(data) ativa. ✅

- [x] **1.7 — Tabela: registros_producao**
  ```sql
  CREATE TABLE registros_producao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operador_id UUID REFERENCES operadores(id) NOT NULL,
    maquina_id UUID REFERENCES maquinas(id),
    operacao_id UUID REFERENCES operacoes(id) NOT NULL,
    produto_id UUID REFERENCES produtos(id),
    quantidade INTEGER NOT NULL DEFAULT 1
      CHECK (quantidade > 0),
    turno VARCHAR(10) CHECK (turno IN ('manha', 'tarde', 'noite')),
    data_producao DATE DEFAULT CURRENT_DATE,
    hora_registro TIMESTAMPTZ DEFAULT NOW(),
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_registros_data ON registros_producao(data_producao);
  CREATE INDEX idx_registros_operador ON registros_producao(operador_id, data_producao);
  CREATE INDEX idx_registros_hora ON registros_producao(hora_registro);
  ```
  **Evidência:** Tabela criada com 3 índices (data, operador+data, hora_registro). ✅

- [x] **1.8 — Views analíticas**
  ```sql
  -- Produção por operador hoje com eficiência
  CREATE OR REPLACE VIEW vw_producao_hoje AS
  SELECT
    o.id AS operador_id,
    o.nome AS operador_nome,
    o.status AS operador_status,
    COUNT(rp.id) AS total_registros,
    COALESCE(SUM(rp.quantidade), 0) AS total_pecas,
    COALESCE(SUM(rp.quantidade * op.tempo_padrao_min), 0) AS minutos_produtivos,
    COALESCE(
      ROUND((SUM(rp.quantidade * op.tempo_padrao_min) /
        NULLIF((SELECT minutos_turno FROM configuracao_turno
                WHERE data = CURRENT_DATE LIMIT 1), 0)
      ) * 100, 2),
    0) AS eficiencia_pct
  FROM operadores o
  LEFT JOIN registros_producao rp
    ON rp.operador_id = o.id
    AND rp.data_producao = CURRENT_DATE
  LEFT JOIN operacoes op ON op.id = rp.operacao_id
  WHERE o.status = 'ativo'
  GROUP BY o.id, o.nome, o.status
  ORDER BY eficiencia_pct DESC NULLS LAST;

  -- Status das máquinas com tempo sem uso
  CREATE OR REPLACE VIEW vw_status_maquinas AS
  SELECT
    m.id,
    m.codigo,
    tm.nome AS tipo_nome,
    m.status,
    MAX(rp.hora_registro) AS ultimo_uso,
    EXTRACT(EPOCH FROM (NOW() - MAX(rp.hora_registro)))/60
      AS minutos_sem_uso
  FROM maquinas m
  JOIN tipos_maquina tm ON tm.codigo = m.tipo_maquina_codigo
  LEFT JOIN registros_producao rp
    ON rp.maquina_id = m.id
    AND rp.data_producao = CURRENT_DATE
  GROUP BY m.id, m.codigo, tm.nome, m.status;

  -- Produção por hora para o gráfico
  CREATE OR REPLACE VIEW vw_producao_por_hora AS
  SELECT
    DATE_TRUNC('hour', hora_registro) AS hora,
    COUNT(*) AS total_registros,
    SUM(quantidade) AS total_pecas
  FROM registros_producao
  WHERE data_producao = CURRENT_DATE
  GROUP BY DATE_TRUNC('hour', hora_registro)
  ORDER BY hora;
  ```
  **Evidência:** 3 views criadas. `vw_producao_hoje` usa `configuracao_turno` do dia (não valor fixo). ✅

- [x] **1.9 — Row Level Security (RLS)**
  ```sql
  ALTER TABLE registros_producao ENABLE ROW LEVEL SECURITY;
  ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
  ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
  ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE configuracao_turno ENABLE ROW LEVEL SECURITY;

  -- Leitura pública para o scanner
  CREATE POLICY "leitura_publica_operadores" ON operadores
    FOR SELECT USING (true);
  CREATE POLICY "leitura_publica_maquinas" ON maquinas
    FOR SELECT USING (true);
  CREATE POLICY "leitura_publica_operacoes" ON operacoes
    FOR SELECT USING (true);
  CREATE POLICY "leitura_publica_config_turno" ON configuracao_turno
    FOR SELECT USING (true);

  -- Inserção de produção pública (qualquer scan registra)
  CREATE POLICY "insercao_producao_publica" ON registros_producao
    FOR INSERT WITH CHECK (true);

  -- Leitura de produção apenas autenticados
  CREATE POLICY "leitura_producao_autenticados" ON registros_producao
    FOR SELECT USING (auth.role() = 'authenticated');
  ```
  **Evidência:** RLS ativo em 5 tabelas. Políticas de leitura pública e inserção aberta para o scanner. ✅

- [x] **1.10 — Habilitar Realtime**
  No Supabase Dashboard → Database → Replication → Tables:
  - Habilitar `registros_producao` (INSERT)
  - Habilitar `maquinas` (UPDATE)
  **Evidência:** `public.registros_producao` e `public.maquinas` adicionadas à publication `supabase_realtime`; validação feita com `pg_publication_tables`, retornando ambas as tabelas.

- [x] **1.11 — Gerar types TypeScript e criar types de domínio**
  ```bash
  npx supabase gen types typescript --project-id SEU_PROJECT_ID > types/supabase.ts
  ```
  Criar `types/index.ts`:
  ```typescript
  export type QRTipo = 'operador' | 'maquina' | 'operacao'

  export interface QRScanResult {
    tipo: QRTipo
    token: string
  }

  export interface OperadorScaneado {
    id: string
    nome: string
    matricula: string
    fotoUrl: string | null
  }

  export interface MaquinaScaneada {
    id: string
    codigo: string
    tipoNome: string
    status: 'ativa' | 'parada' | 'manutencao'
  }

  export interface OperacaoScaneada {
    id: string
    descricao: string
    metaHora: number
    metaIndividual: number     // calculado com minutos_turno do dia
    tempoPadraoMin: number
  }

  export interface SessaoScanner {
    operador: OperadorScaneado
    maquina: MaquinaScaneada | null
  }

  export interface ConfiguracaoTurno {
    id: string
    data: string
    funcionariosAtivos: number
    minutosTurno: number
    produtoId: string | null
    tpProdutoMin: number | null
    metaGrupo: number | null
  }
  ```
  **Evidência:** `types/supabase.ts` gerado via MCP. `types/index.ts` com todas as interfaces. `npx tsc --noEmit` passa sem erros. ✅

- [x] **1.12 — Seed de dados para desenvolvimento**
  Criar `lib/seed.sql` com:
  - 5 operadores de teste
  - 5 máquinas de teste (tipos variados: rt, ov, 2ag, gal, man)
  - 10 operações de teste baseadas na planilha Raizen (unir etiquetas, pregar bolso, etc.)
  - 2 produtos com roteiro completo (incluindo `tp_produto_min` calculado)
  - 1 configuração de turno para hoje (20 funcionários, 540 min, produto 1)
  **Evidência:** `vw_producao_hoje` retorna 5 operadores. `configuracao_turno` retorna `meta_grupo = 1888`. ✅

---

## SPRINT 2 — Cadastros (CRUD)
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 1 concluída.
**Objetivo:** Admin cadastra operadores, máquinas, operações e produtos com QR Code gerado.

- [x] **2.0 — lib/utils/producao.ts e lib/utils/qrcode.ts**

  Criar `lib/utils/producao.ts`:
  ```typescript
  import { MINUTOS_TURNO_PADRAO } from '@/lib/constants'

  export function calcularMetaHora(tempoPadraoMin: number): number {
    if (tempoPadraoMin <= 0) return 0
    return Math.floor(60 / tempoPadraoMin)
  }

  export function calcularMetaDia(
    tempoPadraoMin: number,
    minutosTurno = MINUTOS_TURNO_PADRAO
  ): number {
    if (tempoPadraoMin <= 0) return 0
    return Math.floor(minutosTurno / tempoPadraoMin)
  }

  export function calcularMetaIndividual(
    minutosTurno: number,
    tpOperacao: number
  ): number {
    if (tpOperacao <= 0 || minutosTurno <= 0) return 0
    return Math.floor(minutosTurno / tpOperacao)
  }

  export function calcularMetaGrupo(
    funcionariosAtivos: number,
    minutosTurno: number,
    tpProduto: number
  ): number {
    if (tpProduto <= 0 || funcionariosAtivos <= 0 || minutosTurno <= 0) return 0
    return Math.floor((funcionariosAtivos * minutosTurno) / tpProduto)
  }

  export function calcularTpProduto(
    operacoes: Array<{ tempoPadraoMin: number }>
  ): number {
    return operacoes.reduce((soma, op) => soma + op.tempoPadraoMin, 0)
  }

  export function calcularEficiencia(
    quantidadeProduzida: number,
    tpOperacao: number,
    minutosTrabalhados: number
  ): number {
    if (minutosTrabalhados <= 0) return 0
    const minutosNecessarios = quantidadeProduzida * tpOperacao
    return Math.round((minutosNecessarios / minutosTrabalhados) * 100)
  }
  ```

  Criar `lib/utils/qrcode.ts`:
  ```typescript
  import { QRTipo, QRScanResult } from '@/types'

  const TIPOS_VALIDOS: QRTipo[] = ['operador', 'maquina', 'operacao']

  export function parseQRCode(raw: string): QRScanResult | null {
    const parts = raw.split(':')
    if (parts.length !== 2) return null
    const [tipo, token] = parts
    if (!TIPOS_VALIDOS.includes(tipo as QRTipo)) return null
    if (!token || token.length < 10) return null
    return { tipo: tipo as QRTipo, token }
  }
  ```

  **Evidência:**
  - `calcularMetaHora(0.28)` → `214`
  - `calcularMetaIndividual(540, 0.28)` → `1928`
  - `calcularMetaGrupo(20, 540, 13.89)` → `777`
  - `calcularTpProduto([{tempoPadraoMin: 0.28}, {tempoPadraoMin: 0.10}])` → `0.38`
  - `parseQRCode('operador:abc123def456')` → `{ tipo: 'operador', token: 'abc123def456' }`
  - `parseQRCode('invalido')` → `null`
  Criados durante a Sprint 1. `tsc --noEmit` passa sem erros. ✅

- [x] **2.1 — CRUD Operadores**
  Arquivos:
  - `lib/actions/operadores.ts` — Server Actions: `criarOperador`, `editarOperador`, `excluirOperador`
  - `lib/queries/operadores.ts` — `listarOperadores`, `buscarOperadorPorToken`
  - `app/(admin)/operadores/page.tsx` — listagem com busca
  - `components/ui/ModalOperador.tsx` — formulário criar/editar
  - `components/qrcode/QRCodeDisplay.tsx` — exibe QR + botão download PNG

  QR Code: codifica `operador:{qr_code_token}`. Download via canvas `toDataURL`.
  **Evidência:** CRUD implementado com listagem, busca, modal de criação/edição, tela de detalhes em `/admin/operadores/[id]`, QR Code com download PNG e regra segura de desativação/exclusão. `npx tsc --noEmit` passa. ✅
  Implementado em `lib/actions/operadores.ts`, `lib/queries/operadores.ts`, `app/(admin)/operadores/page.tsx`, `app/(admin)/operadores/ListaOperadores.tsx`, `components/ui/ModalOperador.tsx`, `app/admin/operadores/[id]/page.tsx` e `components/qrcode/QRCodeDisplay.tsx`.

- [x] **2.2 — CRUD Máquinas**
  Arquivos:
  - `lib/actions/maquinas.ts` — `criarMaquina`, `editarMaquina`, `trocarStatusMaquina`
  - `lib/queries/maquinas.ts` — `listarMaquinas`, `buscarMaquinaPorToken`
  - `app/(admin)/maquinas/page.tsx`
  - `components/ui/ModalMaquina.tsx`

  Troca de status: disponível na edição da máquina e na tela de detalhes; removida da listagem por decisão de UX durante a sprint.
  **Evidência:** CRUD implementado com listagem, busca, modal de criação/edição, tela de detalhes em `/admin/maquinas/[id]`, QR Code com download PNG e ações seguras de parada/exclusão. `npx tsc --noEmit` passa. ✅
  Implementado em `lib/actions/maquinas.ts`, `lib/queries/maquinas.ts`, `app/(admin)/maquinas/page.tsx`, `app/(admin)/maquinas/ListaMaquinas.tsx`, `components/ui/ModalMaquina.tsx`, `app/admin/maquinas/[id]/page.tsx` e `components/qrcode/QRCodeDisplay.tsx`.

- [x] **2.3 — CRUD Operações**
  Arquivos:
  - `lib/actions/operacoes.ts` — `criarOperacao`, `editarOperacao`
  - `lib/queries/operacoes.ts` — `listarOperacoes`, `buscarOperacaoPorToken`
  - `app/(admin)/operacoes/page.tsx`
  - `components/ui/ModalOperacao.tsx`

  Ao digitar `tempo_padrao_min`, calcular e exibir em tempo real:
  - Meta/hora via `calcularMetaHora()`
  - Meta/dia via `calcularMetaDia()` (usa `MINUTOS_TURNO_PADRAO` como referência)
  Persistir `meta_hora` e `meta_dia` calculados no banco.
  **Evidência:** CRUD implementado com cálculo em tempo real de meta/hora e meta/dia no modal, persistência de `meta_hora`/`meta_dia`, tela de detalhes em `/admin/operacoes/[id]` e QR Code com download PNG. `MINUTOS_TURNO_PADRAO` alinhado em `lib/constants.ts`. `npx tsc --noEmit` passa. ✅
  Implementado em `lib/actions/operacoes.ts`, `lib/queries/operacoes.ts`, `app/(admin)/operacoes/page.tsx`, `app/(admin)/operacoes/ListaOperacoes.tsx`, `components/ui/ModalOperacao.tsx`, `app/admin/operacoes/[id]/page.tsx`, `lib/utils/producao.ts` e `components/qrcode/QRCodeDisplay.tsx`.

- [x] **2.4 — CRUD Produtos com roteiro**
  Arquivos:
  - `lib/actions/produtos.ts` — `criarProduto`, `editarProduto`, `salvarRoteiro`
  - `lib/queries/produtos.ts` — `listarProdutos`, `buscarProdutoComRoteiro`
  - `app/(admin)/produtos/page.tsx`
  - `components/ui/ModalProduto.tsx`

  Ao adicionar/remover operação do roteiro:
  - Recalcular `tp_produto_min` via `calcularTpProduto()`
  - Exibir T.P Produto em destaque (é o valor usado para Meta Grupo)
  Persistir `tp_produto_min` na tabela `produtos`.
  **Evidência:** CRUD implementado com montagem visual do roteiro, reordenação, recálculo em tempo real de `tp_produto_min`, persistência do roteiro e tela de detalhes em `/admin/produtos/[id]` sem QR Code. `npx tsc --noEmit` passa. ✅
  Implementado em `lib/actions/produtos.ts`, `lib/queries/produtos.ts`, `app/(admin)/produtos/page.tsx`, `app/(admin)/produtos/ListaProdutos.tsx`, `components/ui/ModalProduto.tsx` e `app/admin/produtos/[id]/page.tsx`.

**Evidências consolidadas da Sprint 2:**
- CRUDs de operadores, máquinas, operações e produtos implementados e acessíveis na área admin.
- Rotas de detalhe criadas para operadores, máquinas, operações e produtos.
- QR Code com download PNG disponível para operadores, máquinas e operações.
- Login real de admin/supervisor implementado com proteção de rotas `/admin/*`, `proxy.ts` e autorização nas Server Actions.
- `MINUTOS_TURNO_PADRAO` alinhado com `lib/constants.ts` e consumido pelas funções de cálculo.
- `npx tsc --noEmit` passa sem erros.
- `npm run build -- --webpack` validado anteriormente sem erros de compilação.

---

## SPRINT 3 — Scanner mobile
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 2 concluída.
**Objetivo:** Operador registra produção completa pelo celular.

- [x] **3.1 — Hook useScanner**
  Criar `hooks/useScanner.ts`:
  ```typescript
  type EstadoScanner =
    | { etapa: 'scan_operador' }
    | { etapa: 'scan_maquina'; operador: OperadorScaneado }
    | { etapa: 'scan_operacao'; operador: OperadorScaneado; maquina: MaquinaScaneada }
    | { etapa: 'confirmar'; operador: OperadorScaneado; maquina: MaquinaScaneada; operacao: OperacaoScaneada }
  ```
  Ações: `scanOperador`, `scanMaquina`, `scanOperacao`, `registrar`, `resetarOperacao`, `resetarTudo`
  Ao carregar `OperacaoScaneada`, buscar `configuracao_turno` do dia e calcular `metaIndividual` via `calcularMetaIndividual()`.
  **Evidência:** Estados transitam corretamente. `metaIndividual` é calculado com `minutos_turno` do dia, não com o fallback.
  Hook `useScanner` implementado com máquina de estados, queries client-side para operador/máquina/operação/configuração do turno e cálculo de `metaIndividual` a partir de `configuracao_turno.minutos_turno`; `npx tsc --noEmit` passa sem erros.

- [x] **3.2 — Componente QRScanner**
  Criar `components/scanner/QRScanner.tsx` como Client Component.
  Usar `html5-qrcode` com câmera traseira por padrão.
  Chamar `parseQRCode()` no resultado.
  Exibir overlay com guia visual de escaneamento.
  **Evidência:** Componente abre câmera no celular, lê QR de operador de teste e retorna token correto.
  `components/scanner/QRScanner.tsx` validado em celular físico com leitura real de QR no fluxo do scanner; câmera traseira, parse do código e bloqueios de contexto/permissão funcionando no túnel externo.

- [x] **3.3 — Tela /scanner completa**
  Criar `app/(operador)/scanner/page.tsx` como Client Component.
  Fluxo dos 3 estados conforme PRD seção 5:
  - `scan_operador`: câmera + instrução "Escaneie seu crachá"
  - `scan_maquina`: operador identificado + câmera + instrução "Escaneie a máquina"
  - `scan_operacao`: operador + máquina + câmera + instrução "Escaneie a operação"
  - `confirmar`: operação + meta individual do dia + meta/hora + controle de quantidade + botão registrar

  Bloqueios:
  - Máquina com status "manutencao" → alerta vermelho, não avança
  - QR com tipo errado → erro, repete o scan
  **Evidência:** Fluxo completo testado em celular físico. Testar bloqueio de máquina em manutenção.
  Fluxo completo validado em celular físico: operador, máquina e operação escaneados com sucesso; QR de tipo errado bloqueia avanço e máquina em `manutencao` exibe erro e impede continuidade.

- [x] **3.4 — Componente de confirmação e registro**
  Criar `components/scanner/ConfirmacaoRegistro.tsx`.
  Exibir: nome da operação, meta individual do dia, meta/hora.
  Botão "Registrar" com `min-height: 56px` (touch-friendly), verde.
  Após sucesso: animação verde (Framer Motion 800ms) + `navigator.vibrate(200)` + retorna ao `scan_operacao`.
  **Evidência:** Registrar 3 peças, confirmar 3 registros no Supabase com dados corretos.
  `components/scanner/ConfirmacaoRegistro.tsx` implementado e validado em celular: operação, meta individual e meta/hora exibidas; botão registrar dispara animação verde, vibração e retorno automático para `scan_operacao`.

- [x] **3.5 — Server Action de registro de produção**
  Criar `lib/actions/producao.ts`:
  ```typescript
  export async function registrarProducao(input: {
    operadorId: string
    maquinaId: string
    operacaoId: string
    quantidade: number
  }): Promise<{ sucesso: boolean; erro?: string }>
  ```
  Validações: `quantidade >= 1`, operador ativo, máquina ativa (não manutenção), operação ativa.
  **Evidência:** Dados válidos → registro criado. Máquina em manutenção → retorna erro descritivo.
  `lib/actions/producao.ts` validada com registro persistido no Supabase (`registros_producao` em `2026-03-25`) e erro descritivo confirmado ao tentar registrar com máquina em `manutencao`.

---

## SPRINT 4 — Dashboard em tempo real
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 2 concluída. (Pode rodar em paralelo com Sprint 3)
**Objetivo:** Dashboard atualiza automaticamente. Metas calculadas com base na configuração do turno.

- [x] **4.1 — Server Action e query de configuração do turno**
  Criar `lib/actions/turno.ts`:
  ```typescript
  export async function salvarConfiguracaoTurno(input: {
    funcionariosAtivos: number
    minutosTurno: number
    produtoId: string
  }): Promise<{ sucesso: boolean; metaGrupo: number; erro?: string }>
  ```
  Lógica ao salvar:
  1. Buscar operações do roteiro do produto
  2. Calcular `tpProduto` via `calcularTpProduto()`
  3. Calcular `metaGrupo` via `calcularMetaGrupo()`
  4. Persistir em `configuracao_turno` (upsert por data)

  Criar `lib/queries/turno.ts`:
  ```typescript
  export async function buscarConfiguracaoHoje(): Promise<ConfiguracaoTurno | null>
  ```
  **Evidência:** Salvar configuração com 20 funcionários, 540 min, produto com T.P total 13.89 → `meta_grupo = 777` no banco.
  `lib/actions/turno.ts` e `lib/queries/turno.ts` implementados com cálculo de `tpProduto` e `metaGrupo`, `upsert` por data e leitura server-side da configuração atual; persistência confirmada no Supabase em `2026-03-25` com `funcionarios_ativos = 25`, `minutos_turno = 540`, `tp_produto_min = 1.43` e `meta_grupo = 9440`.

- [x] **4.2 — Modal de configuração do turno**
  Criar `components/dashboard/ModalConfiguracaoTurno.tsx`.
  3 campos:
  - `funcionarios_ativos` — input numérico
  - `minutos_turno` — input numérico (sugestão: 480 ou 540)
  - `produto_id` — select com lista de produtos ativos (exibe nome + T.P Produto)
  Ao selecionar produto: exibir preview do T.P Produto e Meta Grupo calculada em tempo real.
  Ao salvar: chama `salvarConfiguracaoTurno()`.
  Modal abre automaticamente se `buscarConfiguracaoHoje()` retornar `null`.
  **Evidência:** Preencher os 3 campos, Meta Grupo exibida antes de salvar, confirmar valor no banco após salvar.
  `components/dashboard/ModalConfiguracaoTurno.tsx` implementado e integrado ao `/admin/dashboard`, com preview em tempo real de `T.P Produto` e `Meta Grupo`, abertura automática quando não há configuração do dia e ajuste visual dos campos; salvamento validado pela UI e conferido no banco.

- [x] **4.3 — Hook useRealtimeProducao**
  Criar `hooks/useRealtimeProducao.ts`:
  Assina INSERT em `registros_producao` via Supabase Realtime.
  A cada evento: refetch de `vw_producao_hoje` e `vw_producao_por_hora`.
  Retorna: `{ registros, totalPecas, eficienciaMedia, configuracaoTurno, ultimaAtualizacao }`.
  **Evidência:** Dashboard aberto + registro criado pelo scanner → dashboard atualiza em menos de 2 segundos.
  `hooks/useRealtimeProducao.ts` implementado com assinatura `postgres_changes` em `registros_producao`, queries client-side para `vw_producao_hoje` e `vw_producao_por_hora` e consumidor real no `/admin/dashboard`; validação feita com registro criado pelo scanner e atualização automática do dashboard em menos de 2 segundos.

- [x] **4.4 — Cards de KPI**
  Criar `components/dashboard/CardKPI.tsx`.
  4 cards:
  - Meta Grupo do dia (de `configuracao_turno.meta_grupo`)
  - Progresso % = `(total_pecas_hoje / meta_grupo) × 100`
  - Eficiência média da linha
  - Peças produzidas hoje
  Animação de contagem (Framer Motion) quando valor muda.
  **Evidência:** Cards exibem valores corretos. Progresso % atualiza após novo registro.
  `components/dashboard/CardKPI.tsx` implementado com animação de contagem e integrado ao dashboard via `useRealtimeProducao`; cards de Meta Grupo, Progresso %, Eficiência média e Peças produzidas validados na UI, com atualização automática após novo registro do scanner.

- [x] **4.5 — Gráfico de produção por hora**
  Criar `components/dashboard/GraficoProducaoPorHora.tsx`.
  Usar Recharts `LineChart`. Dados de `vw_producao_por_hora`.
  **Evidência:** Gráfico exibe curva de produção corretamente.
  `components/dashboard/GraficoProducaoPorHora.tsx` implementado com `ResponsiveContainer` e `LineChart` do Recharts, integrado ao `useRealtimeProducao`; gráfico validado no dashboard com curva por hora, tooltip correto e atualização automática após novo registro no scanner.

- [x] **4.6 — Ranking de operadores**
  Criar `components/dashboard/RankingOperadores.tsx`.
  Dados de `vw_producao_hoje`. Cores: verde ≥ 70%, amarelo 50–69%, vermelho < 50%.
  **Evidência:** Ranking ordenado com cores corretas.
  `components/dashboard/RankingOperadores.tsx` implementado e integrado ao dashboard com dados de `vw_producao_hoje`; validação feita com ranking ordenado pela eficiência e faixas visuais corretas: verde ≥ 70%, amarelo entre 50% e 69,99% e vermelho abaixo de 50%.

- [x] **4.7 — Grid de status das máquinas**
  Criar `components/dashboard/StatusMaquinas.tsx`.
  Dados de `vw_status_maquinas`.
  Card pisca vermelho se `minutos_sem_uso > ALERTA_MAQUINA_PARADA`.
  **Evidência:** Máquina sem registro há 20 min aparece com card piscando.
  `components/dashboard/StatusMaquinas.tsx` implementado com dados de `vw_status_maquinas`, integrado ao `useRealtimeProducao` e ao dashboard; grid validado com código, tipo, último uso, minutos sem uso e diferenciação visual por status, incluindo alerta vermelho pulsante quando `minutos_sem_uso` ultrapassa `ALERTA_MAQUINA_PARADA`.

- [x] **4.8 — Página do dashboard**
  Criar `app/(admin)/dashboard/page.tsx`.
  Se não houver configuração hoje: renderiza o `ModalConfiguracaoTurno` bloqueando o dashboard.
  Se houver: renderiza os 4 cards + gráfico + ranking + máquinas.
  Responsivo: 1 coluna mobile, 2 tablet, grid completo desktop.
  **Evidência:** Dashboard renderiza corretamente em 375px, 768px e 1280px.
  `app/admin/dashboard/page.tsx` consolidado como página final do dashboard, com carregamento server-side da configuração do turno e composição completa dos blocos da Sprint 4; responsividade validada em 375px, 768px e 1280px sem quebra de layout.

---

## SPRINT 5 — Alertas e relatórios
**Status:** 🚧 Em andamento
**Pré-requisito:** Sprints 3 e 4 concluídas.
**Objetivo:** Sistema completo pronto para deploy.

- [x] **5.1 — Página de relatórios**
  Criar `app/(admin)/relatorios/page.tsx`.
  Filtros: data início/fim, operador, operação.
  Tabela paginada: operador, operação, máquina, quantidade, data/hora.
  Card extra: comparativo Meta Grupo vs Realizado por dia (gráfico de barras).
  **Evidência:** Filtrar por operador e período, dados corretos na tabela.
  `app/admin/relatorios/page.tsx` implementado com filtros por período, operador e operação via `searchParams`, tabela paginada e gráfico de barras comparando `Meta Grupo vs Realizado`; validação feita filtrando por operador e período, com dados corretos na tabela e filtros preservados na paginação.

- [ ] **5.3 — Testes de responsividade final**
  Testar todas as telas em: 375px, 390px, 768px, 1280px.
  **Evidência:** Nenhum overflow, texto cortado ou layout quebrado nas 4 resoluções.

- [ ] **5.4 — Deploy**
  - Criar projeto na Vercel conectado ao repositório
  - Configurar variáveis de ambiente de produção
  - Criar projeto Supabase de produção separado do de desenvolvimento
  - Executar todas as migrations no banco de produção
  **Evidência:** URL de produção funciona. Registrar produção pelo celular e ver no dashboard.

- [ ] **5.5 — Manual do operador**
  Criar `docs/MANUAL_OPERADOR.md` em linguagem simples, sem termos técnicos.
  Incluir: passo a passo com screenshots, o que fazer se o QR não ler, quem chamar em caso de problema.
  **Evidência:** Pessoa sem experiência técnica consegue registrar produção lendo apenas o manual.

---

## SPRINT 6 — Multi-produto no mesmo dia (Pós-MVP)
**Status:** 🔭 Proposta
**Pré-requisito:** Sprint 5 concluída.
**Objetivo:** Suportar mais de um produto no mesmo dia com metas corretas por bloco de produção.

- [ ] **6.1 — Refatorar modelagem da configuração do turno**
  Evoluir a modelagem para separar:
  - cabeçalho do dia (`configuracao_turno`)
  - blocos do dia (`configuracao_turno_blocos`)

  Estrutura proposta para `configuracao_turno_blocos`:
  ```sql
  CREATE TABLE configuracao_turno_blocos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    configuracao_turno_id UUID NOT NULL REFERENCES configuracao_turno(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id),
    sequencia INTEGER NOT NULL,
    funcionarios_ativos INTEGER NOT NULL CHECK (funcionarios_ativos > 0),
    minutos_planejados INTEGER NOT NULL CHECK (minutos_planejados > 0),
    tp_produto_min DECIMAL(10,4) NOT NULL,
    meta_grupo INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('planejado', 'ativo', 'concluido')),
    iniciado_em TIMESTAMPTZ,
    encerrado_em TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(configuracao_turno_id, sequencia)
  );
  ```
  Regra: apenas 1 bloco `ativo` por vez em cada configuração do dia.
  **Evidência:** Dia com 2 blocos planejados salvos no banco, cada um com `tp_produto_min` e `meta_grupo` próprios.

- [ ] **6.2 — Server Actions e queries para blocos do dia**
  Criar:
  - `lib/actions/turno-blocos.ts`
  - `lib/queries/turno-blocos.ts`

  Ações:
  - criar bloco
  - editar bloco
  - ativar bloco
  - concluir bloco
  - reordenar sequência

  Regras:
  - `meta_grupo_bloco = floor((funcionarios_ativos × minutos_planejados) / tp_produto)`
  - `meta_grupo_dia = soma(meta_grupo dos blocos)`
  - ao ativar um bloco, os demais do dia ficam `planejado` ou `concluido`
  **Evidência:** Ativar bloco 2 automaticamente desativa o bloco 1 como bloco corrente.

- [ ] **6.3 — Modal de planejamento do dia com múltiplos produtos**
  Evoluir o modal do turno para permitir adicionar vários blocos:
  - produto
  - minutos planejados
  - funcionários ativos
  - T.P Produto
  - Meta Grupo do bloco

  Exibir também:
  - Meta total do dia = soma dos blocos
  - Ordem dos blocos
  - Bloco atualmente ativo
  **Evidência:** Supervisor planeja 3 blocos no mesmo dia e vê a meta total consolidada antes de salvar.

- [ ] **6.4 — Scanner registra no bloco ativo**
  Ajustar o fluxo de produção para vincular cada registro ao bloco ativo do dia.
  Adicionar `configuracao_turno_bloco_id` em `registros_producao`.

  Regra:
  - o scanner não usa mais apenas `configuracao_turno.produto_id`
  - o produto do registro vem do bloco ativo
  - se não houver bloco ativo, o registro é bloqueado com mensagem para o supervisor
  **Evidência:** Trocar o bloco ativo muda o `produto_id` dos registros seguintes sem reiniciar a sessão do operador.

- [ ] **6.5 — Dashboard consolidado por dia e por bloco**
  Evoluir cards e gráficos para mostrar:
  - realizado do dia
  - meta total do dia
  - progresso por bloco
  - bloco atual
  - blocos concluídos x pendentes
  **Evidência:** Dashboard mostra 2 blocos concluídos e 1 ativo no mesmo dia, com totais corretos.

- [ ] **6.6 — Compatibilidade e migração de histórico**
  Definir migração para manter compatibilidade com dias antigos do MVP:
  - dias antigos com 1 produto continuam legíveis
  - criar bloco único de migração quando necessário
  - relatórios históricos continuam consistentes
  **Evidência:** Relatórios antigos e novos coexistem sem quebrar consultas nem métricas.

---

## SPRINT 7 — Escala do painel de máquinas (Pós-MVP)
**Status:** 🔭 Proposta
**Pré-requisito:** Sprint 5 concluída.
**Objetivo:** Escalar o painel de máquinas para operações com parque maior, sem perder legibilidade operacional.

- [ ] **7.1 — Busca por código e filtros por status/tipo**
  Evoluir o painel de máquinas com:
  - busca textual por `codigo`
  - filtro por `status`
  - filtro por `tipo_nome`

  Regras:
  - filtros devem combinar entre si
  - o estado dos filtros deve sobreviver a atualizações realtime
  - filtros rápidos devem incluir `em alerta`
  **Evidência:** Supervisor encontra uma máquina específica digitando o código e consegue restringir o grid para `manutenção` ou `em alerta`.

- [ ] **7.2 — Agrupamento por status**
  Permitir agrupar o painel em seções:
  - `Em alerta`
  - `Ativas`
  - `Paradas`
  - `Manutenção`

  Regras:
  - `Em alerta` sempre aparece primeiro
  - agrupamento deve respeitar os filtros ativos
  - cada grupo exibe contador de máquinas
  **Evidência:** Painel mostra grupos ordenados por prioridade operacional, com máquinas em alerta no topo.

- [ ] **7.3 — Alternância entre modo cards e modo tabela**
  Adicionar um toggle de visualização:
  - `cards` para acompanhamento operacional
  - `tabela` para leitura densa e auditoria rápida

  Colunas mínimas do modo tabela:
  - código
  - tipo
  - status
  - minutos sem uso
  - último uso
  - indicador visual de alerta
  **Evidência:** Supervisor alterna entre cards e tabela sem perder filtros nem contexto.

- [ ] **7.4 — Paginação ou virtualização**
  Implementar navegação eficiente para cenários com 20, 30 ou mais máquinas.

  Estratégia:
  - usar paginação simples se a densidade visual do modo tabela for suficiente
  - avaliar virtualização se o modo cards crescer demais

  Regras:
  - a experiência não pode esconder alertas críticos
  - máquinas em alerta devem continuar visíveis ou destacadas mesmo com paginação
  **Evidência:** Painel continua utilizável com 30+ máquinas sem scroll excessivo nem perda de alertas.

- [ ] **7.5 — Prioridade operacional e experiência do supervisor**
  Refinar a UX do painel escalado:
  - resumo por status no topo
  - contador de máquinas filtradas
  - preservação do tempo real sem resetar scroll e filtros

  Regras:
  - atualizações realtime não devem "pular" a tela do supervisor
  - alertas críticos devem ter prioridade visual
  **Evidência:** Com o dashboard aberto durante o turno, novos eventos não quebram o contexto de navegação do supervisor.

---

## SPRINT 8 — Escala dos CRUDs admin (Pós-MVP)
**Status:** 🔭 Proposta
**Pré-requisito:** Sprint 5 concluída.
**Objetivo:** Padronizar paginação, busca e filtros server-side nos CRUDs de operadores, máquinas, operações e produtos.

- [ ] **8.1 — Padrão de paginação administrativa**
  Criar um padrão compartilhado de listagem paginada para a área admin.

  Contrato recomendado:
  ```typescript
  interface ResultadoPaginado<T> {
    itens: T[]
    total: number
    page: number
    pageSize: number
    totalPaginas: number
  }
  ```

  Regras:
  - `searchParams` são a fonte de verdade para `q`, `page`, `pageSize`
  - paginação preserva busca e filtros ativos
  - renderização inicial acontece no servidor
  **Evidência:** Um padrão único de paginação é reutilizado em pelo menos dois módulos admin.

- [ ] **8.2 — Operadores com paginação e filtro por status**
  Evoluir `/admin/operadores` para:
  - busca server-side por `nome` e `matricula`
  - filtro por `status`
  - paginação server-side

  Regras:
  - ordenação padrão por `nome`
  - busca e filtros persistem na URL
  **Evidência:** Filtrar operadores por status e navegar páginas mantendo os filtros.

- [ ] **8.3 — Máquinas com paginação e filtros por status/tipo**
  Evoluir `/admin/maquinas` para:
  - busca server-side por `codigo`, `modelo`, `marca`
  - filtro por `status`
  - filtro por `tipo_maquina_codigo`
  - paginação server-side

  Regras:
  - ordenação padrão por `codigo`
  - estado da listagem sobrevive a refresh
  **Evidência:** Buscar uma máquina por código e paginar mantendo filtros por status/tipo.

- [ ] **8.4 — Operações com paginação e filtros por status/tipo**
  Evoluir `/admin/operacoes` para:
  - busca server-side por `codigo` e `descricao`
  - filtro por `ativa/inativa`
  - filtro por `tipo_maquina_codigo`
  - paginação server-side

  Regras:
  - ordenação padrão por `codigo`
  - o comportamento segue o mesmo padrão dos demais CRUDs
  **Evidência:** Buscar uma operação por código e navegar entre páginas sem perder os filtros.

- [ ] **8.5 — Produtos com paginação e filtro por status**
  Evoluir `/admin/produtos` para:
  - busca server-side por `referencia` e `nome`
  - filtro por `ativo/inativo`
  - paginação server-side

  Regras:
  - ordenação padrão por `nome`
  - paginação preserva filtros e busca
  **Evidência:** Filtrar produtos por status e navegar páginas mantendo o contexto.

- [ ] **8.6 — Padronização de UX e navegação**
  Consolidar a experiência dos quatro CRUDs:
  - contador de resultados
  - ações `Anterior` e `Próxima`
  - estado vazio consistente
  - limpeza de filtros

  Regras:
  - nenhuma listagem deve depender de filtro apenas em `useState`
  - links devem ser compartilháveis e reabrir o mesmo estado de listagem
  **Evidência:** Copiar a URL de uma listagem filtrada e reabrir a página preserva o mesmo estado.

---

## SPRINT 9 — Exportação CSV de relatórios (Pós-MVP)
**Status:** 🔭 Proposta
**Pré-requisito:** Sprint 5 concluída.
**Objetivo:** Exportar relatórios filtrados em CSV com compatibilidade prática para Excel.

- [ ] **9.1 — Utilitário de exportação CSV**
  Criar `lib/utils/exportacao.ts`:
  ```typescript
  export function exportarCSV(
    dados: Record<string, unknown>[],
    cabecalhos: Record<string, string>,
    nomeArquivo: string
  ): void
  ```
  Regras:
  - usar apenas Web APIs nativas
  - cabeçalhos em português
  - preservar ordem de colunas
  **Evidência:** Download abre corretamente no Excel com colunas nomeadas em português.

- [ ] **9.2 — Integração com a página de relatórios**
  Adicionar ação de exportar na tela `/admin/relatorios`.
  A exportação deve respeitar os filtros ativos:
  - data início/fim
  - operador
  - operação

  Regras:
  - exportar o conjunto filtrado correto
  - manter nomenclatura de arquivo legível
  **Evidência:** Aplicar filtros na página e gerar CSV contendo somente os registros visíveis ao filtro.
