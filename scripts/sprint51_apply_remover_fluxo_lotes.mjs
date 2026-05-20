import fs from 'node:fs'

const SQL_PATCH_PATH = 'scripts/sprint51_remover_fluxo_lotes_qualidade.sql'

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

function montarSqlValidacaoAntes() {
  return `
select
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'qualidade_lotes'
  ) as tabela_qualidade_lotes_existe,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'qualidade_registros'
      and column_name = 'qualidade_lote_id'
  ) as coluna_qualidade_lote_id_existe,
  exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'registrar_revisao_lote_qualidade'
  ) as rpc_lote_existe,
  exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'registrar_revisao_qualidade_turno_setor_operacao'
  ) as rpc_operacional_existe,
  (select count(*)::integer from public.qualidade_lotes) as lotes_existentes;
`
}

function montarSqlValidacaoDepois() {
  return `
select
  not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'qualidade_lotes'
  ) as tabela_removida,
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'qualidade_registros'
      and column_name = 'qualidade_lote_id'
  ) as coluna_removida,
  not exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'registrar_revisao_lote_qualidade'
  ) as rpc_lote_removida,
  exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'registrar_revisao_qualidade_turno_setor_operacao'
  ) as rpc_operacional_preservada,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'qualidade_registros'
  ) as tabela_registros_preservada,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'qualidade_detalhes'
  ) as tabela_detalhes_preservada,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'qualidade_defeitos'
  ) as tabela_defeitos_preservada;
`
}

async function main() {
  console.log('=== HU 51.12 — Remoção do fluxo paralelo de qualidade por lotes ===\n')

  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

  console.log(`Projeto: ${projectRef}\n`)

  // Passo 1: Validação antes
  console.log('--- Passo 1: Validação do estado atual ---')
  const antes = await executarQuery(projectRef, managementApiKey, montarSqlValidacaoAntes(), true)
  const estadoAntes = antes[0]
  console.log(JSON.stringify(estadoAntes, null, 2))

  if (!estadoAntes.tabela_qualidade_lotes_existe) {
    console.log('\n✅ Tabela qualidade_lotes já não existe. Migration já aplicada.')
    return
  }

  if (!estadoAntes.rpc_operacional_existe) {
    throw new Error('RPC operacional não encontrada — estado inesperado, abortando.')
  }

  console.log(`\nLotes existentes no banco: ${estadoAntes.lotes_existentes}`)

  if (estadoAntes.lotes_existentes > 0) {
    console.log('⚠️  Existem lotes na tabela. Serão perdidos ao dropar.')
    console.log('    (Dados de revisão em qualidade_registros serão preservados.)')
  }

  // Passo 2: Aplicar migration
  console.log('\n--- Passo 2: Aplicar migration SQL ---')
  const sqlPatch = fs.readFileSync(SQL_PATCH_PATH, 'utf8')
  const resultadoMigration = await executarQuery(projectRef, managementApiKey, sqlPatch)
  console.log('Migration aplicada:', JSON.stringify(resultadoMigration, null, 2))

  // Passo 3: Validação depois
  console.log('\n--- Passo 3: Validação pós-migration ---')
  const depois = await executarQuery(projectRef, managementApiKey, montarSqlValidacaoDepois(), true)
  const estadoDepois = depois[0]
  console.log(JSON.stringify(estadoDepois, null, 2))

  const todosOk = estadoDepois.tabela_removida
    && estadoDepois.coluna_removida
    && estadoDepois.rpc_lote_removida
    && estadoDepois.rpc_operacional_preservada
    && estadoDepois.tabela_registros_preservada
    && estadoDepois.tabela_detalhes_preservada
    && estadoDepois.tabela_defeitos_preservada

  if (todosOk) {
    console.log('\n✅ HU 51.12 — Migration concluída com sucesso.')
    console.log('   - qualidade_lotes: REMOVIDA')
    console.log('   - qualidade_lote_id: REMOVIDA')
    console.log('   - registrar_revisao_lote_qualidade: REMOVIDA')
    console.log('   - registrar_revisao_qualidade_turno_setor_operacao: PRESERVADA')
    console.log('   - qualidade_registros: PRESERVADA')
    console.log('   - qualidade_detalhes: PRESERVADA')
    console.log('   - qualidade_defeitos: PRESERVADA')
  } else {
    console.error('\n❌ Validação falhou. Verificar estado manualmente.')
    console.error(estadoDepois)
    process.exit(1)
  }
}

main().catch((erro) => {
  console.error('Erro fatal:', erro.message)
  process.exit(1)
})
