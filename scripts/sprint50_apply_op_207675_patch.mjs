import fs from 'node:fs'

const SQL_PATCH_PATH = 'scripts/sprint50_corrigir_op_207675_quantidade_fisica.sql'

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
with atual as (
  select op.*
  from public.turno_ops as op
  join public.turnos as turno
    on turno.id = op.turno_id
  where op.numero_op = '207675'
  order by turno.iniciado_em desc nulls last, op.created_at desc nulls last
  limit 1
),
linhagem as (
  select op.id
  from public.turno_ops as op
  join atual
    on op.id = atual.id
    or op.id = atual.turno_op_origem_id
)
select
  'turno_ops' as origem,
  count(*) filter (where quantidade_planejada = 1306) as planejada_1306,
  count(*) filter (where quantidade_planejada = 1305) as planejada_1305,
  count(*) filter (where quantidade_planejada_remanescente > 0) as com_saldo_remanescente
from public.turno_ops
where id in (select id from linhagem)
union all
select
  'turno_setor_demandas' as origem,
  count(*) filter (where quantidade_planejada = 1306) as planejada_1306,
  count(*) filter (where quantidade_planejada = 1305) as planejada_1305,
  count(*) filter (where status <> 'concluida') as com_saldo_remanescente
from public.turno_setor_demandas
where turno_op_id in (select id from linhagem)
union all
select
  'turno_setor_ops' as origem,
  count(*) filter (where quantidade_planejada = 1306) as planejada_1306,
  count(*) filter (where quantidade_planejada = 1305) as planejada_1305,
  count(*) filter (where status <> 'concluida') as com_saldo_remanescente
from public.turno_setor_ops
where turno_op_id in (select id from linhagem)
union all
select
  'turno_setor_operacoes' as origem,
  count(*) filter (where quantidade_planejada = 1306) as planejada_1306,
  count(*) filter (where quantidade_planejada = 1305) as planejada_1305,
  count(*) filter (where status <> 'concluida') as com_saldo_remanescente
from public.turno_setor_operacoes
where turno_op_id in (select id from linhagem)
order by origem;
`
}

async function main() {
  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const sqlPatch = fs.readFileSync(SQL_PATCH_PATH, 'utf8')

  const antes = await executarQuery(projectRef, managementApiKey, montarSqlValidacao(), true)
  const patch = await executarQuery(projectRef, managementApiKey, sqlPatch)
  const depois = await executarQuery(projectRef, managementApiKey, montarSqlValidacao(), true)

  console.log(JSON.stringify({ projectRef, antes, patch, depois }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
