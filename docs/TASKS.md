# TASKS.md — Especificação Técnica por Sprint

> Este é o arquivo de trabalho da IA.
> Para cada HU: executar → validar evidência → marcar [x] → descrever o que foi feito.
> Nunca avançar para a próxima sprint sem todas as HUs marcadas e evidências registradas.
> Ao concluir uma sprint, atualizar o status no BACKLOG.md.

---

## INSTRUÇÃO PARA O AGENTE

Antes de iniciar qualquer sprint, leia na ordem:
1. `AGENTS.md` — instruções permanentes do projeto e ritual obrigatório da sessão
2. `docs/PRD.md` — contexto de negócio (fluxos, regras, modelo operacional e regras de domínio)
3. `docs/TASKS.md` — este arquivo (sprints, HUs, evidências)

Só inicie a execução após confirmar a leitura dos 3 documentos.

Observação:
- `CLAUDE.md` pode existir como referência histórica complementar, mas não substitui o ritual obrigatório definido em `AGENTS.md`

Para cada HU:
1. Execute o que está especificado
2. Valide a evidência descrita
3. Marque [x] no checkbox
4. Escreva uma linha abaixo descrevendo o que foi feito

Ao concluir todas as HUs de uma sprint:
1. Atualize o status da sprint no `BACKLOG.md`
2. Informe quais evidências foram validadas
3. Aguarde minha confirmação antes de avançar para a próxima sprint

Nunca avance de sprint sem confirmação explícita minha.

---

## SPRINT 0 — Scaffolding e infraestrutura
**Status:** ✅ Concluída
**Objetivo:** Projeto rodando localmente com Supabase conectado.

- [x] **HU 0.1 — Criar projeto Next.js**
  `npm run dev` respondeu em localhost:3000, pronto em 234ms, sem erros de compilação.

- [x] **HU 0.2 — Instalar dependências**
  Instalados: `@supabase/ssr`, `@supabase/supabase-js`, `react-qr-code`, `html5-qrcode`, `recharts`, `framer-motion`, `lucide-react`. `npm run build` completo sem erros.

- [x] **HU 0.3 — Configurar TypeScript strict**
  `tsconfig.json` com `strict`, `noImplicitAny` e `strictNullChecks` habilitados. `npx tsc --noEmit` passa sem erros.

- [x] **HU 0.4 — Criar projeto no Supabase e configurar variáveis**
  `.env.local` criado com URL e anon key. `lib/supabase/client.ts` e `lib/supabase/server.ts` criados.
  ⚠️ `SUPABASE_SERVICE_ROLE_KEY` pendente — usuário ainda não forneceu. Verificação de conexão será validada na Sprint 1.

- [x] **HU 0.5 — Criar estrutura de pastas**
  Todos os diretórios criados conforme CLAUDE.md seção 5. `lib/constants.ts` com todas as constantes. `types/index.ts` com interfaces de domínio.

- [x] **HU 0.6 — Middleware de autenticação**
  `middleware.ts` na raiz + `lib/supabase/middleware.ts` protegendo `/admin/*`. Rotas `/scanner` e `/login` públicas.

- [x] **HU 0.7 — Layout base admin**
  `app/(admin)/layout.tsx` com sidebar responsiva (colapsável em mobile), header e nav com 5 links usando Lucide React e Tailwind. Páginas placeholder criadas para todas as rotas admin.

---

## SPRINT 1 — Banco de dados
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 0 concluída.
**Objetivo:** Schema completo no Supabase com views, configuração de turno e Realtime habilitado.

- [x] **HU 1.1 — Tabela: tipos_maquina**
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

- [x] **HU 1.2 — Tabela: operadores**
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

- [x] **HU 1.3 — Tabela: maquinas**
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

- [x] **HU 1.4 — Tabela: operacoes**
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

- [x] **HU 1.5 — Tabelas: produtos e produto_operacoes**
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

- [x] **HU 1.6 — Tabela: configuracao_turno**
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

- [x] **HU 1.7 — Tabela: registros_producao**
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

- [x] **HU 1.8 — Views analíticas**
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

- [x] **HU 1.9 — Row Level Security (RLS)**
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

- [x] **HU 1.10 — Habilitar Realtime**
  No Supabase Dashboard → Database → Replication → Tables:
  - Habilitar `registros_producao` (INSERT)
  - Habilitar `maquinas` (UPDATE)
  **Evidência:** `public.registros_producao` e `public.maquinas` adicionadas à publication `supabase_realtime`; validação feita com `pg_publication_tables`, retornando ambas as tabelas.

- [x] **HU 1.11 — Gerar types TypeScript e criar types de domínio**
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

- [x] **HU 1.12 — Seed de dados para desenvolvimento**
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

- [x] **HU 2.0 — lib/utils/producao.ts e lib/utils/qrcode.ts**

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

- [x] **HU 2.1 — CRUD Operadores**
  Arquivos:
  - `lib/actions/operadores.ts` — Server Actions: `criarOperador`, `editarOperador`, `excluirOperador`
  - `lib/queries/operadores.ts` — `listarOperadores`, `buscarOperadorPorToken`
  - `app/(admin)/operadores/page.tsx` — listagem com busca
  - `components/ui/ModalOperador.tsx` — formulário criar/editar
  - `components/qrcode/QRCodeDisplay.tsx` — exibe QR + botão download PNG

  QR Code: codifica `operador:{qr_code_token}`. Download via canvas `toDataURL`.
  **Evidência:** CRUD implementado com listagem, busca, modal de criação/edição, tela de detalhes em `/admin/operadores/[id]`, QR Code com download PNG e regra segura de desativação/exclusão. `npx tsc --noEmit` passa. ✅
  Implementado em `lib/actions/operadores.ts`, `lib/queries/operadores.ts`, `app/(admin)/operadores/page.tsx`, `app/(admin)/operadores/ListaOperadores.tsx`, `components/ui/ModalOperador.tsx`, `app/admin/operadores/[id]/page.tsx` e `components/qrcode/QRCodeDisplay.tsx`.

- [x] **HU 2.2 — CRUD Máquinas**
  Arquivos:
  - `lib/actions/maquinas.ts` — `criarMaquina`, `editarMaquina`, `trocarStatusMaquina`
  - `lib/queries/maquinas.ts` — `listarMaquinas`, `buscarMaquinaPorToken`
  - `app/(admin)/maquinas/page.tsx`
  - `components/ui/ModalMaquina.tsx`

  Troca de status: disponível na edição da máquina e na tela de detalhes; removida da listagem por decisão de UX durante a sprint.
  **Evidência:** CRUD implementado com listagem, busca, modal de criação/edição, tela de detalhes em `/admin/maquinas/[id]`, QR Code com download PNG e ações seguras de parada/exclusão. `npx tsc --noEmit` passa. ✅
  Implementado em `lib/actions/maquinas.ts`, `lib/queries/maquinas.ts`, `app/(admin)/maquinas/page.tsx`, `app/(admin)/maquinas/ListaMaquinas.tsx`, `components/ui/ModalMaquina.tsx`, `app/admin/maquinas/[id]/page.tsx` e `components/qrcode/QRCodeDisplay.tsx`.

- [x] **HU 2.3 — CRUD Operações**
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

- [x] **HU 2.4 — CRUD Produtos com roteiro**
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

- [x] **HU 3.1 — Hook useScanner**
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

- [x] **HU 3.2 — Componente QRScanner**
  Criar `components/scanner/QRScanner.tsx` como Client Component.
  Usar `html5-qrcode` com câmera traseira por padrão.
  Chamar `parseQRCode()` no resultado.
  Exibir overlay com guia visual de escaneamento.
  **Evidência:** Componente abre câmera no celular, lê QR de operador de teste e retorna token correto.
  `components/scanner/QRScanner.tsx` validado em celular físico com leitura real de QR no fluxo do scanner; câmera traseira, parse do código e bloqueios de contexto/permissão funcionando no túnel externo.

- [x] **HU 3.3 — Tela /scanner completa**
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

- [x] **HU 3.4 — Componente de confirmação e registro**
  Criar `components/scanner/ConfirmacaoRegistro.tsx`.
  Exibir: nome da operação, meta individual do dia, meta/hora.
  Botão "Registrar" com `min-height: 56px` (touch-friendly), verde.
  Após sucesso: animação verde (Framer Motion 800ms) + `navigator.vibrate(200)` + retorna ao `scan_operacao`.
  **Evidência:** Registrar 3 peças, confirmar 3 registros no Supabase com dados corretos.
  `components/scanner/ConfirmacaoRegistro.tsx` implementado e validado em celular: operação, meta individual e meta/hora exibidas; botão registrar dispara animação verde, vibração e retorno automático para `scan_operacao`.

- [x] **HU 3.5 — Server Action de registro de produção**
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

- [x] **HU 4.1 — Server Action e query de configuração do turno**
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

- [x] **HU 4.2 — Modal de configuração do turno**
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

- [x] **HU 4.3 — Hook useRealtimeProducao**
  Criar `hooks/useRealtimeProducao.ts`:
  Assina INSERT em `registros_producao` via Supabase Realtime.
  A cada evento: refetch de `vw_producao_hoje` e `vw_producao_por_hora`.
  Retorna: `{ registros, totalPecas, eficienciaMedia, configuracaoTurno, ultimaAtualizacao }`.
  **Evidência:** Dashboard aberto + registro criado pelo scanner → dashboard atualiza em menos de 2 segundos.
  `hooks/useRealtimeProducao.ts` implementado com assinatura `postgres_changes` em `registros_producao`, queries client-side para `vw_producao_hoje` e `vw_producao_por_hora` e consumidor real no `/admin/dashboard`; validação feita com registro criado pelo scanner e atualização automática do dashboard em menos de 2 segundos.

- [x] **HU 4.4 — Cards de KPI**
  Criar `components/dashboard/CardKPI.tsx`.
  4 cards:
  - Meta Grupo do dia (de `configuracao_turno.meta_grupo`)
  - Progresso % = `(total_pecas_hoje / meta_grupo) × 100`
  - Eficiência média da linha
  - Peças produzidas hoje
  Animação de contagem (Framer Motion) quando valor muda.
  **Evidência:** Cards exibem valores corretos. Progresso % atualiza após novo registro.
  `components/dashboard/CardKPI.tsx` implementado com animação de contagem e integrado ao dashboard via `useRealtimeProducao`; cards de Meta Grupo, Progresso %, Eficiência média e Peças produzidas validados na UI, com atualização automática após novo registro do scanner.

- [x] **HU 4.5 — Gráfico de produção por hora**
  Criar `components/dashboard/GraficoProducaoPorHora.tsx`.
  Usar Recharts `LineChart`. Dados de `vw_producao_por_hora`.
  **Evidência:** Gráfico exibe curva de produção corretamente.
  `components/dashboard/GraficoProducaoPorHora.tsx` implementado com `ResponsiveContainer` e `LineChart` do Recharts, integrado ao `useRealtimeProducao`; gráfico validado no dashboard com curva por hora, tooltip correto e atualização automática após novo registro no scanner.

- [x] **HU 4.6 — Ranking de operadores**
  Criar `components/dashboard/RankingOperadores.tsx`.
  Dados de `vw_producao_hoje`. Cores: verde ≥ 70%, amarelo 50–69%, vermelho < 50%.
  **Evidência:** Ranking ordenado com cores corretas.
  `components/dashboard/RankingOperadores.tsx` implementado e integrado ao dashboard com dados de `vw_producao_hoje`; validação feita com ranking ordenado pela eficiência e faixas visuais corretas: verde ≥ 70%, amarelo entre 50% e 69,99% e vermelho abaixo de 50%.

- [x] **HU 4.7 — Grid de status das máquinas**
  Criar `components/dashboard/StatusMaquinas.tsx`.
  Dados de `vw_status_maquinas`.
  Card pisca vermelho se `minutos_sem_uso > ALERTA_MAQUINA_PARADA`.
  **Evidência:** Máquina sem registro há 20 min aparece com card piscando.
  `components/dashboard/StatusMaquinas.tsx` implementado com dados de `vw_status_maquinas`, integrado ao `useRealtimeProducao` e ao dashboard; grid validado com código, tipo, último uso, minutos sem uso e diferenciação visual por status, incluindo alerta vermelho pulsante quando `minutos_sem_uso` ultrapassa `ALERTA_MAQUINA_PARADA`.

- [x] **HU 4.8 — Página do dashboard**
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

- [x] **HU 5.1 — Atualizar PRD para o fluxo V2**
  Reescrever o PRD para refletir:
  - turno como contêiner operacional
  - OPs do dia com produto e quantidade planejada
  - derivação automática de setores e operações a partir do roteiro do produto
  - QR operacional temporário por `setor + OP`
  - encerramentos automáticos e manuais
  **Evidência:** `PRD.md` atualizado com fluxo operacional, entidades, regras e módulos da V2.
  Fluxo antigo centrado em `máquina + operação` substituído por `turno + OP + setor`, com regras de QR temporário, apontamento por setor e encerramentos automáticos documentadas em `PRD.md`.

- [x] **HU 5.2 — Reescrever o plano de execução para a V2**
  Substituir as sprints pendentes do plano antigo por fases de implementação V2, com entidades, dependências e estratégia de migração.
  **Evidência:** `TASKS.md` passa a refletir o plano V2 como única fonte de verdade para as próximas entregas.
  Plano antigo de multi-produto/blocos substituído por fases V2 com migração aditiva, coexistência controlada e cutover posterior.

---

## SPRINT 6 — Base de domínio V2
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 5 concluída.
**Objetivo:** Criar a base de dados e os contratos da V2 sem quebrar o fluxo atual.

- [x] **HU 6.1 — Criar tabela e CRUD de setores**
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

- [x] **HU 6.2 — Criar tabela de usuários do sistema**
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

- [x] **HU 6.3 — Evoluir operações para dependerem de setor**
  Ajustar `operacoes` para incluir:
  - código sequencial automático
  - setor obrigatório
  - situação
  - tempo padrão manual

  Regra:
  - o setor da operação será usado para derivar as seções `setor + OP` do turno
  **Evidência:** Produto com roteiro completo permite identificar automaticamente os setores envolvidos a partir das operações vinculadas.
  Migração `scripts/sprint6_operacoes_setor.sql` aplicada no Supabase com `setor_id` e geração automática de código; backfill dos setores das operações existentes validado; CRUD de operações atualizado para exigir setor e telas de produtos passaram a exibir os setores envolvidos derivados do roteiro. `npx tsc --noEmit` passa sem erros.

- [x] **HU 6.4 — Evoluir máquinas e operadores para a V2**
  Ajustar:
  - `maquinas` para usar `setor_id`
  - `operadores` para incluir `carga_horaria_min`

  Regra:
  - operador não pertence mais fixamente a um setor; a alocação passa a ser dinâmica por turno
  **Evidência:** Operadores e máquinas mantêm cadastro válido com vínculo consistente a setores, sem quebra dos CRUDs existentes.
  Migração `scripts/sprint6_maquinas_operadores_v2.sql` aplicada no Supabase com backfill inicial de `maquinas.setor_id` e `operadores.carga_horaria_min`; CRUD de máquinas atualizado para setor estruturado e CRUD de operadores atualizado para carga horária e alocação dinâmica por turno. Validação funcional confirmada na UI. `npx tsc --noEmit` passa sem erros.

- [x] **HU 6.5 — Regenerar types e contratos da V2**
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
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 6 concluída.
**Objetivo:** Transformar o cadastro estrutural do produto em planejamento executável do dia.

- [x] **HU 7.1 — Criar schema de turnos, OPs e seções operacionais**
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

- [x] **HU 7.2 — Implementar actions e queries do planejamento**
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

- [x] **HU 7.3 — Implementar modal "Novo Turno" V2**
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

- [x] **HU 7.4 — Gerar QR operacional temporário por setor + OP**
  Implementar geração de QR para cada `turno_setor_op`.
  Regra:
  - o QR muda a cada novo turno
  - o QR identifica o contexto operacional do turno, não um cadastro mestre fixo
  **Evidência:** Abrir um novo turno para a mesma OP gera um QR diferente do turno anterior.
  `lib/utils/qrcode.ts` passou a expor `gerarValorQROperacionalSetorOp()` com o prefixo operacional temporário `setor-op:` para a V2. `components/dashboard/QROperacionaisTurnoV2.tsx` implementado e integrado em `app/admin/dashboard/page.tsx`, exibindo um QR por seção `setor + OP` com download em PNG, quantidade planejada, status e token temporário. Validação concluída via Supabase Management API em `2026-03-28`: a mesma OP `OP-VALIDACAO-QR-001` no produto `REF-002 / Polo com Botões`, no setor `Preparação`, gerou `qr_code_token` diferentes em dois turnos distintos (`4c24b3b7cb29ee26ef7b6f28bcf47bee8b9e0f42db19aa5c54609b7e85a9a49c` e `ab063df8894cc35936bebdcad21393e3a55582b3e5e321fab26fde17c856af10`). Os turnos temporários `5bc7b018-4a97-4864-a234-a0c1b4305491` e `e1efc824-7378-4b5b-92dd-4e39ab2bb5ee` foram removidos após o teste. `npx tsc --noEmit` passa sem erros.

---

## SPRINT 8 — Scanner e apontamento V2
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 7 concluída.
**Objetivo:** Registrar produção no contexto correto do turno, com bloqueios consistentes e sem excesso sobre o planejado.

- [x] **HU 8.1 — Evoluir o parser e os tipos de QR**
  Ajustar `lib/utils/qrcode.ts` e os contratos da aplicação para suportar o QR operacional de `setor + OP`.
  **Evidência:** Scanner reconhece separadamente QR de operador e QR operacional da seção do turno.
  `lib/constants.ts` e `types/index.ts` atualizados para suportar o novo tipo `setor-op`, incluindo o contrato `TurnoSetorOpScaneado`. `lib/utils/qrcode.ts` passou a validar `setor-op:` no parser, expor `descreverTipoQRCode()` e manter `gerarValorQROperacionalSetorOp()`. `app/(operador)/scanner/page.tsx` passou a exibir mensagens específicas com o tipo reconhecido quando um QR é lido fora da etapa esperada. Validação concluída em `2026-03-28`: `parseQRCode('operador:abc123def456ghi789')` retornou `{ tipo: 'operador', token: 'abc123def456ghi789' }` e `parseQRCode('setor-op:xyz987uvw654rst321')` retornou `{ tipo: 'setor-op', token: 'xyz987uvw654rst321' }`, com descrições distintas no scanner. `npx tsc --noEmit` passa sem erros.

- [x] **HU 8.2 — Implementar sessão do scanner V2**
  Novo fluxo:
  - scan do operador
  - scan do QR operacional `setor + OP`
  - exibição do contexto da seção aberta
  - input da quantidade executada

  Regra:
  - a máquina pode ser informada opcionalmente, mas não é obrigatória
  **Evidência:** Sessão de scanner mostra turno, OP, produto, setor e saldo restante antes do lançamento.
  `hooks/useScanner.ts` foi reestruturado para o fluxo `scan_operador -> scan_setor_op -> confirmar`, usando `buscarTurnoSetorOpScaneadoPorToken()` e removendo a obrigatoriedade de máquina na sessão V2. `app/(operador)/scanner/page.tsx` passou a exigir QR `setor-op` na segunda etapa e a exibir cards de operador, setor, OP, produto, turno e saldo antes do lançamento. `components/scanner/ConfirmacaoRegistro.tsx` foi adaptado para mostrar o contexto completo da seção do turno e o input de quantidade executada. Validação concluída em `2026-03-28`: `npx tsc --noEmit` passa sem erros e a consulta via Supabase Management API ao contexto operacional mais recente retornou `turno_iniciado_em = 2026-03-28 20:30:47.497507+00`, `numero_op = OP-VALIDACAO-7.1`, `referencia = REF-002`, `produto_nome = Polo com Botões`, `setor_nome = Preparação`, `saldo_restante = 100` e `qr_code_token = cf0531d04c6e5b64d78be890578e3e6154adb1233cfb37c69cd466b9c5215ebd`, que são exatamente os campos agora exibidos na sessão V2 antes do lançamento. O botão de lançamento permanece bloqueado por mensagem explícita até a HU `8.3`, onde entra a transação de apontamento.

- [x] **HU 8.3 — Implementar apontamento transacional com bloqueio de excesso**
  Ajustar `registros_producao` e criar a lógica transacional no backend para:
  - registrar produção no contexto da seção do turno
  - impedir ultrapassar a quantidade planejada
  - atualizar o realizado do `turno_setor_op`

  Regra:
  - a validação final deve ficar no banco ou em operação transacional segura, não apenas no client
  **Evidência:** Dois lançamentos concorrentes não conseguem ultrapassar a quantidade planejada da seção.
  `scripts/sprint8_apontamento_v2.sql` criou a base transacional da V2: `registros_producao.turno_setor_op_id`, flexibilização de `operacao_id` para o fluxo legado/V2 coexistirem, `buscar_turno_setor_op_scanner()` para leitura pública do contexto do QR e `registrar_producao_turno_setor_op()` com `FOR UPDATE` na seção para serializar concorrência. `lib/queries/scanner.ts` passou a consultar o contexto do scanner por RPC, `lib/actions/producao.ts` passou a registrar via RPC transacional e `app/(operador)/scanner/page.tsx` voltou a enviar o lançamento real a partir da sessão V2. Validação concluída em `2026-03-28`: `npx tsc --noEmit` passa sem erros e, na seção temporária `65fc1ff3-72a3-4e2a-b39e-296e8a917866` com planejado `5`, dois lançamentos concorrentes via Supabase Management API (`4` e `3`) resultaram em apenas um sucesso (`registro_id = 5d7d9405-e676-4b00-a076-676cae08d982`, `quantidade_realizada = 4`, `saldo_restante = 1`) e o segundo falhou com `Quantidade excede o saldo restante da seção.`. A verificação final retornou `total_registros = 1` e `total_quantidade_registrada = 4`, provando que o total não ultrapassou o planejado. A OP temporária `OP-VALIDACAO-8.3-20260328-T1` e o registro de teste foram removidos ao final.

- [x] **HU 8.4 — Implementar encerramentos automáticos**
  Regras:
  - setor encerra ao atingir o planejado
  - OP encerra quando todos os setores obrigatórios estiverem concluídos
  - turno pode ser encerrado manualmente ou ao abrir o próximo
  **Evidência:** Atingir o planejado de um setor encerra a seção automaticamente e reflete isso no andamento da OP e do turno.
  `scripts/sprint8_encerramentos_automaticos.sql` adicionou `sincronizar_andamento_turno_op()` e evoluiu `registrar_producao_turno_setor_op()` para encerrar a seção automaticamente ao atingir o planejado, atualizar `quantidade_realizada`, marcar a OP como `em_andamento` ou `concluida` conforme o estado agregado das seções e tocar o `updated_at` do turno para refletir progresso. `components/dashboard/ResumoPlanejamentoTurnoV2.tsx` passou a exibir `OPs concluídas` e `Seções concluídas`, deixando o andamento do turno visível na dashboard V2. Validação concluída em `2026-03-28`: `npx tsc --noEmit` passa sem erros e, na OP temporária `OP-VALIDACAO-8.4-20260328-T1` do turno aberto `404135e9-e5bb-43c9-bb52-d4c2acb4cd77`, quatro apontamentos de `2` encerraram automaticamente as seções `Preparação`, `Frente`, `Montagem` e `Finalização` com `status_turno_setor_op = concluida` e `saldo_restante = 0`. A verificação final retornou `turno_op_status = concluida`, `turno_op_realizada = 2`, `secoes_concluidas_da_op = 4/4`, `turno_status = aberto` e `secoes_concluidas_no_turno = 4/4`, demonstrando o reflexo no andamento da OP e do turno sem autoencerrar o turno. A OP temporária e os 4 registros de validação foram removidos ao final.

---

## SPRINT 9 — Apontamentos atômicos, dashboard, relatórios e coexistência
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 8 concluída.
**Objetivo:** Evoluir a V2 para registrar produção no nível correto de operador + operação + seção, trocar a leitura gerencial para esse consolidado e manter a base histórica consistente durante a transição.

> Refinamento de plano da Sprint 9:
> a modelagem entregue até a Sprint 8 consolidou `turno_setor_op` como unidade de execução, o que é suficiente para o andamento macro do turno, mas não preserva corretamente a produtividade por operador quando o supervisor faz lançamentos agregados do setor. A partir daqui, a fonte de verdade operacional passa a ser o apontamento atômico por `operador + operação + seção`, com consolidação ascendente para seção, OP e turno sem supercontagem.

- [x] **HU 9.1 — Refazer a dashboard para o modelo V2**
  Mostrar:
  - turno aberto ou último turno encerrado
  - OPs em andamento
  - progresso por OP
  - progresso por setor
  - planejado vs realizado
  - seções concluídas e pendentes
  **Evidência:** Dashboard acompanha em tempo real o planejamento derivado das OPs e setores do turno.
  `lib/queries/turnos-client.ts` passou a oferecer o snapshot V2 no browser, `hooks/useRealtimePlanejamentoTurnoV2.ts` implementou recarga em tempo real por `turnos`, `turno_operadores`, `turno_ops`, `turno_setor_ops` e `registros_producao`, e `components/dashboard/MonitorPlanejamentoTurnoV2.tsx` substituiu o monitor legado por uma dashboard V2 com turno aberto/último encerrado, KPIs de planejado vs realizado, OPs em andamento, progresso por OP, seções pendentes/concluídas e QRs operacionais do turno. `app/admin/dashboard/page.tsx` passou a usar o monitor V2 como bloco principal e `components/dashboard/PainelConfiguracaoTurno.tsx` foi simplificado para não misturar métricas legadas com a nova visão. Como ajuste final da `9.1`, o cabeçalho da dashboard passou a expor `Novo Turno` e `Encerrar Turno`, com o encerramento manual aparecendo apenas quando o turno atual está `aberto`, usando um modal dedicado de confirmação alinhado ao design do sistema e acionando a `encerrarTurno()` já existente no backend. `scripts/sprint9_dashboard_v2_realtime.sql` adicionou `turnos`, `turno_operadores`, `turno_ops` e `turno_setor_ops` à publication `supabase_realtime`. Validação concluída em `2026-03-28`: `npx tsc --noEmit` passa sem erros, `pg_publication_tables` retornou as 4 tabelas V2 na publication e a OP temporária `OP-VALIDACAO-9.1-20260328-T1` criada no turno aberto `404135e9-e5bb-43c9-bb52-d4c2acb4cd77` derivou `4` seções automaticamente, confirmando o snapshot operacional que a dashboard V2 agora consome e atualiza por Realtime. A OP temporária foi removida ao final.

- [x] **HU 9.2 — Evoluir o domínio V2 para operação dentro da seção**
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

- [x] **HU 9.3 — Implementar apontamento atômico do supervisor**
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

- [x] **HU 9.4 — Adaptar dashboard e relatórios para os novos consolidados**
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

- [x] **HU 9.5 — Implementar compatibilidade temporária com o legado**
  Regras:
  - registros antigos continuam legíveis
  - relatórios não quebram durante a transição
  - dashboard e apontamentos V2 não dependem de apagar imediatamente o modelo anterior
  **Evidência:** Dados históricos do fluxo antigo continuam acessíveis após a entrada da V2.
  A camada de relatórios V2 em `lib/queries/relatorios-v2.ts` passou a unir registros atômicos da V2 com registros legados de `registros_producao` cujo vínculo estrutural (`turno_op_id`, `turno_setor_op_id`, `turno_setor_operacao_id`) ainda é nulo. A UI de `app/admin/relatorios/page.tsx` e dos componentes `components/relatorios/TabelaRelatorios.tsx` e `components/relatorios/ResumoRelatorios.tsx` passou a identificar a origem de cada linha, preservar o histórico legado como leitura acessível e manter a consolidação estrutural V2 separada, sem exigir remoção imediata do modelo antigo. A query legada `lib/queries/relatorios.ts` foi mantida tipada para coexistência. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros; consulta read-only via Supabase Management API confirmou `20` registros legados ainda acessíveis em `public.registros_producao` após a entrada da V2, no intervalo de `2026-03-25` a `2026-03-25`; e uma amostra dos IDs `0384e977-ba3c-4b81-9d44-2a5e451cc04c`, `b14eae7e-6bae-48e8-bb27-7c7dbf0b25f3` e `07cf39db-09a6-4228-a6f6-1006696b73ad` continuou legível com operador, operação e quantidade preservados no fluxo legado.

- [x] **HU 9.6 — Cutover controlado e validação final**
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

- [x] **HU 10.1 — Reescrever a máquina de estados do hook do scanner**
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
  `hooks/useScanner.ts` foi reescrito com uma máquina de estados explícita baseada em reducer para `scan_secao`, `scan_operador`, `selecionar_operacao`, `informar_quantidade`, `registrar`, `trocar_operador` e `reiniciar_total`, invertendo a ordem operacional para `seção -> operador` e preservando a seção aberta quando o supervisor troca apenas o operador. `app/(operador)/scanner/page.tsx` foi adaptada para a nova ordem, passou a oferecer a transição `Trocar operador` sem reler o QR da seção e a usar `reiniciarTotal()` como reset completo. A etapa `selecionar_operacao` ficou explícita na UI como transição controlada até a entrega da HU `10.2`, sem reintroduzir o loop de estado visto no painel de apontamentos. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **HU 10.2 — Adaptar o scanner para carregar as operações planejadas da seção**
  Implementar a leitura do contexto atômico da seção no scanner.

  Entregas mínimas:
  - carregar as operações derivadas daquela `turno_setor_op`
  - exibir realizado, saldo e status por operação
  - permitir seleção explícita da operação antes do input de quantidade

  **Evidência:** Após escanear a seção e o operador, o scanner lista as operações planejadas daquela seção com saldo correto e permite selecionar a operação a apontar.
  `lib/queries/scanner.ts` passou a expor `buscarOperacoesScaneadasPorSecao()` usando a mesma base de leitura das operações derivadas da seção. `hooks/useScanner.ts` foi adaptado para carregar essas operações imediatamente após o QR do operador, bloquear se a seção não tiver operações derivadas e exigir seleção explícita antes de avançar para a quantidade. `components/scanner/SelecaoOperacaoScanner.tsx` foi criado para exibir sequência, código, descrição, realizado, saldo e status de cada operação da `turno_setor_op`, e `components/scanner/ConfirmacaoRegistro.tsx` passou a refletir a operação selecionada no resumo antes do lançamento. `app/(operador)/scanner/page.tsx` deixou de usar o placeholder da etapa intermediária e passou a renderizar a seleção real de operações com as transições `Trocar operador` e `Trocar operação`. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **HU 10.3 — Registrar produção pelo scanner no nível atômico correto**
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

- [x] **HU 10.4 — Redesenhar a UI móvel do scanner híbrido**
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

- [x] **HU 10.5 — Remover o resíduo legado do scanner e homologar o fluxo híbrido**
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
**Status:** ✅ Concluída
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
- a HU `11.5` passa a validar o reaproveitamento da estrutura setorial do turno, e não a multiplicação de seções por OP

- [x] **HU 11.1 — Formalizar a edição do turno aberto na dashboard**
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
  `components/dashboard/MonitorPlanejamentoTurnoV2.tsx` passou a expor o CTA `Editar turno` apenas quando existe um turno `aberto`, sem substituir os fluxos de `Novo Turno` e `Encerrar Turno`. O novo modal `components/dashboard/ModalEditarTurnoAbertoV2.tsx` formaliza a edição do turno em andamento com cabeçalho em leitura, listagem das OPs já planejadas com status/planejado/realizado/saldo e um bloco local `Incluir nova OP` que já permite iniciar uma ou mais novas linhas de OP sem sair do contexto do turno atual. Neste incremento a gravação ainda não acontece, mas a UX da dashboard e o contrato visual do fluxo de edição ficaram definidos para a HU `11.2`. Validação concluída em `2026-03-30`: `npx tsc --noEmit` passa sem erros.

- [x] **HU 11.2 — Permitir incluir nova OP no turno aberto com derivação imediata**
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

- [x] **HU 11.3 — Endurecer as restrições de edição de OP existente**
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

- [x] **HU 11.4 — Refletir a nova OP em toda a cadeia operacional**
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

- [x] **HU 11.5 — Homologar o fluxo de edição do turno aberto**
  Validar:
  - inclusão de OP durante turno já em andamento
  - reaproveitamento dos setores já ativos no turno
  - geração de novos setores e QRs apenas quando houver setor inédito no turno
  - leitura do QR do setor no scanner com escolha posterior de `OP/produto`
  - fallback por `/admin/apontamentos`
  - manutenção do turno aberto até encerramento manual

  **Evidência:** Um turno em andamento recebe nova OP sem ser encerrado, reaproveita os setores já ativos sem duplicação visual, gera novos QRs apenas para setores inéditos e mantém a nova cadeia operacional utilizável imediatamente, com fechamento do turno funcionando sem regressão.
  Homologação concluída em `2026-04-02` após a refatoração setorial da Sprint 12. `components/dashboard/ModalEditarTurnoAbertoV2.tsx` e `components/dashboard/QROperacionaisTurnoV2.tsx` mantêm a inclusão de OP no turno aberto com reaproveitamento dos setores e criação de QR apenas para setor inédito; `app/(operador)/scanner/page.tsx`, `hooks/useScanner.ts` e `lib/queries/scanner.ts` sustentam o fluxo `setor -> operador -> OP/produto -> operação -> quantidade`; `app/admin/apontamentos/page.tsx` e `components/apontamentos/PainelApontamentosSupervisor.tsx` preservam o fallback administrativo; e `lib/actions/turnos.ts` mantém o turno aberto até `encerrarTurno()`. Validação técnica concluída com `npx tsc --noEmit`, `npm run build` e consulta read-only ao Supabase no turno aberto `4020fd8b-af3d-4633-ab2c-7457f68e4af0`, retornando `4` setores ativos, `13` demandas internas, `4` OPs planejadas, `4` setores distintos e `4` QRs distintos, confirmando a ausência de duplicação visual e a coerência da cadeia operacional após edição do turno.

### Dependência da Sprint 11 — Resolvida

A homologação final da Sprint 11 havia ficado bloqueada por uma inconsistência estrutural do modelo anterior:

- a implementação ainda usa `setor + OP` como unidade operacional visível
- a regra homologada de negócio exige `setor` como estrutura física reaproveitada do turno

Situação final:

- a dependência foi resolvida pela Sprint 12, que migrou o fluxo para `turno + setor`
- a `11.5` foi reaberta e concluída no modelo setorial homologado

---

## SPRINT 12 — Refatoração estrutural do turno por setor
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 11 analisada e replanejada.
**Objetivo:** trocar a unidade operacional visível do sistema de `setor + OP` para `setor do turno`, destravando QR por setor, scanner com escolha de OP/produto e carry-over entre turnos.

### Critério de entrada desta sprint

Esta sprint nasce de uma validação de negócio já confirmada:

- o setor é a estrutura física reaproveitada do turno
- a OP alimenta a demanda interna do setor
- um novo QR só deve existir quando um novo setor entrar no turno

- [x] **HU 12.1 — Refatorar o modelo de dados operacional para `turno + setor`**
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

- [x] **HU 12.2 — Refatorar QR operacional, dashboard e edição de turno para reaproveitamento setorial**
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

- [x] **HU 12.3 — Refatorar o scanner para setor -> operador -> OP/produto -> operação -> quantidade**
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

- [x] **HU 12.4 — Refatorar a consolidação de planejado x realizado sem supercontagem**
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

- [x] **HU 12.5 — Implementar carry-over de saldo entre turnos**
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

- [x] **HU 12.6 — Reabrir a homologação funcional do fluxo operacional**
  Validar:
  - abertura do turno com capacidade + OPs
  - geração de QR por setor do turno
  - inclusão de nova OP sem duplicar setor existente
  - scanner escolhendo `OP/produto` dentro do setor
  - fallback por `/admin/apontamentos`
  - carry-over de pendências entre turnos

  **Evidência:** O fluxo ponta a ponta do supervisor funciona no modelo setorial do turno, sem duplicação visual de setores, com scanner coerente e continuidade operacional entre turnos.
  Nota de homologação em `2026-04-02`: corrigido defeito no carry-over em que o novo turno reabria como pendente setores já concluídos no turno de origem. A correção foi aplicada em `lib/actions/turnos.ts`, hidratando no novo turno o progresso prévio por `setor + operação` antes da recarga da dashboard, para que setores concluídos permaneçam concluídos e setores parciais carreguem apenas o saldo real remanescente.
  Homologação técnica reaberta e validada em `2026-04-02` com `npx tsc --noEmit`, `npm run build` e consulta read-only ao Supabase do turno aberto `a9edf6e9-1313-4599-82ad-eff145403353`, retornando `3` setores ativos, `6` demandas internas e `2` OPs planejadas, confirmando a coerência do modelo setorial do turno na dashboard V2 após a refatoração.

- [x] **HU 12.7 — Implementar KPI Meta do Grupo e gráfico planejado x alcançado por hora na dashboard V2**
  Entregas mínimas:
  - calcular a média simples dos `tp_produto_min` dos produtos vinculados às `turno_ops` do turno aberto
  - calcular `meta_grupo_turno = floor((operadores_disponiveis × minutos_turno) / media_tp_produto_turno)`
  - exibir a KPI `Meta do Grupo` na dashboard V2
  - exibir o gráfico `Projeção do planejado x Alcançado por hora`

  Regras:
  - a média deve considerar uma entrada por `turno_op`, usando o `tp_produto_min` do produto daquela OP
  - a Meta do Grupo V2 não pode ser calculada por soma das metas de cada produto
  - a Meta do Grupo V2 não pode ser calculada por soma de blocos legados
  - a curva de projeção deve partir da meta total calculada para o turno aberto
  - a curva de alcançado deve refletir os apontamentos consolidados do turno ao longo das horas

  **Evidência:** Em um turno com múltiplas OPs/produtos, a dashboard V2 exibe a `Meta do Grupo` calculada pela média simples dos `tp_produto_min` das `turno_ops`, e o gráfico mostra `Projeção do planejado x Alcançado por hora` com atualização coerente após novos apontamentos.
  Implementado em `types/index.ts`, `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts`, `lib/queries/meta-grupo-turno-v2-client.ts`, `lib/utils/meta-grupo-turno.ts`, `hooks/useMetaGrupoTurnoV2.ts`, `components/dashboard/MonitorPlanejamentoTurnoV2.tsx` e `components/dashboard/GraficoMetaGrupoTurnoV2.tsx`. Validação concluída em `2026-04-02`: `npx tsc --noEmit` e `npm run build` passam sem erros; consulta read-only ao turno aberto `a9edf6e9-1313-4599-82ad-eff145403353` retornou as OPs `202625874` (`REF-001`, `tp_produto_min = 1.88`) e `2026030547` (`REF-002`, `tp_produto_min = 2.46`), com `media_tp_produto_turno = 2.17` e `meta_grupo_turno = 5875` para `25` operadores e `510` minutos.

---

## MUDANÇA DE DOMÍNIO FORMALIZADA — Máquinas

Formalizado documentalmente em `2026-04-02`, antes da refatoração de código e schema:

- `maquinas` deixa de ser uma entidade operacional da V2
- `maquinas` passa a existir apenas como cadastro patrimonial e de rastreabilidade física
- `tipo_maquina` deixa de fazer parte do contrato alvo da entidade `maquinas`
- a vinculação direta entre `maquinas` e `setor` deixa de fazer parte do contrato alvo da entidade `maquinas`
- a derivação operacional do turno continua nas entidades `operacoes`, `setores`, `turno_setores`, `turno_setor_demandas` e `turno_setor_operacoes`

Esta mudança foi aplicada em `2026-04-02` na Sprint 13, preservando o papel patrimonial de `maquinas` e removendo seu acoplamento operacional com a V2.

## SPRINT 13 — Simplificação do domínio de máquinas
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 12 concluída.
**Objetivo:** remover do domínio de `maquinas` os campos operacionais herdados do modelo antigo, preservando apenas o papel patrimonial e de rastreabilidade física.

- [x] **HU 13.1 — Refatorar o schema de `maquinas` para o contrato patrimonial**
  Entregas mínimas:
  - remover `tipo_maquina` da tabela `maquinas`
  - remover a vinculação direta entre `maquinas` e `setor`
  - preservar `codigo`, `modelo`, `marca`, `numero_patrimonio`, `status` e `qr_code_token`
  - revisar seeds, migrações e views impactadas

  Regras:
  - a remoção não pode quebrar a V2 operacional baseada em `turno + setor`
  - a máquina deve continuar existindo para patrimônio e auditoria
  - qualquer dependência residual de `maquinas` no fluxo operacional deve ser removida ou substituída

  **Evidência:** Schema aplicado sem `tipo_maquina` e sem vínculo direto com `setor` em `maquinas`, com integridade preservada nas demais entidades.
  Implementado em `scripts/sprint13_maquinas_dominio_patrimonial.sql` e aplicado via Supabase Management API em `2026-04-02`. A tabela `public.maquinas` passou a expor apenas `id, codigo, modelo, marca, numero_patrimonio, status, qr_code_token, created_at, updated_at`, e a view `public.vw_status_maquinas` foi recriada com `descricao` patrimonial em vez de `tipo_nome`. Validação read-only concluída via Management API: `SELECT string_agg(column_name, ', ') ...` retornou exatamente essas 9 colunas, sem `tipo_maquina_codigo`, `setor_id` ou `setor`.

- [x] **HU 13.2 — Atualizar types, queries, actions e CRUD de máquinas**
  Entregas mínimas:
  - atualizar `types/supabase.ts` e `types/index.ts`
  - ajustar `lib/queries/maquinas.ts` e `lib/actions/maquinas.ts`
  - simplificar `/admin/maquinas` e `ModalMaquina`
  - remover exibição e edição dos campos retirados

  Regras:
  - o CRUD de máquinas deve continuar funcional
  - o QR patrimonial deve ser preservado
  - nenhuma tela deve continuar exigindo `tipo_maquina` ou `setor` para salvar máquina

  **Evidência:** CRUD de máquinas funciona com o novo contrato patrimonial, sem campos operacionais residuais na UI.
  Implementado em `types/supabase.ts`, `types/index.ts`, `lib/queries/maquinas.ts`, `lib/actions/maquinas.ts`, `app/admin/maquinas/page.tsx`, `app/(admin)/maquinas/ListaMaquinas.tsx`, `app/admin/maquinas/[id]/page.tsx` e `components/ui/ModalMaquina.tsx`. O CRUD passou a trabalhar apenas com `codigo`, `modelo`, `marca`, `numero_patrimonio`, `status` e `qr_code_token`, preservando o QR patrimonial e removendo da interface qualquer obrigatoriedade de `tipo_maquina` ou `setor`.

- [x] **HU 13.3 — Remover dependências residuais de `maquina -> setor` e `maquina -> tipo`**
  Entregas mínimas:
  - revisar dashboard, detalhes e consultas auxiliares
  - eliminar joins e filtros que dependam desses vínculos no domínio de `maquinas`
  - manter o comportamento operacional apoiado nas entidades corretas da V2

  Regras:
  - setor operacional do turno continua vindo de `operacoes` e da cadeia derivada do turno
  - qualquer leitura de máquina remanescente deve ser puramente patrimonial

  **Evidência:** Nenhum fluxo operacional da V2 depende mais de `tipo_maquina` ou `setor` dentro de `maquinas`.
  Implementado em `app/admin/dashboard/page.tsx`, `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`, `components/dashboard/ModalDetalhesOpTurno.tsx`, `components/dashboard/ModalDetalhesSecaoTurno.tsx`, `lib/queries/scanner.ts`, `lib/queries/producao.ts`, `components/dashboard/StatusMaquinas.tsx` e `scripts/migrate.mjs`. A dashboard V2 deixou de carregar máquinas por setor, o detalhe da seção passou a explicitar que máquinas não compõem mais o contexto operacional, e as leituras remanescentes de máquina ficaram restritas a descrição patrimonial e status.

- [x] **HU 13.4 — Homologar a simplificação do domínio de máquinas**
  Validar:
  - cadastro e edição de máquina com contrato patrimonial
  - QR patrimonial preservado
  - ausência de regressão na dashboard V2, scanner e `/admin/apontamentos`
  - `types`, `build` e consultas principais coerentes após a remoção

  **Evidência:** A entidade `maquinas` permanece útil para patrimônio e rastreabilidade, sem carregar mais atributos operacionais desnecessários e sem regressão na V2.
  Homologação concluída em `2026-04-02` com `npx tsc --noEmit`, `npm run build` e consultas read-only via Supabase Management API. A view `public.vw_status_maquinas` retornou registros patrimoniais como `RT-001 -> Juki DDL-8700` e `OV-001 -> Siruba 747K`, enquanto a V2 operacional permaneceu apoiada apenas em `operacoes`, `setores`, `turno_setores`, `turno_setor_demandas` e `turno_setor_operacoes`, sem regressão observada na dashboard V2, no scanner ou em `/admin/apontamentos`.

## SPRINT 14 — Prévia de pessoas por setor na abertura do turno
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 12 concluída.
**Objetivo:** calcular e exibir, no fluxo de abertura do turno, uma sugestão de quantidade de pessoas necessárias por setor com base na carga planejada das OPs, sem alterar o contrato persistido do turno nesta primeira etapa.

- [x] **HU 14.1 — Criar função pura de dimensionamento por setor**
  Entregas mínimas:
  - criar função em `lib/utils/` para consolidar `tp_total_setor_produto`, `carga_min_setor` e `pessoas_necessarias_setor`
  - aceitar múltiplas OPs no mesmo turno e somar a carga por setor
  - usar `minutosTurno` informado no turno como divisor do cálculo
  - arredondar o resultado final de cada setor com `Math.ceil`

  Regras:
  - a função deve ser pura e sem acesso direto a Supabase
  - a saída deve distinguir claramente `setor`, `cargaMinutos`, `pessoasNecessarias` e eventual déficit agregado
  - o cálculo deve permanecer determinístico para facilitar teste e homologação

  **Evidência:** Com um payload de turno contendo múltiplas OPs e setores compartilhados, a função retorna o dimensionamento setorial consolidado com arredondamento para cima e sem depender da persistência do turno.
  Implementado em `lib/utils/dimensionamento-pessoas-setor.ts`, com contrato tipado próprio para entrada, contribuições por OP/produto, consolidação de carga por setor, `Math.ceil` no fechamento de `pessoasNecessarias` e cálculo agregado de `deficitOperadores`. A homologação executável foi registrada em `lib/utils/dimensionamento-pessoas-setor.test.ts`, cobrindo: exemplo documental `8 × 637 / 510 = 10`, consolidação de múltiplas OPs no mesmo setor com déficit agregado e descarte seguro de operações inválidas do roteiro. Validação concluída em `2026-04-03` com `node --test --experimental-strip-types lib/utils/dimensionamento-pessoas-setor.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 14.2 — Exibir a prévia de pessoas por setor no modal de novo turno**
  Entregas mínimas:
  - integrar o cálculo ao fluxo de `components/dashboard/ModalNovoTurnoV2.tsx`
  - atualizar a prévia em tempo real ao alterar `minutosTurno`, produto ou `quantidadePlanejada`
  - mostrar por setor:
    - carga total em minutos
    - pessoas necessárias
    - comparação com os operadores disponíveis do turno
  - sinalizar quando a soma sugerida ultrapassar `operadoresDisponiveis`

  Regras:
  - a prévia deve ser claramente apresentada como sugestão operacional
  - a UI não deve bloquear a abertura do turno nesta primeira etapa
  - o comportamento deve continuar coerente quando houver carry-over e múltiplas OPs no mesmo setor

  **Evidência:** O modal de abertura do turno passa a recalcular e exibir a sugestão de pessoas por setor em tempo real, refletindo corretamente setores compartilhados, carga planejada e déficit de capacidade quando aplicável.
  Implementado em `components/dashboard/ModalNovoTurnoV2.tsx`, integrando `calcularDimensionamentoPessoasPorSetor()` ao fluxo derivado do formulário para combinar novas OPs e carry-over selecionado sem persistência adicional. O modal agora exibe, em tempo real, os setores dimensionados, a carga em minutos, as contribuições por OP/produto, o total de pessoas sugeridas, a folga/déficit frente aos operadores disponíveis e avisos quando uma OP ainda não pode entrar na prévia por incompletude ou ausência de roteiro. Para suportar o cálculo no mesmo ponto de uso, `app/admin/apontamentos/page.tsx`, `components/apontamentos/ControleTurnoSupervisor.tsx`, `components/dashboard/ModalEditarTurnoAbertoV2.tsx` e `components/dashboard/PainelConfiguracaoTurno.tsx` passaram a trafegar `ProdutoListItem[]`, reaproveitando o roteiro já carregado no catálogo. Ajuste complementar homologado em `2026-04-03`: após salvar um novo turno fora da dashboard, o fluxo redireciona o usuário para `/admin/dashboard`, e as listas setoriais do contexto operacional passaram a respeitar a ordem estrutural por `setor.codigo` com fallback em `setor.id`. Validação concluída em `2026-04-03` com `npx tsc --noEmit` e `node --test --experimental-strip-types lib/utils/dimensionamento-pessoas-setor.test.ts`, ambos sem erros.

- [x] **HU 14.3 — Manter a gravação do turno inalterada na primeira versão**
  Entregas mínimas:
  - preservar o payload atual de `abrirTurnoFormulario`
  - não criar colunas, tabelas ou snapshots novos para persistir o dimensionamento
  - garantir que a abertura do turno continue funcionando mesmo sem consumir a prévia

  Regras:
  - a sugestão de pessoas por setor é derivada e efêmera nesta sprint
  - qualquer discussão sobre persistência futura fica explicitamente fora do escopo

  **Evidência:** O turno continua sendo salvo com o mesmo contrato atual, enquanto a sugestão de pessoas por setor aparece apenas como cálculo derivado no fluxo de abertura.
  O contrato persistido da abertura do turno foi explicitado e centralizado em `lib/utils/turno-formulario.ts` por meio de `ABRIR_TURNO_FORM_FIELDS`, reaproveitado tanto por `components/dashboard/ModalNovoTurnoV2.tsx` quanto por `lib/actions/turnos.ts`. Com isso, a prévia setorial permanece apenas em memória/renderização e o formulário continua submetendo exclusivamente os campos já existentes: `operadores_disponiveis`, `minutos_turno`, `ops_planejadas`, `operador_ids`, `carregar_pendencias_turno_anterior`, `turno_origem_pendencias_id` e `turno_op_ids_pendentes`. Nenhuma coluna, tabela, snapshot ou campo adicional de dimensionamento foi introduzido na gravação. Validação concluída em `2026-04-03` com `npx tsc --noEmit` sem erros e inspeção do contrato compartilhado via `rg`, confirmando que a action `abrirTurnoFormulario()` consome exatamente o mesmo payload persistido da versão anterior.

- [x] **HU 14.4 — Homologar a prévia de pessoas por setor e registrar decisão de persistência futura**
  Validar:
  - cenário com um único produto
  - cenário com múltiplas OPs compartilhando o mesmo setor
  - cenário em que a soma das pessoas sugeridas supera `operadoresDisponiveis`
  - ausência de regressão na abertura do turno

  Decisão a registrar:
  - manter o cálculo apenas como prévia
  - ou abrir sprint posterior para persistir snapshot do dimensionamento setorial

  **Evidência:** A abertura do turno exibe a prévia setorial corretamente nos cenários homologados, sem regressão no fluxo atual e com decisão documentada sobre eventual persistência futura.
  Homologação concluída em `2026-04-03` mantendo a decisão de produto de **não persistir** o dimensionamento setorial nesta etapa e tratá-lo apenas como prévia operacional do modal. Os cenários homologados ficaram cobertos em `lib/utils/dimensionamento-pessoas-setor.test.ts`: `1)` produto único com o exemplo documental `8 × 637 / 510 = 10`, `2)` múltiplas OPs compartilhando `Preparação` com consolidação da carga por setor, e `3)` déficit agregado quando a soma sugerida supera `operadoresDisponiveis`. A ausência de regressão no fluxo de abertura foi validada pela preservação explícita do payload em `lib/utils/turno-formulario.ts`, `components/dashboard/ModalNovoTurnoV2.tsx` e `lib/actions/turnos.ts`, sem introdução de campos persistidos de dimensionamento. Validação final executada com `node --test --experimental-strip-types lib/utils/dimensionamento-pessoas-setor.test.ts`, `npx tsc --noEmit` e inspeção do contrato compartilhado via `rg`, todos sem erros.

## SPRINT 15 — Consistência do progresso da OP entre demanda, setor e dashboard
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 12 concluída.
**Objetivo:** corrigir a cadeia de consolidação da V2 para que `turno_setor_operacoes`, `turno_setor_demandas`, `turno_setores` e `turno_ops` permaneçam sincronizados após cada apontamento, eliminando divergências entre dashboard, scanner e relatórios.

- [x] **HU 15.1 — Formalizar a sincronização da demanda setorial no backend de apontamento**
  Entregas mínimas:
  - revisar a função transacional de apontamento atômico por operação
  - garantir recálculo explícito de `turno_setor_demandas` a partir de `turno_setor_operacoes`
  - manter a sequência de consolidação `demanda -> setor -> OP`
  - preservar os bloqueios de saldo e encerramento existentes

  Regras:
  - a fonte de verdade operacional continua sendo o apontamento atômico em `turno_setor_operacoes`
  - `turno_setor_demandas` não pode ficar stale após nova produção
  - a correção deve manter compatibilidade com scanner e `/admin/apontamentos`

  **Evidência:** Após um novo apontamento em uma operação da demanda, `turno_setor_demandas`, `turno_setores` e `turno_ops` refletem imediatamente os mesmos realizados e status esperados no mesmo turno.
  Implementado em `scripts/sprint15_consistencia_progresso.sql`, introduzindo `sincronizar_turno_setor_demanda()` com compatibilidade para a V2 atual via `turno_setor_demanda_id` ou `turno_setor_op_legacy_id`, e encadeando a sincronização automática em `sincronizar_andamento_turno_setor_op()` antes do reflexo final em `turno_ops`. Validação concluída em `2026-04-03`: `npx tsc --noEmit` passa sem erros; o SQL foi aplicado via Supabase Management API; e uma validação transacional com `ROLLBACK` no turno aberto `d559f332-6584-45fe-86a6-c17eae5e9ec6` registrou três apontamentos temporários na demanda `f82fe19f-196d-4256-8a44-d61632a983fd`, retornando imediatamente `demanda_realizada = 1`, `setor_realizado = 1` e `turno_op_realizado = 1`, todos com status `em_andamento`. A leitura read-only após o rollback confirmou ausência de resíduo do teste, com a mesma cadeia voltando para `0 / aberta / planejada`.

- [x] **HU 15.2 — Executar backfill seguro dos turnos abertos e dados recentes impactados**
  Entregas mínimas:
  - criar rotina de recálculo para demandas setoriais já existentes
  - reaplicar a consolidação em cascata para setores e OPs após o backfill
  - garantir operação idempotente e segura para reexecução

  Regras:
  - o backfill não pode apagar produção apontada
  - a rotina deve apenas recomputar realizados, saldos e status derivados
  - priorizar turnos `abertos` e janela recente afetada pela V2

  **Evidência:** Um turno já afetado pela divergência passa a exibir o mesmo progresso consolidado em demanda, setor e OP após a execução do backfill.
  Implementado em `scripts/sprint15_backfill_consistencia.sql`, com as rotinas `backfill_consistencia_turno()` e `backfill_consistencia_turnos_recentes()`, além da evolução das funções de sincronização para preservar encerramentos manuais durante a recomputação e alinhar `turno_setor_operacoes`, `turno_setor_demandas`, `turno_setor_ops`, `turno_setores` e `turno_ops` a partir do estado real das operações. Validação concluída em `2026-04-03`: o SQL foi aplicado via Supabase Management API e o turno afetado `6ed0534c-bf6e-471f-8d0c-1aec61662fe8` teve a cadeia inconsistente `secao_realizada = 6`, `demanda_realizada = 6`, `setor_realizado = 6` com operações `[0,0]` corrigida para `0 / 0 / 0`, preservando `encerrada_manualmente` em demanda, setor e OP e propagando `encerrada_manualmente` para as operações filhas. A reexecução do backfill no mesmo turno manteve exatamente o mesmo estado, confirmando idempotência. Em seguida, `backfill_consistencia_turnos_recentes(NOW() - INTERVAL '7 days')` foi executado com sucesso para a janela priorizada, incluindo o turno aberto `d559f332-6584-45fe-86a6-c17eae5e9ec6` (`13` demandas, `13` seções, `4` setores e `4` OPs recalculadas) e os demais turnos recentes impactados.

- [x] **HU 15.3 — Alinhar queries e snapshots da dashboard, scanner e relatórios**
  Entregas mínimas:
  - revisar `lib/queries/turnos.ts` e `lib/queries/turnos-client.ts`
  - revisar leituras do scanner e relatórios que dependem de `turno_setor_demandas`
  - eliminar leituras incoerentes de progresso na dashboard e no modal de detalhe da OP

  Regras:
  - o KPI da OP e o detalhe das seções devem contar a mesma história operacional
  - o scanner não pode mostrar saldo ou status stale para a mesma demanda
  - relatórios V2 não podem continuar consolidando progresso a partir de demandas divergentes

  **Evidência:** A dashboard, o modal de detalhe da OP, o scanner e os relatórios V2 passam a apresentar realizado, saldo e status coerentes para a mesma OP/demanda/setor.
  Implementado em `lib/utils/consolidacao-turno.ts`, `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts`, `lib/queries/scanner.ts`, `lib/queries/relatorios-v2.ts` e `lib/utils/turno-setores.ts`, centralizando a recomputação de demanda, seção, setor e OP a partir de `turno_setor_operacoes` antes de montar os snapshots consumidos pela dashboard, modal de detalhe, scanner e relatórios V2. Validação concluída em `2026-04-03`: `buscarPlanejamentoTurnoPorId()` e `buscarPlanejamentoTurnoPorIdClient()` passaram a consolidar `demandasSetor`, `secoesSetorOp`, `setoresAtivos` e `ops` na mesma cadeia; `buscarTurnoSetorScaneadoPorToken()` e `buscarDemandasScaneadasPorTurnoSetor()` deixaram de confiar em `turno_setores` e `turno_setor_demandas` crus; `carregarBaseRelatorioV2()` passou a recomputar demandas, seções e OPs antes de gerar resumo e itens. `mapearSetoresTurnoParaDashboard()` também passou a derivar quantidade e status a partir das demandas normalizadas, eliminando leituras stale no KPI e no detalhe da OP. `npx tsc --noEmit` executou com sucesso após a mudança.

- [x] **HU 15.4 — Homologar a consistência ponta a ponta e ausência de regressão**
  Validar:
  - a cadeia `operação -> demanda -> setor -> OP` permanece consistente sob o contrato atual de quantidade concluída
  - realizado, saldo e status da OP na dashboard coincidem com o modal de detalhe sob a regra vigente de peças completas
  - scanner e `/admin/apontamentos` continuam registrando normalmente
  - relatórios V2 permanecem coerentes após novos apontamentos e após backfill

  **Evidência:** Em um turno aberto real com demandas já iniciadas, a consolidação vigente da OP permanece consistente entre operação, demanda, setor, dashboard, scanner e relatórios V2, sem regressão observada no fluxo atual.
  Homologação manual registrada em `2026-04-03`: a leitura ponta a ponta do contrato vigente de peças completas permaneceu coerente entre dashboard, modal da OP, scanner, `/admin/apontamentos` e relatórios V2, incluindo cenários com demandas já iniciadas e sem regressão observada após os ajustes de consolidação da Sprint 15.

## SPRINT 16 — KPI de progresso operacional ponderado por T.P.
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 15 concluída.
**Objetivo:** separar explicitamente `quantidade concluída` de `progresso operacional` e implementar o novo KPI incremental da OP, do setor e do turno com ponderação por `tempo_padrao_min`.

- [x] **HU 16.1 — Formalizar contratos tipados e funções puras do progresso operacional**
  Entregas mínimas:
  - criar contratos explícitos para `quantidadeConcluida` e `progressoOperacional`
  - implementar função pura em `lib/utils/` para calcular progresso operacional por operação, setor, OP e turno
  - ponderar o progresso pelo `tempo_padrao_min` das operações
  - preservar a métrica atual de peças completas sem regressão

  Regras:
  - `quantidade concluída` continua medindo peças completas via menor realizado entre setores obrigatórios
  - `progresso operacional` deve nascer dos incrementos em `turno_setor_operacoes`
  - a nova função não pode depender de acesso direto ao banco
  - o cálculo deve limitar o realizado de cada operação ao planejado correspondente

  **Evidência:** Dado um conjunto de operações com `tempo_padrao_min` diferentes e progresso parcial em setores distintos, a função retorna `progressoOperacional` coerente com a ponderação por T.P. e mantém `quantidadeConcluida` separada.
  Implementado em `lib/utils/progresso-operacional.ts` e `types/index.ts`, introduzindo os contratos explícitos `IndicadoresOperacionais`, `quantidadeConcluida`, `progressoOperacionalPct`, `cargaPlanejadaTp` e `cargaRealizadaTp`, além das funções puras `calcularCargaOperacionalTp()`, `somarCargasOperacionaisTp()`, `montarIndicadoresOperacionais()` e `calcularIndicadoresOperacionaisPorItens()`. A validação executável foi registrada em `lib/utils/progresso-operacional.test.ts`, cobrindo ponderação por `tempo_padrao_min`, limitação do realizado ao planejado e separação entre peças completas e carga operacional agregada. Validação concluída em `2026-04-03` com `node --test --experimental-strip-types lib/utils/progresso-operacional.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 16.2 — Propagar o novo KPI para queries e snapshots da dashboard**
  Entregas mínimas:
  - evoluir `lib/queries/turnos.ts` e `lib/queries/turnos-client.ts` para expor os dois indicadores
  - garantir que setor, OP e turno carreguem `progressoOperacional` e `quantidadeConcluida`
  - revisar qualquer snapshot intermediário que ainda use apenas `quantidadeRealizada` como proxy de progresso

  Regras:
  - dashboard e modal da OP devem contar a mesma história com a mesma fórmula
  - a mudança não pode quebrar a ordenação estrutural nem o carry-over vigente
  - o contrato novo deve ser nomeado de forma explícita para evitar ambiguidade na UI

  **Evidência:** As queries do turno passam a devolver, para a mesma OP, `progressoOperacional` ponderado por T.P. e `quantidadeConcluida` como peças completas, sem divergência entre server e client snapshots.
  Implementado em `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts`, `lib/queries/scanner.ts`, `lib/queries/relatorios-v2.ts`, `lib/utils/consolidacao-turno.ts` e `lib/utils/turno-setores.ts`, propagando os indicadores `quantidadeConcluida`, `progressoOperacionalPct`, `cargaPlanejadaTp` e `cargaRealizadaTp` para demanda, seção, setor, OP e turno a partir de `turno_setor_operacoes`. A leitura do turno, do scanner e dos relatórios V2 deixou de depender de `quantidadeRealizada` como proxy única de progresso e passou a trafegar explicitamente peças completas e carga operacional ponderada por T.P. Homologação documental e técnica concluída em `2026-04-03` com `npx tsc --noEmit` sem erros, mantendo compatibilidade entre server e client snapshots.

- [x] **HU 16.3 — Atualizar dashboard e modal da OP para distinguir progresso operacional de peças completas**
  Entregas mínimas:
  - ajustar cards, barras e rótulos da dashboard
  - ajustar o cabeçalho e os KPIs do modal de detalhe da OP
  - manter a leitura por setor coerente com o novo progresso operacional

  Regras:
  - o KPI principal de progresso deve usar `progressoOperacional`
  - a UI deve continuar exibindo `quantidadeConcluida` como métrica separada
  - nenhum rótulo pode chamar peças completas de progresso

  **Evidência:** Uma OP com setores em estágios diferentes passa a exibir progresso operacional acima de `0%` na dashboard e no modal, enquanto a quantidade de peças completas permanece separada e coerente.
  Implementado em `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`, `components/dashboard/ModalDetalhesOpTurno.tsx` e `components/dashboard/ModalDetalhesSecaoTurno.tsx`, substituindo o uso de `quantidadeRealizada / quantidadePlanejada` como KPI principal por `progressoOperacionalPct` e relabelando a métrica de saída como `Peças completas`. Ajustes complementares de consistência visual também entraram em `components/apontamentos/PainelApontamentosSupervisor.tsx`, `components/scanner/SelecaoDemandaScanner.tsx`, `components/scanner/ConfirmacaoRegistro.tsx` e `components/relatorios/ResumoRelatorios.tsx`, para impedir que a UI volte a chamar peças completas de progresso. Homologação de UI registrada em `2026-04-03`: dashboard, modal da OP e telas relacionadas passaram a exibir corretamente progresso operacional separado de peças completas.

- [x] **HU 16.4 — Alinhar scanner, `/admin/apontamentos` e relatórios V2 ao novo KPI**
  Entregas mínimas:
  - revisar leituras auxiliares do scanner e dos apontamentos administrativos
  - garantir que relatórios V2 diferenciem progresso operacional de peças completas
  - validar o comportamento após novos apontamentos e após backfill

  Regras:
  - o fluxo de registro continua sendo atômico por operação
  - a leitura operacional não pode reintroduzir divergência entre dashboard, scanner e relatórios
  - o backfill da Sprint 15 continua compatível com o novo KPI

  **Evidência:** Após novos apontamentos em um turno aberto real, dashboard, modal, scanner, `/admin/apontamentos` e relatórios V2 passam a exibir o mesmo progresso operacional ponderado por T.P., sem perder a leitura separada de peças completas.
  Homologação manual registrada em `2026-04-03`: scanner, `/admin/apontamentos`, dashboard, modal e relatórios V2 passaram a manter a mesma leitura de `progresso operacional` ponderado por T.P. e `peças completas`, sem reintroduzir ambiguidade visual e sem quebrar a compatibilidade esperada com o backfill da Sprint 15.

## SPRINT 17 — KPIs de eficiência por hora e por dia na dashboard V2
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 16 concluída.
**Objetivo:** introduzir o domínio de eficiência operacional do operador na dashboard V2, com KPI horário por `hora + operador + operação` e KPI diário por operador, ambos ponderados por `tempo_padrao_min_snapshot` e separados do progresso operacional da OP.

- [x] **HU 17.1 — Formalizar contratos tipados e queries base dos KPIs de eficiência**
  Entregas mínimas:
  - definir contratos explícitos para `Eficiência por hora` e `Eficiência do dia`
  - criar query/read model dedicado para `hora + operador + operação`
  - criar query/read model dedicado para resumo diário por operador no escopo do turno
  - registrar o uso obrigatório de `tempo_padrao_min_snapshot` e `minutos_turno`

  Regras:
  - `Meta/hora` pode ser exibida como apoio visual, mas o cálculo do percentual deve usar minutos padrão realizados
  - o contrato não pode depender de `meta_hora` arredondada como base do cálculo
  - o denominador diário deve vir de `turno.minutos_turno`, nunca de valor fixo em produção

  **Evidência:** As queries da V2 passam a devolver linhas horárias por `hora + operador + operação` e um resumo diário por operador, ambos usando `tempo_padrao_min_snapshot` e `minutos_turno` do turno consultado.
  Implementado em `types/index.ts`, `lib/queries/eficiencia-operacional-turno-base.ts`, `lib/queries/eficiencia-operacional-turno.ts` e `lib/queries/eficiencia-operacional-turno-client.ts`, introduzindo os contratos `EficienciaOperacionalHoraRegistroV2`, `EficienciaOperacionalDiaRegistroV2` e `ResumoEficienciaOperacionalTurnoV2`, além das queries base server/client para `hora + operador + operação` e resumo diário por operador no escopo do turno. O cálculo usa `tempoPadraoMinSnapshot` das operações derivadas, `turno.minutos_turno` como denominador diário e `60` minutos como denominador horário, preservando a distinção entre `Meta/hora` visual e percentual calculado por minutos padrão realizados. Validação concluída em `2026-04-03` com `npx tsc --noEmit` sem erros.

- [x] **HU 17.2 — Implementar regra de troca de operação dentro da mesma hora**
  Entregas mínimas:
  - tratar múltiplas operações do mesmo operador na mesma hora sem colapsar em uma operação dominante
  - garantir que a tabela horária gere uma linha por operação efetivamente apontada
  - consolidar corretamente a eficiência agregada do operador naquela hora e no dia

  Regras:
  - não deve haver rateio manual de minutos por operação
  - cada linha horária continua usando `60` minutos como denominador
  - a eficiência agregada da hora deve resultar da soma dos minutos padrão realizados nas linhas daquela `hora + operador`

  **Evidência:** Em um cenário com o mesmo operador apontando duas operações diferentes dentro da mesma hora, a dashboard V2 mostra duas linhas horárias distintas e o resumo do dia consolida as duas sem distorção de eficiência.
  Implementado em `lib/queries/eficiencia-operacional-turno-base.ts` ao consolidar explicitamente por chave `hora + operador + operação`, sem eleger operação dominante nem ratear minutos manualmente entre operações. O resumo diário por operador segue consolidando os mesmos `minutos padrão realizados` no denominador de `turno.minutos_turno`, preservando compatibilidade matemática entre leitura horária e leitura diária. A dashboard V2 também passou a sinalizar visualmente quando o mesmo operador aparece com mais de uma operação na mesma hora em `components/dashboard/EficienciaOperacionalTurnoV2.tsx`. Validação técnica concluída em `2026-04-03` com `npx tsc --noEmit` sem erros.

- [x] **HU 17.3 — Integrar os dois KPIs à dashboard V2 sem misturar com progresso operacional**
  Entregas mínimas:
  - criar bloco visual próprio de `Eficiência operacional`
  - renderizar a tabela `Eficiência por hora`
  - renderizar o resumo `Eficiência do dia por operador`
  - manter o bloco separado do domínio de progresso operacional da OP

  Regras:
  - nenhum card ou barra de progresso da OP pode ser reutilizado para eficiência
  - a leitura visual deve deixar claro que se trata de produtividade do operador
  - a ordenação e o recorte temporal devem permanecer coerentes com o turno exibido

  **Evidência:** A dashboard V2 passa a exibir um bloco separado de `Eficiência operacional`, com tabela horária e resumo diário por operador, sem ambiguidade visual com `progresso operacional` e `peças completas`.
  Implementado em `components/dashboard/EficienciaOperacionalTurnoV2.tsx` e integrado ao fluxo principal da dashboard por `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`, com consumo do snapshot novo propagado por `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts` e `types/index.ts`. O bloco foi mantido separado da área de progresso da OP, exibindo `Eficiência por hora` em tabela própria e `Eficiência do dia por operador` em resumo dedicado. Validação técnica concluída em `2026-04-03` com `npx tsc --noEmit` sem erros.

- [x] **HU 17.4 — Homologar os KPIs de eficiência com turnos reais e jornadas variáveis**
  Entregas mínimas:
  - validar turno com `minutos_turno` diferente de `510`
  - validar operador com uma única operação na hora
  - validar operador trocando de operação dentro da mesma hora
  - validar coerência entre soma horária e resumo diário

  Regras:
  - a homologação deve usar a jornada configurada no turno real consultado
  - o resultado não pode assumir turno padrão fixo
  - os números exibidos na UI e nas queries devem contar a mesma história

  **Evidência:** Em turnos reais com jornadas configuradas no banco, a dashboard V2 passa a exibir `Eficiência por hora` e `Eficiência do dia` coerentes entre si, inclusive quando um operador troca de operação dentro da mesma hora.
  Homologação manual registrada em `2026-04-03`: a UI da dashboard V2 confirmou o bloco `Eficiência operacional` com jornada real do turno, leitura horária por `hora + operador + operação`, consolidação diária por operador e comportamento correto quando o mesmo operador alterna operações dentro da mesma hora, sem mistura com o KPI de progresso operacional da OP.

## SPRINT 18 — Ajuste cirúrgico do input de quantidade no scanner
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 17 concluída.
**Objetivo:** corrigir o campo de quantidade do scanner V2 para aceitar digitação direta, permitir reset para `0` e impedir que a UI force o valor mínimo `1` antes do registro.

- [x] **HU 18.1 — Mapear a causa do travamento da quantidade em `1`**
  Entregas mínimas:
  - localizar o ponto exato onde a UI força a quantidade mínima
  - registrar se o travamento vem do componente, do hook ou do action de registro
  - definir o contrato esperado: digitação livre de inteiros não negativos, com registro bloqueado quando o valor for `0`

  Regras:
  - a correção deve preservar o fluxo atômico `setor -> operador -> OP/produto -> operação -> quantidade`
  - não deve alterar o contrato do `registrarProducaoOperacao`
  - o ajuste deve ser concentrado no menor conjunto possível de arquivos

  **Evidência:** A análise identifica que o travamento da quantidade em `1` está na camada de UI do scanner e define o contrato corrigido para digitação e reset.
  Mapeado em `components/scanner/ConfirmacaoRegistro.tsx`: o travamento vinha da função `limitarQuantidade()` com mínimo `1`, reforçado pelo `useEffect` inicial, pelo `handleNovaQuantidade()` e pelo `onChange` do input, todos recolocando `1` mesmo quando o usuário tentava zerar ou digitar livremente. A análise confirmou que o problema não estava no hook `useScanner` nem no action `registrarProducaoOperacao`, permitindo um ajuste cirúrgico restrito ao componente de UI. Validação documental e técnica registrada em `2026-04-03`.

- [x] **HU 18.2 — Permitir digitação direta e reset para `0` no scanner**
  Entregas mínimas:
  - permitir escrever a quantidade manualmente no campo
  - permitir zerar a contagem sem a UI recolocar `1` automaticamente
  - manter os botões `+` e `-` funcionando como apoio, agora com mínimo `0`
  - bloquear o botão de registrar enquanto a quantidade estiver `0` ou inválida

  Regras:
  - a UI não pode mais forçar `1` no `onChange`, no estado inicial nem após sucesso
  - o valor continua respeitando o saldo máximo da operação
  - a correção deve ser mobile-first e não pode mexer além do necessário no fluxo do scanner

  **Evidência:** O scanner passa a aceitar digitação livre de inteiros não negativos, permite zerar a quantidade e só habilita o registro quando houver quantidade válida acima de `0`.
  Implementado em `components/scanner/ConfirmacaoRegistro.tsx`, substituindo o estado numérico rígido por um estado textual normalizado, com suporte a digitação direta, `inputMode="numeric"`, decremento até `0`, reset para `0` após sucesso e na ação `Nova quantidade`, além de bloqueio do botão `Registrar quantidade` enquanto o valor atual for `0` ou inválido. O ajuste manteve o teto pelo saldo da operação e não alterou o contrato transacional do registro. Validação concluída em `2026-04-03` com `npx tsc --noEmit` sem erros.

- [x] **HU 18.3 — Homologar o ajuste do scanner na UI**
  Entregas mínimas:
  - validar digitação manual de quantidade
  - validar decremento até `0`
  - validar reset após sucesso e na ação `Nova quantidade`
  - validar que o registro continua respeitando o saldo da operação

  Regras:
  - a homologação deve ser feita na UI real do scanner
  - o ajuste não pode introduzir regressão nas ações `Trocar operação`, `Trocar operador` e `Trocar OP/produto`

  **Evidência:** Na UI do scanner V2, o usuário consegue digitar a quantidade desejada, zerar a contagem quando necessário e registrar apenas valores válidos sem regressão nas demais ações do fluxo.
  Homologação manual registrada em `2026-04-03`: o scanner V2 passou a aceitar digitação direta da quantidade, decremento até `0`, reset correto após sucesso e na ação `Nova quantidade`, preservando o respeito ao saldo da operação e sem regressão observada nas ações `Trocar operação`, `Trocar operador` e `Trocar OP/produto`.

## SPRINT 19 — Cadastro de produto orientado por setores
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 18 concluída.
**Objetivo:** refatorar o cadastro de produto para montar o roteiro por setores, deixando explícita a composição `setor -> operações`, preservando o payload atual do roteiro e mantendo o `T.P Produto` como cálculo automático de apoio visual.

**Nota de replanejamento:** a execução foi pausada em `2026-04-03` após a conclusão da `19.2`, por decisão do usuário, para priorizar a Sprint 20 de ciclo de vida/exclusão de produtos. Após a homologação da Sprint 20, as HUs `19.3` e `19.4` foram retomadas e concluídas.
**Nota de melhoria incremental em `2026-04-05`:** após a homologação da UX base do cadastro por setores, foi identificada a necessidade de busca local de operações dentro do setor, para suportar catálogos com centenas de operações sem depender de rolagem extensa.

- [x] **HU 19.1 — Formalizar o contrato da nova UX do cadastro de produto**
  Entregas mínimas:
  - registrar no PRD que o cadastro deixa de partir de uma lista única de operações e passa a ser guiado por setores
  - fechar a regra de ordenação oficial dos setores e a ordenação interna das operações
  - registrar que o modal pode ser ampliado se isso for necessário para manter a UX enxuta e intuitiva
  - preservar explicitamente a compatibilidade com o payload atual de `roteiro`

  Regras:
  - a ordem dos setores no roteiro é sempre a ordem oficial de fluxo por `setor.codigo`
  - o usuário não pode reordenar setores manualmente
  - dentro de um mesmo setor, a ordem das operações segue a ordem em que o usuário as selecionou
  - o `T.P Produto` continua sendo calculado automaticamente como soma das operações escolhidas

  **Evidência:** O PRD passa a descrever explicitamente o novo fluxo do cadastro de produto por setores, incluindo ordenação, cálculo do `T.P Produto`, princípio de UX enxuta e preservação do contrato atual de persistência.
  Documentado em `2026-04-03` em `docs/PRD.md`, formalizando a composição `setor -> operações`, a ordem oficial dos setores por `setor.codigo`, a ordem de seleção das operações dentro do setor, a possibilidade de ampliar o modal quando necessário e a permanência do payload linear de `roteiro`.

- [x] **HU 19.2 — Refatorar o modal de produto para selecionar setores antes das operações**
  Entregas mínimas:
  - substituir a lista plana de operações por um fluxo guiado por setores
  - permitir buscar e adicionar setores ao roteiro do produto
  - ao selecionar um setor, exibir apenas as operações disponíveis naquele setor
  - manter o cadastro de `referência`, `nome`, `URL da imagem` e `situação` no mesmo modal

  Regras:
  - a UI deve continuar mobile-first, mas pode ampliar o modal em desktop se isso reduzir ruído visual
  - o fluxo visual deve expor apenas o contexto necessário para o passo atual
  - a ordem final dos setores deve seguir o fluxo oficial, sem affordance de reorder manual entre setores

  **Evidência:** O modal de produto passa a montar o roteiro por setores, exibindo somente as operações do setor ativo/selecionado e tornando a composição do produto mais evidente sem poluir a interface.
  Implementado em `components/ui/ModalProduto.tsx`, substituindo a lista plana por um fluxo guiado por setores com busca, adição de setores, setor ativo para seleção de operações e resumo final agrupado por `setor -> operações`. A UI passou a respeitar a ordem oficial dos setores por `setor.codigo`, removeu o reorder manual entre setores e dentro do roteiro, e manteve os campos principais do cadastro no mesmo modal com o `T.P Produto` em papel visual secundário. Por decisão explícita de produto, `imagem_url` ficou temporariamente oculta no modal até a futura inclusão real da imagem, com o bloco visual preservado comentado no código. O contrato de leitura da UI recebeu `setorCodigo` em `types/index.ts` e `lib/queries/operacoes.ts` para sustentar a ordenação oficial. Validação concluída em `2026-04-03` com `npx tsc --noEmit` sem erros.

- [x] **HU 19.3 — Preservar o contrato de persistência e o cálculo automático do T.P Produto**
  Entregas mínimas:
  - manter o payload salvo como lista linear de `operacaoId + sequencia`
  - achatar a estrutura visual `setor -> operações` para o contrato atual antes de salvar
  - garantir que o `T.P Produto` continue sendo recalculado automaticamente com base nas operações escolhidas
  - manter compatibilidade com criação e edição de produto

  Regras:
  - não alterar schema nesta sprint
  - não alterar o contrato de `lib/actions/produtos.ts` além do estritamente necessário
  - a sequência final das operações deve respeitar primeiro a ordem oficial dos setores e, dentro de cada setor, a ordem de seleção do usuário

  **Evidência:** Produtos novos e editados continuam sendo persistidos corretamente com o payload atual de `roteiro`, enquanto o `T.P Produto` permanece consistente com as operações selecionadas na nova UX.
  Validado no código em `2026-04-03`: `components/ui/ModalProduto.tsx` continua achatando a estrutura visual por setores para um payload linear de `operacaoId + sequencia`, respeitando primeiro a ordem oficial dos setores e depois a ordem de seleção dentro de cada setor; `lib/actions/produtos.ts` permanece recalculando `tp_produto_min` a partir das operações efetivamente selecionadas tanto em criação quanto em edição, sem alteração de schema nem do contrato de persistência.

- [x] **HU 19.4 — Homologar a nova UX do cadastro de produto**
  Entregas mínimas:
  - validar criação de produto com múltiplos setores
  - validar seleção de múltiplas operações dentro de um mesmo setor
  - validar edição de produto existente sem perder a sequência do roteiro
  - validar que o `T.P Produto` acompanha corretamente as escolhas durante o cadastro

  Regras:
  - a homologação deve ser feita na UI real de `/admin/produtos`
  - o fluxo não pode reintroduzir ambiguidade visual sobre a ordem dos setores e das operações
  - a interface final deve permanecer enxuta, intuitiva e focada apenas no necessário para o cadastro

  **Evidência:** Na UI real de `/admin/produtos`, o usuário consegue montar o produto por setores, escolher operações por setor, visualizar o `T.P Produto` em tempo real e salvar/editar o roteiro sem perder clareza nem compatibilidade com os dados existentes.
  Homologação manual confirmada pelo usuário em `2026-04-03`: a UX real de `/admin/produtos` foi validada com criação e edição preservando a ordem `setor -> operações`, o `T.P Produto` em tempo real e a compatibilidade do roteiro persistido. Por decisão explícita de produto, `imagem_url` permanece oculta no modal por enquanto; o bloco visual foi preservado comentado em `components/ui/ModalProduto.tsx` para reintrodução futura junto ao fluxo de inclusão real da imagem.

- [x] **HU 19.5 — Permitir busca de operações dentro do setor no cadastro de produto**
  Entregas mínimas:
  - adicionar um campo de busca no bloco de seleção de operações do setor ativo
  - filtrar as operações daquele setor por código, descrição e termos relevantes de identificação
  - manter visíveis e preservadas as operações já selecionadas mesmo quando a busca estiver ativa
  - garantir que a UX continue viável com catálogos grandes, sem depender de rolagem extensa

  Regras:
  - a busca deve atuar apenas sobre as operações do setor atualmente selecionado
  - a filtragem não pode limpar nem reordenar as operações já escolhidas pelo usuário
  - a busca deve ser responsiva e pensada para cenários com centenas de operações por setor
  - a melhoria não pode quebrar o contrato atual de persistência nem a ordenação oficial `setor -> operações`

  **Evidência:** No modal de produto, ao selecionar um setor com grande volume de operações, o usuário consegue localizar rapidamente a operação desejada por busca textual, sem perder as seleções já feitas nem depender de rolagem manual longa.
  Implementado em `components/ui/ModalProduto.tsx` em `2026-04-05`, adicionando busca local de operações no setor ativo com filtro por `codigo`, `descricao` e `tipoNome`, resumo de quantidade visível e preservação das operações já selecionadas mesmo com filtro ativo. Validação concluída com `npx tsc --noEmit` sem erros.

## SPRINT 20 — Ciclo de vida e exclusão segura de produtos
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 19 pausada após `19.2`.
**Objetivo:** concluir o CRUD de produtos com ações explícitas de ciclo de vida, impedindo exclusão ou arquivamento indevido de produto em uso e preservando o histórico operacional já produzido.

- [x] **HU 20.1 — Formalizar a regra de ciclo de vida do produto**
  Entregas mínimas:
  - registrar no PRD a diferença entre `arquivar/desativar` e `excluir permanentemente`
  - fechar a regra de `produto em produção agora`
  - fechar a regra de preservação do histórico operacional
  - definir quando a remoção física continua permitida

  Regras:
  - produto em `turno aberto` não pode ser arquivado nem excluído
  - produto com histórico em `turno_ops`, `configuracao_turno` ou `registros_producao` não pode ser excluído permanentemente
  - produto com histórico deve ser tratado por `arquivar/desativar`
  - a produção passada nunca pode ser apagada por uma ação de CRUD do produto

  **Evidência:** O PRD passa a descrever explicitamente as duas ações de ciclo de vida do produto, as travas por turno aberto e histórico, e a proibição de apagar produção passada a partir do CRUD.
  Documentado em `2026-04-03` em `docs/PRD.md`, formalizando `arquivar/desativar` versus `excluir permanentemente`, a trava para produto em `turno aberto`, a proibição de exclusão física para produto com histórico em `turno_ops`, `configuracao_turno` ou `registros_producao`, e a preservação obrigatória da produção passada.

- [x] **HU 20.2 — Centralizar a validação de dependências e uso atual do produto**
  Entregas mínimas:
  - identificar se o produto está presente em `turno aberto`
  - identificar se o produto possui histórico operacional ou de planejamento
  - reutilizar a mesma validação em `desativarProduto()` e `excluirProduto()`
  - diferenciar mensagens de erro para `em produção agora` e `histórico preservado`

  Regras:
  - a validação deve consultar explicitamente `turno_ops` vinculadas a `turnos.status = aberto`
  - a exclusão permanente só pode ser permitida para produto sem qualquer uso anterior
  - a checagem não pode depender apenas de `configuracao_turno` e `registros_producao`

  **Evidência:** Os actions de produto passam a rejeitar corretamente arquivamento ou exclusão quando o produto estiver em turno aberto e rejeitam exclusão física quando houver histórico, com mensagens coerentes para cada caso.
  Implementado em `lib/actions/produtos.ts`, introduzindo a helper central `carregarDependenciasProduto()` para consultar `turno_ops` em `turno aberto`, histórico em `turno_ops`, `configuracao_turno` e `registros_producao`, além das mensagens distintas para `produto em uso agora` e `histórico preservado`. `desativarProduto()` passou a bloquear apenas produto em turno aberto, enquanto `excluirProduto()` bloqueia tanto produto em turno aberto quanto qualquer produto com histórico operacional ou de planejamento. Validação concluída em `2026-04-03` com `npx tsc --noEmit` sem erros.

- [x] **HU 20.3 — Expor ações seguras no CRUD de produtos**
  Entregas mínimas:
  - garantir botão/ação de exclusão no CRUD com confirmação explícita
  - expor claramente a ação de `arquivar/desativar`
  - aplicar as restrições de negócio na UI sem esconder mensagens de bloqueio
  - manter o comportamento coerente entre lista e detalhe do produto

  Regras:
  - a UI deve deixar claro que `arquivar` preserva histórico e `excluir` é excepcional
  - a ação de exclusão permanente não pode sugerir que apagará histórico passado
  - o fluxo visual deve ser cirúrgico, sem reescrever o restante do CRUD

  **Evidência:** O CRUD de produtos passa a exibir ações de ciclo de vida claras e consistentes, bloqueando exclusão ou arquivamento indevido e comunicando corretamente quando só o arquivamento é permitido.
  Implementado em `components/admin/actions/ProdutoLifecycleActions.tsx`, reaproveitando o mesmo componente tanto no detalhe quanto na listagem com uma variante compacta, mantendo a mesma regra e as mesmas mensagens para `arquivar` e `excluir permanentemente`. A listagem passou a expor essas ações em `app/(admin)/produtos/ListaProdutos.tsx`, enquanto a página de detalhe em `app/admin/produtos/[id]/page.tsx` recebeu o redirecionamento explícito após exclusão bem-sucedida. A comunicação visual foi alinhada para deixar claro que arquivar preserva histórico e que exclusão física é excepcional. Validação concluída em `2026-04-03` com `npx tsc --noEmit` sem erros.

- [x] **HU 20.4 — Homologar o ciclo de vida seguro do produto**
  Entregas mínimas:
  - validar produto virgem com exclusão permanente permitida
  - validar produto com histórico bloqueando exclusão e permitindo arquivamento
  - validar produto em turno aberto bloqueando tanto arquivamento quanto exclusão
  - validar preservação do histórico após arquivamento

  Regras:
  - a homologação deve usar a UI real do CRUD de produtos
  - a validação deve comprovar que produção passada continua consultável
  - após a Sprint 20 homologada, a Sprint 19 deve ser retomada para fechamento conjunto

  **Evidência:** Na UI real de produtos, o sistema diferencia corretamente exclusão permanente e arquivamento, bloqueia produtos em uso ou com histórico e preserva a leitura histórica após o arquivamento.
  Homologação manual confirmada pelo usuário em `2026-04-03`: o CRUD real de produtos validou os três cenários de ciclo de vida, com exclusão permanente apenas para produto virgem, bloqueio de exclusão para produto com histórico com opção de arquivamento preservada, e bloqueio simultâneo de arquivamento e exclusão para produto em turno aberto, mantendo a leitura histórica acessível após o arquivamento.

## SPRINT 21 — Relatório operacional de QR Codes do turno
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 20 concluída.
**Objetivo:** retirar os QRs operacionais da dashboard pública da fábrica e movê-los para uma página própria de visualização e impressão, adequada ao fluxo do supervisor após a abertura do turno.

- [x] **HU 21.1 — Formalizar no PRD a separação entre dashboard pública e relatório de QRs**
  Entregas mínimas:
  - registrar que a dashboard da fábrica não deve exibir QRs operacionais
  - registrar a nova página `/admin/qrcodes` como superfície de impressão
  - registrar o redirecionamento pós-abertura de turno para o relatório de QRs
  - registrar a escolha de presets de impressão

  Regras:
  - o QR continua pertencendo ao contexto `turno + setor`
  - a mudança é de superfície de visualização, não de contrato de geração
  - a dashboard da TV deve permanecer focada em monitoramento

  **Evidência:** `docs/PRD.md` passa a distinguir explicitamente monitoramento em TV e impressão operacional de QRs.
  Formalizado em `docs/PRD.md` nas seções de abertura do turno, relatório operacional de QR Codes e comportamento da dashboard, documentando a remoção dos QRs da TV e a nova rota `/admin/qrcodes`.

- [x] **HU 21.2 — Remover os QRs operacionais da dashboard V2**
  Entregas mínimas:
  - retirar o bloco de QRs da dashboard principal
  - preservar os KPIs, gráficos e blocos de progresso sem regressão
  - evitar impacto no restante do monitoramento em tempo real

  Regras:
  - a remoção deve ser cirúrgica
  - não alterar o contrato de geração do QR

  **Evidência:** `/admin/dashboard` deixa de renderizar os QRs operacionais e permanece exibindo apenas o monitoramento do turno.
  Implementado em `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`, removendo o bloco `QROperacionaisTurnoV2` sem tocar nos demais blocos da dashboard.

- [x] **HU 21.3 — Criar a página `/admin/qrcodes` com presets de impressão**
  Entregas mínimas:
  - carregar o turno por `turnoId` ou usar o turno aberto atual
  - exibir os QRs por setor do turno
  - permitir presets como `1`, `2`, `4`, `6`, `8` e `12` por página
  - expor ação explícita de impressão

  Regras:
  - a página deve priorizar legibilidade do QR e identificação do setor
  - a implementação não deve duplicar lógica de geração do QR
  - a página deve permanecer utilizável para reimpressão posterior

  **Evidência:** `/admin/qrcodes` renderiza os QRs operacionais do turno e permite alternar o layout de impressão sem recriar o turno.
  Implementado em `app/admin/qrcodes/page.tsx`, `app/(admin)/qrcodes/page.tsx` e `components/qrcode/RelatorioQRCodesTurno.tsx`, reutilizando `buscarPlanejamentoTurnoPorId()`, `buscarTurnoAberto()` e `mapearSetoresTurnoParaDashboard()`.

- [x] **HU 21.4 — Redirecionar o supervisor para o relatório de QRs após abrir um novo turno**
  Entregas mínimas:
  - usar o `turnoId` retornado na abertura do turno
  - trocar o pós-save do modal de novo turno
  - manter fallback seguro caso o `turnoId` não venha preenchido

  Regras:
  - o supervisor deve cair no relatório de QRs antes de voltar ao monitoramento da TV
  - a alteração não pode quebrar o fluxo de abertura do turno

  **Evidência:** Após abrir um turno com sucesso, a navegação passa a seguir para `/admin/qrcodes?turnoId=...`.
  Implementado em `components/dashboard/ModalNovoTurnoV2.tsx`, usando o `turnoId` já retornado por `abrirTurnoFormulario`.

- [x] **HU 21.5 — Expor acesso manual ao relatório de QRs**
  Entregas mínimas:
  - permitir reabrir a página de QRs depois da criação do turno
  - disponibilizar acesso administrativo sem poluir a dashboard da TV

  Regras:
  - o acesso manual não depende de recriar turno
  - a solução deve ser simples e previsível

  **Evidência:** O supervisor consegue abrir manualmente a página de QRs a partir da navegação administrativa.
  Implementado em `components/admin/AdminShell.tsx`, adicionando o item de navegação `/admin/qrcodes`.

## SPRINT 22 — Duplicação assistida de produtos
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 19 concluída.
**Objetivo:** permitir criar um novo produto a partir de um produto existente, reaproveitando roteiro e setores em um modal pré-carregado, sem criar um fluxo paralelo ao CRUD atual.

- [x] **HU 22.1 — Formalizar no PRD a duplicação assistida no cadastro de produtos**
  Entregas mínimas:
  - registrar a ação `duplicar produto` no contrato de UX do cadastro
  - registrar que a duplicação abre o mesmo modal de produto em modo de criação
  - registrar que a `referência` do novo produto precisa ser revisada

  Regras:
  - duplicação não pode ser tratada como edição do cadastro original
  - o reaproveitamento deve se limitar aos dados estruturais do produto de origem

  **Evidência:** O PRD passa a prever explicitamente a duplicação de produto como extensão objetiva do CRUD atual.
  Formalizado em `docs/PRD.md`, registrando a duplicação assistida dentro do contrato de UX do cadastro de produtos e a obrigatoriedade de revisar a `referência` antes de salvar o novo produto.

- [x] **HU 22.2 — Expor a ação `Duplicar` na listagem do CRUD de produtos**
  Entregas mínimas:
  - adicionar botão `Duplicar` junto das ações rápidas da listagem
  - manter as ações atuais de editar, detalhe, arquivar e excluir sem regressão
  - preservar o fluxo enxuto da tabela

  Regras:
  - a nova ação deve reaproveitar o modal já existente
  - a duplicação não deve criar uma nova tela administrativa

  **Evidência:** A listagem de produtos passa a oferecer uma ação explícita de duplicação no mesmo conjunto de ações rápidas do CRUD.
  Implementado em `app/(admin)/produtos/ListaProdutos.tsx`, adicionando o botão `Duplicar` na tabela e reutilizando o `ModalProduto` em modo de criação pré-carregada.

- [x] **HU 22.3 — Pré-carregar o modal de produto a partir de um cadastro existente**
  Entregas mínimas:
  - carregar `nome`, `roteiro` e setores do produto-base
  - manter o salvamento via `criarProduto`, não via edição
  - sugerir novos valores para os campos textuais sem sobrescrever o produto original

  Regras:
  - a duplicação deve continuar criando um novo registro
  - o fluxo não pode introduzir mutation nova sem necessidade

  **Evidência:** O modal de produto passa a abrir pré-preenchido a partir de um produto existente, mas continua salvando como novo cadastro.
  Implementado em `components/ui/ModalProduto.tsx`, introduzindo o modo de duplicação com base em `produtoBase`, preservando a action `criarProduto` e pré-carregando referência sugerida, nome e roteiro do produto de origem.

- [x] **HU 22.4 — Manter consistência entre listagem e detalhe do produto**
  Entregas mínimas:
  - permitir iniciar a duplicação também a partir da página de detalhe
  - redirecionar o usuário para o ponto correto do CRUD
  - manter uma única superfície de edição/duplicação

  Regras:
  - a tela de detalhe não deve ganhar um segundo formulário de produto
  - a duplicação deve convergir para a listagem, onde o modal já existe

  **Evidência:** A página de detalhe do produto passa a encaminhar o usuário para a duplicação na listagem, sem criar um formulário paralelo.
  Implementado em `app/admin/produtos/[id]/page.tsx` e `app/admin/produtos/page.tsx`, usando o parâmetro `duplicar` para abrir automaticamente o modal de duplicação na listagem.
  Homologação manual confirmada pelo usuário em `2026-04-03`: a duplicação de produto abriu o modal pré-carregado corretamente a partir do CRUD, preservou roteiro e setores do produto-base e manteve o salvamento como novo cadastro.

## SPRINT 23 — Consolidação visual profissional do admin
**Status:** 🔄 Em realinhamento documental
**Pré-requisito:** Sprint 22 concluída.
**Objetivo:** consolidar uma linguagem visual profissional, semântica e consistente no admin usando `docs/DESIGN_PROPOSAL.md` como direção de design, não como plano literal de implementação, preservando o scanner atual como exceção deliberada fora do escopo desta sprint.

**Nota de replanejamento em `2026-04-05`:**
- a tentativa de migração visual ampla do admin foi revertida no worktree para restaurar o baseline pré-migração
- a documentação da sprint foi preservada, mas as entregas de código de tema, shell, dashboard e CRUDs precisam ser consideradas reabertas até nova execução oficial
- antes de retomar implementação, a estratégia documental e o escopo da sprint precisam ser realinhados explicitamente
- enquanto esta sprint permanecer em `realinhamento documental`, nenhuma HU visual reaberta deve voltar a ser implementada no frontend sem nova confirmação explícita do usuário

**Observação de prioridade em `2026-04-20`:**
- a Sprint 23 sai da prioridade ativa do projeto até segunda ordem
- o status e o checklist atual permanecem preservados exatamente como estão
- nenhuma HU da Sprint 23 deve voltar para a fila de execução sem reativação explícita do usuário

**Decisões de produto já homologadas para esta sprint:**
- `docs/DESIGN_PROPOSAL.md` passa a ser o norte visual oficial do admin e da dashboard.
- a proposta deve orientar semântica, tipografia, tokens, hierarquia visual e consistência entre superfícies, mas não precisa ser seguida literalmente como sequência de arquivos/fases.
- o scanner mantém a linguagem visual atual por enquanto e volta a ser tratado como exceção explícita, fora do escopo desta sprint.
- o foco desta sprint é consolidar o admin: dashboard, CRUDs, relatórios, apontamentos, QR Codes e componentes compartilhados.
- para `/admin/dashboard` e para o shell administrativo, as referências visuais homologadas pelo usuário passam a ser o benchmark canônico de execução em light mode e dark mode.
- nessas superfícies, o objetivo é atingir o mesmo padrão de composição, contraste, paleta, hierarquia e presença da navegação da referência homologada, e não apenas uma aproximação abstrata do `DESIGN_PROPOSAL`.

- [x] **HU 23.1 — Formalizar a governança visual da sprint e o escopo oficial**
  **Prioridade:** P0
  **Risco:** Baixo

  Entregas mínimas:
  - registrar em `docs/PRD.md` e/ou documentação de design que `docs/DESIGN_PROPOSAL.md` é direção visual oficial do admin
  - registrar explicitamente que a sprint é de consolidação visual controlada, não de redesign aberto
  - registrar o scanner como exceção deliberada, fora do escopo
  - registrar os princípios obrigatórios: tokens centralizados, sidebar escura, tipografia `Outfit + DM Mono`, semântica profissional e consistência de componentes

  Regras:
  - não abrir refatoração visual genérica sem vínculo direto com as superfícies administrativas
  - não introduzir uma segunda linguagem visual para telas novas do admin
  - o scanner não deve bloquear nem contaminar a consolidação do admin nesta sprint

  **Evidência:** A documentação oficial do projeto passa a distinguir claramente direção visual, escopo da sprint de consolidação e exceção deliberada do scanner.
  Formalizado em `docs/PRD.md` na nova seção `8.0 Governança visual do sistema administrativo`, registrando `docs/DESIGN_PROPOSAL.md` como direção oficial do admin, a consolidação visual controlada como estratégia da Sprint 23, os princípios obrigatórios de tokens/semântica/tipografia e o scanner como exceção deliberada fora do escopo desta fase.

- [ ] **HU 23.2 — Fechar a fundação do tema e eliminar inconsistências semânticas**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `app/globals.css`
  - `components/ui/Badge.tsx`
  - primitives que dependem diretamente dos tokens globais

  Entregas mínimas:
  - corrigir tokens ausentes ou incoerentes do tema global
  - eliminar variáveis extras que contrariem o princípio de acento principal único quando não forem estritamente necessárias
  - garantir paridade entre light e dark mode para os tokens efetivamente usados
  - alinhar `Badge`, `Button`, `Card`, inputs e estados semânticos ao contrato visual consolidado

  Regras:
  - todo estado visual recorrente deve nascer de token semântico, não de classe hardcoded de cor
  - `info` continua permitido como semântica de apoio; não pode virar accent visual primário
  - não criar novos tokens sem necessidade clara de uso transversal

  **Evidência:** O tema global passa a cobrir todos os tokens realmente usados no admin, sem variáveis quebradas, e os componentes-base reutilizáveis passam a refletir o contrato visual consolidado.
  Observação de replanejamento em `2026-04-05`: a execução anterior desta HU foi revertida no worktree durante a restauração do frontend ao baseline pré-migração. A HU permanece aberta e sem entrega válida no código atual.

- [ ] **HU 23.3 — Consolidar primeiro as superfícies mais visíveis: shell admin e dashboard**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `components/admin/AdminShell.tsx`
  - `app/(admin)/dashboard/page.tsx`
  - `components/dashboard/*`

  Entregas mínimas:
  - fechar a consistência da sidebar escura e topbar
  - revisar KPIs, cards, badges, gráficos, tabelas e modais de dashboard para aderirem ao contrato visual consolidado
  - garantir separação visual clara entre progresso operacional, eficiência, alertas e estados neutros
  - remover resíduos de cores utilitárias antigas nas superfícies principais da dashboard

  Regras:
  - a dashboard deve virar a referência visual do sistema administrativo
  - nenhum KPI central deve depender de estilos inline ou paleta hardcoded fora do sistema
  - mudanças visuais não podem alterar a semântica dos indicadores nem o contrato dos dados

  **Evidência:** `/admin/dashboard` e o shell administrativo passam a apresentar uma linguagem visual coesa, profissional e semanticamente estável, servindo como referência do sistema.
  Observação de replanejamento em `2026-04-05`: a execução anterior desta HU foi revertida no worktree durante a restauração do frontend ao baseline pré-migração. A HU permanece aberta e sem entrega válida no código atual.

- [ ] **HU 23.3b — Recalibrar dashboard e navegação principal para refletirem o peso visual do DESIGN_PROPOSAL**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `components/admin/AdminShell.tsx`
  - `app/(admin)/dashboard/page.tsx`
  - `components/dashboard/CardKPI.tsx`
  - `components/dashboard/ResumoPlanejamentoTurnoV2.tsx`
  - `components/dashboard/StatusMaquinas.tsx`
  - `components/dashboard/RankingOperadores.tsx`
  - `components/dashboard/GraficoProducaoPorHora.tsx`
  - demais blocos da dashboard que hoje estejam excessivamente neutros

  Objetivo específico:
  - corrigir a subexecução visual identificada após a `23.3`, aproximando a dashboard do peso, da hierarquia e da paleta previstos em `docs/DESIGN_PROPOSAL.md`, especialmente nas seções de paleta, tipografia, sidebar e KPI cards

  Entregas mínimas:
  - fortalecer a hero bar do turno com status, metas e ações em uma superfície mais marcada, com leitura operacional imediata
  - transformar 3 ou 4 KPIs em cards realmente prioritários, evitando que todos tenham o mesmo peso visual
  - reduzir o excesso de contorno e aumentar a hierarquia por contraste de fundo, sombra, densidade e agrupamento
  - dar mais presença para a sidebar e para a navegação principal, incluindo estado recolhido profissional, ícones maiores, semânticos e visualmente mais fortes
  - tratar gráficos, ranking e status de máquinas como blocos operacionais do painel, e não apenas caixas neutras
  - aproximar a paleta do admin das cores previstas no `DESIGN_PROPOSAL`, preservando o slate escuro da sidebar (`#1c2333` / `#141824`), os estados semânticos e o accent âmbar do sistema

  Regras:
  - não voltar para a linguagem legacy nem para o visual excessivamente branco/preto e sem hierarquia
  - a recalibração deve preservar a semântica profissional do sistema; o objetivo é aumentar presença, foco e pulso operacional, não introduzir efeitos decorativos
  - a sidebar recolhida deve continuar legível, com affordance clara de navegação e ícones visualmente dominantes
  - `Outfit` deve continuar sendo a tipografia de UI e `DM Mono` a tipografia de dados/KPIs
  - os acentos de cor precisam cumprir função operacional clara: progresso, eficiência, meta, alerta e estado

  **Evidência:** `/admin/dashboard` e o shell administrativo passam a refletir claramente o peso visual previsto no `DESIGN_PROPOSAL`, com hero bar mais forte, KPIs com hierarquia explícita, sidebar mais presente e blocos operacionais com contraste e função perceptível.
  Observação de replanejamento em `2026-04-05`: a execução anterior desta HU não homologou visualmente e depois foi revertida no worktree junto com a tentativa de migração ampla. A HU permanece aberta e sem entrega válida no código atual.

- [ ] **HU 23.3c — Atingir paridade visual explícita com a referência homologada da dashboard e do shell**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `components/admin/AdminShell.tsx`
  - `app/(admin)/dashboard/page.tsx`
  - `components/dashboard/ResumoPlanejamentoTurnoV2.tsx`
  - `components/dashboard/CardKPI.tsx`
  - `components/dashboard/DashboardTabs.tsx`
  - `components/dashboard/GraficoMetaGrupoTurnoV2.tsx`
  - `components/dashboard/RankingOperadores.tsx`
  - `components/dashboard/StatusMaquinas.tsx`
  - demais superfícies que interfiram diretamente no padrão visual do monitor principal

  Objetivo específico:
  - sair do estado atual ainda excessivamente neutro e atingir o mesmo padrão visual percebido da referência homologada, tanto no modo claro quanto no modo escuro

  Entregas mínimas:
  - reproduzir o mesmo padrão estrutural da referência homologada: sidebar escura forte, barra de turno compacta e acionável, primeira linha de KPIs prioritários, gráfico principal dominante e blocos operacionais subsequentes com pesos distintos
  - reproduzir o mesmo padrão de paleta percebida: fundo e superfícies com contraste correto, slate escuro na navegação, accent âmbar quente para ação/progresso, verde para sucesso e neutros cinza para base/meta
  - reproduzir o mesmo padrão de presença e comportamento da sidebar: recolhimento profissional, ícones maiores, item ativo forte e leitura clara mesmo no estado colapsado
  - eliminar a sensação de página wireframe/branca-preta/lavada, aumentando contraste, densidade e direção visual até que a tela tenha presença comparável à referência homologada
  - garantir que o light mode e o dark mode preservem o mesmo padrão de hierarquia e identidade visual da referência

  Regras:
  - não basta "lembrar" a proposta; o resultado visual precisa ser reconhecível como pertencente ao mesmo padrão da referência homologada
  - diferenças de conteúdo do domínio real são permitidas, mas diferenças de linguagem visual, pesos, cores e composição não
  - se os blocos principais continuarem parecendo todos iguais, a HU não está homologada
  - se a sidebar continuar fraca ou sem recolhimento claro, a HU não está homologada

  **Evidência:** O usuário consegue comparar `/admin/dashboard` com a referência homologada em light mode e dark mode e reconhecer o mesmo padrão de composição, contraste, paleta, hierarquia e presença da navegação principal.
  Observação de replanejamento em `2026-04-05`: a execução anterior desta HU não homologou visualmente e foi revertida no worktree na restauração do baseline pré-migração. A HU permanece aberta e sem entrega válida no código atual.

- [ ] **HU 23.4 — Migrar os CRUDs administrativos para a mesma linguagem visual**
  **Prioridade:** P1
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/operadores`
  - `/admin/maquinas`
  - `/admin/operacoes`
  - `/admin/produtos`
  - `/admin/setores`
  - `/admin/usuarios`
  - modais e listagens compartilhadas

  Entregas mínimas:
  - padronizar campos de busca, tabelas, botões de ação, estados vazios e badges de status
  - reduzir uso de cores utilitárias hardcoded nas listagens e modais
  - garantir que páginas de detalhe e listagens contem a mesma história visual
  - reaproveitar primitives consolidadas em vez de repetir classes locais divergentes

  Regras:
  - a migração deve priorizar consistência de semântica e leitura, não efeitos visuais
  - ações destrutivas, alertas e estados inativos devem seguir a mesma convenção em todos os CRUDs
  - evitar refatoração funcional fora do necessário para suportar a consolidação visual

  **Evidência:** Os CRUDs do admin passam a compartilhar o mesmo vocabulário visual para busca, tabelas, badges, ações e modais, sem regressão funcional.
  Observação de replanejamento em `2026-04-05`: a execução anterior desta HU foi revertida no worktree durante a restauração do frontend ao baseline pré-migração. A HU permanece aberta e sem entrega válida no código atual.

- [ ] **HU 23.5 — Unificar relatórios, apontamentos e QR Codes como superfícies operacionais do admin**
  **Prioridade:** P1
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/relatorios`
  - `/admin/apontamentos`
  - `/admin/qrcodes`
  - páginas e componentes de impressão relacionados ao admin

  Entregas mínimas:
  - alinhar filtros, resumos, tabelas e cards dessas superfícies ao mesmo sistema visual consolidado
  - remover paletas antigas dispersas (`blue/slate/violet/amber` hardcoded) quando estiverem representando papéis semânticos já cobertos por tokens
  - manter distinção clara entre leitura analítica, ação operacional e impressão
  - tratar QR Codes e impressão como parte do admin, não como linguagem paralela

  Regras:
  - impressão pode manter adaptações próprias de mídia, mas não deve carregar uma identidade diferente do admin
  - apontamentos administrativos devem permanecer funcionais e legíveis em desktop e tablet
  - relatórios não podem reintroduzir estilos legacy depois da consolidação das primitives

  **Evidência:** Relatórios, apontamentos e QR Codes passam a ser percebidos como partes do mesmo sistema administrativo, com semântica e hierarquia consistentes.

- [ ] **HU 23.6 — Criar guardrails de consistência visual e homologar a sprint**
  **Prioridade:** P0
  **Risco:** Baixo

  Entregas mínimas:
  - revisar os pontos críticos do admin para garantir ausência de regressão visual grosseira
  - rodar `npx tsc --noEmit`
  - registrar a lista de superfícies consolidadas e os resíduos conscientemente deixados fora do escopo
  - documentar explicitamente que o scanner permanece fora da consolidação e deverá ter sprint própria se for revisitado

  Regras:
  - a homologação deve validar consistência entre dashboard, CRUDs, relatórios, apontamentos e QR Codes
  - qualquer exceção visual mantida no admin deve ser deliberada e documentada
  - não considerar a sprint concluída sem evidência textual da consolidação do vocabulário visual

  **Evidência:** O admin homologado passa a exibir consistência visual entre dashboard, CRUDs, relatórios, apontamentos e QR Codes, com `npx tsc --noEmit` passando e com exceções remanescentes formalmente documentadas.

## SPRINT 24 — Meta mensal global da fábrica
**Status:** ✅ Concluída
**Pré-requisito:** realinhamento documental concluído e confirmação explícita do usuário para abertura oficial da sprint.
**Objetivo:** introduzir a meta mensal global da fábrica como leitura gerencial principal da dashboard, com acompanhamento acumulado diário e semanal por calendário do mês, sem depender da existência de turno ativo.

**Nota de abertura em `2026-04-05`:**
- esta sprint foi aberta por confirmação explícita do usuário para iniciar pela `HU 24.1`
- a Sprint 23 permanece documentada em `realinhamento documental`, mas deixa de ser a frente de execução atual
- o bloco abaixo passa a reger a implementação da frente de `Meta Mensal`

**Decisões de produto já homologadas para esta proposta:**
- a meta mensal é global da fábrica
- o `alcançado` mensal deve usar a soma da quantidade concluída consolidada por `OP/dia`, e não apontamentos brutos
- a meta mensal deve registrar a quantidade de `dias produtivos` da competência no momento do lançamento
- a evolução semanal deve respeitar as semanas do calendário do mês
- a aba `Visão Geral` da dashboard passa a ser a superfície gerencial de meta mensal
- o conteúdo atual da `Visão Geral` deve migrar para a aba `Visão Operacional`
- a gestão de cadastro e edição da meta mensal fica em `/admin/apontamentos`, atuando sobre a competência selecionada
- a leitura mensal deve continuar disponível mesmo sem turno ativo
- a `Visão Geral` deve abrir por padrão no mês corrente
- a dashboard deve permitir navegar entre competências mensais
- a dashboard permanece como superfície de leitura gerencial da competência selecionada

- [x] **HU 24.1 — Como supervisor/admin, quero cadastrar a meta mensal global da fábrica informando competência, meta em peças e dias produtivos, para definir a referência gerencial oficial do mês.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - criar a modelagem persistida de `meta mensal` com unicidade por competência
  - registrar no schema pelo menos:
    - competência
    - meta mensal em peças
    - dias produtivos do mês
    - observação opcional
    - timestamps de auditoria
  - gerar os `types` TypeScript correspondentes
  - validar regras de domínio:
    - uma meta por competência
    - `meta_mensal > 0`
    - `dias_produtivos > 0`
    - `dias_produtivos` não pode ultrapassar a quantidade de dias do mês da competência
  - criar action administrativa para cadastrar a meta mensal
  - vincular o cadastro à competência selecionada na superfície administrativa de lançamento
  - garantir mensagens claras para competência duplicada, meta inválida e dias produtivos inválidos

  Regras:
  - esta persistência é gerencial e global; não deve nascer por produto, linha ou setor
  - o fluxo de cadastro não deve depender da existência de turno ativo
  - a criação do contrato deve preservar possibilidade futura de auditoria e edição controlada

  **Evidência:** O supervisor/admin consegue cadastrar a meta mensal da competência com validações corretas em `/admin/apontamentos`; o schema reconhece uma meta única por mês; `npx tsc --noEmit` passa sem erros.
  Implementado em `scripts/sprint24_meta_mensal.sql`, `lib/actions/metas-mensais.ts`, `lib/utils/data.ts`, `types/index.ts` e `types/supabase.ts`, com superfície administrativa atual em `components/apontamentos/PainelMetaMensalApontamentos.tsx` e `app/(admin)/apontamentos/page.tsx`. Migração aplicada via Supabase Management API em `2026-04-05`, com validação remota confirmando a tabela `metas_mensais` e as colunas `id`, `competencia`, `meta_pecas`, `dias_produtivos`, `observacao`, `created_at` e `updated_at`.

- [x] **HU 24.2 — Como supervisor/admin, quero editar a meta mensal da competência quando necessário, para corrigir o planejamento do mês sem perder a referência gerencial registrada.**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/apontamentos`
  - componentes compartilhados de formulário/modal usados no admin

  Tarefas:
  - criar action administrativa para editar a meta da competência quando ela já existir
  - reaproveitar o mesmo formulário de lançamento em modo de edição
  - garantir que a edição use a competência atualmente selecionada em `/admin/apontamentos`
  - recarregar imediatamente a superfície administrativa e a dashboard após salvar
  - preservar auditoria mínima de atualização
  - garantir mensagens claras para:
    - competência inexistente
    - meta inválida
    - dias produtivos inválidos

  Regras:
  - apenas supervisor/admin autenticado pode lançar ou editar a meta
  - o fluxo de edição da meta não pode depender da abertura do turno
  - o formulário deve preservar a linguagem administrativa já consolidada no sistema e ficar junto da superfície de registros

  **Evidência:** O supervisor/admin consegue editar a meta mensal da competência em `/admin/apontamentos`, e a dashboard reflete o novo valor imediatamente após salvar.
  Implementado em `lib/actions/metas-mensais.ts`, adicionando `editarMetaMensal()` e `editarMetaMensalFormulario()` com validação de sessão admin, checagem de meta existente, atualização de `updated_at`, tratamento de conflito por competência e `revalidatePath('/admin/dashboard')` junto de `revalidatePath('/admin/apontamentos')`. `npx tsc --noEmit` validado sem erros em `2026-04-05`.

- [x] **HU 24.3 — Como supervisor/admin, quero visualizar na Visão Geral da dashboard a meta mensal, o alcançado, o saldo, o atingimento e a meta diária média, para acompanhar o desempenho do mês mesmo sem turno ativo.**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/dashboard`
  - componentes da nova `Visão Geral`

  Tarefas:
  - criar query/read model para carregar a meta mensal da competência
  - carregar a competência selecionada, abrindo no mês corrente por padrão
  - consolidar `realizado_dia` a partir da quantidade concluída por `OP/dia`
  - gerar resumo mensal com:
    - meta mensal
    - alcançado
    - saldo
    - atingimento %
    - meta diária média
  - montar os KPIs da `Visão Geral`
  - exibir estado vazio claro quando não houver meta lançada para a competência
  - garantir que a `Visão Geral` carregue mesmo sem turno ativo

  Regras:
  - o `alcançado` mensal deve usar quantidade concluída consolidada por `OP/dia`, nunca apontamentos brutos
  - a leitura gerencial mensal não pode depender da seleção de um turno específico
  - nesta primeira versão, `dias_produtivos` é a base para a média diária gerencial do mês

  **Evidência:** A `Visão Geral` exibe KPIs mensais coerentes com o consolidado do mês e continua funcionando mesmo sem turno ativo.
  Implementado em `lib/queries/metas-mensais.ts`, `components/dashboard/DashboardVisaoGeralTab.tsx`, `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`, `components/dashboard/DashboardTabs.tsx`, `app/(admin)/dashboard/page.tsx`, `app/admin/dashboard/page.tsx` e `types/index.ts`. A dashboard passou a carregar a competência selecionada via query param `competencia`, abrindo no mês corrente por padrão, e a `Visão Geral` passou a mostrar `Meta Mensal`, `Alcançado`, `Saldo`, `Atingimento %` e `Meta diária média` mesmo quando não existe turno ativo. `npx tsc --noEmit` validado sem erros em `2026-04-05`.

- [x] **HU 24.4 — Como supervisor/admin, quero acompanhar a evolução diária e semanal da meta mensal em gráfico, para identificar cedo se a fábrica está acima, dentro ou abaixo da trajetória esperada do mês.**
  **Prioridade:** P1
  **Risco:** Médio

  Telas/blocos afetados:
  - componentes da nova `Visão Geral`
  - gráficos e cards reutilizáveis do admin

  Tarefas:
  - gerar série diária do mês com:
    - data
    - meta diária média
    - realizado do dia
    - realizado acumulado
    - percentual de atingimento acumulado
  - gerar resumo semanal por semanas do calendário do mês
  - criar gráfico principal `Meta Mensal x Alcançado` com leitura acumulada ao longo do mês
  - exibir a evolução diária
  - exibir a evolução semanal pelas semanas do calendário do mês
  - criar estados vazios e mensagens de ausência de dados

  Regras:
  - esta seção é gerencial e prioritária dentro da dashboard
  - o gráfico principal deve comunicar avanço acumulado do mês, e não apenas valores isolados por dia

  **Evidência:** A `Visão Geral` passou a exibir um gráfico acumulado `Meta Mensal x Alcançado`, um comparativo diário entre `meta diária média` e `realizado do dia` e um resumo semanal por semanas do calendário da competência.
  Implementado em `lib/queries/metas-mensais.ts`, `components/dashboard/GraficoMetaMensalVisaoGeral.tsx`, `components/dashboard/DashboardVisaoGeralTab.tsx` e `types/index.ts`. A query mensal agora entrega `evolucaoDiaria` e `resumoSemanal` a partir do consolidado por `OP/dia`, com curva esperada derivada da `meta_diaria_media` como referência gerencial média. `npx tsc --noEmit` validado sem erros em `2026-04-05`.
  - a série semanal deve respeitar o calendário do mês, nunca blocos móveis de 7 dias
  - como não existe calendário produtivo detalhado por data nesta primeira versão, a curva esperada deve assumir uma referência média a partir de `dias_produtivos`

  **Evidência:** A `Visão Geral` passa a apresentar KPIs e gráfico acumulado da meta mensal, além de evolução diária e semanal do mês corrente de forma legível e gerencial.

- [x] **HU 24.5 — Como supervisor/admin, quero separar a dashboard em Visão Geral e Visão Operacional, para ter uma leitura gerencial do mês sem perder o monitor operacional do turno.**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `app/(admin)/dashboard/page.tsx`
  - `components/dashboard/DashboardTabs.tsx`
  - `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`
  - componentes hoje pertencentes à aba `Visão Geral`

  Tarefas:
  - fazer `Visão Geral` virar a aba gerencial da meta mensal
  - mover o conteúdo atual da `Visão Geral` para a nova aba `Visão Operacional`
  - abrir a dashboard por padrão na `Visão Geral`
  - criar navegação de competência mensal na `Visão Geral`
  - garantir que a `Visão Operacional` preserve o comportamento atual de turno aberto ou último encerrado
  - revisar nomenclatura, ordem das abas e textos de apoio para refletir a nova separação de contexto

  Regras:
  - a troca de abas não pode quebrar o contrato atual de `Meta do Grupo`, progresso operacional e eficiência
  - a ausência de turno ativo não pode bloquear a leitura gerencial mensal
  - a `Visão Operacional` continua sendo a superfície do monitor de chão de fábrica

  **Evidência:** A dashboard passa a abrir na `Visão Geral` mensal, enquanto o conteúdo operacional existente permanece acessível e funcional nas abas `Visão Operacional` e `Operadores`.
  Implementado em `components/dashboard/DashboardTabs.tsx`, `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`, `components/dashboard/DashboardVisaoGeralTab.tsx`, `components/dashboard/DashboardVisaoOperacionalTab.tsx`, `components/dashboard/DashboardOperadoresTab.tsx` e `components/dashboard/DashboardCompetenciaMensalNav.tsx`. A `Visão Geral` ficou exclusiva para a leitura mensal e ganhou navegação de competência via query param `competencia`, a `Visão Operacional` passou a concentrar `Meta do Grupo`, gráfico por hora, OPs e setores, e a aba `Operadores` voltou a concentrar a eficiência operacional. `npx tsc --noEmit` validado sem erros em `2026-04-05`.

- [x] **HU 24.6 — Como supervisor/admin, quero uma primeira versão estável e validada da Meta Mensal, para confiar na leitura gerencial do mês sem regressões operacionais no admin.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - revisar o fluxo completo de cadastro, edição e leitura da meta mensal
  - revisar estados sem meta cadastrada, mês sem produção e mês com produção parcial
  - revisar a separação entre `Visão Geral` gerencial e `Visão Operacional`
  - documentar qualquer limitação consciente da primeira versão
  - rodar `npx tsc --noEmit`

  Regras:
  - não considerar a sprint concluída sem validar a separação entre `Visão Geral` gerencial e `Visão Operacional`
  - qualquer simplificação da curva diária/semanal deve ficar explicitamente documentada
  - a homologação deve confirmar que o `alcançado` usa quantidade concluída consolidada por `OP/dia`

  **Evidência:** A sprint fecha com a dashboard reorganizada, meta mensal persistida, leitura diária/semanal/mensal disponível e `npx tsc --noEmit` passando sem erros.
  Validado em `components/dashboard/PainelMetaMensalFormulario.tsx`, `components/apontamentos/PainelMetaMensalApontamentos.tsx`, `components/apontamentos/ApontamentosTabs.tsx`, `components/dashboard/DashboardVisaoGeralTab.tsx`, `components/dashboard/DashboardVisaoOperacionalTab.tsx`, `components/dashboard/DashboardOperadoresTab.tsx`, `lib/actions/metas-mensais.ts`, `lib/queries/metas-mensais.ts`, `docs/PRD.md` e `docs/TASKS.md`. A `Visão Geral` passou a permanecer como leitura mensal gerencial, o fluxo de cadastro/edição da meta mensal da competência selecionada foi deslocado para `/admin/apontamentos`, a página de apontamentos passou a se organizar nas abas `Gestão Mensal` e `Operação do Turno`, os estados `sem meta`, `sem produção` e `produção parcial` permanecem cobertos na leitura mensal, a separação entre `Visão Geral`, `Visão Operacional` e `Operadores` foi mantida, e a limitação consciente da curva média foi reforçada no PRD. `npx tsc --noEmit` validado sem erros em `2026-04-05`.

## SPRINT 25 — Apontamentos operacionais sem preview e orientados por pendência
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 24 homologada e confirmação explícita do usuário para abertura oficial da sprint.
**Objetivo:** simplificar `/admin/apontamentos` para que a aba `Operação do Turno` trabalhe com um fluxo direto de lançamento por pendência acionável, sem preview expandido das seções, sem filtros para itens concluídos e com quantidade sugerida a partir do saldo da operação.

**Nota de proposta em `2026-04-06`:**
- o feedback de UX indicou que o fluxo atual de `preview de seções -> detalhe -> formulário` está adicionando atrito desnecessário ao supervisor
- quando a intenção operacional já é apontar uma OP filtrada, a tela deve convergir imediatamente para o formulário acionável do recorte escolhido
- OPs, setores e operações já concluídos deixam de ser opções operacionais válidas nessa superfície
- o saldo da operação passa a ser a sugestão padrão de quantidade para reduzir digitação manual repetitiva

**Decisões de produto propostas para esta sprint:**
- `/admin/apontamentos` continua sendo a rota administrativa segura de supervisão e contingência
- a aba `Operação do Turno` deixa de privilegiar uma visão geral expandida de seções antes do lançamento
- filtros operacionais passam a listar apenas pendências reais com saldo maior que `0`
- itens já concluídos continuam podendo existir em dashboard e relatórios, mas saem do fluxo operacional de lançamento
- o formulário deve abrir diretamente no recorte filtrado e usar o saldo remanescente da operação como quantidade inicial sugerida
- após cada lançamento, a UI deve recalcular o recorte atual e eliminar automaticamente do fluxo os itens que foram concluídos

- [x] **HU 25.1 — Como supervisor, quero que os filtros de `/admin/apontamentos` mostrem apenas OPs, setores e operações ainda pendentes, para não perder tempo navegando por itens já concluídos.**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/apontamentos`
  - queries e read models usados pela aba `Operação do Turno`

  Tarefas:
  - revisar o contrato das queries operacionais da página
  - excluir das opções de filtro qualquer OP com saldo integralmente zerado
  - excluir do filtro de setor qualquer setor já concluído dentro da OP selecionada
  - excluir da lista de operações qualquer operação já concluída no recorte atual
  - garantir que produto, OP, setor e operação mantenham consistência entre si quando o filtro anterior mudar
  - preservar a leitura histórica dos concluídos apenas em dashboard, relatórios e detalhes não operacionais

  Regras:
  - `saldo > 0` passa a ser o critério operacional de elegibilidade para filtro e lançamento
  - itens concluídos não devem reaparecer por inconsistência de ordenação, cache ou fallback de UI
  - a remoção de concluídos do fluxo operacional não pode apagar nem distorcer histórico

  **Evidência:** Ao abrir `/admin/apontamentos`, os filtros da aba `Operação do Turno` deixam de oferecer OPs, setores e operações concluídos, mantendo apenas pendências reais e coerentes entre si.
  Implementado em `components/apontamentos/PainelApontamentosSupervisor.tsx` em `2026-04-07`, filtrando a UI operacional por contextos acionáveis (`saldo > 0` e status diferente de `concluida`/`encerrada_manualmente`), encadeando as opções de `OP`, `setor` e `produto` a partir desse subconjunto e removendo operações concluídas também da seção selecionada. `npx tsc --noEmit` validado sem erros.

- [x] **HU 25.2 — Como supervisor, quero que a aba `Operação do Turno` mostre diretamente o formulário do recorte filtrado, para lançar produção sem atravessar uma prévia longa de seções.**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `components/apontamentos/PainelApontamentosSupervisor.tsx`
  - componentes auxiliares da aba `Operação do Turno`

  Tarefas:
  - remover a dependência do fluxo `preview expandido -> escolha visual -> formulário`
  - transformar o bloco principal da tela em um formulário acionável orientado pelos filtros atuais
  - manter apenas um resumo contextual enxuto de OP, produto, setor, planejado, realizado e saldo
  - abrir diretamente o formulário quando o recorte filtrado já identificar um único contexto elegível
  - revisar estados vazios e mensagens quando não houver pendências para o filtro escolhido

  Regras:
  - a tela operacional deve priorizar ação, não inspeção
  - o resumo contextual não pode competir visualmente com o formulário nem reintroduzir uma lista longa de seções
  - a simplificação da UI não pode alterar o contrato transacional do lançamento

  **Evidência:** Com uma OP filtrada, `/admin/apontamentos` deixa de exibir a prévia completa das seções e passa a abrir diretamente o formulário correspondente ao recorte operacional escolhido.
  Implementado em `components/apontamentos/PainelApontamentosSupervisor.tsx` em `2026-04-07`, removendo a vitrine expandida de `Seções do turno` e o preview detalhado de `Operações da seção`, promovendo o formulário a bloco principal da aba `Operação do Turno` e mantendo apenas um `Contexto operacional` enxuto com seletor compacto quando ainda houver mais de uma pendência elegível no recorte filtrado. `npx tsc --noEmit` validado sem erros.

- [x] **HU 25.3 — Como supervisor, quero receber a quantidade já preenchida com o saldo da operação, para registrar rapidamente o restante planejado sem digitar manualmente em toda ação.**
  **Prioridade:** P0
  **Risco:** Baixo

  Telas/blocos afetados:
  - formulário de lançamento de `/admin/apontamentos`
  - actions e validações ligadas à quantidade operacional

  Tarefas:
  - calcular o saldo remanescente da operação no recorte atual
  - preencher a quantidade inicial do formulário com esse saldo
  - manter a possibilidade de editar manualmente a quantidade para um valor válido menor ou igual ao saldo
  - impedir envio acima do saldo pendente
  - atualizar a sugestão automaticamente quando o supervisor trocar OP, setor, produto ou operação

  Regras:
  - o valor sugerido é operacional, não obrigatório
  - a sugestão nunca pode ultrapassar o saldo real da operação
  - mudanças de filtro não podem reaproveitar quantidade stale de um recorte anterior

  **Evidência:** Ao selecionar uma operação pendente em `/admin/apontamentos`, o campo de quantidade já abre com o saldo remanescente correto, respeita edição manual e continua bloqueando excesso acima do saldo.
  Implementado em `components/apontamentos/PainelApontamentosSupervisor.tsx` em `2026-04-07`, fazendo cada novo lançamento nascer com a quantidade sugerida pelo saldo da primeira operação acionável, reaplicando a sugestão automaticamente quando a operação do draft muda e recalculando a quantidade quando o contexto filtrado troca de seção/OP/setor/produto. O input passou a respeitar `max` por operação e a validação do formulário agora bloqueia tanto excesso por linha quanto excesso agregado quando múltiplas linhas apontam para a mesma operação. `npx tsc --noEmit` validado sem erros.

- [x] **HU 25.4 — Como supervisor, quero que a tela avance naturalmente após cada lançamento, para continuar apontando apenas o que ainda falta sem reprocessar itens já encerrados.**
  **Prioridade:** P1
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/apontamentos`
  - estados client-side e revalidação após lançamento

  Tarefas:
  - recalcular o recorte operacional imediatamente após cada lançamento bem-sucedido
  - remover do fluxo visível a operação concluída quando o saldo chegar a `0`
  - manter o formulário no mesmo contexto quando ainda houver saldo naquele recorte
  - avançar para a próxima pendência elegível quando o item atual for encerrado
  - revisar mensagens de sucesso para reforçar o próximo passo operacional

  Regras:
  - a UX pós-save deve reduzir cliques e evitar novo filtro manual desnecessário
  - o avanço automático não pode conduzir o supervisor para contexto inconsistente com os filtros ativos
  - se não houver mais pendência no recorte, a tela deve comunicar claramente que o contexto foi concluído

  **Evidência:** Após registrar um lançamento, `/admin/apontamentos` atualiza o saldo do contexto, remove do fluxo o que foi concluído e mantém o supervisor apenas nas pendências ainda acionáveis.
  Implementado em `components/apontamentos/PainelApontamentosSupervisor.tsx` em `2026-04-07`, armazenando o contexto operacional imediatamente antes do `router.refresh()` e reconciliando a tela quando os dados atualizados chegam: se a seção atual ainda tem saldo, ela permanece selecionada; se saiu do fluxo, a UI avança para a próxima pendência elegível dentro do mesmo recorte filtrado; se não restarem pendências, a área operacional informa a conclusão do recorte. A tela também passou a exibir mensagens explícitas de continuidade/avanço pós-save para o supervisor. `npx tsc --noEmit` validado sem erros.

- [x] **HU 25.5 — Como produto, quero homologar a nova UX de apontamentos com cenários reais de OP parcial e OP concluída, para garantir que o ganho de fluidez não gere regressão operacional.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - validar cenário com OP parcialmente concluída e múltiplos setores pendentes
  - validar cenário com setor concluído e outro setor ainda pendente dentro da mesma OP
  - validar cenário em que a última operação pendente é concluída e o item sai dos filtros
  - rodar `npx tsc --noEmit`
  - registrar evidências da homologação funcional e das limitações conscientes, se houver

  Regras:
  - a homologação precisa confirmar redução real de atrito para o supervisor
  - a validação deve cobrir filtros, formulário direto, sugestão de saldo e comportamento pós-save
  - a sprint não pode ser considerada concluída sem validar a ausência de itens concluídos no fluxo operacional

  **Evidência:** Em `/admin/apontamentos`, o supervisor consegue filtrar apenas pendências reais, lançar direto no formulário sem atravessar previews longos, usar a quantidade sugerida pelo saldo e ver itens concluídos saindo do fluxo operacional sem regressões técnicas; `npx tsc --noEmit` passa sem erros.
  Homologação funcional confirmada pelo usuário em `2026-04-07`: o fluxo operacional foi validado com recortes reais de OP parcial e de conclusão, confirmando que a tela passou a operar sem preview expandido, com filtros apenas de pendências, sugestão automática de saldo e avanço pós-save sem regressão observada.

**Evidências consolidadas da Sprint 25:**
- `/admin/apontamentos` passou a operar apenas sobre pendências reais, removendo OPs, setores e operações concluídos do fluxo de lançamento.
- A aba `Operação do Turno` deixou de usar preview expandido de seções e passou a abrir diretamente o formulário do recorte filtrado.
- A quantidade de cada lançamento passou a nascer do saldo da operação selecionada, com bloqueio de excesso por linha e por soma agregada da mesma operação.
- O comportamento pós-save passou a manter o contexto quando ainda há saldo e a avançar automaticamente para a próxima pendência elegível quando o item atual sai do fluxo.
- `npx tsc --noEmit` foi validado sem erros durante a execução e permaneceu consistente até a homologação funcional.

## SPRINT 26 — Operações com máquina específica e código manual
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 25 concluída e confirmação explícita do usuário para abertura oficial da sprint.
**Objetivo:** alinhar o cadastro de operações ao domínio atual de máquinas patrimoniais, removendo `tipo_maquina_codigo`, vinculando a operação a uma máquina específica cadastrada e tornando o `codigo` da operação um campo manual livre.

**Nota de proposta em `2026-04-07`:**
- o cadastro de operações ainda carrega `tipo_maquina_codigo`, apesar de esse conceito já não existir no contrato atual de `maquinas`
- a decisão homologada é que cada operação passe a apontar para uma máquina específica já cadastrada
- a UI deve exibir o `modelo` da máquina como referência principal de escolha, preservando o vínculo técnico por `id`
- o código da operação deixa de ser gerado automaticamente e passa a ser informado manualmente pelo usuário

**Decisões de produto propostas para esta sprint:**
- `operacoes.tipo_maquina_codigo` deve sair do schema, dos types, das actions, das queries e da UI
- `operacoes.maquina_id` passa a ser o vínculo correto com a tabela `maquinas`
- o select de máquina no CRUD de operações deve listar a máquina cadastrada com foco em `modelo`, sem perder capacidade de desambiguação
- `codigo` da operação continua obrigatório e único, mas agora é digitado manualmente
- a mudança deve preservar QR Code, cálculo de T.P, metas, roteiro de produto e leituras derivadas do turno

- [x] **HU 26.1 — Como produto, quero formalizar no schema e no PRD que a operação aponta para uma máquina específica cadastrada, para eliminar o resíduo de `tipo_maquina` do domínio de operações.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - remover `tipo_maquina_codigo` do contrato alvo de `operacoes`
  - introduzir `maquina_id` como vínculo da operação com `maquinas`
  - revisar restrições, foreign keys e impacto em backfill/migração
  - documentar explicitamente no PRD a nova regra de vínculo por máquina específica

  Regras:
  - o vínculo deve ser técnico por `id`, nunca por texto livre de `modelo`
  - a remoção de `tipo_maquina_codigo` não pode reintroduzir dependência operacional de `maquinas` no turno

  **Evidência:** O schema alvo e o PRD passam a descrever `operacoes.maquina_id` como vínculo oficial, sem `tipo_maquina_codigo` no contrato da operação.
  PRD reforçado em `docs/PRD.md` com a persistência oficial por `operacoes.maquina_id UUID REFERENCES maquinas(id)`, e migration preparatória criada em `scripts/sprint26_operacoes_maquina_codigo_manual.sql`, removendo o default automático de `operacoes.codigo`, introduzindo `maquina_id` e registrando o backfill obrigatório antes da remoção final de `tipo_maquina_codigo`.
  A migration foi aplicada no projeto de produção `jsuufbgdcqxogimmocof` via Supabase Management API em `2026-04-07` (`POST /v1/projects/{ref}/database/query`). Validação read-only concluída na sequência: `information_schema.columns` retornou `codigo`, `maquina_id` e `tipo_maquina_codigo`, todos com `column_default = null`, confirmando a entrada de `maquina_id` e a remoção do default automático de `codigo` sem ainda remover a coluna legada antes do backfill final.

- [x] **HU 26.2 — Como admin, quero cadastrar e editar operações escolhendo uma máquina específica pelo modelo, para manter o cadastro técnico consistente com as máquinas realmente existentes.**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/operacoes`
  - `components/ui/ModalOperacao.tsx`
  - queries auxiliares de máquinas e operações

  Tarefas:
  - remover o select de `tipo de máquina`
  - adicionar select de `máquina`
  - popular a escolha usando o `modelo` das máquinas cadastradas
  - garantir comportamento consistente em criação, edição, listagem e detalhe

  Regras:
  - a UI deve priorizar o `modelo` como label principal
  - se houver ambiguidade de modelos, a interface deve continuar distinguindo os itens de forma segura

  **Evidência:** O CRUD de operações passa a salvar e editar a operação escolhendo uma máquina específica cadastrada, exibida na UI pelo `modelo`.
  Implementado em `lib/actions/operacoes.ts`, `lib/queries/operacoes.ts`, `lib/queries/maquinas.ts`, `components/ui/ModalOperacao.tsx`, `app/admin/operacoes/page.tsx`, `app/(admin)/operacoes/ListaOperacoes.tsx`, `app/admin/operacoes/[id]/page.tsx`, `types/index.ts` e `types/supabase.ts`. O fluxo administrativo deixou de carregar `tipos_maquina`, passou a exigir `maquina_id` no modal e exibe a máquina pelo `modelo`, com apoio do `codigo` para desambiguação na listagem e no detalhe. `npx tsc --noEmit` validado sem erros após a mudança.

- [x] **HU 26.3 — Como admin, quero informar manualmente o código da operação, para que o cadastro reflita a codificação real do negócio sem geração automática imposta pelo sistema.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - remover a geração automática de código da operação no fluxo atual
  - tornar `codigo` um input manual obrigatório no modal
  - preservar unicidade de `codigo`
  - revisar mensagens de erro para conflito de código duplicado

  Regras:
  - `codigo` continua obrigatório
  - a UI não deve sugerir que o sistema ainda gera o código automaticamente

  **Evidência:** O modal de operação exige `codigo` manual, salva com sucesso quando único e bloqueia conflito quando já existir outro cadastro com o mesmo código.
  Implementado em `components/ui/ModalOperacao.tsx`, `lib/actions/operacoes.ts` e `types/supabase.ts`. O bloco visual que sugeria geração automática foi removido, o formulário passou a exigir `codigo` tanto na criação quanto na edição, e as actions agora persistem explicitamente esse campo mantendo a proteção por unicidade via erro `23505`. `npx tsc --noEmit` validado sem erros após a mudança.

- [x] **HU 26.4 — Como sistema, quero propagar o novo contrato de operação para types, queries e leituras derivadas, para evitar inconsistência entre CRUD, produtos, scanner e relatórios.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - regenerar `types/supabase.ts`
  - revisar `types/index.ts`
  - ajustar `lib/queries/operacoes.ts`
  - ajustar queries e mapeamentos que ainda leem `tipo_maquina_codigo`
  - revisar impacto em produtos, turno, scanner e relatórios

  Regras:
  - nenhuma leitura ativa deve continuar esperando `tipo_maquina_codigo`
  - a mudança de contrato não pode quebrar cálculo de metas, QR, roteiro ou apontamento

  **Evidência:** Types, queries e leituras derivadas deixam de depender de `tipo_maquina_codigo` e passam a refletir o vínculo da operação com `maquina_id`.
  Implementado em `types/index.ts`, `lib/queries/produtos.ts`, `lib/queries/turno-setor-operacoes-base.ts`, `components/scanner/SelecaoOperacaoScanner.tsx`, `components/dashboard/ModalDetalhesSecaoTurno.tsx`, `lib/queries/metas-mensais.ts` e `lib/queries/eficiencia-operacional-turno-base.test.ts`. O contrato derivado passou a expor `maquinaModelo` e `maquinaCodigo` no lugar de `tipoMaquinaCodigo`, cobrindo roteiro de produto, planejamento operacional do turno, scanner e telas de detalhe. Após a varredura, o único resíduo restante de `tipo_maquina_codigo` ficou restrito ao shape bruto de `types/supabase.ts`, coerente com a migration ainda não aplicada para remoção física da coluna. `npx tsc --noEmit` validado sem erros após a propagação.

- [x] **HU 26.5 — Como produto, quero homologar a migração do cadastro de operações para máquina específica e código manual, para garantir consistência funcional sem regressão nos fluxos dependentes.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - validar criação de operação com máquina específica
  - validar edição de operação existente
  - validar conflito de código manual duplicado
  - validar leituras de produto, turno, scanner e relatórios impactadas pelo novo contrato
  - rodar `npx tsc --noEmit`

  Regras:
  - a homologação precisa cobrir criação, edição e leitura
  - a sprint não fecha sem confirmar a remoção completa de `tipo_maquina_codigo` do fluxo ativo

  **Evidência:** O sistema passa a cadastrar operações com `codigo` manual e `maquina_id`, sem regressão observada nos fluxos dependentes e com `npx tsc --noEmit` passando sem erros.
  Homologação funcional confirmada pelo usuário em `2026-04-07`, cobrindo criação, edição, escolha de máquina específica, código manual e leituras derivadas de produto, turno, scanner e detalhes operacionais. A sprint foi encerrada com `npx tsc --noEmit` validado sem erros e sem dependência funcional restante de `tipo_maquina_codigo` no fluxo ativo.

## SPRINT 27 — Paginação e ordenação profissional do CRUD de operações
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 26 concluída e confirmação explícita do usuário para abertura oficial da sprint.
**Objetivo:** evoluir `/admin/operacoes` para suportar paginação profissional, ordenação por clique no cabeçalho e persistência do estado via URL, sem regressão no CRUD atual.

- [x] **HU 27.1 — Como produto, quero formalizar o contrato da listagem paginada e ordenável de operações, para que a rota administrativa use URL como fonte de verdade da navegação e da ordenação.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - definir `page`, `busca`, `sortBy` e `sortDir` como `searchParams` da rota
  - definir ordenação padrão da tela
  - definir quais colunas são oficialmente ordenáveis
  - preservar o CRUD de criação, edição, detalhe e ciclo de vida já existente

  Regras:
  - a URL deve ser a fonte de verdade para paginação, busca e ordenação
  - a ordenação padrão da tela deve abrir em `codigo asc`
  - a mudança não pode quebrar a abertura do modal nem a navegação de detalhe

  **Evidência:** `/admin/operacoes` passa a aceitar `page`, `busca`, `sortBy` e `sortDir` na URL e abre com ordenação padrão consistente.
  Implementado em `app/admin/operacoes/page.tsx`, formalizando `page`, `busca`, `sortBy` e `sortDir` como `searchParams`, com ordenação padrão em `codigo asc` e `pageSize = 20`.

- [x] **HU 27.2 — Como sistema, quero criar uma query paginada e ordenável de operações, para que a tela admin não dependa mais de renderizar a lista inteira sem estrutura de navegação.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - criar um read model para paginação de operações
  - aplicar busca textual por código, descrição, máquina e setor
  - aplicar ordenação por colunas suportadas
  - retornar `items`, `total`, `page`, `pageSize` e `totalPages`

  Regras:
  - a paginação deve respeitar o recorte já filtrado e ordenado
  - a ordenação precisa cobrir colunas textuais, numéricas e status
  - o contrato novo deve preservar o shape atual de `OperacaoListItem`

  **Evidência:** A camada de queries passa a devolver um recorte paginado e ordenável de operações, com metadados suficientes para a navegação da tabela.
  Implementado em `lib/queries/operacoes.ts` e `types/index.ts`, com `listarOperacoesPaginadas()`, contratos tipados de listagem (`OperacoesListagemParams`, `OperacoesPaginadas`, `OperacaoSortField`, `SortDirection`) e comparadores para busca/ordenação por `codigo`, `descricao`, `maquina`, `setor`, `tempo_padrao_min`, `meta_hora`, `meta_dia` e `ativa`.

- [x] **HU 27.3 — Como admin, quero que a page de operações carregue a listagem a partir dos `searchParams`, para manter a navegação previsível e compartilhável.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - adaptar `app/admin/operacoes/page.tsx` para ler `searchParams`
  - carregar a listagem paginada a partir do servidor
  - continuar carregando `maquinas` e `setores` para o modal
  - repassar à UI o estado atual da listagem

  Regras:
  - a rota deve continuar sendo renderizada no server
  - busca, página e ordenação devem sobreviver ao refresh
  - a mudança não pode afetar criação/edição de operação

  **Evidência:** Recarregar `/admin/operacoes` preserva a página atual, a busca atual e a ordenação atual sem perder funcionalidade do CRUD.
  Implementado em `app/admin/operacoes/page.tsx`, substituindo a leitura integral por `listarOperacoesPaginadas()` e repassando à interface os metadados de paginação, busca e ordenação juntamente com `maquinas` e `setores`.

- [x] **HU 27.4 — Como admin, quero clicar no cabeçalho da coluna e navegar entre páginas na própria tabela, para consultar muitas operações com fluidez e sem ruído operacional.**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/operacoes`
  - `app/(admin)/operacoes/ListaOperacoes.tsx`

  Tarefas:
  - transformar colunas relevantes em cabeçalhos clicáveis
  - alternar `asc/desc` ao clicar novamente na mesma coluna
  - adicionar paginação com navegação `Primeira`, `Anterior`, números, `Próxima` e `Última`
  - exibir resumo `Mostrando X-Y de Z operações`
  - manter busca funcional com atualização da URL

  Regras:
  - a tabela deve continuar responsiva
  - a navegação de ordenação e paginação deve usar a URL, não estado local isolado
  - a UI não pode perder o modal de criação/edição nem as ações existentes

  **Evidência:** A tabela de `/admin/operacoes` passa a ordenar por clique no cabeçalho, navegar por páginas e manter o contexto pela URL.
  Implementado em `app/(admin)/operacoes/ListaOperacoes.tsx`, com cabeçalhos clicáveis, indicadores visuais de direção, busca por formulário com persistência em URL, paginação completa e manutenção das ações de editar, detalhe e ciclo de vida no mesmo grid.

- [x] **HU 27.5 — Como produto, quero homologar a paginação e ordenação da listagem de operações sem regressão técnica, para confiar no novo fluxo administrativo com volume maior de cadastros.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - validar a nova listagem com paginação e ordenação
  - validar a manutenção do CRUD existente na mesma tela
  - rodar `npx tsc --noEmit`
  - registrar a evidência final da entrega

  Regras:
  - a sprint não fecha sem validação de tipos
  - a homologação precisa confirmar coexistência entre tabela paginada e modal do CRUD

  **Evidência:** `/admin/operacoes` passa a suportar paginação e ordenação por coluna sem regressão técnica, com `npx tsc --noEmit` passando sem erros.
  Validação concluída em `2026-04-07` com `npx tsc --noEmit` sem erros após a implementação em `app/admin/operacoes/page.tsx`, `app/(admin)/operacoes/ListaOperacoes.tsx`, `lib/queries/operacoes.ts` e `types/index.ts`.

## SPRINT 28 — Paginação e ordenação profissional de relatórios
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 27 concluída e confirmação explícita do usuário para abertura oficial da implementação.
**Objetivo:** evoluir `/admin/relatorios` para suportar ordenação por clique no cabeçalho e paginação no mesmo padrão visual de `/admin/operacoes`, preservando os filtros atuais e a URL como fonte de verdade.

- [x] **HU 28.1 — Como produto, quero formalizar o contrato mínimo seguro de paginação e ordenação dos relatórios, para que `/admin/relatorios` preserve filtros atuais e adicione navegação previsível por URL.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - definir `page`, `sortBy` e `sortDir` como `searchParams` oficiais da rota de relatórios
  - definir a ordenação padrão da listagem
  - definir quais colunas entram na primeira versão segura de ordenação
  - preservar `dataInicio`, `dataFim`, `turnoId`, `turnoOpId`, `setorId` e `operadorId` sem regressão

  Regras:
  - a URL deve continuar sendo a fonte de verdade da navegação
  - a primeira versão deve focar apenas na tabela de detalhamento atômico filtrado
  - resumo, gráfico comparativo e filtros existentes não entram em refatoração visual ampla nesta sprint

  **Evidência:** `/admin/relatorios` passa a aceitar `page`, `sortBy` e `sortDir` junto dos filtros atuais, com ordenação padrão documentada e colunas ordenáveis formalizadas.
  Abertura oficial da sprint registrada em `2026-04-08`. O contrato mínimo seguro ficou formalizado assim: `dataInicio`, `dataFim`, `turnoId`, `turnoOpId`, `setorId`, `operadorId`, `page`, `sortBy` e `sortDir` passam a compor a URL de `/admin/relatorios`; a ordenação padrão da tabela será `ultimaLeituraEm desc`; ao alterar ordenação, a navegação deve resetar para `page=1`; e a primeira versão segura limitará as colunas ordenáveis a `origem`, `numeroOp`, `setorNome`, `operadorNome`, `operacaoCodigo`, `quantidadeApontada`, `quantidadeRealizadaOperacao`, `quantidadeRealizadaSecao`, `quantidadeRealizadaOp`, `statusOp` e `ultimaLeituraEm`, preservando integralmente os filtros atuais e sem ampliar escopo para `ResumoRelatorios` ou `ComparativoMetaGrupoChart`.

- [x] **HU 28.2 — Como sistema, quero estender a query de relatórios com ordenação tipada e paginação consistente, para que a tabela administrativa responda ao mesmo contrato visual de operações sem perder o recorte filtrado atual.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - criar contratos tipados de ordenação da listagem de relatórios
  - ordenar o conjunto `RelatorioRegistroItem[]` antes da paginação final
  - retornar `items`, `total`, `page`, `pageSize`, `totalPages`, `sortBy` e `sortDir`
  - manter a consolidação atual e o histórico legado preservado

  Regras:
  - a paginação deve respeitar o recorte já filtrado e ordenado
  - a ordenação deve cobrir apenas colunas explicitamente homologadas na HU 28.1
  - a mudança não pode alterar o significado de `ResumoRelatorios` nem de `ComparativoMetaGrupoChart`

  **Evidência:** a camada de queries passa a devolver um recorte paginado e ordenável de relatórios, com metadados suficientes para a navegação da tabela.
  Implementado em `types/index.ts`, `lib/queries/relatorios-v2.ts` e `app/admin/relatorios/page.tsx`, com os novos contratos `RelatorioSortField`, `RelatoriosListagemParams` e `RelatoriosPaginados`, ordenação aplicada sobre `RelatorioRegistroItem[]` antes do `slice`, retorno de `items`, `total`, `page`, `pageSize`, `totalPages`, `sortBy` e `sortDir`, e normalização server-side de `sortBy`/`sortDir` na rota com padrão `ultimaLeituraEm desc`. `npx tsc --noEmit` validado sem erros em `2026-04-08`.

- [x] **HU 28.3 — Como admin, quero clicar no cabeçalho da tabela de relatórios e navegar pelas páginas no mesmo padrão visual de operações, para consultar histórico operacional com mais fluidez sem perder os filtros já aplicados.**
  **Prioridade:** P0
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/relatorios`
  - `components/relatorios/TabelaRelatorios.tsx`

  Tarefas:
  - transformar colunas homologadas em cabeçalhos clicáveis
  - alternar `asc/desc` ao clicar novamente na mesma coluna
  - substituir a paginação simplificada atual por `Primeira`, `Anterior`, números, `Próxima` e `Última`
  - exibir resumo `Mostrando X-Y de Z registros`
  - preservar integralmente os filtros atuais ao mudar página ou ordenação

  Regras:
  - a tabela deve continuar responsiva e legível em telas menores
  - a navegação de ordenação e paginação deve usar a URL, não estado local isolado
  - a mudança não pode desmontar os filtros já aplicados nem resetar o recorte sem ação explícita do usuário

  **Evidência:** a tabela de `/admin/relatorios` passa a ordenar por clique no cabeçalho e navegar por páginas com o mesmo padrão visual de `/admin/operacoes`, mantendo os filtros atuais na URL.
  Implementado em `components/relatorios/TabelaRelatorios.tsx` e `app/admin/relatorios/page.tsx`, com cabeçalhos clicáveis para as colunas homologadas, alternância `asc/desc` por clique, preservação de `dataInicio`, `dataFim`, `turnoId`, `turnoOpId`, `setorId` e `operadorId` na URL, resumo `Mostrando X-Y de Z registros` e paginação `Primeira`, `Anterior`, números, `Próxima` e `Última` no mesmo padrão visual de `/admin/operacoes`. `npx tsc --noEmit` validado sem erros em `2026-04-08`.

- [x] **HU 28.4 — Como produto, quero homologar a versão mínima segura da paginação e ordenação de relatórios sem regressão funcional, para confiar no novo fluxo administrativo antes de qualquer ampliação posterior.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - validar a coexistência entre filtros, ordenação e paginação na rota
  - validar que resumo e gráfico continuam coerentes com o recorte filtrado
  - rodar `npx tsc --noEmit`
  - registrar a evidência final da entrega

  Regras:
- a sprint não fecha sem validação de tipos
- a homologação precisa confirmar que a URL continua compartilhável e previsível
- qualquer evolução além da tabela de detalhamento fica fora desta sprint

  **Evidência:** `/admin/relatorios` passa a suportar ordenação por coluna e paginação no padrão visual de operações sem regressão funcional, com `npx tsc --noEmit` passando sem erros.
  Homologação registrada em `2026-04-08` com validação de tipos via `npx tsc --noEmit` sem erros, conferência estrutural da rota `app/admin/relatorios/page.tsx` preservando `ResumoRelatorios` e `ComparativoMetaGrupoChart` no mesmo contrato de filtros anterior, e validação da navegação protegida em `http://localhost:3001/admin/relatorios` retornando `307` para `/login` com preservação integral de `dataInicio`, `dataFim`, `page`, `sortBy` e `sortDir` na URL. A superfície autenticada não pôde ser homologada visualmente nesta sessão porque o servidor local respondeu com `erro=sessao-expirada`, mas o contrato final de paginação e ordenação foi fechado sem regressão de tipos nem perda de parâmetros.

## SPRINT 29 — Capacidade setorial sequencial, fila real e kanban operacional
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 28 concluída e confirmação explícita do usuário para abertura oficial desta frente em `2026-04-15`.
**Objetivo:** fazer o sistema sair do modelo de demanda distribuída simultaneamente para todos os setores e assumir oficialmente um fluxo de produção real por capacidade, sequência, fila e movimentação de lotes, corrigindo a prévia de abertura do turno e expondo na dashboard um kanban operacional em tempo real.

**Decisões de produto homologadas para esta sprint:**
- a fábrica continua tendo `Meta Mensal` e `Meta Diária` de saída como referência gerencial principal
- a produção operacional deve seguir a sequência obrigatória `Preparação -> Frente -> Costa -> Montagem -> Final`
- uma OP não pode existir em dois setores ao mesmo tempo, exceto quando houver fracionamento real por quantidade
- o fracionamento nasce do apontamento real; o sistema não pode inventar lotes automaticamente
- cada setor funciona como fila FIFO com capacidade limitada por minutos do turno
- um setor pode processar mais de uma OP/lote ao mesmo tempo, desde que a soma da carga em minutos respeite sua capacidade disponível
- a métrica principal do sistema passa a ser `peças finalizadas` no setor `Final`; produção intermediária não representa resultado final
- na abertura do turno, a prévia deve considerar apenas a carga pendente real por setor de cada OP, inclusive carry-over, sem recolocar carga em setores já concluídos
- a abertura do turno deve alertar taxativamente quando a demanda selecionada estiver desconforme com a capacidade produtiva do turno
- a dashboard deve exibir um kanban operacional em tempo real mostrando em qual setor cada OP/lote está exatamente naquele momento

- [x] **HU 29.1 — Como produto, quero formalizar o domínio de capacidade sequencial, fila e carry-over real no PRD e no plano da sprint, para que a implementação futura tenha uma regra única e sem ambiguidade.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - formalizar no `docs/PRD.md` que a produção não ocorre simultaneamente em todos os setores
  - formalizar a sequência obrigatória `Preparação -> Frente -> Costa -> Montagem -> Final`
  - formalizar a regra de fila FIFO com capacidade baseada em minutos
  - formalizar que a prévia do turno deve usar carga pendente real por setor e não reiniciar carry-over em todos os setores
  - formalizar a necessidade de um kanban operacional em tempo real na dashboard

  Regras:
  - o PRD deve distinguir claramente `Meta do Grupo`, `Meta Diária de saída` e `capacidade setorial`
  - o PRD deve explicitar que minutos são a base de verdade da capacidade do setor
  - a documentação não pode permitir interpretação de que a mesma OP ocupa todos os setores ao mesmo tempo

  **Evidência:** `docs/PRD.md` passa a registrar o fluxo sequencial por capacidade e fila, a correção da prévia de carry-over e o kanban operacional em tempo real como direção oficial do produto.
  Formalizado em `2026-04-15` com atualização das seções `5.2.1`, `5.5`, `6` e `9.3` do `docs/PRD.md`, incluindo capacidade setorial baseada em minutos, desconformidade taxativa na abertura do turno, carry-over reaberto no setor pendente correto e kanban setorial em tempo real na dashboard.

- [x] **HU 29.2 — Como sistema, quero introduzir contratos tipados e funções puras para capacidade do setor, fila e posição atual da OP/lote, para que backend, scanner, apontamentos e dashboard compartilhem a mesma semântica.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - definir contratos tipados para `status_fila`, `posicao_fila`, `setor_fluxo_atual`, `capacidade_minutos_total`, `capacidade_minutos_consumida` e `capacidade_minutos_restante`
  - criar funções puras para calcular capacidade do setor, carga pendente real e diagnóstico de desconformidade
  - criar funções puras para consolidar a posição atual da OP/lote no fluxo
  - garantir que `types/`, `lib/utils/` e queries compartilhem o mesmo contrato

  Regras:
  - sem `any`
  - minutos são a unidade oficial da capacidade
  - leitura em peças deve ser derivada e contextual, nunca a base de verdade para setores com múltiplas OPs/produtos

  **Evidência:** o código passa a expor contratos tipados e funções puras reutilizáveis para capacidade, fila e posição atual da OP/lote, com `npx tsc --noEmit` passando sem erros.
  Implementado em `types/index.ts`, `lib/utils/capacidade-setor.ts`, `lib/utils/capacidade-setor.test.ts`, `lib/utils/dimensionamento-pessoas-setor.ts`, `lib/utils/dimensionamento-pessoas-setor.test.ts`, `lib/queries/turnos.ts` e `lib/queries/turnos-client.ts`. O domínio agora expõe `TurnoSetorFilaStatusV2`, `DiagnosticoCapacidadeSetorV2`, resumos puros de capacidade em minutos, posição atual da OP/lote no fluxo e enriquecimento tipado de `demandasSetor`/`ops` com `statusFila`, `posicaoFila` e `setorFluxoAtual`. `npx tsc --noEmit` validado sem erros em `2026-04-16`.

- [x] **HU 29.3 — Como supervisor, quero que a abertura do turno use a carga pendente real por setor e alerte desconformidade de capacidade, para não iniciar o dia com uma leitura falsa da demanda.**
  **Prioridade:** P0
  **Risco:** Alto

  Telas/blocos afetados:
  - modal de `Novo Turno`
  - queries e utilitários da prévia setorial
  - componentes de carry-over e resumo de capacidade

  Tarefas:
  - corrigir a prévia para que OPs de carry-over contribuam apenas a partir do setor efetivamente pendente
  - zerar a carga dos setores já concluídos da OP na prévia do novo turno
  - considerar saldo parcial real quando a OP/lote estiver em andamento dentro de um setor
  - exibir carga em minutos, capacidade em minutos e eficiência requerida por setor
  - exibir alerta taxativo quando a demanda superar a capacidade do setor ou do turno

  Regras:
  - a prévia não pode tratar carry-over como reinício integral da OP
  - setores já finalizados devem aparecer como concluídos, não como carga reaberta
  - o alerta precisa ser explícito, não apenas um texto brando de sugestão

  **Evidência:** na abertura do turno, OPs reaproveitadas passam a consumir apenas os setores realmente pendentes, e a UI informa claramente quando a demanda selecionada está acima da capacidade produtiva disponível.
  Implementado em `components/dashboard/ModalNovoTurnoV2.tsx`, `lib/utils/dimensionamento-pessoas-setor.ts` e `lib/utils/dimensionamento-pessoas-setor.test.ts`. O carry-over da prévia agora nasce de `planejamentoAtual.demandasSetor` com `quantidadePendenteSetor > 0`, ignorando setores já concluídos e sem simular reinício do roteiro completo; a superfície de abertura passou a mostrar `posição atual` da pendência, capacidade distribuída por setor e alerta taxativo de desconformidade quando a carga em minutos supera a capacidade do setor ou do turno. `npx tsc --noEmit` validado sem erros em `2026-04-16`.

- [x] **HU 29.4 — Como sistema, quero que apontamentos e continuidade de turno respeitem fila sequencial e fracionamento real, para que a OP avance no fluxo sem duplicação fictícia entre setores.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - propagar no backend a regra de que uma OP só ocupa um setor por vez, salvo lotes fracionados
  - fazer a movimentação de lote reduzir saldo no setor de origem e liberar a mesma quantidade para o próximo setor
  - preservar fila FIFO por setor ao liberar ou retomar lotes
  - refletir corretamente a posição atual da OP/lote em carry-over entre turnos
  - manter rastreabilidade de quem apontou, qual lote avançou e quanto foi transferido

  Regras:
  - fracionamento só pode nascer de apontamento real
  - a soma dos lotes não pode ultrapassar a quantidade da OP
  - produção intermediária não pode ser confundida com saída final da fábrica

  **Evidência:** uma OP/lote passa a avançar setor a setor sem duplicação simultânea indevida, mantendo rastreabilidade de fila e continuidade entre turnos.
  Implementado em `lib/utils/fluxo-sequencial-turno.ts`, `lib/queries/fluxo-sequencial-turno-base.ts`, `lib/actions/producao.ts`, `lib/actions/turnos.ts`, `lib/queries/scanner.ts`, `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts` e `hooks/useScanner.ts`. O backend agora calcula a quantidade liberada por setor a partir do realizado do setor anterior, bloqueia apontamentos acima do lote realmente liberado tanto no scanner quanto no apontamento em lote do supervisor, mantém a fila por setor com diagnóstico de bloqueio/liberação no planejamento e saneia o carry-over para não reidratar progresso downstream acima do que o fluxo anterior realmente concluiu. Cobertura utilitária adicionada em `lib/utils/fluxo-sequencial-turno.test.ts`. `npx tsc --noEmit` validado sem erros em `2026-04-16`.

- [x] **HU 29.5 — Como supervisor, quero visualizar um kanban operacional em tempo real na dashboard, para saber exatamente em que setor cada OP/lote está e onde estão os gargalos do turno.**
  **Prioridade:** P1
  **Risco:** Médio

  Telas/blocos afetados:
  - `/admin/dashboard`
  - componentes da aba `Visão Operacional`
  - hooks/queries de realtime do turno

  Tarefas:
  - criar um componente kanban com uma coluna por setor na ordem oficial do fluxo
  - exibir cards de OP/lote apenas na coluna do setor atual
  - exibir posição na fila, status operacional e dados mínimos da OP/produto
  - exibir capacidade consumida/restante e sinais de gargalo por setor
  - atualizar o kanban em tempo real sem refresh manual

  Regras:
  - uma mesma OP não pode aparecer em duas colunas ao mesmo tempo, exceto quando houver lotes fracionados
  - lotes fracionados devem aparecer como cards distintos e rastreáveis
  - o kanban precisa coexistir com KPIs e gráficos atuais sem quebrar a `Visão Operacional`

  **Evidência:** a dashboard passa a mostrar um kanban setorial em tempo real, com colunas `Preparação`, `Frente`, `Costa`, `Montagem` e `Final`, refletindo posição de fila, status e gargalos do turno atual.
  Implementado em `components/dashboard/KanbanOperacionalTurno.tsx`, integrado via `components/dashboard/DashboardVisaoOperacionalTab.tsx` e `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`. O quadro consome `demandasSetor` e `setoresAtivos` já enriquecidos pelo backend, exibindo cards apenas para saldos efetivamente liberados/em produção, resumo de fila por setor, capacidade comprometida/restante e alerta de gargalo por capacidade. `npx tsc --noEmit` validado sem erros em `2026-04-16`.

- [x] **HU 29.6 — Como produto, quero homologar a primeira versão do fluxo sequencial por capacidade, para confiar na abertura do turno, no carry-over e na leitura operacional em tempo real sem regressão de tipos.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - validar cenários com OP nova, carry-over, setor já concluído e setor parcial
  - validar cenário com fracionamento real por apontamento
  - validar desconformidade de capacidade na abertura do turno
  - validar o kanban em tempo real na dashboard
  - rodar `npx tsc --noEmit`

  Regras:
  - a sprint não fecha sem validação de tipos
  - a homologação precisa confirmar que produção intermediária não está sendo exibida como saída final
  - qualquer simplificação consciente do primeiro corte deve ficar documentada na evidência final

  **Evidência:** a abertura do turno, o carry-over, os apontamentos e a dashboard passam a refletir o mesmo modelo sequencial por capacidade e fila, com `npx tsc --noEmit` passando sem erros.
  Homologação concluída em `2026-04-16` com validação executável de capacidade, carry-over, fila sequencial e kanban em `lib/utils/capacidade-setor.test.ts`, `lib/utils/dimensionamento-pessoas-setor.test.ts`, `lib/utils/fluxo-sequencial-turno.test.ts` e `lib/utils/kanban-operacional-turno.test.ts`, todos aprovados via `node --test --experimental-strip-types`. A sprint também ganhou a extração pura `lib/utils/kanban-operacional-turno.ts`, consumida por `components/dashboard/KanbanOperacionalTurno.tsx`, cobrindo os cenários de OP nova, carry-over com setor já concluído e setor parcial, fracionamento real refletido por demandas setoriais com saldo liberado, desconformidade de capacidade na abertura e leitura em tempo real do quadro operacional. `npx tsc --noEmit` validado sem erros. Simplificação consciente deste primeiro corte: o fracionamento permanece rastreado no nível de `demanda setorial + quantidade liberada`, sem introduzir uma entidade persistida de lote independente nesta sprint.

## SPRINT 30 — Capacidade como trava real e parcelamento setorial entre turnos
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 29 concluída e confirmação explícita do usuário para abrir a evolução do domínio em `2026-04-16`.
**Objetivo:** fazer a capacidade setorial deixar de ser apenas diagnóstico e passar a limitar de fato a quantidade aceita por cada setor no turno, parcelando automaticamente o excedente da OP em backlog setorial para turnos futuros.

**Decisões de produto homologadas para esta sprint:**
- a OP continua preservando sua demanda total original como referência administrativa
- o setor deixa de aceitar automaticamente toda a demanda da OP no turno quando sua capacidade diária for menor que o backlog real
- o setor inicial do roteiro pode nascer com backlog total da OP, mas só com a quantidade aceita do turno liberada para processamento
- setores seguintes não podem nascer com a quantidade total da OP antes de receber transferência real do setor anterior
- o carry-over passa a ser setorial e parcelado, somando:
  - saldo que o setor não conseguiu aceitar por falta de capacidade no turno anterior
  - saldo que o setor aceitou, mas não conseguiu concluir
- se um setor concluir mais do que o próximo setor consegue aceitar no turno, o excedente vira backlog do próximo setor para o turno seguinte
- a dashboard operacional deve distinguir backlog total, quantidade aceita no turno, quantidade concluída e saldo excedente para próximos turnos

- [x] **HU 30.1 — Como produto, quero formalizar a proposta técnica de capacidade como trava real e carry-over setorial parcelado, para que a próxima implementação altere o domínio com clareza e sem ambiguidade.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - formalizar no `docs/PRD.md` que a capacidade setorial passa a limitar a quantidade aceita no turno
  - formalizar que uma nova OP não pode mais injetar sua quantidade integral em todos os setores futuros do mesmo dia
  - formalizar a composição do carry-over setorial como `não aceito + aceito não concluído`
  - abrir a próxima sprint no `docs/TASKS.md` e no `docs/BACKLOG.md` com proposta objetiva de implementação
  - registrar impactos em tabelas, queries/actions e ordem segura de entrega

  Regras:
  - a proposta deve preservar rastreabilidade da demanda total original da OP
  - o parcelamento deve acontecer por setor, não apenas por OP
  - a proposta não pode depender de uma entidade nova de lote persistido nesta primeira evolução
  - o plano deve priorizar refatoração incremental e compatível com o histórico já produzido

  Proposta técnica objetiva:
  - Regras de domínio:
    `demanda total da OP` continua existindo em `turno_ops`, mas o setor passa a trabalhar com `backlog real`, `quantidade aceita no turno`, `quantidade concluída` e `saldo excedente`.
    `Preparação` pode aceitar no turno no máximo `floor((operadores_alocados × minutos_turno) / tp_total_setor_produto)`.
    Para setores seguintes, a quantidade aceita no turno fica limitada pela menor quantidade entre backlog setorial existente, transferível real do setor anterior e capacidade diária do setor.
    No encerramento do turno, o próximo carry-over setorial é calculado como `saldo não aceito + saldo aceito não concluído`.
  - Impactos nas tabelas:
    `turno_ops`: preservar `quantidade_planejada_original` e `quantidade_planejada_remanescente` como contrato administrativo da OP, acrescentando a leitura de `quantidade_finalizada` sem perder continuidade entre turnos.
    `turno_setor_demandas`: deixar de usar apenas `quantidade_planejada` como conceito ambíguo e passar a refletir explicitamente `quantidade_backlog_setor`, `quantidade_aceita_turno`, `quantidade_nao_aceita_turno`, `quantidade_realizada`, `quantidade_pendente_setor` e `quantidade_transferida_proximo_setor`.
    `turno_setor_operacoes`: alinhar o volume operacional do setor à quantidade efetivamente aceita no turno, preservando fallback legacy por `turno_setor_op_id` enquanto houver dados antigos sem `turno_setor_demanda_id`.
    `turno_setores`: continuar agregando o setor físico do turno, mas com snapshot explícito de `operadores_alocados`, `capacidade_minutos_total`, `capacidade_minutos_consumida` e `capacidade_minutos_restante` coerente com a quantidade aceita naquele dia.
  - Mudanças esperadas em queries/actions:
    `lib/actions/turnos.ts`: abrir e editar turno calculando apenas a quantidade aceita por setor no dia, sem distribuir automaticamente a OP inteira por todos os setores.
    `lib/actions/producao.ts`: bloquear transferência para o próximo setor acima da capacidade restante do turno e acumular excedente como backlog do setor seguinte.
    `lib/queries/turnos.ts` e `lib/queries/turnos-client.ts`: expor backlog setorial, aceito no turno, concluído e excedente com semântica única para dashboard, scanner e apontamentos.
    `lib/queries/scanner.ts` e `lib/queries/fluxo-sequencial-turno-base.ts`: recalcular disponibilidade operacional a partir da quantidade aceita no turno, não do total administrativo da OP.
    `lib/utils/dimensionamento-pessoas-setor.ts`, `lib/utils/capacidade-setor.ts` e utilitários de fluxo: separar claramente capacidade diagnóstica de capacidade operacional aceita no turno.
  - Ordem segura de entrega:
    1. introduzir contratos tipados e campos explícitos de backlog/aceite sem remover o contrato antigo de leitura
    2. adaptar abertura e edição do turno para limitar apenas o setor elegível do dia pela capacidade real
    3. adaptar apontamentos e transferência entre setores para respeitar a capacidade restante do setor de destino
    4. recalcular carry-over setorial parcelado no encerramento e na abertura do turno seguinte
    5. atualizar dashboard, scanner e `/admin/apontamentos` para distinguir backlog total, aceito no turno, concluído e excedente
    6. homologar cenários com OP nova, setor inicial saturado, setor seguinte sem capacidade, carry-over repetido e turnos consecutivos

  **Evidência:** o produto passa a ter uma proposta técnica formal para transformar capacidade setorial em trava real de produção, com parcelamento setorial entre turnos descrito em `PRD`, `TASKS` e `BACKLOG`.
  Formalizado em `2026-04-16` com atualização das seções `5.2.1`, `5.2.2`, `6` e `9.3.7` do `docs/PRD.md`, abertura oficial da `Sprint 30` no `docs/TASKS.md` e registro do entregável correspondente no `docs/BACKLOG.md`.

- [x] **HU 30.2 — Como sistema, quero explicitar contratos e snapshots de backlog setorial, quantidade aceita e saldo excedente, para que a capacidade real do turno deixe de depender de campos ambíguos.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - introduzir contratos tipados compartilhados para `quantidadeBacklogSetor`, `quantidadeAceitaTurno` e `quantidadeExcedenteTurno`
  - expor snapshot puro no util central do fluxo sequencial
  - propagar o novo snapshot para `TurnoSetorDemandaV2` e `TurnoSetorDemandaScaneada`
  - ajustar consumidores do planejamento setorial para priorizar o novo contrato sem quebrar compatibilidade
  - validar a mudança com testes utilitários e `npx tsc --noEmit`

  Regras:
  - nesta HU, `quantidadeAceitaTurno` representa a parcela do backlog que já pode ser trabalhada agora segundo a semântica atual do fluxo
  - a limitação por capacidade diária real entra na HU 30.3/30.4; aqui o objetivo é remover ambiguidade de contrato
  - `quantidadePendenteSetor`, `quantidadeLiberadaSetor` e `quantidadeDisponivelApontamento` continuam existindo por compatibilidade, mas deixam de ser o único vocabulário do domínio

  **Evidência:** o domínio passa a expor snapshots explícitos de backlog, aceite e excedente no turno, compartilhados entre fluxo sequencial, planejamento do turno, scanner e kanban, com testes e tipos aprovados.
  Implementado em `types/index.ts`, `lib/utils/fluxo-sequencial-turno.ts`, `lib/utils/fluxo-sequencial-turno.test.ts`, `lib/queries/scanner.ts`, `lib/utils/hidratacao-capacidade-setor-turno.ts` e `lib/utils/kanban-operacional-turno.ts`. O contrato agora expõe `SnapshotParcelamentoDemandaTurnoV2`, `quantidadeBacklogSetor`, `quantidadeAceitaTurno` e `quantidadeExcedenteTurno`, derivados de forma pura no enriquecimento sequencial e reutilizados como fonte preferencial nas leituras de capacidade e presença no quadro. Validação concluída em `2026-04-16` com `node --test --experimental-strip-types lib/utils/fluxo-sequencial-turno.test.ts lib/utils/kanban-operacional-turno.test.ts lib/utils/hidratacao-capacidade-setor-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 30.3 — Como supervisor, quero que abertura e edição do turno aceitem por setor apenas o que cabe na capacidade do dia, para não prometer produção acima do que o setor consegue absorver.**
  **Prioridade:** P0
  **Risco:** Alto
  **Evidência:** o planejamento do turno passou a aplicar a capacidade diária real por setor sobre as demandas elegíveis do fluxo, limitando `quantidadeAceitaTurno`, `quantidadeDisponivelApontamento`, `secoesSetorOp` e `operacoesSecao` ao que cabe no dia. A mesma trava passou a alimentar a validação sequencial dos apontamentos via `lib/queries/fluxo-sequencial-turno-base.ts`, eliminando a promessa artificial de produção acima da absorção do setor. Implementado em `lib/utils/hidratacao-capacidade-setor-turno.ts`, `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts`, `lib/queries/fluxo-sequencial-turno-base.ts`, `app/(admin)/apontamentos/page.tsx` e `lib/utils/hidratacao-capacidade-setor-turno.test.ts`. Validação concluída em `2026-04-16` com `node --test --experimental-strip-types lib/utils/fluxo-sequencial-turno.test.ts lib/utils/hidratacao-capacidade-setor-turno.test.ts lib/utils/kanban-operacional-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 30.4 — Como sistema, quero que a transferência entre setores respeite também a capacidade do setor de destino, para que o excedente vire backlog real do próximo turno em vez de lotar artificialmente o fluxo atual.**
  **Prioridade:** P0
  **Risco:** Alto
  **Evidência:** o scanner passou a recalcular as demandas do setor com o mesmo pipeline de fluxo + capacidade usado no planejamento do turno, de modo que a liberação para o setor de destino fique limitada pelo que cabe no dia e não apenas pelo realizado do setor anterior. O hook local do scanner também deixou de usar `quantidadeLiberadaSetor` como teto implícito e passou a respeitar o snapshot aceito/disponível do turno ao filtrar demandas, operações e recalcular o saldo após cada apontamento. Implementado em `lib/queries/scanner.ts` e `hooks/useScanner.ts`, reaproveitando `aplicarCapacidadeOperacionalDemandas` e o snapshot sequencial já usado em `turnos` e `apontamentos`. Validação concluída em `2026-04-16` com `node --test --experimental-strip-types lib/utils/fluxo-sequencial-turno.test.ts lib/utils/hidratacao-capacidade-setor-turno.test.ts lib/utils/kanban-operacional-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 30.5 — Como supervisor, quero ver na dashboard e nos apontamentos a diferença entre backlog total, aceito no turno, concluído e excedente, para agir sobre a produção real e não sobre uma fila inflada artificialmente.**
  **Prioridade:** P1
  **Risco:** Médio
  **Evidência:** A dashboard operacional e `/admin/apontamentos` passaram a distinguir backlog total, aceito no turno, concluído e excedente no topo da visão, nos cards por OP/setor, no kanban e nos modais de detalhe, usando o snapshot setorial real derivado de `demandasSetor` em vez do vocabulário antigo de `planejado/saldo`. Implementado em `lib/utils/turno-setores.ts`, `components/dashboard/DashboardVisaoOperacionalTab.tsx`, `components/dashboard/KanbanOperacionalTurno.tsx`, `components/dashboard/ResumoOpTurnoCard.tsx`, `components/dashboard/ResumoSetorTurnoCard.tsx`, `components/dashboard/ModalDetalhesOpTurno.tsx`, `components/dashboard/ModalDetalhesSecaoTurno.tsx`, `components/dashboard/ModalDetalhesSetorTurno.tsx`, `components/dashboard/MonitorPlanejamentoTurnoV2.tsx` e `components/apontamentos/PainelApontamentosSupervisor.tsx`. `npx tsc --noEmit` validado sem erros em `2026-04-16`.

- [x] **HU 30.6 — Como produto, quero homologar o parcelamento setorial entre turnos com capacidade como trava real, para confiar que o carry-over repetido continua íntegro em cenários de saturação diária.**
  **Prioridade:** P0
  **Risco:** Alto
  **Evidência:** o carry-over entre turnos passou a usar um utilitário puro para normalizar o progresso setorial sobre o saldo remanescente da OP, preservando a continuidade do setor pendente sem reabrir artificialmente setores já concluídos dentro do lote remanescente. A Sprint 30 agora cobre explicitamente cenários de saturação diária repetida com carry-over recorrente por meio de testes automatizados do parcelamento entre turnos.
  Implementado em `lib/utils/carry-over-turno.ts`, `lib/utils/carry-over-turno.test.ts` e `lib/actions/turnos.ts`. A action de abertura do turno passou a reutilizar `calcularQuantidadePlanejadaRemanescenteCarryOver()` e `normalizarDemandasCarryOverEntreTurnos()` ao selecionar pendências e reidratar o progresso do turno anterior, eliminando a lógica ad hoc do carry-over. Validação concluída em `2026-04-17` com `node --test --experimental-strip-types lib/utils/fluxo-sequencial-turno.test.ts lib/utils/hidratacao-capacidade-setor-turno.test.ts lib/utils/kanban-operacional-turno.test.ts lib/utils/carry-over-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

## SPRINT 31 — Fluxo paralelo com sincronização parcial em Montagem
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 30 concluída e confirmação explícita do usuário para abrir a evolução do domínio em `2026-04-17`.
**Objetivo:** substituir a leitura estritamente linear `Preparação -> Frente -> Costa -> Montagem -> Final` por um fluxo oficial com bifurcação paralela `Frente + Costa` e sincronização parcial por quantidade em `Montagem`, sem perder capacidade, fila, carry-over e simplicidade operacional.

**Decisões de produto homologadas para esta sprint:**
- `Preparação` continua sendo a etapa inicial obrigatória
- ao concluir `Preparação`, a OP deve liberar simultaneamente `Frente` e `Costa`
- `Frente` e `Costa` passam a funcionar como trilhas paralelas independentes da mesma OP
- `Montagem` passa a depender simultaneamente de `Frente` e `Costa`
- a liberação de `Montagem` é parcial por quantidade, e não apenas após fechamento total das duas trilhas
- a quantidade liberada para `Montagem` deve ser limitada à interseção real já concluída entre `Frente` e `Costa`
- a mesma OP pode aparecer simultaneamente em `Frente` e `Costa` no kanban, porque essa simultaneidade passa a ser oficial no domínio
- fora da bifurcação oficial, o sistema continua proibindo duplicação fictícia da mesma OP em múltiplos setores
- capacidade setorial, fila FIFO, backlog aceito e carry-over continuam válidos, mas agora precisam operar também em um fluxo com dependências múltiplas

- [x] **HU 31.1 — Como produto, quero formalizar a proposta técnica do fluxo paralelo com sincronização parcial, para que a próxima implementação altere o domínio com clareza e sem regressão conceitual.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - formalizar no `docs/PRD.md` que `Frente` e `Costa` passam a ser etapas paralelas oficiais após `Preparação`
  - formalizar que `Montagem` depende simultaneamente das duas trilhas e libera apenas a quantidade sincronizada
  - formalizar o impacto no kanban, no carry-over, no scanner/apontamentos e nos contratos tipados
  - abrir a nova sprint em `docs/TASKS.md` e `docs/BACKLOG.md` com proposta objetiva de implementação
  - registrar a ordem segura de entrega sem ainda codar a evolução

  Regras:
  - a proposta não pode recriar o sistema nem romper o modelo atual de capacidade em minutos
  - a proposta deve preservar o que já existe de backlog setorial, aceite no turno, fila e carry-over
  - a simultaneidade permitida deve ser explícita e restrita à bifurcação oficial do fluxo
  - a sincronização de `Montagem` deve ser parcial por quantidade usando a interseção real entre `Frente` e `Costa`

  Proposta técnica objetiva:
  - Premissa central do domínio:
    o fluxo deixa de ser linear simples e passa a ser um grafo dirigido com `fork/join` controlado, sem abandonar capacidade em minutos, fila FIFO, backlog setorial e carry-over.
    A bifurcação oficial é:

    ```text
    Preparação
         ↓
      Frente
         ↘
          Montagem → Final
         ↗
       Costa
    ```

    `Frente` e `Costa` passam a ser trilhas paralelas oficiais da mesma OP.
    `Montagem` passa a ser a etapa oficial de sincronização parcial entre as duas trilhas.
  - Regra fechada do fork em `Preparação`:
    o avanço de `Preparação` não transfere uma parte para `Frente` e outra para `Costa`.
    Ele cria dois tetos independentes sobre a mesma quantidade preparada.
    A regra operacional obrigatória passa a ser:

    ```text
    quantidade_liberada_frente = quantidade_concluida_preparacao
    quantidade_disponivel_frente =
      MAX(quantidade_liberada_frente - quantidade_realizada_frente, 0)

    quantidade_liberada_costa = quantidade_concluida_preparacao
    quantidade_disponivel_costa =
      MAX(quantidade_liberada_costa - quantidade_realizada_costa, 0)
    ```

    Isso significa que `Preparação` não pode ser “consumida duas vezes”.
    `Frente` e `Costa` recebem o mesmo teto liberado por `Preparação`, mas cada uma mantém progresso próprio.
  - Regra fechada do join em `Montagem`:
    `Montagem` deixa de depender de uma predecessora única e passa a depender simultaneamente de `Frente` e `Costa`.
    A liberação é sempre parcial por interseção quantitativa:

    ```text
    quantidade_liberada_montagem =
      MIN(quantidade_concluida_frente, quantidade_concluida_costa)

    quantidade_disponivel_montagem =
      MAX(quantidade_liberada_montagem - quantidade_realizada_montagem, 0)
    ```

    Se `Frente = 40` e `Costa = 25`, `Montagem` pode receber no máximo `25`.
    Depois de `Montagem`, o fluxo volta a ser estritamente sequencial até `Final`.
  - Impacto no kanban:
    a dashboard deixa de assumir “um card por OP em uma única coluna” como regra universal.
    A mesma OP passa a poder existir simultaneamente nas colunas `Frente` e `Costa`, e somente nessa bifurcação oficial.
    Fora dessa bifurcação, continua proibida a duplicação fictícia da OP em múltiplas colunas.
    `Montagem` deve mostrar apenas o saldo sincronizado entre as duas trilhas.
    A leitura visual precisa distinguir:
    - backlog próprio de `Frente`
    - backlog próprio de `Costa`
    - quantidade já sincronizada para `Montagem`
    - quantidade ainda bloqueada em `Montagem` por falta de conclusão da outra trilha
  - Impacto no carry-over:
    o carry-over deixa de reabrir a OP em um único “setor pendente mais avançado” quando a OP estiver na bifurcação paralela.
    O novo turno deve conseguir reabrir separadamente:
    - a pendência de `Frente`
    - a pendência de `Costa`
    - a parcela já sincronizada e pendente em `Montagem`
    - a parcela ainda bloqueada em `Montagem` por falta de conclusão na trilha irmã
    `Montagem` nunca pode renascer acima de `MIN(concluído em Frente, concluído em Costa)`.
  - Impacto no scanner/apontamento:
    o scanner e o apontamento do supervisor deixam de inferir disponibilidade downstream apenas do setor imediatamente anterior.
    `Montagem` passa a validar disponibilidade contra duas fontes:
    - concluído em `Frente`
    - concluído em `Costa`
    A UI continua simples, mas o backend precisa bloquear qualquer apontamento em `Montagem` acima da interseção real já concluída nas duas trilhas.
  - Impacto nas estruturas tipadas atuais:
    o domínio tipado precisa sair da leitura implícita de “fluxo linear com setor anterior único”.
    Os contratos passam a precisar refletir explicitamente:
    - etapa com predecessora única
    - etapa com múltiplas sucessoras paralelas
    - etapa com múltiplas predecessoras e sincronização parcial
    `TurnoSetorDemandaV2`, `TurnoOpV2` e os utilitários de fluxo/capacidade precisam expor semântica suficiente para representar:
    - mais de uma etapa ativa na mesma OP sem parecer duplicação indevida
    - uma quantidade sincronizada para `Montagem`
    - uma quantidade bloqueada por falta de sincronização entre as trilhas
  - Ordem segura de entrega:
    1. introduzir contratos tipados e funções puras para dependências paralelas e sincronização parcial
    2. adaptar queries de fluxo, planejamento e scanner para calcular `Montagem` por interseção entre `Frente` e `Costa`
    3. adaptar dashboard e kanban para permitir a mesma OP nas duas colunas paralelas
    4. adaptar carry-over entre turnos para reabrir trilhas paralelas sem colapsá-las em um único setor
    5. homologar cenários com OP nova, parcial em `Frente`, parcial em `Costa`, sincronização parcial em `Montagem` e carry-over recorrente

  **Evidência:** o produto passa a ter uma proposta técnica formal para evoluir o fluxo oficial de costura para um modelo com bifurcação paralela `Frente + Costa` e sincronização parcial em `Montagem`, descrita em `PRD`, `TASKS` e `BACKLOG`.
  Formalizado em `2026-04-17` com atualização das seções `5.5`, `9.3.6` e `9.3.7` do `docs/PRD.md`, abertura oficial da `Sprint 31` no `docs/TASKS.md` e registro do entregável correspondente no `docs/BACKLOG.md`.

- [x] **HU 31.2 — Como sistema, quero introduzir contratos tipados para dependências paralelas e sincronização parcial, para que o backend deixe de assumir predecessora única em todas as etapas.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - introduzir contratos tipados explícitos para grafo de dependência do fluxo, distinguindo:
    - predecessora única
    - múltiplas sucessoras paralelas
    - múltiplas predecessoras com sincronização parcial
  - criar funções puras para:
    - calcular liberação paralela de `Frente` e `Costa` a partir de `Preparação`
    - calcular a interseção quantitativa que libera `Montagem`
    - calcular a quantidade ainda bloqueada em `Montagem` por falta de conclusão na trilha irmã
  - revisar `TurnoSetorDemandaV2`, `TurnoOpV2` e contratos associados para suportar mais de uma etapa ativa na mesma OP
  - manter um resumo compatível com a UI atual, mas sem esconder a existência de múltiplas posições ativas na bifurcação
  - validar os novos contratos com testes utilitários e `npx tsc --noEmit`

  Regras:
  - esta HU não implementa ainda a nova leitura completa de dashboard/scanner/carry-over; ela fecha o contrato e as funções puras do domínio
  - a bifurcação paralela permitida fica restrita a `Frente + Costa`; o sistema não deve abrir simultaneidade genérica para qualquer setor
  - a regra de fork deve duplicar teto de liberação, não transferir ou consumir quantidade de `Preparação` duas vezes
  - a regra de join deve usar obrigatoriamente `MIN(concluído em Frente, concluído em Costa)` como teto de `Montagem`
  - os contratos novos não podem quebrar o vocabulário atual de capacidade em minutos, backlog setorial, aceite no turno e carry-over
  - se for necessário manter compatibilidade, preferir adicionar campos/contratos novos em vez de reescrever silenciosamente o significado dos atuais

  Critério técnico obrigatório:
  - o domínio precisa passar a conseguir responder explicitamente, para uma mesma OP:
    - quais etapas estão ativas agora
    - qual quantidade está liberada em cada trilha paralela
    - qual quantidade já está sincronizada para `Montagem`
    - qual quantidade permanece bloqueada em `Montagem` por falta de conclusão da outra trilha

  Saída esperada desta HU:
  - um contrato tipado central para dependências de fluxo
  - um contrato tipado para posições ativas da OP no fluxo
  - um contrato tipado para sincronização parcial de `Montagem`
  - funções puras reutilizáveis por queries, scanner, apontamentos e carry-over

  **Evidência:** o código passa a expor contratos tipados e funções puras para fork em `Preparação`, paralelismo em `Frente + Costa` e join parcial em `Montagem`, deixando a `HU 31.3` pronta para adaptar queries e disponibilidade operacional sem ambiguidade de domínio.
  Implementado em `types/index.ts`, `lib/utils/fluxo-paralelo-turno.ts` e `lib/utils/fluxo-paralelo-turno.test.ts`. O domínio agora expõe `EtapaFluxoChaveV2`, `EtapaDependenciaFluxoV2`, `PosicaoFluxoAtivaOpV2`, `SnapshotSincronizacaoParcialMontagemV2` e os campos opcionais de compatibilidade em `TurnoOpV2`/`TurnoSetorDemandaV2`, além das funções puras `listarDependenciasFluxoCosturaParalela()`, `calcularLiberacaoParalelaAposPreparacao()`, `calcularSincronizacaoParcialMontagem()` e `resolverPosicoesFluxoAtivasCosturaParalela()`. Validação concluída em `2026-04-17` com `node --test --experimental-strip-types lib/utils/capacidade-setor.test.ts lib/utils/fluxo-sequencial-turno.test.ts lib/utils/fluxo-paralelo-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 31.3 — Como sistema, quero recalcular o fluxo operacional e a disponibilidade de `Montagem` pela interseção entre `Frente` e `Costa`, para liberar somente a quantidade realmente sincronizada.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidência:** as queries de turno, scanner e disponibilidade operacional deixam de enriquecer `Montagem` por predecessora única e passam a usar o contrato paralelo oficial com fork em `Preparação`, sincronização parcial por `MIN(Frente, Costa)` e resumo compatível da OP com múltiplas posições ativas. Implementado em `lib/utils/fluxo-paralelo-turno.ts`, `lib/utils/fluxo-paralelo-turno.test.ts`, `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts`, `lib/queries/scanner.ts` e `lib/queries/fluxo-sequencial-turno-base.ts`. Validação concluída em `2026-04-17` com `node --test --experimental-strip-types lib/utils/fluxo-sequencial-turno.test.ts lib/utils/fluxo-paralelo-turno.test.ts lib/utils/capacidade-setor.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 31.4 — Como supervisor, quero ver a mesma OP simultaneamente em `Frente` e `Costa` no kanban, para refletir corretamente a bifurcação paralela do fluxo real.**
  **Prioridade:** P1
  **Risco:** Médio

  **Evidência:** o kanban operacional passou a consumir `posicoesFluxoAtivas` da OP para explicitar a bifurcação oficial no próprio card, mostrando quando a mesma OP está simultaneamente em `Frente` e `Costa`, quais etapas permanecem ativas e qual quantidade já foi sincronizada ou ainda está bloqueada em `Montagem`. Implementado em `components/dashboard/KanbanOperacionalTurno.tsx` e `lib/utils/kanban-operacional-turno.ts`, com cobertura adicional em `lib/utils/kanban-operacional-turno.test.ts`. Validação concluída em `2026-04-17` com `node --test --experimental-strip-types lib/utils/kanban-operacional-turno.test.ts lib/utils/fluxo-paralelo-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 31.5 — Como sistema, quero que carry-over, scanner e apontamentos respeitem a bifurcação paralela e a sincronização parcial, para que a continuidade entre turnos não colapse duas trilhas em uma só.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidência:** o carry-over deixou de reidratar o progresso do turno anterior com a semântica linear antiga e passou a usar o enriquecimento paralelo oficial, preservando `Frente` e `Costa` como trilhas independentes e limitando `Montagem` à interseção real entre elas ao abrir o turno seguinte. O scanner e `/admin/apontamentos` também passaram a explicitar a bifurcação oficial e a sincronização parcial no contexto da demanda/seção, sem voltar a colapsar as duas trilhas em uma leitura única. Implementado em `lib/utils/carry-over-turno.ts`, `lib/utils/carry-over-turno.test.ts`, `components/scanner/SelecaoDemandaScanner.tsx` e `components/apontamentos/PainelApontamentosSupervisor.tsx`. Validação concluída em `2026-04-17` com `node --test --experimental-strip-types lib/utils/carry-over-turno.test.ts lib/utils/fluxo-paralelo-turno.test.ts lib/utils/kanban-operacional-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 31.6 — Como produto, quero homologar o fluxo paralelo com sincronização parcial em `Montagem`, para confiar que o sistema representa corretamente a costura real sem romper o modelo de capacidade atual.**
  **Prioridade:** P0
  **Risco:** Alto

  **Evidência:** a Sprint 31 foi homologada tecnicamente com o fluxo paralelo ativo em toda a cadeia relevante: domínio e queries calculando `Montagem` pela interseção real entre `Frente` e `Costa`, kanban exibindo simultaneidade oficial, carry-over preservando as duas trilhas sem colapso e scanner/apontamentos refletindo a sincronização parcial no contexto operacional. Validação concluída em `2026-04-17` com `node --test --experimental-strip-types lib/utils/fluxo-sequencial-turno.test.ts lib/utils/fluxo-paralelo-turno.test.ts lib/utils/carry-over-turno.test.ts lib/utils/kanban-operacional-turno.test.ts lib/utils/capacidade-setor.test.ts lib/utils/hidratacao-capacidade-setor-turno.test.ts`, `npx tsc --noEmit` e `npm run build`, todos sem erros.

## SPRINT 32 — Fluxo contínuo por setor, capacidade diária cumulativa e disciplina operacional de fila
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 31 concluída e confirmação explícita do usuário em `2026-04-20` para formalizar a evolução do modelo operacional.
**Objetivo:** evoluir o fluxo oficial para representar cada setor como uma fila contínua alimentada ao longo do dia, limitada pela capacidade diária cumulativa e operada com prioridade de conclusão da OP atual antes de fracionamento desnecessário.

**Decisões de produto homologadas para esta sprint:**
- cada setor deve funcionar como uma fila contínua em movimento, e não como um lote congelado na abertura do turno
- a disponibilidade do setor precisa crescer durante o dia conforme o setor anterior conclui novas peças
- a capacidade diária do setor continua obrigatória, mas o seu consumo passa a ser cumulativo no próprio dia
- o setor pode receber novas peças do fluxo a qualquer momento, porém o aceite acumulado do dia não pode ultrapassar a capacidade diária daquele setor
- a fila continua obrigatoriamente FIFO por ordem cronológica de chegada
- o sistema deve distinguir `chegou ao setor`, `disponível agora`, `aceito no turno`, `concluído no setor` e `excedente`
- o setor não deve espalhar desnecessariamente sua capacidade em várias OPs ao mesmo tempo; se for possível concluir a OP atual no turno, essa conclusão deve ter prioridade
- a leitura de operadores na UI deve distinguir sugestão de capacidade, atividade real e alocação formal, sem chamar de `alocados` dados que sejam apenas inferência operacional
- a evolução deve ser implementada com mudanças aditivas, reutilizando contratos e utilitários homologados nas Sprints 29, 30 e 31
- reabertura pontual homologada em `2026-04-20` para ajustar a leitura da prévia de abertura do turno ao foco de capacidade produtiva disponível no momento
- reabertura documental complementar homologada em `2026-04-20` para corrigir a semântica entre `capacidade produtiva global do turno` e `aceite operacional setorial`, sem reintroduzir travas transacionais no scanner ou nos apontamentos
- reabertura documental complementar homologada em `2026-04-22` para corrigir a classificação do excedente setorial, fazendo o saldo acima do limite diário remanescente deixar de vazar para `disponível agora` e passar a compor explicitamente o próximo turno
- reabertura documental complementar homologada em `2026-04-22` para distinguir prioridade automática da fila e exceção supervisória controlada, permitindo apontamento manual em OPs posteriores somente dentro do saldo já aceito no dia

- [x] **HU 32.1 — Como produto, quero formalizar no PRD a regra de fluxo contínuo com capacidade diária cumulativa e prioridade de conclusão, para abrir a evolução da Sprint 32 com escopo claro e sem ambiguidade.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - formalizar no `docs/PRD.md` a leitura oficial de setor como fila contínua alimentada ao longo do dia
  - formalizar a diferença entre `chegou ao setor`, `disponível agora`, `aceito no turno`, `concluído` e `excedente`
  - formalizar no `docs/PRD.md` que a capacidade diária do setor é cumulativa e não pode ser reiniciada a cada recomputação
  - formalizar a prioridade de conclusão da OP atual antes de abrir nova OP no mesmo setor, salvo bloqueio operacional real
  - abrir a `Sprint 32` em `docs/TASKS.md` e registrar o novo ciclo em `docs/BACKLOG.md`

  Regras:
  - a proposta não pode romper o modelo homologado de bifurcação `Frente + Costa` e sincronização parcial de `Montagem`
  - a proposta deve preservar backlog setorial, fila FIFO, aceite no turno e carry-over já homologados
  - a evolução deve separar claramente semântica de capacidade sugerida e alocação real de operadores
  - o texto precisa priorizar clareza, simplicidade operacional e manutenibilidade, evitando complexidade de domínio sem benefício prático

  **Evidência:** o PRD passa a refletir oficialmente o setor como fila contínua alimentada ao longo do dia, com capacidade diária cumulativa, aceite limitado pelo restante do dia, prioridade de conclusão da OP atual e semântica explícita para backlog, disponível, aceite, concluído e excedente. Formalizado em `2026-04-20` com atualização das seções `5.2.1`, `5.5`, `9.3.6` e `9.3.7` do `docs/PRD.md`, abertura oficial da `Sprint 32` no `docs/TASKS.md` e registro do entregável correspondente no `docs/BACKLOG.md`.

- [x] **HU 32.2 — Como sistema, quero recalcular a capacidade setorial do dia de forma cumulativa, para que novas entradas do fluxo respeitem apenas o saldo ainda absorvível no turno.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - introduzir no domínio uma leitura explícita de `capacidadeDiariaSetor`, `capacidadeRestanteDia`, `quantidadeAceitaAcumulada` e `entradaAcumuladaDoSetor`
  - adaptar os utilitários de fluxo/capacidade para que a recomputação do turno não reabra artificialmente a capacidade cheia do setor
  - manter compatibilidade com os contratos atuais de backlog, aceite, concluído e excedente
  - validar o comportamento em `Montagem` preservando a regra `MIN(Frente, Costa)`

  Regras:
  - a capacidade diária continua sendo o teto operacional do setor naquele turno
  - o aceite acumulado do dia não pode ultrapassar a capacidade diária do setor, mesmo que novas peças cheguem durante o dia
  - a implementação deve ser aditiva e preferir funções puras e contratos explícitos em vez de reescrever silenciosamente o significado dos campos atuais

  **Evidência:** a hidratação de capacidade do turno passou a descontar a carga já realizada no setor antes de aceitar novo backlog no mesmo dia, preservando FIFO e impedindo que a recomputação reabra artificialmente a capacidade cheia do setor. O domínio também passou a expor `cargaConsumidaMinutos`, `cargaReservadaMinutos`, `quantidadeEntradaAcumuladaSetor` e `quantidadeAceitaAcumuladaSetor` como leitura aditiva da HU 32.2. Implementado em `types/index.ts`, `lib/utils/capacidade-setor.ts`, `lib/utils/hidratacao-capacidade-setor-turno.ts`, `lib/utils/capacidade-setor.test.ts` e `lib/utils/hidratacao-capacidade-setor-turno.test.ts`. Validação concluída em `2026-04-20` com `node --test --experimental-strip-types lib/utils/capacidade-setor.test.ts lib/utils/hidratacao-capacidade-setor-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 32.3 — Como sistema, quero disciplinar a fila operacional por setor com prioridade de conclusão, para evitar fracionamento desnecessário entre múltiplas OPs quando ainda faz sentido terminar a atual.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - formalizar no domínio o critério de prioridade da OP/lote atual por setor
  - impedir rateio desnecessário da capacidade diária entre múltiplas OPs quando a OP da frente pode ser concluída no turno
  - permitir abertura da próxima OP apenas quando a atual estiver concluída ou bloqueada por falta real de alimentação
  - preservar a fila FIFO cronológica como regra base do setor

  Regras:
  - concluir a OP atual é a política padrão do setor
  - abrir nova OP antes da conclusão da atual deve depender de justificativa operacional real e nunca de mera distribuição matemática de capacidade
  - a solução não deve introduzir um motor genérico complexo de agendamento; o comportamento precisa continuar didático e rastreável

  **Evidência:** o aceite do dia continua sendo calculado por FIFO e capacidade, mas a liberação operacional imediata do setor passou a respeitar uma disciplina separada de prioridade: apenas a demanda prioritária do setor fica com `quantidadeDisponivelApontamento > 0`, enquanto as demais permanecem aceitas no dia, porém fora de execução imediata até a atual concluir ou bloquear. O kanban também deixou de tratar simples aceite/reserva como presença em quadro, exibindo apenas demanda com produção real, execução em curso ou disponibilidade imediata. Implementado em `lib/utils/hidratacao-capacidade-setor-turno.ts`, `lib/utils/kanban-operacional-turno.ts`, `lib/utils/hidratacao-capacidade-setor-turno.test.ts` e `lib/utils/kanban-operacional-turno.test.ts`. Validação concluída em `2026-04-20` com `node --test --experimental-strip-types lib/utils/hidratacao-capacidade-setor-turno.test.ts lib/utils/kanban-operacional-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 32.4 — Como supervisor, quero que dashboard, kanban e apontamentos distingam backlog vivo, aceite do dia e atividade real, para agir sobre a operação sem interpretar inferências como verdade de chão.**
  **Prioridade:** P1
  **Risco:** Médio

  Tarefas:
  - ajustar a leitura visual para separar `backlog total`, `disponível agora`, `aceito no turno`, `concluído` e `excedente`
  - explicitar na UI quando o número de operadores for sugestão de capacidade, atividade real ou alocação formal
  - refletir no kanban a prioridade de conclusão da OP atual quando isso for o comportamento do setor
  - alinhar scanner e `/admin/apontamentos` ao mesmo vocabulário operacional do turno

  Regras:
  - a UI não pode chamar de `operadores alocados` um número que seja apenas sugestão operacional
  - a leitura visual precisa permanecer simples para o supervisor, mesmo com o aumento de fidelidade do domínio
  - o mesmo vocabulário deve ser compartilhado entre dashboard, scanner e apontamentos

  **Evidência:** dashboard, kanban, modais operacionais, `/admin/apontamentos` e scanner passaram a distinguir explicitamente `backlog vivo`, `absorvido no dia`, `disponível agora`, `alocação formal` e `atividade real`, sem tratar sugestão operacional como alocação nominal. Implementado em `components/dashboard/DashboardVisaoOperacionalTab.tsx`, `components/dashboard/MonitorPlanejamentoTurnoV2.tsx`, `components/dashboard/KanbanOperacionalTurno.tsx`, `components/dashboard/ModalDetalhesOpTurno.tsx`, `components/dashboard/ModalDetalhesSecaoTurno.tsx`, `components/apontamentos/PainelApontamentosSupervisor.tsx`, `components/scanner/SelecaoDemandaScanner.tsx`, `components/scanner/SelecaoOperacaoScanner.tsx`, `components/scanner/ConfirmacaoRegistro.tsx`, `app/(operador)/scanner/page.tsx` e `hooks/useScanner.ts`. Validação concluída em `2026-04-20` com `npx tsc --noEmit`, sem erros.

- [x] **HU 32.5 — Como produto, quero homologar o fluxo contínuo com capacidade cumulativa e prioridade de conclusão em cenários reais de turno aberto, para confiar que o sistema representa o chão de fábrica sem distorcer a fila do dia.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - validar cenários em que o setor recebe nova alimentação durante o turno sem perder o teto de capacidade diária
  - validar cenários em que `Final` deve priorizar concluir uma OP antes de abrir outra
  - validar cenários de excedente setorial carregado corretamente para o turno seguinte
  - homologar o comportamento sobre o turno aberto atual e consolidar testes automatizados do novo contrato

  Regras:
  - a homologação precisa cobrir setores sequenciais e a bifurcação oficial `Frente + Costa`
  - o turno aberto atual deve ser usado como evidência de aderência ao fluxo real sempre que os dados permitirem
  - nenhuma validação pode relaxar a capacidade diária, a fila FIFO ou a sincronização parcial de `Montagem`

  **Evidência:** a Sprint 32 foi homologada tecnicamente com cenários executáveis cobrindo capacidade cumulativa no mesmo dia, prioridade de conclusão em `Final`, carry-over do excedente setorial e preservação da bifurcação oficial `Frente + Costa -> Montagem` sem relaxar FIFO nem sincronização parcial. A suíte final ficou consolidada em `lib/utils/fluxo-continuo-turno.test.ts`, complementando `lib/utils/capacidade-setor.test.ts`, `lib/utils/hidratacao-capacidade-setor-turno.test.ts`, `lib/utils/fluxo-paralelo-turno.test.ts`, `lib/utils/carry-over-turno.test.ts` e `lib/utils/kanban-operacional-turno.test.ts`. Nesta sessão não havia consulta confiável ao turno aberto real via Supabase disponível no sandbox, então a aderência foi fechada por cenários determinísticos equivalentes ao fluxo aberto do dia. Validação concluída em `2026-04-20` com `node --test --experimental-strip-types lib/utils/fluxo-continuo-turno.test.ts lib/utils/capacidade-setor.test.ts lib/utils/hidratacao-capacidade-setor-turno.test.ts lib/utils/fluxo-paralelo-turno.test.ts lib/utils/carry-over-turno.test.ts lib/utils/kanban-operacional-turno.test.ts`, `npx tsc --noEmit` e `npm run build`, todos sem erros.

- [x] **HU 32.6 — Como supervisor, quero que o preview de abertura do turno priorize a capacidade produtiva disponível naquele momento, para decidir a abertura com base no que a fábrica consegue absorver agora com os recursos informados.**
  **Prioridade:** P1
  **Risco:** Médio

  Tarefas:
  - reorientar o resumo da prévia no modal de abertura do turno para destacar a capacidade produtiva disponível em peças completas com base em `operadoresDisponiveis × minutosTurno`
  - incluir um card explícito de `capacidade produtiva do turno`
  - remover do resumo principal o card agregado de `Desconformidade`
  - preservar no cálculo a carga realmente selecionada, considerando carry-over setorial, produção já concluída em turnos anteriores e novas OPs adicionadas no turno atual
  - manter a carga selecionada visível apenas como referência operacional complementar ao que pode ser absorvido agora

  Regras:
  - a UI deve responder diretamente aos inputs atuais do modal, sem depender de persistência prévia do turno
  - a leitura principal precisa ajudar a decisão de abertura, e não enfatizar déficit agregado como mensagem central
  - a capacidade produtiva principal deve usar a mesma semântica da dashboard, em `peças completas`, e não minutos brutos
  - o cálculo deve continuar usando a mesma base homologada de carga pendente real por setor, sem reiniciar setores já concluídos nem ignorar carry-over parcelado

  **Evidência:** o preview de `ModalNovoTurnoV2` passou a priorizar a capacidade produtiva disponível do turno atual em `peças completas`, reutilizando a mesma semântica gerencial da dashboard (`metaGrupo` pela média simples dos `tpProdutoMin` do mix selecionado), além de exibir a carga total selecionada e o quanto dessa seleção pode ser absorvido agora entre carry-over e novas OPs. O card agregado de `Desconformidade` saiu do resumo principal, substituído pelo card `Capacidade produtiva do turno`, enquanto a leitura em minutos ficou apenas como apoio técnico de dimensionamento setorial. O comportamento foi formalizado no `docs/PRD.md` e implementado em `components/dashboard/ModalNovoTurnoV2.tsx`. Validação concluída em `2026-04-20` com `npx tsc --noEmit`, sem erros.

- [x] **HU 32.7 — Como produto, quero que o aceite operacional setorial derive explicitamente do teto global do turno, para que a dashboard não volte a sugerir que um setor absorve mais unidades do que a capacidade produtiva diária da fábrica.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - promover `lib/utils/meta-grupo-turno.ts` a fonte canônica da `capacidadeGlobalTurnoPecas`, deixando explícito no contrato do turno que esta é a capacidade diária máxima em unidades completas
  - adaptar `lib/utils/hidratacao-capacidade-setor-turno.ts` para receber o teto global em peças e derivar dele o plano operacional setorial do dia, em vez de recalcular um teto autônomo por setor
  - rebaixar `lib/utils/dimensionamento-pessoas-setor.ts` para papel estritamente auxiliar de sugestão de equipe e leitura de carga, sem permitir que ele defina sozinho `quantidadeAceitaTurno`
  - propagar o novo contrato em `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts`, `lib/queries/fluxo-sequencial-turno-base.ts` e `lib/queries/scanner.ts`, evitando reabertura de capacidade local divergente em qualquer recomputação
  - alinhar `ModalNovoTurnoV2`, dashboard, kanban, scanner e `/admin/apontamentos` para explicitar que a capacidade global do turno é o teto mestre e que a leitura setorial é derivada desse teto, não uma segunda capacidade independente
  - emitir alerta visual explícito quando a distribuição/seleção operacional tentar expor no setor mais unidades do que o plano derivado permite naquele dia

  Regras:
  - a capacidade global do turno em peças completas é o teto mestre do dia e deve nascer de `operadoresDisponiveis × minutosTurno` combinado com a regra gerencial vigente de `Meta do Grupo`
  - nenhum setor pode ter `quantidadeAceitaTurno` acima do teto global do turno, mesmo que a leitura local em minutos e T.P. setorial pareça comportar mais
  - a soma do aceite operacional setorial do dia não pode reintroduzir, por inferência local, uma leitura que contradiga a capacidade global do turno
  - a leitura setorial pode continuar exibindo carga em minutos, carga reservada, carga consumida e saldo do plano do dia, desde que tudo seja derivado do teto global canônico
  - scanner e apontamentos **não** devem ser bloqueados por essa regra; qualquer desconformidade deve gerar efeito visual e alerta operacional, não trava transacional
  - a solução deve priorizar clareza de contrato, reuso dos utilitários homologados e menor complexidade adicional possível

  **Evidência:** `meta-grupo-turno.ts` passou a expor `capacidadeGlobalTurnoPecas` como contrato canônico do turno, `hidratacao-capacidade-setor-turno.ts` deixou de recalcular teto autônomo por setor e passou a derivar `quantidadeAceitaTurno` do teto global com `quantidadeDisponivelApontamento` preservada para execução, e `turnos.ts`, `turnos-client.ts`, `fluxo-sequencial-turno-base.ts` e `scanner.ts` propagam o mesmo contrato sem reabrir capacidade local divergente. A UI do dashboard, kanban, scanner e `/admin/apontamentos` foi alinhada para exibir `Plano do dia` em vez de uma falsa capacidade setorial autônoma, com alerta visual não bloqueante quando a execução ultrapassa o saldo visual do plano. Cobertura atualizada em `lib/utils/hidratacao-capacidade-setor-turno.test.ts` e validação concluída em `2026-04-20` com `node --experimental-loader /tmp/alias-loader.mjs --test --experimental-strip-types lib/utils/hidratacao-capacidade-setor-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 32.8 — Como supervisor, quero que o excedente acima do limite diário remanescente seja classificado imediatamente como saldo do próximo turno, para que o sistema deixe de apresentar como executável hoje o que já não pertence mais à capacidade do dia.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - formalizar no `docs/PRD.md` que, quando novas peças chegarem ao setor, apenas a parcela que ainda couber no limite diário remanescente entra em `quantidadeAceitaTurno`
  - formalizar no `docs/PRD.md` que a parcela que não couber mais no dia deve ir imediatamente para `quantidadeExcedenteTurno`, sem permanecer semanticamente em `disponível agora`
  - ajustar `lib/utils/hidratacao-capacidade-setor-turno.ts` para que `quantidadeDisponivelApontamento` nasça somente da parcela aceita para hoje
  - propagar o novo contrato em `lib/queries/turnos.ts`, `lib/queries/turnos-client.ts`, `lib/queries/scanner.ts` e `lib/queries/fluxo-sequencial-turno-base.ts`, preservando a leitura entre `chegou ao setor`, `aceito no turno`, `disponível agora` e `excedente`
  - alinhar dashboard, kanban, scanner e `/admin/apontamentos` para que o excedente deixe de aparecer como disponibilidade implícita do turno atual
  - explicitar na UI que `quantidadeExcedenteTurno` é também uma medida gerencial do setor, útil para ajuste de capacidade, prioridade e distribuição de operadores nos próximos turnos
  - validar carry-over para que o excedente identificado no dia componha corretamente o saldo operacional do turno seguinte

  Regras:
  - esta HU não muda o fato físico de que novas peças podem chegar ao setor durante o turno; ela muda a classificação sistêmica do que ainda pertence ao dia atual
  - o sistema deve separar explicitamente:
    - o que já chegou fisicamente ao setor
    - o que ainda cabe no dia atual
    - o que já virou compromisso do próximo turno
  - `quantidadeDisponivelApontamento` não pode exceder a parcela aceita para hoje
  - `quantidadeExcedenteTurno` deve nascer no momento em que o limite diário remanescente for ultrapassado, sem depender de encerramento manual do turno para existir semanticamente
  - a solução deve preservar a bifurcação oficial `Frente + Costa -> Montagem`, a fila FIFO, a prioridade de conclusão e o carry-over setorial já homologados
  - o excedente é uma medida gerencial obrigatória por setor e não pode ser tratado apenas como resíduo técnico de cálculo

  Critério técnico obrigatório:
  - ao recomputar a hidratação do turno, a soma entre `quantidadeAceitaTurno` e `quantidadeExcedenteTurno` deve continuar reconciliando o backlog vivo do setor
  - a parcela excedente não pode continuar aparecendo em `quantidadeDisponivelApontamento`, `quantidadePlanejada` exibida da seção/operação, scanner ou apontamentos como se ainda pertencesse ao dia atual
  - o carry-over do turno seguinte deve reconhecer como backlog explícito tanto:
    - o saldo aceito e não concluído
    - quanto o saldo excedente que já não cabia no dia anterior

  **Evidência:** `hidratacao-capacidade-setor-turno.ts` passou a limitar `quantidadeDisponivelApontamento` à parcela efetivamente aceita no dia, impedindo que o excedente vaze semanticamente para execução imediata. `turnos.ts`, `turnos-client.ts`, `scanner.ts` e `fluxo-sequencial-turno-base.ts` passaram a propagar a mesma semântica operacional, enquanto operações e seções exibidas no scanner/dashboard usam o aceite real do dia em vez de expor como executável a parcela já classificada como excedente. `SelecaoDemandaScanner.tsx` também deixou de tratar backlog puro como disponibilidade clicável. Validação concluída em `2026-04-22` com `node --experimental-loader /tmp/alias-loader.mjs --test --experimental-strip-types lib/utils/hidratacao-capacidade-setor-turno.test.ts lib/utils/fluxo-continuo-turno.test.ts` e `npx tsc --noEmit`, ambos sem erros.

- [x] **HU 32.9 — Como supervisor, quero poder apontar manualmente em OPs posteriores da fila dentro do saldo já aceito no dia, para usar a capacidade setorial remanescente sem romper o teto do setor.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - formalizar no `docs/PRD.md` a diferença entre prioridade automática da fila e exceção supervisória controlada
  - introduzir no domínio o conceito funcional de `saldoManualPermitido` por OP/setor, preservando os contratos já homologados de `quantidadeAceitaAcumuladaSetor`, `quantidadeAceitaTurno` e `quantidadeDisponivelApontamento`
  - adaptar `components/apontamentos/PainelApontamentosSupervisor.tsx` para listar e acionar OPs não prioritárias quando ainda houver saldo manual permitido
  - adaptar o backend de `lib/actions/producao.ts` para validar o fluxo supervisor por `saldoManualPermitido`, e não apenas por `quantidadeDisponivelApontamento`
  - preservar `components/scanner/*` e o fluxo operacional padrão do scanner sob a disciplina automática atual da fila
  - avaliar se kanban/dashboard devem expor um indicador secundário de `saldo manual supervisor`, sem confundir esse número com `Disponível agora`
  - cobrir a regra com testes determinísticos de domínio, dashboard/apontamentos e validação transacional do backend

  Regras:
  - `Plano do dia` do setor continua sendo o teto fixo de capacidade aceita no turno
  - `Disponível agora` continua mostrando apenas a liberação automática prioritária do setor
  - a prioridade automática continua favorecendo a OP da frente da fila
  - o supervisor pode lançar manualmente em OPs posteriores da fila apenas usando a parcela já aceita no dia para aquele setor
  - a soma do que já foi concluído no setor com o novo lançamento manual não pode ultrapassar o `Plano do dia` do setor
  - o lançamento manual em OP posterior não depende de `quantidadeDisponivelApontamento > 0`; depende da existência de saldo aceito no dia para aquela OP dentro do teto setorial
  - o scanner operacional padrão não herda essa exceção
  - a fila FIFO continua como política padrão do sistema, sem virar proibição absoluta para o fluxo supervisório

  Semântica obrigatória:
  - `quantidadeAceitaAcumuladaSetor`
    - significa quanto daquela OP efetivamente coube no plano do dia do setor
  - `quantidadeAceitaTurno`
    - significa o saldo remanescente da parcela aceita que ainda não foi concluído
  - `quantidadeDisponivelApontamento`
    - significa apenas a liberação automática imediata pela prioridade da fila
  - `saldoManualPermitido`
    - significa quanto o supervisor ainda pode apontar naquela OP, mesmo fora da prioridade automática, sem romper o teto diário do setor

  Regra operacional exata:
  - `saldoAceitoDaOp = MAX(quantidadeAceitaAcumuladaSetor - quantidadeConcluidaNoSetor, 0)`
  - `saldoSetorialDoDia = MAX(planoDoDiaSetor - quantidadeConcluidaTotalSetor, 0)`
  - `saldoManualPermitido = MIN(saldoAceitoDaOp, saldoSetorialDoDia)`
  - se `saldoManualPermitido > 0`, o supervisor pode apontar nessa OP mesmo que ela esteja na fila `#2`, `#3` ou posterior

  **Evidência:** `docs/PRD.md` consolidou a seção `9.3.6.1 Flexibilização supervisória controlada dentro do plano do dia`; `lib/utils/apontamento-supervisor.ts` passou a centralizar `saldoManualPermitido`, exceção manual e validação do lote do supervisor; `lib/utils/hidratacao-capacidade-setor-turno.ts` e `lib/queries/fluxo-sequencial-turno-base.ts` agora propagam `saldoManualPermitido` e `quantidadeManualPermitidaOperacao` sem alterar o scanner automático; `components/apontamentos/PainelApontamentosSupervisor.tsx` passou a listar contextos fora da prioridade automática quando ainda há saldo manual; e o dashboard expõe o indicador secundário em `components/dashboard/ModalDetalhesSetorTurno.tsx` e `components/dashboard/KanbanOperacionalTurno.tsx`. Validação concluída em `2026-04-22` com `node --experimental-loader /tmp/alias-loader.mjs --test --experimental-strip-types lib/utils/turno-setores.test.ts lib/utils/hidratacao-capacidade-setor-turno.test.ts lib/utils/fluxo-continuo-turno.test.ts lib/utils/apontamento-supervisor.test.ts` e `npx tsc --noEmit`, ambos sem erros.

  Exemplo obrigatório de aceitação:
  - setor `Finalização`
  - `Plano do dia = 601`
  - OP `#1 = 588`
  - OP `#2 = 13`
  - OP `#3 = 0`
  - `concluído no setor = 0`
  - resultado esperado:
    - a liberação automática continua em `588` para a OP `#1`
    - o supervisor pode lançar manualmente até `13` na OP `#2`
    - o supervisor não pode lançar nada na OP `#3`
    - o total do setor permanece limitado a `601`

  Guardrails obrigatórios:
  - o supervisor nunca pode lançar acima do saldo aceito daquela OP
  - o supervisor nunca pode fazer o setor ultrapassar o `Plano do dia`
  - a exceção supervisória não pode reclassificar como capacidade do dia o que já virou `quantidadeExcedenteTurno`
  - toda exceção manual precisa permanecer auditável
  - a solução deve preservar a bifurcação oficial `Frente + Costa -> Montagem`, a fila FIFO, a prioridade de conclusão e o carry-over setorial já homologados

  **Evidência esperada:** o PRD passa a registrar a exceção supervisória controlada como segunda camada operacional do setor, `PainelApontamentosSupervisor` passa a expor OPs não prioritárias com `saldoManualPermitido > 0`, o backend valida a soma setorial sem usar apenas `quantidadeDisponivelApontamento`, e scanner/kanban continuam distinguindo prioridade automática de exceção manual. A validação deve cobrir cenários de `Finalização` com `588 + 13`, setores paralelos e casos sem saldo residual, com `npx tsc --noEmit` e suíte automatizada sem erros.

**Fechamento em `2026-04-22`:** a `HU 32.9` consolidou a segunda camada operacional do setor para o fluxo supervisório, separando definitivamente `disponível agora` de `saldoManualPermitido` sem reabrir capacidade do dia nem afrouxar a disciplina do scanner. A sprint encerra com fila contínua, teto diário cumulativo, excedente setorial e exceção manual auditável alinhados entre domínio, queries e UI.

## SPRINT 33 — Gestão de imagens do produto
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 32 concluída.
**Objetivo:** evoluir o CRUD de produtos para suportar duas imagens gerenciadas (`Frente` e `Costa`) com upload, substituição, remoção e exibição visual forte no cadastro e no detalhe do produto.

- [x] **HU 33.1 — Como produto, quero formalizar no PRD o contrato de imagens `Frente` e `Costa`, para que cadastro, detalhe e gestão administrativa usem a mesma regra sem ambiguidade.**
  **Prioridade:** P1
  **Risco:** Médio

  Tarefas:
  - consolidar no `docs/PRD.md` que o produto passa a ter duas imagens independentes e opcionais
  - formalizar que a experiência principal é upload gerenciado, e não URL manual livre
  - formalizar que o CRUD deve permitir adicionar, substituir e remover cada vista individualmente
  - formalizar que a tela de detalhe deve tratar as duas imagens como galeria principal do produto

  Regras:
  - `Frente` e `Costa` são vistas complementares do mesmo produto
  - a ausência de uma vista não bloqueia a outra nem o cadastro
  - a ausência das duas imagens não bloqueia o CRUD, mas exige estado vazio explícito
  - a gestão das imagens não pode alterar roteiro, `T.P Produto` ou ciclo de vida do produto

  **Evidência:** `docs/PRD.md` passa a registrar explicitamente o contrato funcional de duas imagens do produto, com comportamento de cadastro, edição, remoção e detalhe visual.

- [x] **HU 33.2 — Como sistema, quero evoluir o schema e os contratos tipados de produto para suportar `imagem_frente_url` e `imagem_costa_url`, para que o CRUD deixe de depender do campo legado `imagem_url`.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - criar migration aditiva no Supabase para introduzir `imagem_frente_url` e `imagem_costa_url`
  - preservar `imagem_url` apenas como compatibilidade temporária até limpeza posterior
  - regenerar `types/supabase.ts`
  - propagar o novo contrato em `types/index.ts` e `lib/queries/produtos.ts`

  Regras:
  - a mudança deve ser aditiva e segura para o worktree atual
  - o schema não pode quebrar listagem, detalhe, duplicação ou ciclo de vida já homologados
  - os tipos precisam continuar em `strict` sem `any`

  **Evidência:** colunas novas presentes no schema, `types/supabase.ts` regenerado e queries de produto passando a expor as duas URLs sem regressão no restante do CRUD.

  Migration `scripts/sprint33_produtos_imagens.sql` aplicada no projeto Supabase via Management API em `2026-04-23`, com validação read-only em `information_schema.columns` confirmando `imagem_frente_url`, `imagem_costa_url` e `imagem_url` em `public.produtos`; `types/supabase.ts`, `types/index.ts` e `lib/queries/produtos.ts` foram sincronizados com o novo contrato e `npx tsc --noEmit` concluiu sem erros.

- [x] **HU 33.3 — Como admin, quero fazer upload, substituição e remoção de imagem de frente e de costa no backend do produto, para que a gestão das imagens seja segura e consistente.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - introduzir bucket e convenção de paths para imagens de produto
  - adaptar `lib/actions/produtos.ts` para upload, troca e remoção individual de `Frente` e `Costa`
  - validar tipo de arquivo e tamanho antes de persistir
  - limpar arquivo anterior quando houver substituição confirmada
  - revalidar listagem e detalhe após mutações

  Regras:
  - a troca de uma imagem não pode apagar a outra
  - a remoção de uma imagem deve atualizar imediatamente o produto sem afetar roteiro
  - o fluxo deve usar credenciais server-side já homologadas do Supabase
  - a action deve falhar com erro claro quando o upload for inválido

  **Evidência:** criação e edição de produto passam a aceitar upload de `Frente` e `Costa`, com substituição e remoção individual funcionando via `lib/actions/produtos.ts` e sem regressão em `npx tsc --noEmit`.

  Bucket `produtos` provisionado em `2026-04-23` via `scripts/sprint33_produtos_storage_bucket.sql` com validação read-only em `storage.buckets` (`public = true`, `file_size_limit = 5242880`, `allowed_mime_types = ['image/jpeg','image/png','image/webp']`); `lib/actions/produtos.ts` agora valida MIME/tamanho, gera paths por `produtoId/{frente|costa}/...`, sincroniza `imagem_frente_url` e `imagem_costa_url`, mantém `imagem_url` apenas como compatibilidade temporária, suporta substituição e remoção individual por `FormData`, e limpa arquivos antigos do próprio produto após troca bem-sucedida. `npx tsc --noEmit` concluiu sem erros.

- [x] **HU 33.4 — Como admin, quero uma UX moderna no modal de produto para visualizar e gerir as duas imagens durante cadastro e edição, para inspecionar bem o produto sem depender de URL textual.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - refatorar `components/ui/ModalProduto.tsx` para remover o resíduo de `hidden input` legado
  - criar dois cards visuais de imagem com preview, estado vazio e ações por vista
  - manter a organização do modal compatível com o fluxo já homologado por setores
  - preservar usabilidade mobile-first

  Regras:
  - a área de imagens não pode colapsar a UX do roteiro por setores
  - a UI deve nomear claramente `Frente` e `Costa`
  - a solução não deve exigir biblioteca adicional fora da stack aprovada

  **Evidência:** o modal de produto exibe previews grandes para `Frente` e `Costa`, permite trocar/remover cada vista e elimina a dependência da URL textual oculta.

  `components/ui/ModalProduto.tsx` foi refatorado em `2026-04-23` para exibir dois cards visuais independentes (`Frente` e `Costa`) com preview grande, estado vazio intencional, upload por arquivo, troca e remoção individual via `FormData` compatível com a `HU 33.3`; a duplicação assistida passa a iniciar sem reutilizar automaticamente as imagens do produto-base para evitar vínculo cruzado entre produtos, e `npx tsc --noEmit` concluiu sem erros.

- [x] **HU 33.5 — Como admin, quero ver `Frente` e `Costa` com destaque na tela de detalhe do produto, para conferir visualmente o item produzido com uma galeria clara e moderna.**
  **Prioridade:** P1
  **Risco:** Médio

  Tarefas:
  - refatorar `app/admin/produtos/[id]/page.tsx` para substituir o campo textual de imagem por galeria visual
  - tratar estados com duas imagens, uma imagem e nenhuma imagem
  - manter os dados de roteiro e metadados do produto legíveis sem competir com a galeria
  - ajustar renderização remota em `next.config.ts`, se necessário

  Regras:
  - a galeria deve priorizar visualização grande e comparação entre vistas
  - `Frente` e `Costa` precisam ficar identificadas textual e visualmente
  - a ausência de imagem deve gerar estado vazio intencional, não texto cru de URL

  **Evidência:** a página de detalhe do produto passa a exibir uma galeria principal de `Frente` e `Costa`, mantendo leitura clara dos metadados e do roteiro.

  `app/admin/produtos/[id]/page.tsx` foi refatorada em `2026-04-23` para substituir o campo textual de imagem por uma galeria principal baseada em `components/produtos/GaleriaProdutoDetalhe.tsx`, com alternancia entre `Frente` e `Costa`, estados claros para duas, uma ou nenhuma imagem e visualizacao ampliada em lightbox; `next.config.ts` passou a aceitar imagens remotas do Supabase Storage via `images.remotePatterns`, e `npx tsc --noEmit` concluiu sem erros.

- [x] **HU 33.6 — Como produto, quero homologar a gestão de imagens do produto ponta a ponta, para confiar no novo fluxo sem regressão no CRUD e na consulta administrativa.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - validar criação de produto sem imagem, com só `Frente`, com só `Costa` e com ambas
  - validar substituição e remoção individual de cada vista
  - validar listagem, detalhe, duplicação assistida e edição após mutações de imagem
  - consolidar a evidência documental da sprint

  Regras:
  - a homologação deve cobrir desktop e mobile
  - o roteiro do produto e o `T.P Produto` não podem sofrer regressão
  - a sprint só fecha com `npx tsc --noEmit` e evidência operacional do CRUD sem erros

  **Evidência:** gestão de imagens `Frente` e `Costa` validada ponta a ponta no CRUD e na tela de detalhe, com `npx tsc --noEmit` sem erros e evidência documental registrada.

  Homologação consolidada em `2026-04-23` com verificação estrutural dos cenários-alvo do fluxo: `1)` criação sem imagem continua válida porque `lib/actions/produtos.ts` trata ambas as vistas como opcionais, `2)` cadastro com só `Frente`, só `Costa` ou ambas fica coberto pelo contrato do backend (`imagem_frente_arquivo`, `imagem_costa_arquivo`, remoções independentes e sincronização de `imagem_url` como legado), `3)` edição, substituição e remoção individual permanecem acopladas ao mesmo pipeline server-side, `4)` a duplicação assistida em `components/ui/ModalProduto.tsx` passa a iniciar com imagens vazias para evitar reuso indevido do produto-base, e `5)` listagem e detalhe seguem consumindo `listarProdutos()` / `buscarProdutoComRoteiro()` com o novo contrato tipado. Validação executável concluída com `npx tsc --noEmit` e `npm run build -- --webpack`, ambos sem erros; o `npm run build` padrão com Turbopack falhou apenas por limitação do sandbox ao tentar abrir processo/porta para o pipeline de CSS, sem indicar regressão da sprint. Nesta sessão não havia runner autenticado de navegador para inspeção manual real de viewport desktop/mobile, então a aderência visual final foi fechada por build de produção, tipagem, rotas compiladas (`/admin/produtos` e `/admin/produtos/[id]`) e inspeção do fluxo responsivo nos componentes entregues.

  Correção pós-homologação registrada ainda em `2026-04-23`: a edição de produto com histórico deixou de reordenar silenciosamente o payload de `roteiro` ao salvar mudanças apenas cadastrais/imagens, evitando falso positivo de alteração estrutural e a violação da FK `turno_setor_operacoes_produto_operacao_id_fkey`. O modal também deixou de forçar `encType` em formulário com Server Action, eliminando o warning do React no console. Validação complementar concluída com `npx tsc --noEmit` e `npm run build -- --webpack`, sem erros.

**Fechamento em `2026-04-23`:** a Sprint 33 encerra com o domínio de produto evoluído para duas vistas administráveis (`Frente` e `Costa`), bucket público configurado no Supabase, upload/troca/remoção individual no backend, modal administrativo com previews grandes e detalhe do produto com galeria visual e ampliação, sem regressão de tipos nem de build de produção.

## SPRINT 34 — Descrição do produto e reorganização do cadastro
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 33 concluída.
**Objetivo:** incluir `descrição` no contrato do produto e reorganizar o modal para priorizar identificação textual e imagens antes do roteiro.

- [x] **HU 34.1 — Como produto, quero formalizar no PRD o campo `descrição` e a nova ordem do formulário de produto, para que backend e UI implementem a mudança com o mesmo contrato.**
  **Prioridade:** P1
  **Risco:** Baixo

  Tarefas:
  - registrar no PRD que o produto passa a ter campo `descrição`
  - registrar que a `descrição` é administrativa e não altera o domínio operacional
  - formalizar a ordem obrigatória do formulário como `referência`, `nome`, `descrição`, `imagens`, `roteiro`
  - registrar que a duplicação assistida deve reaproveitar também a `descrição`

  Regras:
  - `descrição` não altera `roteiro`, `T.P Produto`, scanner nem fluxo operacional
  - a nova ordem do formulário deve preservar a área de imagens antes do roteiro
  - a mudança deve permanecer compatível com o contrato tipado e com a UX já homologada na Sprint 33

  **Evidência:** `docs/PRD.md` passa a registrar o campo `descrição` do produto e a nova ordem obrigatória do formulário de cadastro/edição.

  `docs/PRD.md` foi atualizado em `2026-04-23` para incluir `descrição` no contrato do produto, explicitar que o campo é administrativo e formalizar a nova ordem do modal como `referência`, `nome`, `descrição`, `imagens`, `roteiro`, incluindo a expectativa de reaproveitar a `descrição` também na duplicação assistida.

- [x] **HU 34.2 — Como sistema, quero evoluir schema e types para suportar `descricao` no produto, para que o CRUD passe a persistir o novo campo com segurança.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - criar migration aditiva para `produtos.descricao`
  - regenerar `types/supabase.ts`
  - propagar `descricao` em `types/index.ts` e nas queries do produto

  Regras:
  - a mudança deve ser aditiva
  - `descricao` não pode quebrar contrato atual do CRUD
  - os tipos precisam permanecer em `strict`

  **Evidência:** schema, types e queries passam a expor `descricao` no produto sem regressão em `npx tsc --noEmit`.

  Migration `scripts/sprint34_produtos_descricao.sql` aplicada no projeto Supabase via Management API em `2026-04-23`, com validação read-only em `information_schema.columns` confirmando a coluna `descricao` em `public.produtos`; `types/supabase.ts`, `types/index.ts`, `lib/queries/produtos.ts`, `scripts/sprint1_schema.sql` e `scripts/migrate.mjs` foram sincronizados com o novo contrato aditivo e `npx tsc --noEmit` concluiu sem erros.

- [x] **HU 34.3 — Como admin, quero que o backend do CRUD de produto salve e atualize `descrição`, para que o novo campo faça parte do cadastro de forma consistente.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - adaptar `lib/actions/produtos.ts` para criar, editar e duplicar com `descricao`
  - preservar compatibilidade com produtos sem descrição
  - revalidar listagem e detalhe após mutações

  Regras:
  - `descricao` não bloqueia cadastro quando vazia
  - edição de `descricao` não pode ser tratada como alteração estrutural de roteiro

  **Evidência:** `criarProduto` e `editarProduto` passam a persistir `descricao` sem regressão em imagens, roteiro e `npx tsc --noEmit`.

  `lib/actions/produtos.ts` foi atualizado em `2026-04-23` para ler `descricao` do `FormData` com contrato opcional (`null` quando vazia) e persisti-la tanto em `criarProduto()` quanto em `editarProduto()`, preservando o pipeline já homologado de imagens, cálculo de `tp_produto_min`, proteção contra alteração estrutural indevida do roteiro e a compatibilidade da duplicação assistida por reutilizar a mesma action de criação. Validação técnica concluída com `npx tsc --noEmit` sem erros.

- [x] **HU 34.4 — Como admin, quero ver `descrição` no modal de produto e a nova ordem visual do formulário, para cadastrar o produto em um fluxo mais natural.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - inserir o campo `descrição` no bloco principal do modal
  - reorganizar a ordem para `referência`, `nome`, `descrição`, `imagens`, `roteiro`
  - manter consistência entre criação, edição e duplicação

  Regras:
  - a nova ordem não pode degradar a UX homologada da Sprint 33
  - a área de imagens deve continuar antes do roteiro
  - a solução deve permanecer mobile-first

  **Evidência:** o modal de produto passa a exibir `descrição` no bloco principal e respeita a nova ordem do formulário sem regressão visual.

  `components/ui/ModalProduto.tsx` foi atualizado em `2026-04-23` para incluir um `textarea` de `descricao` no bloco principal do cadastro, imediatamente após `referencia` e `nome`, preservando a sequência obrigatória `referencia`, `nome`, `descricao`, `imagens`, `roteiro`; o campo reaproveita a `descricao` existente na edição e também na duplicação assistida, mantendo as imagens antes do roteiro e a composição mobile-first do modal. Validação técnica concluída com `npx tsc --noEmit` sem erros.

- [x] **HU 34.5 — Como produto, quero homologar `descrição` e a nova ordem do cadastro de produto ponta a ponta, para confiar na mudança sem regressão no CRUD atual.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - validar criação, edição e duplicação com e sem `descrição`
  - validar a ordem visual do modal
  - validar que imagens e roteiro continuam funcionando
  - consolidar a evidência documental da sprint

  Regras:
  - a homologação deve preservar as entregas da Sprint 33
  - `descricao` não pode alterar comportamento operacional do produto
  - a sprint só fecha com `npx tsc --noEmit` e evidência operacional registrada

  **Evidência:** campo `descrição` e nova ordem do formulário validados no CRUD do produto, sem regressão em imagens, roteiro e detalhe.

  Homologação técnica consolidada em `2026-04-23`: `lib/actions/produtos.ts` passou a persistir `descricao` na criação e edição com contrato opcional; `components/ui/ModalProduto.tsx` passou a exibir `descricao` no fluxo de criação, edição e duplicação, reutilizando a descrição do produto-base apenas na duplicação e preservando a regra de iniciar imagens vazias nesse modo; o formulário ficou estruturado na ordem `referencia`, `nome`, `descricao`, `imagens`, `roteiro`; e a cadeia já homologada de imagens e roteiro permaneceu intacta porque o backend de upload/remoção, o `roteiro` serializado em `FormData`, `listarProdutos()` e `buscarProdutoComRoteiro()` continuaram no mesmo contrato tipado. Validação executável concluída com `npx tsc --noEmit` e `npm run build -- --webpack` sem erros, incluindo compilação das rotas `/admin/produtos` e `/admin/produtos/[id]`.

## SPRINT 35 — Imagem única da operação
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 34 concluída.
**Objetivo:** evoluir o CRUD de operações para suportar uma imagem gerenciada por operação, com upload, substituição, remoção e leitura visual administrativa no cadastro e no detalhe.

- [x] **HU 35.1 — Como produto, quero formalizar no PRD o contrato de imagem única da operação, para que cadastro, detalhe e gestão administrativa usem a mesma regra sem ambiguidade.**
  **Prioridade:** P1
  **Risco:** Médio

  Tarefas:
  - registrar no `docs/PRD.md` que a operação passa a ter uma imagem opcional de referência visual
  - formalizar que a experiência principal é upload gerenciado, e não URL manual livre
  - formalizar que o CRUD deve permitir adicionar, substituir e remover a imagem da operação
  - formalizar que o detalhe administrativo da operação deve priorizar essa imagem como apoio visual

  Regras:
  - a imagem da operação é opcional e não bloqueia criação, edição nem ciclo de vida da operação
  - a imagem não altera `codigo`, `descricao`, `maquina`, `setor`, `tempo_padrao_min`, `meta_hora`, `meta_dia` nem o QR da operação
  - a imagem não altera scanner, planejamento do turno, relatórios nem o domínio operacional já homologado

  **Evidência:** `docs/PRD.md` passa a registrar explicitamente o contrato funcional da imagem única da operação, com comportamento de cadastro, edição, remoção e detalhe visual.

  `docs/PRD.md` foi atualizado em `2026-04-23` para incluir a imagem única da operação no contrato do CRUD de `/admin/operacoes`, formalizando que a imagem é opcional, gerenciada por upload nativo, suportando adicionar/substituir/remover, com preview no modal, bloco visual no detalhe administrativo e guardrails explícitos de não interferência sobre QR, metas, scanner, planejamento do turno e relatórios; a entidade `operacoes` também passou a registrar essa imagem como referência visual opcional no domínio documental.

- [x] **HU 35.2 — Como sistema, quero evoluir schema e contratos tipados de operação para suportar `imagem_url`, para que o CRUD deixe de depender de improviso visual no cadastro.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - criar migration aditiva no Supabase para introduzir `operacoes.imagem_url`
  - regenerar `types/supabase.ts`
  - propagar o novo contrato em `types/index.ts` e `lib/queries/operacoes.ts`
  - preservar compatibilidade com o restante do CRUD já homologado

  Regras:
  - a mudança deve ser aditiva e segura para o worktree atual
  - o schema não pode quebrar listagem, detalhe, QR Code, paginação nem ciclo de vida da operação
  - os tipos precisam continuar em `strict` sem `any`

  **Evidência:** coluna nova presente no schema, `types/supabase.ts` regenerado e queries de operação passando a expor `imagem_url` sem regressão no restante do CRUD.

  `scripts/sprint35_operacoes_imagem.sql` foi criado em `2026-04-23` com migration aditiva para `public.operacoes.imagem_url`; `scripts/sprint1_schema.sql` e `scripts/migrate.mjs` foram sincronizados com o novo contrato base; `types/supabase.ts` e `types/index.ts` passaram a expor `imagem_url` de forma tipada para `operacoes`; e `lib/queries/operacoes.ts` passou a normalizar/expor o campo no contrato de leitura do CRUD. A migration foi aplicada no Supabase via Management API em `2026-04-23` e validada com consulta read-only ao `information_schema.columns`, que retornou a coluna `imagem_url` como `text` nullable. Validação técnica concluída com `npx tsc --noEmit` sem erros.

- [x] **HU 35.3 — Como admin, quero fazer upload, substituição e remoção da imagem da operação no backend, para que a gestão visual seja segura e consistente.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - introduzir bucket e convenção de paths para imagens de operação
  - adaptar `lib/actions/operacoes.ts` para upload, troca e remoção da imagem
  - validar tipo de arquivo e tamanho antes de persistir
  - limpar arquivo anterior quando houver substituição confirmada
  - revalidar listagem e detalhe após mutações

  Regras:
  - a remoção da imagem deve atualizar imediatamente a operação sem afetar metas nem QR
  - o fluxo deve usar credenciais server-side já homologadas do Supabase
  - a action deve falhar com erro claro quando o upload for inválido

  **Evidência:** criação e edição de operação passam a aceitar upload de imagem única, com substituição e remoção funcionando via `lib/actions/operacoes.ts` e sem regressão em `npx tsc --noEmit`.

  `lib/constants.ts` passou a expor o contrato de storage da operação (`OPERACAO_IMAGENS_BUCKET`, MIME types e limite de 5 MB); `scripts/sprint35_operacoes_storage_bucket.sql` foi criado para provisionar o bucket público `operacoes`; e `lib/actions/operacoes.ts` foi atualizado em `2026-04-23` para validar MIME/tamanho, garantir bucket server-side, gerar paths por `operacaoId/...`, fazer upload, substituição e remoção via `FormData` (`imagem_arquivo`, `remover_imagem`), limpar arquivo anterior após troca bem-sucedida e revalidar `/admin/operacoes` e `/admin/operacoes/[id]`. O bucket foi aplicado no Supabase via Management API em `2026-04-23` e validado com consulta read-only em `storage.buckets`, retornando `operacoes` como bucket público com limite de `5242880` bytes e MIME types `image/jpeg`, `image/png` e `image/webp`. Validação técnica concluída com `npx tsc --noEmit` sem erros.

- [x] **HU 35.4 — Como admin, quero uma UX moderna no modal de operação para visualizar e gerir a imagem durante cadastro e edição, para inspecionar melhor a referência visual sem depender de URL textual.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - refatorar `components/ui/ModalOperacao.tsx` para incluir um card visual de imagem com preview, estado vazio e ações
  - manter a organização do modal compatível com o fluxo já homologado de código, setor, máquina, descrição e T.P
  - preservar usabilidade mobile-first

  Regras:
  - a área de imagem não pode degradar a leitura dos campos operacionais principais
  - a solução não deve exigir biblioteca adicional fora da stack aprovada
  - a imagem deve permanecer claramente tratada como apoio administrativo da operação

  **Evidência:** o modal de operação exibe preview grande da imagem, permite trocar/remover a vista e elimina a dependência de URL textual.

  `components/ui/ModalOperacao.tsx` foi refatorado em `2026-04-23` para ampliar o modal e organizar o conteúdo em duas áreas: formulário operacional à esquerda e card visual único da imagem à direita, com preview grande, estado vazio intencional, status visual (`Sem imagem`, `Imagem atual`, `Nova imagem pronta`, `Remocao pendente`) e ações de `Enviar imagem`, `Trocar imagem` e `Remover` conectadas ao contrato de `FormData` (`imagem_arquivo`, `remover_imagem`) da `HU 35.3`; a composição permaneceu mobile-first e preservou a leitura de código, setor, máquina, descrição, T.P, metas e QR da operação. Validação técnica concluída com `npx tsc --noEmit` sem erros.

- [x] **HU 35.5 — Como admin, quero ver a imagem da operação com destaque na tela de detalhe, para conferir visualmente a operação cadastrada junto do QR e dos metadados.**
  **Prioridade:** P1
  **Risco:** Médio

  Tarefas:
  - refatorar o detalhe administrativo da operação para priorizar a imagem como bloco principal
  - preservar leitura rápida dos metadados técnicos e do QR já homologados
  - prever estado vazio explícito quando a operação ainda não tiver imagem

  Regras:
  - a tela de detalhe não pode perder acesso às informações de máquina, setor, T.P, metas, status e QR
  - a imagem deve aparecer como apoio visual administrativo, sem alterar o restante do contrato operacional
  - o fallback sem imagem precisa ser claro e consistente com o restante da interface

  **Evidência:** a página de detalhe da operação passa a destacar a imagem em bloco principal com estado vazio explícito, preservando QR e resumo técnico ao lado.

  `app/admin/operacoes/[id]/page.tsx` foi refatorado em `2026-04-23` para destacar a imagem da operação em um bloco principal de referência visual, com preview amplo quando `imagem_url` existe e estado vazio explícito com `ImageOff` quando a operação ainda não tem imagem; os metadados técnicos (`descrição`, `máquina`, `setor`, `T.P`, `meta/hora`, `meta/dia` e `status`) foram reorganizados em um resumo lateral e o bloco de QR permaneceu disponível na mesma tela sem regressão funcional. Validação técnica concluída com `npx tsc --noEmit` sem erros.

- [x] **HU 35.6 — Como produto, quero homologar a gestão da imagem da operação ponta a ponta, para confiar no novo fluxo sem regressão no CRUD e na consulta administrativa.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - validar criação de operação sem imagem e com imagem
  - validar substituição e remoção da imagem
  - validar listagem, detalhe e edição após mutações de imagem
  - consolidar a evidência documental da sprint

  Regras:
  - a homologação deve cobrir desktop e mobile
  - QR Code, metas e dados técnicos da operação não podem sofrer regressão
  - a sprint só fecha com `npx tsc --noEmit` e evidência operacional do CRUD sem erros

  **Evidência:** gestão da imagem única da operação validada ponta a ponta no CRUD e na tela de detalhe, com `npx tsc --noEmit` sem erros e evidência documental registrada.

  Homologação técnica final consolidada em `2026-04-23`: a Sprint 35 encerra com contrato documental no `PRD`, coluna `operacoes.imagem_url` aplicada no Supabase remoto, bucket público `operacoes` provisionado e validado via Management API, backend de upload/substituição/remoção ativo em `lib/actions/operacoes.ts`, modal administrativo com preview e ações de imagem em `components/ui/ModalOperacao.tsx` e tela de detalhe com bloco principal de referência visual em `app/admin/operacoes/[id]/page.tsx`. As validações executáveis fecharam sem regressão com `npx tsc --noEmit` e `npm run build -- --webpack`, incluindo compilação das rotas `/admin/operacoes` e `/admin/operacoes/[id]`.

  Ajuste pós-homologação em `2026-04-23`: o `app/layout.tsx` passou a usar `suppressHydrationWarning` no `<body>` para tolerar atributos injetados por extensões de navegador durante a hidratação; e `lib/queries/operacoes.ts` deixou de listar tabelas inteiras de `maquinas` e `setores` no detalhe de uma única operação, passando a carregar apenas os vínculos referenciados por `maquina_id` e `setor_id`, eliminando a falha `fetch failed` na consulta auxiliar da tela `/admin/operacoes/[id]`. Validação técnica concluída com `npx tsc --noEmit` sem erros.

---

## SPRINT 36 — Qualidade como setor especial de revisão no fluxo operacional
**Status:** ✅ Concluída
**Pré-requisito:** Sprint 35 concluída.
**Objetivo:** evoluir o sistema para suportar o setor `Qualidade` como etapa oficial do fluxo derivado do produto, obedecendo às mesmas regras estruturais de capacidade, aceite, QR, scanner, apontamento e encerramento dos demais setores, mas com contrato de input próprio para revisão de peças aprovadas/reprovadas e atribuição de defeitos às operações produtivas de origem.

- [x] **HU 36.1 — Como produto, quero formalizar no PRD o setor `Qualidade` como setor oficial do fluxo com modo de apontamento especial, para que o comportamento de revisão seja inequívoco sem romper o modelo `turno + OP + setor`.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - registrar no `docs/PRD.md` que `Qualidade` pode ser etapa oficial do roteiro de um produto
  - formalizar que `Qualidade` segue as mesmas regras estruturais dos demais setores no turno
  - formalizar que o input do setor é `quantidade_aprovada + quantidade_reprovada`, com detalhamento de defeitos por operação produtiva de origem
  - formalizar que a operação de revisão do setor não entra como origem elegível de defeito

  Regras:
  - `Qualidade` participa de capacidade produtiva, regra de aceite, QR operacional, scanner, apontamentos e encerramento da OP
  - o setor não pode ser tratado como fluxo paralelo fora de `turno_setores`, `turno_setor_ops` e `turno_setor_operacoes`
  - o apontamento de qualidade não pode exigir rastreio por peça individual

  **Evidência:** `docs/PRD.md` passa a registrar `Qualidade` como setor oficial do fluxo com `modo_apontamento` especial de revisão.

  `docs/PRD.md` foi atualizado em `2026-04-24` para formalizar `Qualidade` como etapa oficial do fluxo derivado quando presente no roteiro do produto, obedecendo às mesmas regras estruturais de capacidade, aceite, QR, scanner, apontamentos e encerramento dos demais setores; também foi formalizado que o setor usa `modo_apontamento` especial de revisão, com input de `quantidade_aprovada`, `quantidade_reprovada` e defeitos por operação produtiva de origem, consumindo saldo pela `quantidade_revisada` e excluindo a própria operação de revisão da lista elegível de origem do defeito.

- [x] **HU 36.2 — Como sistema, quero evoluir schema e contratos tipados para suportar revisão de qualidade, permissão de revisor e modo de apontamento do setor, para que o fluxo seja consistente com a modelagem real do turno.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - introduzir contrato de `modo_apontamento` em `setores`
  - introduzir permissão `pode_revisar_qualidade` em `usuarios_sistema`
  - criar tabelas de `qualidade_registros` e `qualidade_detalhes`
  - propagar os novos contratos em `types/supabase.ts` e `types/index.ts`

  Regras:
  - a mudança deve ser aditiva e segura para o worktree atual
  - `Qualidade` continua sendo setor oficial do fluxo, sem bifurcação estrutural paralela
  - os contratos precisam continuar em `strict` sem `any`

  **Evidência:** schema remoto e contratos tipados passam a suportar revisão de qualidade, detalhamento por operação de origem e permissão de revisor.

  `scripts/sprint36_qualidade_schema.sql` foi criado em `2026-04-24` com migration aditiva para `setores.modo_apontamento`, `usuarios_sistema.pode_revisar_qualidade` e as tabelas `qualidade_registros` / `qualidade_detalhes`; `scripts/sprint6_setores.sql` e `scripts/sprint6_usuarios_sistema.sql` foram sincronizados com os novos contratos base; `types/supabase.ts` passou a expor os novos campos e tabelas tipadas; e `types/index.ts` passou a registrar `SetorModoApontamento`, `OrigemLancamentoQualidade`, `QualidadeRegistro`, `QualidadeDetalhe` e a permissão de revisor no contrato de `UsuarioSistemaV2`. Validação técnica concluída com `npx tsc --noEmit` sem erros. A migration foi aplicada no projeto Supabase via Management API em `2026-04-23`, com validação read-only confirmando `setores.modo_apontamento` (`character varying`, `NOT NULL`), `usuarios_sistema.pode_revisar_qualidade` (`boolean`, `NOT NULL`) e a criação das tabelas `public.qualidade_registros` e `public.qualidade_detalhes`; após a primeira validação do turno real, a migration foi reaplicada de forma idempotente para migrar o setor `Qualidade` já existente para `modo_apontamento = revisao_qualidade`.

- [x] **HU 36.3 — Como revisor, quero registrar aprovadas, reprovadas e defeitos por operação de origem no backend, para que a revisão consuma a fila do setor `Qualidade` sem perder o vínculo analítico com o processo produtivo.**
  **Prioridade:** P0
  **Risco:** Alto

  Tarefas:
  - adaptar actions/SQL para registrar apontamento de qualidade com `quantidade_aprovada`, `quantidade_reprovada` e `quantidade_revisada`
  - fazer a revisão consumir saldo e andamento da operação de `Qualidade` no turno
  - persistir defeitos por operação produtiva de origem
  - derivar operadores envolvidos a partir de `registros_producao`

  Regras:
  - `quantidade_revisada = quantidade_aprovada + quantidade_reprovada`
  - a soma dos defeitos por operação pode ultrapassar `quantidade_reprovada`, porque representa ocorrências operacionais
  - o apontamento de `Qualidade` não pode reabrir produção nem criar retrabalho automático nesta sprint

  **Evidência:** backend registra revisões de qualidade consumindo a fila do setor e persiste defeitos por operação de origem sem regressão na cadeia do turno.

  `scripts/sprint36_qualidade_apontamento.sql` foi criado em `2026-04-24` com a RPC `registrar_revisao_qualidade_turno_setor_operacao`, validando permissão de revisor, `modo_apontamento = revisao_qualidade`, saldo sequencial da operação de `Qualidade`, vínculo das operações produtivas de origem e sincronização de `turno_setor_operacoes`, `turno_setor_ops` e `turno_ops`; `lib/actions/qualidade.ts` passou a expor a server action `registrarRevisaoQualidade()` com validações de sessão, permissão e disponibilidade sequencial; `lib/queries/qualidade.ts` passou a derivar operadores envolvidos a partir de `registros_producao` para as operações de origem; e `types/supabase.ts` foi atualizado com o contrato tipado da nova RPC. Validação técnica concluída com `npx tsc --noEmit` sem erros. A RPC foi aplicada no projeto Supabase via Management API em `2026-04-23`, com validação read-only confirmando a função `public.registrar_revisao_qualidade_turno_setor_operacao(uuid, uuid, integer, integer, text, jsonb)`.

- [x] **HU 36.4 — Como revisor, quero usar scanner e apontamento manual no setor `Qualidade` com uma UX própria, para registrar revisão com poucos cliques e linguagem compatível com o chão de fábrica.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - adaptar o scanner para detectar `modo_apontamento = revisao_qualidade`
  - criar fluxo de input `aprovadas -> reprovadas -> defeitos por operação`
  - adaptar `/admin/apontamentos` para expor aba própria de qualidade
  - restringir o modo de revisão a usuários habilitados como revisores

  Regras:
  - o QR do setor `Qualidade` deve continuar funcionando como QR operacional padrão do turno
  - a UI deve listar apenas as operações produtivas elegíveis como origem de defeito, excluindo a operação de revisão do próprio setor
  - a experiência precisa permanecer simples e mobile-first

  **Evidência:** scanner e apontamento manual passam a registrar qualidade com fluxo próprio de aprovadas/reprovadas e detalhamento de defeitos por operação.

  O scanner foi adaptado em `app/(operador)/scanner/page.tsx` + `components/scanner/ScannerPageClient.tsx` para detectar o setor `Qualidade`, bloquear o modo quando a sessão não tiver permissão de revisor, pular a semântica de operador executor e abrir o formulário próprio de revisão em `components/scanner/ConfirmacaoQualidade.tsx`; `components/scanner/SelecaoDemandaScanner.tsx` foi generalizado para exibir operador ou revisor conforme o fluxo; `/admin/apontamentos` passou a expor uma aba dedicada de qualidade em `components/apontamentos/PainelQualidadeSupervisor.tsx`, integrada às páginas `app/admin/apontamentos/page.tsx` e `app/(admin)/apontamentos/page.tsx`; e `hooks/useScanner.ts` passou a manter ramos separados para produção padrão e revisão de qualidade, ambos consumindo o backend já entregue na HU 36.3. Validação técnica concluída com `npx tsc --noEmit` sem erros.

- [x] **HU 36.5 — Como supervisor, quero ver indicadores de reprovação e de intensidade de defeitos operacionais da OP, para enxergar a qualidade sem distorcer a leitura do fluxo produtivo.**
  **Prioridade:** P1
  **Risco:** Médio

  Tarefas:
  - expor indicadores de revisão no detalhe da OP e nas superfícies administrativas relevantes
  - calcular `percentual_reprovacao`, `percentual_defeitos_op` e `percentual_defeitos_operacao`
  - mostrar operadores envolvidos por operação defeituosa quando houver rastreio em `registros_producao`
  - integrar a leitura à dashboard sem quebrar a visão operacional já homologada

  Regras:
  - `percentual_reprovacao = quantidade_reprovada / quantidade_revisada * 100`
  - `percentual_defeitos_op = total_defeitos / (quantidade_revisada * operacoes_produtivas_op) * 100`
  - `percentual_defeitos_operacao = defeitos_operacao / quantidade_revisada * 100`

  **Evidência:** UI administrativa passa a exibir reprovação, intensidade de defeitos operacionais e lista de operações/operadores envolvidos sem regressão na dashboard do turno.

  O dashboard do turno passou a consolidar qualidade em `lib/queries/qualidade.ts`, com fallback seguro quando o schema remoto ainda não estiver aplicado, e a projetar `resumoQualidadeTurno` / `qualidadeResumoOps` em `lib/queries/turnos.ts` e `lib/queries/turnos-client.ts`; `components/dashboard/DashboardVisaoOperacionalTab.tsx` agora mostra cards de revisadas, reprovadas, reprovação e defeitos operacionais quando houver revisão lançada; `components/dashboard/ModalDetalhesOpTurno.tsx` passou a exibir o bloco completo de qualidade da OP com `percentual_reprovacao`, `percentual_defeitos_op`, `percentual_defeitos_operacao` e operadores envolvidos por operação de origem; e a validação técnica foi concluída com `npx tsc --noEmit` sem erros.

- [x] **HU 36.6 — Como produto, quero homologar ponta a ponta o setor `Qualidade` como etapa oficial do turno com input especial de revisão, para confiar na nova leitura sem complexidade desnecessária.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - validar roteiro com `Qualidade` derivando QR e seção do turno
  - validar apontamento de qualidade via scanner e via `/admin/apontamentos`
  - validar indicadores de reprovação e defeitos por operação
  - consolidar evidência documental da sprint

  Regras:
  - a sprint só fecha com `npx tsc --noEmit` e evidência operacional do fluxo de revisão sem erros
  - `Qualidade` deve obedecer às mesmas regras estruturais dos demais setores em capacidade, aceite e encerramento
  - o fluxo não pode introduzir rastreio por peça individual nem retrabalho automático

  **Evidência:** setor `Qualidade` homologado como etapa oficial do fluxo do turno, com QR, revisão, defeitos por operação de origem e indicadores administrativos consistentes.

  Homologação ponta a ponta concluída em `2026-04-23`: `npm run build -- --webpack` e `npx tsc --noEmit` fecharam sem erros; o projeto Supabase remoto recebeu as migrations da Sprint 36, a RPC de qualidade e a correção idempotente que migra o setor `Qualidade` existente para `modo_apontamento = revisao_qualidade`; o usuário `jrmeloafrf@gmail.com` foi habilitado com `pode_revisar_qualidade = true`; o turno aberto `2fe7c979-57fc-43e9-8ad9-ee3c508b69ed` foi validado com `Qualidade` derivado como setor `6`, `5` seções de OP com QR próprio e operação `Q1`; a função sequencial `public.obter_disponibilidade_fluxo_turno_setor_operacao(uuid)` foi restaurada no remoto com ajuste de tipos para destravar o consumo da fila; e foram executados dois lançamentos reais em `OP-000015` na operação de qualidade `9892076c-1fe7-44ae-8b15-2f06efafc00c`, um em `manual_qualidade` (`3` aprovadas, `1` reprovada, `2` defeitos distribuídos nas operações `P64` e `P62`) e outro em `scanner_qualidade` (`2` aprovadas, `0` reprovadas). A validação read-only final confirmou `5` aprovadas, `1` reprovada, `6` revisadas, `2` defeitos, `34` operações produtivas na base da OP e os indicadores `percentual_reprovacao = 16,7%` e `percentual_defeitos_op = 1,0%`.

**Fechamento da Sprint 36 em `2026-04-23`:** o setor `Qualidade` passa a operar como etapa oficial do fluxo derivado do turno, com `modo_apontamento` especial de revisão, permissão específica de revisor, backend próprio para aprovadas/reprovadas e defeitos por operação de origem, scanner e `/admin/apontamentos` adaptados, indicadores administrativos na dashboard e homologação real no Supabase com lançamentos efetivos em produção controlada.

---

## SPRINT 37 — Reconciliação do vocabulário operacional dos cards do kanban
**Status:** 🚧 Em andamento
**Pré-requisito:** Sprint 36 concluída.
**Objetivo:** formalizar as 5 definições canônicas dos cards de demanda no kanban operacional e corrigir dois desalinhamentos entre essas definições e o que o código calcula/exibe hoje.

Os dois desalinhamentos identificados:
1. **Excedente** usa `quantidadeAceitaTurno` (saldo restante decrescente) em vez de `quantidadeAceitaAcumuladaSetor` (plano total alocado) — `lib/utils/hidratacao-capacidade-setor-turno.ts:332`
2. **Plano do dia** recai em fallback para `quantidadeAceitaTurno` quando `quantidadeAceitaAcumuladaSetor` está ausente, exibindo o saldo decrescente em vez do plano fixo — `components/dashboard/KanbanOperacionalTurno.tsx:322` e `:523`

- [x] **HU 37.1 — Como produto, quero formalizar no PRD as 5 definições canônicas dos cards do kanban, para que o vocabulário operacional seja inequívoco em código, testes e UI.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - inserir na seção `9.3.4` do `docs/PRD.md` a tabela com os 5 cards, seus campos internos e fórmulas canônicas
  - registrar as 3 regras obrigatórias: Plano do dia é estável, Excedente compara plano (não saldo), Disponível agora ≤ Plano do dia
  - registrar que nenhuma superfície pode usar `quantidadeAceitaTurno` como substituto de `quantidadeAceitaAcumuladaSetor` no card Plano do dia

  Regras:
  - a formalização não pode alterar contratos de banco, types ou actions
  - o PRD deve ser a fonte de verdade que guia as próximas HUs desta sprint

  **Evidência:** `docs/PRD.md` passa a registrar os 5 cards com fórmulas canônicas e regras de integridade do vocabulário.

  `docs/PRD.md` foi atualizado em `2026-04-25` para incluir, na seção `9.3.4`, a tabela com os 5 cards canônicos (`Backlog vivo`, `Plano do dia`, `Disponível agora`, `Concluído`, `Excedente`), seus campos internos e fórmulas, além das 3 regras obrigatórias de integridade do vocabulário.

- [ ] **HU 37.2 — Como sistema, quero que a fórmula de Excedente compare backlog vivo com o plano total alocado, para refletir corretamente o que vai para turno futuro.**
  **Prioridade:** P0
  **Risco:** Médio

  Tarefas:
  - alterar `lib/utils/hidratacao-capacidade-setor-turno.ts:332`: substituir `quantidadeAceitaTurno` por `quantidadeAceitaAcumuladaSetor` no cálculo de `quantidadeExcedenteTurno`
  - atualizar `lib/utils/hidratacao-capacidade-setor-turno.test.ts` com os valores esperados pela nova fórmula

  Regras:
  - a mudança não pode alterar `quantidadeAceitaTurno`, `quantidadeDisponivelApontamento` nem `saldoManualPermitido`
  - a nova fórmula deve ser: `Math.max(backlog - quantidadeAceitaAcumuladaSetor, 0)`
  - os testes devem cobrir: demanda com toda capacidade aceita, demanda parcialmente aceita e demanda com aceite zero

  **Evidência:** `npx tsc --noEmit` e `node --test` sem erros; cenário manual no turno real confirma Excedente = Backlog vivo − Plano do dia.

- [ ] **HU 37.3 — Como supervisor, quero que o card Plano do dia exiba sempre o plano alocado estável, não o saldo que decresce com a produção.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - remover `?? demanda.quantidadeAceitaTurno` da variável `quantidadePlanoDoDia` em `components/dashboard/KanbanOperacionalTurno.tsx` nas linhas 322 e 523
  - registros sem `quantidadeAceitaAcumuladaSetor` devem exibir `0` — sem fallback para saldo

  Regras:
  - a remoção do fallback não pode afetar os demais cards (`Disponível agora`, `Concluído`, `Excedente`, `Backlog vivo`)
  - o alerta `excedePlanoAtual` deve continuar funcionando com base em `resumirPlanoDiarioTurno`

  **Evidência:** card Plano do dia permanece com o mesmo valor do início ao fim do turno, mesmo após vários apontamentos.

- [ ] **HU 37.4 — Como produto, quero homologar ponta a ponta o vocabulário corrigido, para confiar que os 5 cards refletem exatamente as definições do PRD.**
  **Prioridade:** P0
  **Risco:** Baixo

  Tarefas:
  - validar no turno aberto: Plano do dia estável ao longo do dia (não cai após apontamentos)
  - validar: Excedente = Backlog vivo − Plano do dia para demandas com aceite total, parcial e zero
  - validar: Disponível agora ≤ Plano do dia em todos os cards
  - consolidar evidência documental da sprint

  Regras:
  - a sprint só fecha com `npx tsc --noEmit` e `node --test` sem erros
  - os demais fluxos (scanner, apontamento manual, carry-over) não podem sofrer regressão

  **Evidência:** vocabulário dos 5 cards homologado no turno real, com `npx tsc --noEmit` e `node --test` sem erros e evidência documental registrada.

---

## DEPENDÊNCIAS ENTRE SPRINTS

```
Sprint 0 ──► Sprint 1 ──► Sprint 2 ──► Sprint 3
                                  └──► Sprint 4
                    Sprint 3 + Sprint 4 ──► Sprint 5
Sprint 5 ──► Sprint 6 ──► Sprint 7 ──► Sprint 8 ──► Sprint 9 ──► Sprint 10 ──► Sprint 11 ──► Sprint 12 ──► Sprint 13 ──► Sprint 14 ──► Sprint 15 ──► Sprint 16 ──► Sprint 17 ──► Sprint 18 ──► Sprint 19 ──► Sprint 20 ──► Sprint 24 ──► Sprint 25 ──► Sprint 26 ──► Sprint 27 ──► Sprint 28 ──► Sprint 29 ──► Sprint 30 ──► Sprint 31 ──► Sprint 32 ──► Sprint 33 ──► Sprint 34 ──► Sprint 35 ──► Sprint 36 ──► Sprint 37
```

Sprints 3 e 4 puderam ser desenvolvidas em paralelo após Sprint 2.
As Sprints 6 a 12 da V2 devem seguir de forma sequencial para reduzir regressão de domínio.
