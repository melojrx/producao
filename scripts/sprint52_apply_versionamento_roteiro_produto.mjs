import fs from 'node:fs'

const SQL_PATCH_PATH = 'scripts/sprint52_versionamento_roteiro_produto.sql'

function carregarEnvLocal() {
  const conteudo = fs.readFileSync('.env.local', 'utf8')
  const env = new Map()

  for (const linha of conteudo.split('\n')) {
    const linhaNormalizada = linha.trim()

    if (!linhaNormalizada || linhaNormalizada.startsWith('#')) {
      continue
    }

    const separadorIndex = linhaNormalizada.indexOf('=')

    if (separadorIndex === -1) {
      continue
    }

    env.set(linhaNormalizada.slice(0, separadorIndex), linhaNormalizada.slice(separadorIndex + 1))
  }

  return env
}

function obterValorObrigatorio(env, chave) {
  const valor = env.get(chave)

  if (!valor) {
    throw new Error(`Variavel ${chave} ausente em .env.local`)
  }

  return valor
}

async function executarQuery(projectRef, managementApiKey, query, readOnly = false) {
  const rota = readOnly ? 'query/read-only' : 'query'
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/${rota}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${managementApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  )
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(JSON.stringify(payload, null, 2))
  }

  return payload
}

function montarSqlValidacao() {
  return `
with funcoes as (
  select
    p.proname,
    pg_get_functiondef(p.oid) as definicao
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('sincronizar_turno_setor_ops', 'sincronizar_turno_setor_operacoes')
)
select
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'produto_operacoes'
      and column_name = 'versao_roteiro'
  ) as coluna_versao_existe,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'produto_operacoes'
      and column_name = 'vigente'
  ) as coluna_vigente_existe,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'produto_operacoes'
      and column_name = 'substituido_em'
  ) as coluna_substituido_existe,
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'produto_operacoes'
      and indexname = 'produto_operacoes_produto_versao_sequencia_uidx'
  ) as indice_versao_existe,
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'produto_operacoes'
      and indexname = 'produto_operacoes_produto_vigente_sequencia_uidx'
  ) as indice_vigente_existe,
  exists (
    select 1
    from funcoes
    where proname = 'sincronizar_turno_setor_ops'
      and definicao ilike '%produto_operacao.vigente = true%'
  ) as funcao_setores_filtra_vigente,
  exists (
    select 1
    from funcoes
    where proname = 'sincronizar_turno_setor_operacoes'
      and definicao ilike '%produto_operacao.vigente = true%'
  ) as funcao_operacoes_filtra_vigente;
`
}

function validarEstado(estado) {
  return Boolean(
    estado.coluna_versao_existe &&
      estado.coluna_vigente_existe &&
      estado.coluna_substituido_existe &&
      estado.indice_versao_existe &&
      estado.indice_vigente_existe &&
      estado.funcao_setores_filtra_vigente &&
      estado.funcao_operacoes_filtra_vigente
  )
}

async function main() {
  console.log('=== HU 52.2 — Versionamento de roteiro de produto ===\n')

  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

  console.log(`Projeto: ${projectRef}\n`)

  console.log('--- Passo 1: Validação do estado atual ---')
  const antes = await executarQuery(projectRef, managementApiKey, montarSqlValidacao(), true)
  console.log(JSON.stringify(antes[0], null, 2))

  console.log('\n--- Passo 2: Aplicar migration SQL ---')
  const sqlPatch = fs.readFileSync(SQL_PATCH_PATH, 'utf8')
  const resultadoMigration = await executarQuery(projectRef, managementApiKey, sqlPatch)
  console.log('Migration aplicada:', JSON.stringify(resultadoMigration, null, 2))

  console.log('\n--- Passo 3: Validação pós-migration ---')
  const depois = await executarQuery(projectRef, managementApiKey, montarSqlValidacao(), true)
  const estadoDepois = depois[0]
  console.log(JSON.stringify(estadoDepois, null, 2))

  if (!validarEstado(estadoDepois)) {
    throw new Error('Validação da HU 52.2 falhou após migration.')
  }

  console.log('\n✅ HU 52.2 — Schema de roteiro versionado validado.')
}

main().catch((erro) => {
  console.error('Erro fatal:', erro.message)
  process.exit(1)
})
