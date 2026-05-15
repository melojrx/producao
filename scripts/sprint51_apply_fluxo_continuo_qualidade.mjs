import fs from 'node:fs'

const SQL_PATCH_PATH = 'scripts/sprint51_fluxo_continuo_qualidade.sql'

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
select
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'qualidade_lotes'
  ) as qualidade_lotes_existe,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'qualidade_defeitos'
  ) as qualidade_defeitos_existe,
  exists (
    select 1
    from pg_trigger
    where tgname = 'trg_registros_producao_criar_lote_qualidade'
      and not tgisinternal
  ) as trigger_lote_existe,
  exists (
    select 1
    from pg_proc
    where proname = 'criar_lote_qualidade_de_registro_producao'
  ) as funcao_lote_existe,
  exists (
    select 1
    from pg_proc
    where proname = 'registrar_revisao_lote_qualidade'
  ) as funcao_revisao_lote_existe,
  (
    select count(*)::integer
    from public.qualidade_defeitos
    where ativo = true
  ) as defeitos_ativos;
`
}

async function main() {
  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const sqlPatch = fs.readFileSync(SQL_PATCH_PATH, 'utf8')

  const patch = await executarQuery(projectRef, managementApiKey, sqlPatch)
  const validacao = await executarQuery(projectRef, managementApiKey, montarSqlValidacao(), true)

  console.log(JSON.stringify({ projectRef, patch, validacao }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
