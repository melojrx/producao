import fs from 'node:fs'

const DEMANDA_PREPARACAO_OP_13089_ID = 'a38ac71b-0f79-4ff3-8df9-5ec2003f1639'
const TURNO_OP_13089_ATUAL_ID = '8656f0ec-d755-44ba-8309-da0b0734c4df'

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

    env.set(
      linhaNormalizada.slice(0, separadorIndex),
      linhaNormalizada.slice(separadorIndex + 1)
    )
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

function montarSqlAntesDepois() {
  return `
select
  d.id as demanda_id,
  d.turno_op_id,
  op.numero_op,
  s.codigo as setor_codigo,
  s.nome as setor_nome,
  d.quantidade_planejada,
  d.quantidade_realizada,
  d.quantidade_liberada_setor,
  d.status
from turno_setor_demandas d
join turno_ops op on op.id = d.turno_op_id
join setores s on s.id = d.setor_id
where d.id = '${DEMANDA_PREPARACAO_OP_13089_ID}'::uuid
  and d.turno_op_id = '${TURNO_OP_13089_ATUAL_ID}'::uuid
`
}

function montarSqlPatch() {
  return `
update turno_setor_demandas
set
  quantidade_liberada_setor = 0,
  status = 'concluida',
  updated_at = now()
where id = '${DEMANDA_PREPARACAO_OP_13089_ID}'::uuid
  and turno_op_id = '${TURNO_OP_13089_ATUAL_ID}'::uuid
  and quantidade_realizada = 0
  and quantidade_liberada_setor = 792
returning
  id as demanda_id,
  turno_op_id,
  quantidade_planejada,
  quantidade_realizada,
  quantidade_liberada_setor,
  status,
  updated_at
`
}

async function main() {
  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

  const antes = await executarQuery(projectRef, managementApiKey, montarSqlAntesDepois(), true)
  const patch = await executarQuery(projectRef, managementApiKey, montarSqlPatch())
  const depois = await executarQuery(projectRef, managementApiKey, montarSqlAntesDepois(), true)

  console.log(JSON.stringify({ antes, patch, depois }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
