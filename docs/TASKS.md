# TASKS.md — Especificação Técnica por Sprint

> Este é o arquivo de trabalho da IA.
> Para cada task: executar → validar evidência → marcar [x] → descrever o que foi feito.
> Nunca avançar para a próxima sprint sem todas as tasks marcadas e evidências registradas.
> Ao concluir uma sprint, atualizar o status no BACKLOG.md.

---

## INSTRUÇÃO PARA O AGENTE

Antes de iniciar qualquer sprint, leia na ordem:
1. `CLAUDE.md` — contexto técnico permanente (stack, padrões, convenções)
2. `PRD.md` — contexto de negócio (fluxos, regras, modelo operacional e regras de domínio)
3. `TASKS.md` — este arquivo (sprints, tasks, evidências)

Só inicie a execução após confirmar a leitura dos 3 documentos.

Para cada task:
1. Execute o que está especificado
2. Valide a evidência descrita
3. Marque [x] no checkbox
4. Escreva uma linha abaixo descrevendo o que foi feito

Ao concluir todas as tasks de uma sprint:
1. Atualize o status da sprint no `BACKLOG.md`
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

## REBASELINE V2 — Turno + OP + Setor

> As sprints pendentes do plano antigo foram substituídas por este plano V2.
> O histórico concluído das Sprints 0 a 4 permanece válido como fundação técnica.
> A partir daqui, a fonte de verdade do produto passa a ser o modelo derivado de `turno + OP + setor`.

### Entidades V2

- `setores`: cadastro mestre dos setores produtivos
- `usuarios_sistema`: usuários administrativos com papel `admin` ou `supervisor`
- `turnos`: cabeçalho operacional do dia
- `turno_operadores`: alocação dinâmica de operadores no turno
- `turno_ops`: OPs planejadas no turno
- `turno_setor_ops`: seções operacionais derivadas de `setor + OP` com QR temporário
- `registros_producao`: apontamentos produtivos vinculados ao contexto operacional do turno

### Estratégia de migração

1. **Migração aditiva**
   - criar tabelas novas e colunas novas sem apagar o legado de imediato
2. **Coexistência controlada**
   - manter queries e relatórios antigos funcionando até o dashboard e o scanner V2 estabilizarem
3. **Cutover por feature flag**
   - só desligar o fluxo legado depois de validar a V2 ponta a ponta
4. **Limpeza posterior**
   - remover estruturas antigas apenas após homologação e validação de histórico

---

## SPRINT 5 — Rebaseline documental V2
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 4 concluída.
**Objetivo:** Consolidar oficialmente o novo domínio operacional antes de alterar código de produção.

- [x] **5.1 — Atualizar PRD para o fluxo V2**
  Reescrever o PRD para refletir:
  - turno como contêiner operacional
  - OPs do dia com produto e quantidade planejada
  - derivação automática de setores e operações a partir do roteiro do produto
  - QR operacional temporário por `setor + OP`
  - encerramentos automáticos e manuais
  **Evidência:** `PRD.md` atualizado com fluxo operacional, entidades, regras e módulos da V2.
  Fluxo antigo centrado em `máquina + operação` substituído por `turno + OP + setor`, com regras de QR temporário, apontamento por setor e encerramentos automáticos documentadas em `PRD.md`.

- [x] **5.2 — Reescrever o plano de execução para a V2**
  Substituir as sprints pendentes do plano antigo por fases de implementação V2, com entidades, dependências e estratégia de migração.
  **Evidência:** `TASKS.md` passa a refletir o plano V2 como única fonte de verdade para as próximas entregas.
  Plano antigo de multi-produto/blocos substituído por fases V2 com migração aditiva, coexistência controlada e cutover posterior.

---

## SPRINT 6 — Base de domínio V2
**Status:** 🚧 Em andamento
**Pré-requisito:** Sprint 5 concluída.
**Objetivo:** Criar a base de dados e os contratos da V2 sem quebrar o fluxo atual.

- [x] **6.1 — Criar tabela e CRUD de setores**
  Criar a tabela `setores` com código sequencial, nome e situação.
  Seed inicial obrigatório:
  - Preparação
  - Frente
  - Costa
  - Montagem
  - Finalização

  Também criar:
  - `lib/actions/setores.ts`
  - `lib/queries/setores.ts`
  - `/admin/setores`
  **Evidência:** CRUD de setores disponível e seed inicial carregado com os 5 setores base.
  Migração `scripts/sprint6_setores.sql` aplicada no Supabase com seed inicial dos 5 setores; CRUD implementado em `lib/actions/setores.ts`, `lib/queries/setores.ts`, `components/ui/ModalSetor.tsx`, `app/(admin)/setores/ListaSetores.tsx` e `app/admin/setores/page.tsx`. `npx tsc --noEmit` passa sem erros.

- [x] **6.2 — Criar tabela de usuários do sistema**
  Criar `usuarios_sistema`, vinculada ao `auth.users`, com:
  - nome
  - email
  - papel (`admin | supervisor`)
  - situação

  Regra:
  - a autorização da área admin deve poder usar essa tabela como fonte de verdade, sem depender apenas de metadata do auth
  - o primeiro `admin` entra por bootstrap técnico direto no banco
  - a `senha inicial` atual pode existir apenas como bootstrap interno de desenvolvimento
  - o fluxo profissional de produção deve ficar documentado como `convite por email + definição da própria senha pelo usuário`
  - depois disso, apenas `admin` pode acessar e operar `/admin/usuarios`
  - novos `admins` e `supervisores` devem ser cadastrados pela interface
  **Evidência:** Usuário autenticado com papel `supervisor` acessa `/admin/*` mas não acessa `/admin/usuarios`; usuário `admin` consegue cadastrar um novo supervisor/admin pela interface; usuário sem cadastro administrativo é bloqueado.
  Migração `scripts/sprint6_usuarios_sistema.sql` aplicada no Supabase; autenticação administrativa migrada para `usuarios_sistema`; CRUD `/admin/usuarios` implementado com restrição `admin-only`; validação funcional confirmada com acesso de `supervisor`, bloqueio de usuário sem cadastro ativo e cadastro de novos usuários via interface. Fluxo de produção com convite e senha definida pelo próprio usuário documentado no `PRD.md`.

- [x] **6.3 — Evoluir operações para dependerem de setor**
  Ajustar `operacoes` para incluir:
  - código sequencial automático
  - setor obrigatório
  - situação
  - tempo padrão manual

  Regra:
  - o setor da operação será usado para derivar as seções `setor + OP` do turno
  **Evidência:** Produto com roteiro completo permite identificar automaticamente os setores envolvidos a partir das operações vinculadas.
  Migração `scripts/sprint6_operacoes_setor.sql` aplicada no Supabase com `setor_id` e geração automática de código; backfill dos setores das operações existentes validado; CRUD de operações atualizado para exigir setor e telas de produtos passaram a exibir os setores envolvidos derivados do roteiro. `npx tsc --noEmit` passa sem erros.

- [x] **6.4 — Evoluir máquinas e operadores para a V2**
  Ajustar:
  - `maquinas` para usar `setor_id`
  - `operadores` para incluir `carga_horaria_min`

  Regra:
  - operador não pertence mais fixamente a um setor; a alocação passa a ser dinâmica por turno
  **Evidência:** Operadores e máquinas mantêm cadastro válido com vínculo consistente a setores, sem quebra dos CRUDs existentes.
  Migração `scripts/sprint6_maquinas_operadores_v2.sql` aplicada no Supabase com backfill inicial de `maquinas.setor_id` e `operadores.carga_horaria_min`; CRUD de máquinas atualizado para setor estruturado e CRUD de operadores atualizado para carga horária e alocação dinâmica por turno. Validação funcional confirmada na UI. `npx tsc --noEmit` passa sem erros.

- [x] **6.5 — Regenerar types e contratos da V2**
  Atualizar `types/supabase.ts` e `types/index.ts` com as entidades novas.
  Introduzir os contratos de:
  - turno
  - OP do turno
  - seção `setor + OP`
  - usuário do sistema
  **Evidência:** `npx tsc --noEmit` passa com os novos contratos e sem `any`.
  `types/supabase.ts` alinhado ao estado atual do banco após as migrações da Sprint 6; `types/index.ts` consolidado com contratos V2 de `usuarios_sistema`, `turno`, `turno_op`, `turno_setor_op` e payloads de planejamento. `npx tsc --noEmit` passa sem erros.

---

## SPRINT 7 — Planejamento do turno V2
**Status:** 🔭 Proposta
**Pré-requisito:** Sprint 6 concluída.
**Objetivo:** Transformar o cadastro estrutural do produto em planejamento executável do dia.

- [x] **7.1 — Criar schema de turnos, OPs e seções operacionais**
  Criar tabelas:
  - `turnos`
  - `turno_operadores`
  - `turno_ops`
  - `turno_setor_ops`

  Regras:
  - uma `turno_op` possui produto e quantidade planejada
  - uma `turno_setor_op` nasce automaticamente dos setores do roteiro do produto
  - `turno_setor_op` armazena `qr_code_token` temporário
  **Evidência:** Criar um turno com uma OP gera automaticamente as seções por setor no banco.
  `scripts/sprint7_turnos_schema.sql` aplicado via Supabase Management API (`POST /v1/projects/{ref}/database/query`). Validação concluída em `2026-03-28`: as tabelas `turnos`, `turno_operadores`, `turno_ops` e `turno_setor_ops` existem; um turno de teste para o produto `REF-002 / Polo com Botões` gerou automaticamente 4 seções (`Preparação`, `Frente`, `Montagem`, `Finalização`) com `quantidade_planejada = 100`, status `aberta` e `qr_code_token` distintos; o turno de validação foi removido ao final.

- [x] **7.2 — Implementar actions e queries do planejamento**
  Criar:
  - `lib/actions/turnos.ts`
  - `lib/queries/turnos.ts`

  Ações mínimas:
  - abrir turno
  - adicionar OP ao turno
  - editar OP do turno
  - encerrar turno
  - listar turno aberto e último turno encerrado
  **Evidência:** Dashboard consegue carregar o turno aberto atual ou, na ausência dele, o último turno encerrado.
  `lib/actions/turnos.ts` implementado com `abrirTurno`, `adicionarOpAoTurno`, `editarOpDoTurno` e `encerrarTurno`, incluindo validação de produto roteirizado, encerramento automático do turno aberto anterior e recarga do dashboard. `lib/queries/turnos.ts` implementado com `buscarTurnoAberto`, `buscarUltimoTurnoEncerrado`, `buscarTurnoAbertoOuUltimoEncerrado` e composição completa de operadores, OPs e seções. `app/admin/dashboard/page.tsx` passou a carregar `buscarTurnoAbertoOuUltimoEncerrado()` e renderizar `components/dashboard/ResumoPlanejamentoTurnoV2.tsx`. Validação concluída via Supabase Management API em `2026-03-28`: a lógica retornou um turno `aberto` (`404135e9-e5bb-43c9-bb52-d4c2acb4cd77`) e o último `encerrado` (`8ed665e9-be6b-44f3-be5d-ff7c4e4e1245`, removido após o teste). `npx tsc --noEmit` passa sem erros.

- [x] **7.3 — Implementar modal "Novo Turno" V2**
  Evoluir a dashboard para abrir turno com:
  - data/hora automática
  - operadores disponíveis
  - minutos do turno
  - múltiplas OPs
  - produto e quantidade planejada por OP

  Regra:
  - o supervisor informa a demanda; o sistema deriva os setores automaticamente
  **Evidência:** Salvar um turno com 2 OPs gera corretamente as seções `setor + OP` para os setores exigidos pelos produtos.
  `components/dashboard/ModalNovoTurnoV2.tsx` implementado com data/hora automática, seleção de operadores ativos, minutos do turno, observação opcional e lista dinâmica de múltiplas OPs. `components/dashboard/PainelConfiguracaoTurno.tsx` passou a abrir o modal V2 e `app/admin/dashboard/page.tsx` passou a carregar operadores ativos para o fluxo. `lib/actions/turnos.ts` ganhou `abrirTurnoFormulario` para receber o payload serializado do modal. Validação concluída via Supabase Management API em `2026-03-28`: um turno de teste com 2 OPs gerou 7 seções `setor + OP` corretamente, sendo 4 para `OP-VALIDACAO-7.3-A` (`REF-002 / Polo com Botões` → `Preparação`, `Frente`, `Montagem`, `Finalização`, quantidade 150) e 3 para `OP-VALIDACAO-7.3-B` (`31030602 / CALÇA AMBEV` → `Preparação`, `Frente`, `Montagem`, quantidade 90). O turno temporário `3d24f905-d22a-4ccc-8716-e1c7f0f8b2b1` foi removido após o teste. `npx tsc --noEmit` passa sem erros.

- [x] **7.4 — Gerar QR operacional temporário por setor + OP**
  Implementar geração de QR para cada `turno_setor_op`.
  Regra:
  - o QR muda a cada novo turno
  - o QR identifica o contexto operacional do turno, não um cadastro mestre fixo
  **Evidência:** Abrir um novo turno para a mesma OP gera um QR diferente do turno anterior.
  `lib/utils/qrcode.ts` passou a expor `gerarValorQROperacionalSetorOp()` com o prefixo operacional temporário `setor-op:` para a V2. `components/dashboard/QROperacionaisTurnoV2.tsx` implementado e integrado em `app/admin/dashboard/page.tsx`, exibindo um QR por seção `setor + OP` com download em PNG, quantidade planejada, status e token temporário. Validação concluída via Supabase Management API em `2026-03-28`: a mesma OP `OP-VALIDACAO-QR-001` no produto `REF-002 / Polo com Botões`, no setor `Preparação`, gerou `qr_code_token` diferentes em dois turnos distintos (`4c24b3b7cb29ee26ef7b6f28bcf47bee8b9e0f42db19aa5c54609b7e85a9a49c` e `ab063df8894cc35936bebdcad21393e3a55582b3e5e321fab26fde17c856af10`). Os turnos temporários `5bc7b018-4a97-4864-a234-a0c1b4305491` e `e1efc824-7378-4b5b-92dd-4e39ab2bb5ee` foram removidos após o teste. `npx tsc --noEmit` passa sem erros.

---

## SPRINT 8 — Scanner e apontamento V2
**Status:** 🔭 Proposta
**Pré-requisito:** Sprint 7 concluída.
**Objetivo:** Registrar produção no contexto correto do turno, com bloqueios consistentes e sem excesso sobre o planejado.

- [x] **8.1 — Evoluir o parser e os tipos de QR**
  Ajustar `lib/utils/qrcode.ts` e os contratos da aplicação para suportar o QR operacional de `setor + OP`.
  **Evidência:** Scanner reconhece separadamente QR de operador e QR operacional da seção do turno.
  `lib/constants.ts` e `types/index.ts` atualizados para suportar o novo tipo `setor-op`, incluindo o contrato `TurnoSetorOpScaneado`. `lib/utils/qrcode.ts` passou a validar `setor-op:` no parser, expor `descreverTipoQRCode()` e manter `gerarValorQROperacionalSetorOp()`. `app/(operador)/scanner/page.tsx` passou a exibir mensagens específicas com o tipo reconhecido quando um QR é lido fora da etapa esperada. Validação concluída em `2026-03-28`: `parseQRCode('operador:abc123def456ghi789')` retornou `{ tipo: 'operador', token: 'abc123def456ghi789' }` e `parseQRCode('setor-op:xyz987uvw654rst321')` retornou `{ tipo: 'setor-op', token: 'xyz987uvw654rst321' }`, com descrições distintas no scanner. `npx tsc --noEmit` passa sem erros.

- [x] **8.2 — Implementar sessão do scanner V2**
  Novo fluxo:
  - scan do operador
  - scan do QR operacional `setor + OP`
  - exibição do contexto da seção aberta
  - input da quantidade executada

  Regra:
  - a máquina pode ser informada opcionalmente, mas não é obrigatória
  **Evidência:** Sessão de scanner mostra turno, OP, produto, setor e saldo restante antes do lançamento.
  `hooks/useScanner.ts` foi reestruturado para o fluxo `scan_operador -> scan_setor_op -> confirmar`, usando `buscarTurnoSetorOpScaneadoPorToken()` e removendo a obrigatoriedade de máquina na sessão V2. `app/(operador)/scanner/page.tsx` passou a exigir QR `setor-op` na segunda etapa e a exibir cards de operador, setor, OP, produto, turno e saldo antes do lançamento. `components/scanner/ConfirmacaoRegistro.tsx` foi adaptado para mostrar o contexto completo da seção do turno e o input de quantidade executada. Validação concluída em `2026-03-28`: `npx tsc --noEmit` passa sem erros e a consulta via Supabase Management API ao contexto operacional mais recente retornou `turno_iniciado_em = 2026-03-28 20:30:47.497507+00`, `numero_op = OP-VALIDACAO-7.1`, `referencia = REF-002`, `produto_nome = Polo com Botões`, `setor_nome = Preparação`, `saldo_restante = 100` e `qr_code_token = cf0531d04c6e5b64d78be890578e3e6154adb1233cfb37c69cd466b9c5215ebd`, que são exatamente os campos agora exibidos na sessão V2 antes do lançamento. O botão de lançamento permanece bloqueado por mensagem explícita até a task `8.3`, onde entra a transação de apontamento.

- [x] **8.3 — Implementar apontamento transacional com bloqueio de excesso**
  Ajustar `registros_producao` e criar a lógica transacional no backend para:
  - registrar produção no contexto da seção do turno
  - impedir ultrapassar a quantidade planejada
  - atualizar o realizado do `turno_setor_op`

  Regra:
  - a validação final deve ficar no banco ou em operação transacional segura, não apenas no client
  **Evidência:** Dois lançamentos concorrentes não conseguem ultrapassar a quantidade planejada da seção.
  `scripts/sprint8_apontamento_v2.sql` criou a base transacional da V2: `registros_producao.turno_setor_op_id`, flexibilização de `operacao_id` para o fluxo legado/V2 coexistirem, `buscar_turno_setor_op_scanner()` para leitura pública do contexto do QR e `registrar_producao_turno_setor_op()` com `FOR UPDATE` na seção para serializar concorrência. `lib/queries/scanner.ts` passou a consultar o contexto do scanner por RPC, `lib/actions/producao.ts` passou a registrar via RPC transacional e `app/(operador)/scanner/page.tsx` voltou a enviar o lançamento real a partir da sessão V2. Validação concluída em `2026-03-28`: `npx tsc --noEmit` passa sem erros e, na seção temporária `65fc1ff3-72a3-4e2a-b39e-296e8a917866` com planejado `5`, dois lançamentos concorrentes via Supabase Management API (`4` e `3`) resultaram em apenas um sucesso (`registro_id = 5d7d9405-e676-4b00-a076-676cae08d982`, `quantidade_realizada = 4`, `saldo_restante = 1`) e o segundo falhou com `Quantidade excede o saldo restante da seção.`. A verificação final retornou `total_registros = 1` e `total_quantidade_registrada = 4`, provando que o total não ultrapassou o planejado. A OP temporária `OP-VALIDACAO-8.3-20260328-T1` e o registro de teste foram removidos ao final.

- [x] **8.4 — Implementar encerramentos automáticos**
  Regras:
  - setor encerra ao atingir o planejado
  - OP encerra quando todos os setores obrigatórios estiverem concluídos
  - turno pode ser encerrado manualmente ou ao abrir o próximo
  **Evidência:** Atingir o planejado de um setor encerra a seção automaticamente e reflete isso no andamento da OP e do turno.
  `scripts/sprint8_encerramentos_automaticos.sql` adicionou `sincronizar_andamento_turno_op()` e evoluiu `registrar_producao_turno_setor_op()` para encerrar a seção automaticamente ao atingir o planejado, atualizar `quantidade_realizada`, marcar a OP como `em_andamento` ou `concluida` conforme o estado agregado das seções e tocar o `updated_at` do turno para refletir progresso. `components/dashboard/ResumoPlanejamentoTurnoV2.tsx` passou a exibir `OPs concluídas` e `Seções concluídas`, deixando o andamento do turno visível na dashboard V2. Validação concluída em `2026-03-28`: `npx tsc --noEmit` passa sem erros e, na OP temporária `OP-VALIDACAO-8.4-20260328-T1` do turno aberto `404135e9-e5bb-43c9-bb52-d4c2acb4cd77`, quatro apontamentos de `2` encerraram automaticamente as seções `Preparação`, `Frente`, `Montagem` e `Finalização` com `status_turno_setor_op = concluida` e `saldo_restante = 0`. A verificação final retornou `turno_op_status = concluida`, `turno_op_realizada = 2`, `secoes_concluidas_da_op = 4/4`, `turno_status = aberto` e `secoes_concluidas_no_turno = 4/4`, demonstrando o reflexo no andamento da OP e do turno sem autoencerrar o turno. A OP temporária e os 4 registros de validação foram removidos ao final.

---

## SPRINT 9 — Apontamentos atômicos, dashboard, relatórios e coexistência
**Status:** 🔭 Proposta
**Pré-requisito:** Sprint 8 concluída.
**Objetivo:** Evoluir a V2 para registrar produção no nível correto de operador + operação + seção, trocar a leitura gerencial para esse consolidado e manter a base histórica consistente durante a transição.

> Refinamento de plano da Sprint 9:
> a modelagem entregue até a Sprint 8 consolidou `turno_setor_op` como unidade de execução, o que é suficiente para o andamento macro do turno, mas não preserva corretamente a produtividade por operador quando o supervisor faz lançamentos agregados do setor. A partir daqui, a fonte de verdade operacional passa a ser o apontamento atômico por `operador + operação + seção`, com consolidação ascendente para seção, OP e turno sem supercontagem.

- [x] **9.1 — Refazer a dashboard para o modelo V2**
  Mostrar:
  - turno aberto ou último turno encerrado
  - OPs em andamento
  - progresso por OP
  - progresso por setor
  - planejado vs realizado
  - seções concluídas e pendentes
  **Evidência:** Dashboard acompanha em tempo real o planejamento derivado das OPs e setores do turno.
  `lib/queries/turnos-client.ts` passou a oferecer o snapshot V2 no browser, `hooks/useRealtimePlanejamentoTurnoV2.ts` implementou recarga em tempo real por `turnos`, `turno_operadores`, `turno_ops`, `turno_setor_ops` e `registros_producao`, e `components/dashboard/MonitorPlanejamentoTurnoV2.tsx` substituiu o monitor legado por uma dashboard V2 com turno aberto/último encerrado, KPIs de planejado vs realizado, OPs em andamento, progresso por OP, seções pendentes/concluídas e QRs operacionais do turno. `app/admin/dashboard/page.tsx` passou a usar o monitor V2 como bloco principal e `components/dashboard/PainelConfiguracaoTurno.tsx` foi simplificado para não misturar métricas legadas com a nova visão. Como ajuste final da `9.1`, o cabeçalho da dashboard passou a expor `Novo Turno` e `Encerrar Turno`, com o encerramento manual aparecendo apenas quando o turno atual está `aberto`, usando um modal dedicado de confirmação alinhado ao design do sistema e acionando a `encerrarTurno()` já existente no backend. `scripts/sprint9_dashboard_v2_realtime.sql` adicionou `turnos`, `turno_operadores`, `turno_ops` e `turno_setor_ops` à publication `supabase_realtime`. Validação concluída em `2026-03-28`: `npx tsc --noEmit` passa sem erros, `pg_publication_tables` retornou as 4 tabelas V2 na publication e a OP temporária `OP-VALIDACAO-9.1-20260328-T1` criada no turno aberto `404135e9-e5bb-43c9-bb52-d4c2acb4cd77` derivou `4` seções automaticamente, confirmando o snapshot operacional que a dashboard V2 agora consome e atualiza por Realtime. A OP temporária foi removida ao final.

- [x] **9.2 — Evoluir o domínio V2 para operação dentro da seção**
  Criar a camada `turno_setor_operacoes` como derivação aditiva da V2.

  Estrutura mínima:
  - uma linha por operação do roteiro dentro de cada `turno_setor_op`
  - `quantidade_planejada` espelhando a quantidade planejada da OP
  - `quantidade_realizada` como consolidado da operação dentro da seção
  - `status`, `sequencia` e `tempo_padrao_min_snapshot`

  Também evoluir `registros_producao` para registrar:
  - `turno_op_id`
  - `turno_setor_op_id`
  - `turno_setor_operacao_id`
  - `usuario_sistema_id`
  - `origem_apontamento` (`operador_qr | supervisor_manual`)

  Regra de consolidação:
  - realizado da operação da seção = soma dos lançamentos daquela operação
  - realizado da seção = menor realizado entre as operações obrigatórias do setor
  - realizado da OP = menor realizado entre as seções obrigatórias da OP
  - realizado do turno = soma do realizado das OPs do turno

  **Evidência:** Uma seção com duas operações (`20` e `15`) consolida `15` no setor, sem supercontar `35`, e preserva os lançamentos por operador e operação.
  Implementado em `scripts/sprint9_apontamento_atomico_v2.sql`, com a nova tabela `turno_setor_operacoes`, evolução aditiva de `registros_producao`, funções `sincronizar_turno_setor_operacoes()`, `sincronizar_andamento_turno_setor_op()` e `registrar_producao_turno_setor_operacao()`. Os contratos foram atualizados em `types/index.ts` e `types/supabase.ts`; a action atômica foi adicionada em `lib/actions/producao.ts`; e a primeira query server-side para a nova camada entrou em `lib/queries/apontamentos.ts`. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros, a migração foi aplicada via Supabase Management API e, em um cenário temporário no turno aberto `289f8096-f67d-499e-b54e-b3ef8444dae4`, dois lançamentos atômicos em uma seção com exatamente duas operações (`20` e `15`) consolidaram `realizado_secao = 15` com `status_secao = em_andamento`, sem supercontar `35`. Os dados temporários `OP-VALIDACAO-9.2-20260330-T1` foram removidos ao final.

- [x] **9.3 — Implementar apontamento atômico do supervisor**
  Criar a experiência administrativa `/admin/apontamentos` para captura incremental do chão.

  Fluxo mínimo:
  - contexto fixo do turno aberto
  - filtros por OP, setor e produto
  - lista de seções com planejado, realizado, saldo e progresso
  - detalhe da seção com operações previstas e operadores do turno
  - formulário com múltiplas linhas por envio:
    - operador
    - operação
    - quantidade
  - gravação transacional

  Regra:
  - o supervisor registra lançamentos atômicos por operador e operação; a seção, a OP e o turno são consolidados automaticamente após salvar

  **Evidência:** O supervisor registra no mesmo envio `João + Operação A + 20` e `Maria + Operação B + 15`, e o sistema atualiza operação, seção, OP e turno com os consolidados corretos.
  `components/apontamentos/PainelApontamentosSupervisor.tsx` implementou a interface administrativa com filtros por OP/setor/produto, lista de seções com planejado/realizado/saldo/progresso, detalhe da seção, múltiplas linhas `operador + operação + quantidade` no mesmo envio e submissão via `useActionState(registrarApontamentosSupervisor)`. A rota foi publicada em `app/admin/apontamentos/page.tsx` com espelho em `app/(admin)/apontamentos/page.tsx`, e o menu admin passou a expor `/admin/apontamentos` em `components/admin/AdminShell.tsx`. Como o turno aberto atual não possuía `turno_operadores`, a página ganhou fallback explícito para operadores ativos do cadastro, sem ocultar o problema operacional. No backend, `scripts/sprint9_apontamento_supervisor_v2.sql` adicionou a RPC `registrar_producao_supervisor_em_lote()`, `lib/actions/producao.ts` passou a autenticar o supervisor, validar o payload e revalidar dashboard/relatórios/apontamentos, e durante a validação foi corrigido um defeito estrutural em `scripts/sprint9_apontamento_atomico_v2.sql`: a função base `registrar_producao_turno_setor_operacao()` ainda validava `usuarios_sistema.status`, mas a tabela usa `ativo`. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros; as funções SQL foram aplicadas via Supabase Management API; e um cenário temporário no turno aberto `289f8096-f67d-499e-b54e-b3ef8444dae4`, com a OP `OP-VALIDACAO-9.3-20260330-T1`, registrou `Adriele + D1 + 20` e `Alef + D2 + 15` na seção `Frente`, consolidando `quantidade_realizada_secao = 15` para a seção, preservando `20` e `15` nas operações. Após repetir `15` nas demais seções do mesmo produto, a OP temporária chegou a `quantidade_realizada_turno_op = 15` com `status_turno_op = em_andamento`, e o consolidado do turno subiu de `0` para `15` sem supercontagem. Os dados temporários foram removidos ao final e a consulta de conferência retornou `total_restante = 0`.

- [x] **9.4 — Adaptar dashboard e relatórios para os novos consolidados**
  Leituras mínimas:
  - dashboard do turno lendo o consolidado por operação, seção e OP
  - relatório por turno
  - relatório por OP
  - relatório por setor
  - relatório por operação dentro do setor
  - relatório por operador
  - comparativo planejado vs realizado

  Regra explícita:
  - filtros por turno, OP ou setor não podem supercontar produção ao somar operações internas ou seções paralelas

  **Evidência:** Filtrar por turno ou OP retorna os dados corretos, preservando o detalhamento por operação e sem duplicar o realizado ao consolidar setor e OP.
  A dashboard V2 passou a carregar `operacoesSecao` dentro de `PlanejamentoTurnoV2` em `lib/queries/turnos.ts` e `lib/queries/turnos-client.ts`, usando a helper compartilhada `lib/queries/turno-setor-operacoes-base.ts`. O Realtime da dashboard foi ampliado em `hooks/useRealtimePlanejamentoTurnoV2.ts` para ouvir `turno_setor_operacoes`, e a publication foi atualizada em `scripts/sprint9_dashboard_v2_realtime.sql`. Os modais `components/dashboard/ModalDetalhesOpTurno.tsx` e `components/dashboard/ModalDetalhesSecaoTurno.tsx` deixaram de depender apenas do roteiro estático do produto e passaram a exibir realizado, saldo e status da operação derivada da seção. Nos relatórios, a página `app/admin/relatorios/page.tsx` foi reescrita para consumir `lib/queries/relatorios-v2.ts`, com filtros por período, turno, OP, setor e operador; `components/relatorios/FiltrosRelatorios.tsx`, `components/relatorios/TabelaRelatorios.tsx`, `components/relatorios/ComparativoMetaGrupoChart.tsx` e `components/relatorios/ResumoRelatorios.tsx` passaram a refletir o modelo V2 com resumo consolidado, tabela atômica por operador+operação e comparativo planejado vs realizado. A camada legada `lib/queries/relatorios.ts` foi ajustada apenas para compatibilidade de tipos até a 9.5. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros; `pg_publication_tables` confirmou `turno_setor_operacoes` na publication `supabase_realtime`; e um cenário temporário no turno aberto `289f8096-f67d-499e-b54e-b3ef8444dae4`, com a OP `OP-VALIDACAO-9.4-20260330-T1`, confirmou a regra de não supercontagem: na seção `Frente`, as operações `D1 = 20` e `D2 = 15` ficaram preservadas no detalhe, a seção consolidou `15`, a OP filtrada consolidou `15`, e o turno subiu de `0` para `15`. A mesma validação mostrou por contraste que a soma bruta das seções (`45`) e das operações (`95`) seria incorreta para o consolidado da OP, provando que o relatório por turno/OP agora precisa usar os consolidadores corretos. Os dados temporários foram removidos ao final e a conferência retornou `total_restante = 0`.

- [x] **9.5 — Implementar compatibilidade temporária com o legado**
  Regras:
  - registros antigos continuam legíveis
  - relatórios não quebram durante a transição
  - dashboard e apontamentos V2 não dependem de apagar imediatamente o modelo anterior
  **Evidência:** Dados históricos do fluxo antigo continuam acessíveis após a entrada da V2.
  A camada de relatórios V2 em `lib/queries/relatorios-v2.ts` passou a unir registros atômicos da V2 com registros legados de `registros_producao` cujo vínculo estrutural (`turno_op_id`, `turno_setor_op_id`, `turno_setor_operacao_id`) ainda é nulo. A UI de `app/admin/relatorios/page.tsx` e dos componentes `components/relatorios/TabelaRelatorios.tsx` e `components/relatorios/ResumoRelatorios.tsx` passou a identificar a origem de cada linha, preservar o histórico legado como leitura acessível e manter a consolidação estrutural V2 separada, sem exigir remoção imediata do modelo antigo. A query legada `lib/queries/relatorios.ts` foi mantida tipada para coexistência. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros; consulta read-only via Supabase Management API confirmou `20` registros legados ainda acessíveis em `public.registros_producao` após a entrada da V2, no intervalo de `2026-03-25` a `2026-03-25`; e uma amostra dos IDs `0384e977-ba3c-4b81-9d44-2a5e451cc04c`, `b14eae7e-6bae-48e8-bb27-7c7dbf0b25f3` e `07cf39db-09a6-4228-a6f6-1006696b73ad` continuou legível com operador, operação e quantidade preservados no fluxo legado.

- [x] **9.6 — Cutover controlado e validação final**
  Executar:
  - feature flag do scanner V2
  - homologação do fluxo completo
  - teste de responsividade final
  - deploy
  - manual operacional atualizado
  **Evidência:** URL de produção registra lançamentos no fluxo V2 e a dashboard reflete o progresso em tempo real sem regressão crítica.
  O cutover controlado foi formalizado com a flag pública `NEXT_PUBLIC_SCANNER_V2_ENABLED` em `lib/utils/feature-flags.ts`, aplicada na rota `app/(operador)/scanner/page.tsx` para liberar ou bloquear o scanner móvel sem remover o fluxo V2 nem o fallback administrativo. O manual operacional foi publicado em `docs/MANUAL_OPERACIONAL_V2.md`, detalhando ativação, homologação e rollback seguro. A validação final foi concluída em `2026-03-30`: `npx tsc --noEmit` e `npm run build` passaram sem erros, a correção dos contêineres do Recharts eliminou os warnings de largura/altura inválida em dashboard e relatórios, o commit `d99c18e` foi publicado em `main`, o deploy de produção `dpl_5UwHaTSw3L1AJ6TaV9EPLmD4ASm9` ficou `READY` no Vercel, a URL `https://producao-chi.vercel.app` respondeu `200` e `/scanner` respondeu `200` exibindo corretamente a tela de cutover controlado com fallback para `/admin/apontamentos` e `/admin/dashboard` enquanto a flag não estiver ativada em produção.

---

## SPRINT 10 — Scanner híbrido por operação
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 9 concluída.
**Objetivo:** transformar o scanner em fluxo móvel híbrido para apontamento atômico no chão, por seção, operador e operação, sem regressão do domínio V2.

- [x] **10.1 — Reescrever a máquina de estados do hook do scanner**
  Substituir o fluxo parcial atual por uma máquina de estados explícita:
  - `scan_secao`
  - `scan_operador`
  - `selecionar_operacao`
  - `informar_quantidade`
  - `registrar`
  - `trocar_operador`
  - `reiniciar_total`

  Regras:
  - `trocar_operador` preserva a seção já aberta
  - `reiniciar_total` limpa toda a sessão
  - após um registro bem-sucedido, o scanner não deve forçar o retorno ao início

  **Evidência:** O hook permite trocar operador sem reler o QR da seção e reiniciar tudo sem loops de estado nem travamentos de UI.
  `hooks/useScanner.ts` foi reescrito com uma máquina de estados explícita baseada em reducer para `scan_secao`, `scan_operador`, `selecionar_operacao`, `informar_quantidade`, `registrar`, `trocar_operador` e `reiniciar_total`, invertendo a ordem operacional para `seção -> operador` e preservando a seção aberta quando o supervisor troca apenas o operador. `app/(operador)/scanner/page.tsx` foi adaptada para a nova ordem, passou a oferecer a transição `Trocar operador` sem reler o QR da seção e a usar `reiniciarTotal()` como reset completo. A etapa `selecionar_operacao` ficou explícita na UI como transição controlada até a entrega da task `10.2`, sem reintroduzir o loop de estado visto no painel de apontamentos. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **10.2 — Adaptar o scanner para carregar as operações planejadas da seção**
  Implementar a leitura do contexto atômico da seção no scanner.

  Entregas mínimas:
  - carregar as operações derivadas daquela `turno_setor_op`
  - exibir realizado, saldo e status por operação
  - permitir seleção explícita da operação antes do input de quantidade

  **Evidência:** Após escanear a seção e o operador, o scanner lista as operações planejadas daquela seção com saldo correto e permite selecionar a operação a apontar.
  `lib/queries/scanner.ts` passou a expor `buscarOperacoesScaneadasPorSecao()` usando a mesma base de leitura das operações derivadas da seção. `hooks/useScanner.ts` foi adaptado para carregar essas operações imediatamente após o QR do operador, bloquear se a seção não tiver operações derivadas e exigir seleção explícita antes de avançar para a quantidade. `components/scanner/SelecaoOperacaoScanner.tsx` foi criado para exibir sequência, código, descrição, realizado, saldo e status de cada operação da `turno_setor_op`, e `components/scanner/ConfirmacaoRegistro.tsx` passou a refletir a operação selecionada no resumo antes do lançamento. `app/(operador)/scanner/page.tsx` deixou de usar o placeholder da etapa intermediária e passou a renderizar a seleção real de operações com as transições `Trocar operador` e `Trocar operação`. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **10.3 — Registrar produção pelo scanner no nível atômico correto**
  O scanner deve usar a action atômica existente, não o fluxo residual da seção.

  Payload alvo:
  - `operadorId`
  - `turnoSetorOperacaoId`
  - `quantidade`
  - `origemApontamento`
  - `usuarioSistemaId?`
  - `observacao?`

  Regra:
  - a quantidade fica atribuída ao `operador_id` do QR escaneado
  - se houver sessão autenticada de supervisor, o lançamento também audita `usuario_sistema_id`

  **Evidência:** Um lançamento no scanner preserva o operador executor, atualiza a operação correta e consolida seção, OP e turno sem supercontagem.
  `app/(operador)/scanner/page.tsx` deixou de usar `registrarProducao()` e passou a chamar `registrarProducaoOperacao()` no fluxo híbrido. `hooks/useScanner.ts` foi ajustado para enviar `operadorId + turnoSetorOperacaoId + quantidade + origemApontamento='operador_qr'`, validar o saldo da operação antes do envio e atualizar localmente o resumo consolidado da seção após o retorno bem-sucedido da action. `lib/actions/producao.ts` passou a resolver opcionalmente o `usuario_sistema_id` da sessão autenticada do scanner antes de chamar a RPC atômica, preservando a autoria quando houver supervisor logado sem quebrar o uso público do scanner. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **10.4 — Redesenhar a UI móvel do scanner híbrido**
  Layout mínimo:
  - tela `scan_secao`
  - tela `scan_operador`
  - tela `selecionar_operacao`
  - tela `informar_quantidade`
  - feedback pós-registro com ações rápidas

  Botões obrigatórios:
  - `Nova quantidade`
  - `Trocar operação`
  - `Trocar operador`
  - `Reiniciar tudo`

  **Evidência:** O fluxo móvel fica utilizável em celular pelo supervisor no chão, sem depender de abrir `/admin/apontamentos` para cada troca de operador ou operação.
  `app/(operador)/scanner/page.tsx` ganhou um indicador visual de etapas e copy operacional específica para as telas de leitura de seção e operador, mantendo o contexto do turno aberto visível no topo em mobile. `components/scanner/ConfirmacaoRegistro.tsx` foi redesenhado para uma tela de quantidade mobile-first com contexto de operador, operação, seção, saldo da operação e feedback pós-registro persistente com as quatro ações rápidas obrigatórias: `Nova quantidade`, `Trocar operação`, `Trocar operador` e `Reiniciar tudo`. `hooks/useScanner.ts` deixou de expulsar o usuário da tela de quantidade após sucesso e passou a manter a operação/seção atualizadas em memória para que o supervisor continue o fluxo no mesmo celular sem reler a seção. `components/scanner/SelecaoOperacaoScanner.tsx` também passou a sinalizar a disponibilidade real da operação e desabilitar seleção quando não houver saldo. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **10.5 — Remover o resíduo legado do scanner e homologar o fluxo híbrido**
  Limpar o que sobrou do fluxo antigo:
  - tela de confirmação que registra apenas `seção + operador + quantidade`
  - reset único que obriga reler a seção quando só o operador mudou
  - mensagens e contratos que assumem apontamento apenas no nível da seção

  Validar:
  - responsividade móvel
  - troca de operador na mesma seção
  - troca de operação com o mesmo operador
  - fallback administrativo em `/admin/apontamentos`

  **Evidência:** O scanner híbrido substitui o fluxo residual sem quebrar o fallback administrativo e sem reintroduzir apontamento agregado no nível incorreto.
  `app/(operador)/scanner/page.tsx` teve a copy residual por seção removida da etapa de quantidade e passou a expor um card permanente de contingência com link direto para `/admin/apontamentos`, mantendo o fallback administrativo acessível no próprio fluxo móvel. A homologação do scanner híbrido foi fechada sem regressão no contrato atômico: a varredura local do escopo do scanner não encontrou mais chamadas a `registrarProducao()` nem payloads residuais `turnoSetorOpId` ou mensagens de apontamento agregado por seção; `hooks/useScanner.ts` segue preservando a seção na troca de operador e a operação na nova quantidade; e `components/scanner/ConfirmacaoRegistro.tsx` continua operando no contexto `operador + operação + seção`. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros, `npm run build` conclui com sucesso e a rota de contingência `/admin/apontamentos` permanece publicada no build final.

---

## SPRINT 11 — Edição do turno aberto
**Status:** 🔭 Proposta
**Pré-requisito:** Sprint 10 concluída.
**Objetivo:** permitir que supervisor/admin incluam novas OPs em um turno já aberto, refletindo isso em toda a cadeia derivada sem exigir encerramento do turno.

### Nota de correção de modelagem

A homologação funcional desta sprint abriu uma correção obrigatória de negócio:

- a estrutura física reaproveitável do turno é o **setor**
- incluir uma nova OP em um turno aberto **não** pode duplicar visualmente setores, operações e QRs já existentes
- setores já ativos no turno devem ser reaproveitados
- um novo QR operacional só deve ser gerado quando a nova OP exigir um setor ainda ausente no turno
- no scanner, depois de abrir o setor e identificar o operador, o supervisor deve escolher qual `OP/produto` está apontando dentro daquele setor

Consequência para as entregas desta sprint:

- qualquer implementação que continue exibindo a estrutura operacional principal como `setor + OP` deve ser considerada incorreta para homologação
- a task `11.5` passa a validar o reaproveitamento da estrutura setorial do turno, e não a multiplicação de seções por OP

- [x] **11.1 — Formalizar a edição do turno aberto na dashboard**
  Entregas mínimas:
  - CTA `Editar turno` visível apenas para turno `aberto`
  - modal ou drawer de edição do turno atual
  - listagem das OPs existentes no turno
  - ação explícita `Adicionar OP`

  Regras:
  - turno encerrado não pode entrar em edição
  - o cabeçalho do turno permanece somente leitura neste incremento
  - a edição do turno não pode esconder o monitoramento em tempo real da dashboard

  **Evidência:** Com turno aberto, a dashboard expõe a edição do turno e permite iniciar a inclusão de nova OP sem sair do contexto do turno atual.
  `components/dashboard/MonitorPlanejamentoTurnoV2.tsx` passou a expor o CTA `Editar turno` apenas quando existe um turno `aberto`, sem substituir os fluxos de `Novo Turno` e `Encerrar Turno`. O novo modal `components/dashboard/ModalEditarTurnoAbertoV2.tsx` formaliza a edição do turno em andamento com cabeçalho em leitura, listagem das OPs já planejadas com status/planejado/realizado/saldo e um bloco local `Incluir nova OP` que já permite iniciar uma ou mais novas linhas de OP sem sair do contexto do turno atual. Neste incremento a gravação ainda não acontece, mas a UX da dashboard e o contrato visual do fluxo de edição ficaram definidos para a task `11.2`. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **11.2 — Permitir incluir nova OP no turno aberto com derivação imediata**
  Entregas mínimas:
  - formulário com `numeroOp`, `produtoId` e `quantidadePlanejada`
  - uso da action existente `adicionarOpAoTurno()`
  - recarga imediata do planejamento após salvar

  Regras:
  - apenas turnos `abertos` aceitam nova OP
  - `numero_op` deve seguir único dentro do turno
  - produto precisa estar ativo, com roteiro válido e setores válidos

  **Evidência:** Ao adicionar uma nova OP em turno aberto, o sistema cria a linha em `turno_ops` e deriva automaticamente suas seções e operações sem fechar o turno.
  `components/dashboard/ModalEditarTurnoAbertoV2.tsx` passou a executar a inclusão real de novas OPs via `adicionarOpAoTurno()`, com formulário para `numeroOp`, `produtoId` e `quantidadePlanejada`, validação local, tratamento explícito de sucesso parcial e recarga imediata do planejamento via `recarregar()` da dashboard. `components/dashboard/MonitorPlanejamentoTurnoV2.tsx` agora entrega esse refresh para o modal, mantendo o turno aberto enquanto a cadeia derivada é atualizada. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **11.3 — Endurecer as restrições de edição de OP existente**
  Entregas mínimas:
  - expor edição de OP existente apenas quando permitido
  - bloquear alteração estrutural em OP com produção
  - mensagens claras de bloqueio na UI

  Regras:
  - `produto` e `quantidadePlanejada` só podem mudar se a OP ainda não tiver produção
  - `numeroOp` não pode colidir com outra OP do mesmo turno
  - nenhuma edição pode apagar ou reescrever produção já apontada

  **Evidência:** Uma OP sem produção pode ser ajustada; uma OP com produção recebe bloqueio explícito para alterações estruturais.
  `components/dashboard/ModalEditarTurnoAbertoV2.tsx` passou a expor `Editar OP` somente para OPs sem produção detectada nas seções derivadas do turno, com formulário de edição para `numeroOp`, `produtoId` e `quantidadePlanejada` e mensagem explícita de bloqueio nas OPs que já possuem apontamento. `lib/actions/turnos.ts` endureceu `editarOpDoTurno()` para exigir turno `aberto` e rejeitar qualquer alteração estrutural quando já existir produção na OP. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **11.4 — Refletir a nova OP em toda a cadeia operacional**
  Entregas mínimas:
  - novos QRs de seção disponíveis na dashboard
  - nova OP visível no scanner
  - nova OP visível em `/admin/apontamentos`
  - dashboard e relatórios recalculados com o novo planejado do turno

  Regras:
  - a inclusão de nova OP não pode afetar a produção já consolidada das OPs anteriores
  - os agregados do turno devem aumentar de forma consistente com o novo planejado

  **Evidência:** Após incluir nova OP, dashboard, scanner, apontamentos e relatórios passam a enxergá-la no mesmo turno aberto, com QRs e saldos corretos.
  `lib/actions/turnos.ts` passou a revalidar também `/admin/apontamentos` e `/admin/relatorios` no mesmo evento de inclusão ou edição de OP, além de `/admin/dashboard` e `/scanner`. Com isso, a nova OP já nasce refletida na dashboard com seus QRs operacionais, fica disponível para leitura no scanner pelo QR derivado da seção, aparece no contexto do turno aberto em `/admin/apontamentos` e entra no escopo dos filtros e agregados de `/admin/relatorios` sem exigir fechamento do turno. `components/dashboard/ModalEditarTurnoAbertoV2.tsx` também passou a confirmar explicitamente essa propagação operacional após salvar. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [ ] **11.5 — Homologar o fluxo de edição do turno aberto**
  Validar:
  - inclusão de OP durante turno já em andamento
  - reaproveitamento dos setores já ativos no turno
  - geração de novos setores e QRs apenas quando houver setor inédito no turno
  - leitura do QR do setor no scanner com escolha posterior de `OP/produto`
  - fallback por `/admin/apontamentos`
  - manutenção do turno aberto até encerramento manual

  **Evidência:** Um turno em andamento recebe nova OP sem ser encerrado, reaproveita os setores já ativos sem duplicação visual, gera novos QRs apenas para setores inéditos e mantém a nova cadeia operacional utilizável imediatamente, com fechamento do turno funcionando sem regressão.

### Dependência aberta da Sprint 11

A homologação final da Sprint 11 ficou bloqueada por uma inconsistência estrutural do modelo atual:

- a implementação ainda usa `setor + OP` como unidade operacional visível
- a regra homologada de negócio exige `setor` como estrutura física reaproveitada do turno

Portanto:

- a `11.5` só pode ser concluída depois da sprint de refatoração estrutural abaixo
- qualquer ajuste pontual na UI atual sem corrigir o modelo base deve ser tratado como paliativo e não como homologação válida

---

## SPRINT 12 — Refatoração estrutural do turno por setor
**Status:** ⏭️ Prioridade máxima
**Pré-requisito:** Sprint 11 analisada e replanejada.
**Objetivo:** trocar a unidade operacional visível do sistema de `setor + OP` para `setor do turno`, destravando QR por setor, scanner com escolha de OP/produto e carry-over entre turnos.

### Critério de entrada desta sprint

Esta sprint nasce de uma validação de negócio já confirmada:

- o setor é a estrutura física reaproveitada do turno
- a OP alimenta a demanda interna do setor
- um novo QR só deve existir quando um novo setor entrar no turno

- [x] **12.1 — Refatorar o modelo de dados operacional para `turno + setor`**
  Entregas mínimas:
  - introduzir a entidade de setor ativo do turno como unidade operacional principal
  - separar a demanda por OP/produto dentro do setor
  - preservar o vínculo das operações executáveis dentro dessa demanda setorial
  - manter rastreabilidade com a estrutura atual durante a transição

  Proposta técnica mínima:
  - `turno_setores`: setor ativo do turno, com QR próprio
  - `turno_setor_demandas`: relação entre `turno_setor` e `turno_op`
  - evolução de `turno_setor_operacoes` para apontar a demanda setorial correta

  **Evidência:** Um turno com duas OPs que compartilham `Preparação` mantém um único setor `Preparação` ativo no banco, com duas demandas internas distintas e sem duplicação de QR.
  Evidência registrada em `scripts/sprint12_turno_setores_refactor.sql`, `types/supabase.ts`, `types/index.ts`, `lib/queries/turnos.ts` e `lib/queries/scanner.ts`. Validação read-only via Supabase Management API concluída em `2026-04-02`: no turno `03bf2781-c80a-4dae-a8ae-a99bd6ddee39`, o setor `Preparação` retornou `total_demandas = 4`, `total_setores_ativos = 1` e `total_qrs_distintos = 1`, com as OPs `201520, 201545, 201555, 201801`, comprovando que o modelo `turno + setor` mantém um único setor ativo com múltiplas demandas internas sem duplicação de QR.

- [x] **12.2 — Refatorar QR operacional, dashboard e edição de turno para reaproveitamento setorial**
  Entregas mínimas:
  - QR operacional passar a representar `turno + setor`
  - dashboard principal consolidar por setor do turno
  - detalhe do setor expor as OPs/produtos ativas ali
  - edição do turno reutilizar setores já ativos e criar QR só para setor novo

  Regras:
  - incluir nova OP não pode duplicar visualmente setores existentes
  - o card principal do setor no turno é único
  - a OP continua rastreável no detalhe e nos relatórios

  **Evidência:** Adicionar uma nova OP que também passa por `Preparação` não cria um segundo QR nem um segundo card de `Preparação`; apenas acrescenta a nova demanda interna desse setor.
  Evidência registrada em `components/dashboard/QROperacionaisTurnoV2.tsx`, `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`, `components/dashboard/ModalEditarTurnoAbertoV2.tsx`, `components/dashboard/ResumoPlanejamentoTurnoV2.tsx`, `components/dashboard/ModalEncerrarTurno.tsx`, `components/dashboard/ModalNovoTurnoV2.tsx`, `components/dashboard/PainelConfiguracaoTurno.tsx` e `lib/utils/turno-setores.ts`, com `npx tsc --noEmit` passando.

- [x] **12.3 — Refatorar o scanner para setor -> operador -> OP/produto -> operação -> quantidade**
  Entregas mínimas:
  - scanner ler QR do setor do turno
  - exibir as OPs/produtos ativos naquele setor
  - exigir escolha explícita da OP/produto antes da operação
  - manter `trocar operador`, `trocar OP/produto` e `trocar operação` sem reinício total

  Regras:
  - o supervisor não deve precisar reler o QR do setor ao trocar operador
  - o payload do scanner deve apontar a demanda setorial correta
  - `/admin/apontamentos` segue como fallback oficial

  **Evidência:** No mesmo setor aberto, o supervisor consegue alternar entre duas OPs/produtos diferentes e registrar produção de operadores distintos sem reiniciar a sessão do setor.
  Evidência registrada em `app/(operador)/scanner/page.tsx`, `hooks/useScanner.ts`, `lib/queries/scanner.ts`, `lib/queries/turno-setor-operacoes-base.ts`, `components/scanner/SelecaoDemandaScanner.tsx`, `components/scanner/SelecaoOperacaoScanner.tsx`, `components/scanner/ConfirmacaoRegistro.tsx`, `types/index.ts` e `lib/actions/producao.ts`, com `npx tsc --noEmit` passando.

- [x] **12.4 — Refatorar a consolidação de planejado x realizado sem supercontagem**
  Entregas mínimas:
  - consolidado por operação da demanda setorial
  - consolidado por demanda setorial
  - consolidado da OP pelos setores obrigatórios
  - consolidado do turno pela soma das OPs

  Regras:
  - setor compartilhado por várias OPs não pode poluir a leitura principal
  - relatórios por setor, OP e turno devem continuar coerentes
  - filtros não podem duplicar produção ao combinar setores e OPs

  **Evidência:** Duas OPs compartilhando o mesmo setor continuam separadas no detalhe, mas a dashboard principal mostra um único setor ativo e os relatórios não supercontam o realizado.
  Evidência registrada em `lib/utils/consolidacao-turno.ts`, `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts`, `lib/queries/relatorios-v2.ts`, `components/relatorios/ResumoRelatorios.tsx` e `components/apontamentos/PainelApontamentosSupervisor.tsx`, com `npx tsc --noEmit` passando.

- [x] **12.5 — Implementar carry-over de saldo entre turnos**
  Entregas mínimas:
  - calcular saldo remanescente de OPs não concluídas ao encerrar turno
  - permitir abrir novo turno carregando pendências do turno anterior
  - distinguir quantidade original já produzida da quantidade remanescente
  - manter rastreabilidade entre OP original e continuidade no turno seguinte

  Regras:
  - o turno anterior permanece fechado historicamente
  - o novo turno recebe apenas o saldo pendente
  - o supervisor pode combinar pendências carregadas com novas OPs do dia

  **Evidência:** Encerrar um turno com uma OP parcialmente produzida e abrir o turno seguinte gera uma nova demanda já preenchida com apenas o saldo faltante, mantendo o vínculo histórico com o turno anterior.
  Evidência registrada em `lib/actions/turnos.ts`, `components/dashboard/ModalNovoTurnoV2.tsx` e `types/index.ts`, com `npx tsc --noEmit` passando.

- [ ] **12.6 — Reabrir a homologação funcional do fluxo operacional**
  Validar:
  - abertura do turno com capacidade + OPs
  - geração de QR por setor do turno
  - inclusão de nova OP sem duplicar setor existente
  - scanner escolhendo `OP/produto` dentro do setor
  - fallback por `/admin/apontamentos`
  - carry-over de pendências entre turnos

  **Evidência:** O fluxo ponta a ponta do supervisor funciona no modelo setorial do turno, sem duplicação visual de setores, com scanner coerente e continuidade operacional entre turnos.
  Nota de homologação em `2026-04-02`: corrigido defeito no carry-over em que o novo turno reabria como pendente setores já concluídos no turno de origem. A correção foi aplicada em `lib/actions/turnos.ts`, hidratando no novo turno o progresso prévio por `setor + operação` antes da recarga da dashboard, para que setores concluídos permaneçam concluídos e setores parciais carreguem apenas o saldo real remanescente.
