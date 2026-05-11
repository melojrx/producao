import fs from 'node:fs'

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

async function executarQuery(projectRef, managementApiKey, query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`,
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

function montarSqlDiagnostico() {
  return `
with turnos_recentes as (
  select id, status, iniciado_em, encerrado_em, created_at
  from turnos
  order by iniciado_em desc nulls last, created_at desc
  limit 6
),
ops_recentes as (
  select
    t.id as turno_id,
    t.status as turno_status,
    t.iniciado_em,
    t.encerrado_em,
    op.id as turno_op_id,
    op.numero_op,
    op.turno_op_origem_id,
    op.quantidade_planejada,
    op.quantidade_realizada,
    op.quantidade_planejada_remanescente,
    op.status as op_status
  from turnos_recentes t
  join turno_ops op on op.turno_id = t.id
),
demandas_recentes as (
  select
    op.turno_id,
    op.turno_op_id,
    op.numero_op,
    d.id as demanda_id,
    d.setor_id,
    s.codigo as setor_codigo,
    s.nome as setor_nome,
    d.quantidade_planejada,
    d.quantidade_realizada,
    d.quantidade_liberada_setor,
    d.status as demanda_status
  from ops_recentes op
  join turno_setor_demandas d on d.turno_op_id = op.turno_op_id
  join setores s on s.id = d.setor_id
),
operacoes_recentes as (
  select
    op.turno_id,
    op.turno_op_id,
    op.numero_op,
    tso.setor_id,
    count(*) as apontamentos,
    coalesce(sum(tso.quantidade_realizada), 0) as soma_quantidade_realizada,
    coalesce(min(tso.quantidade_realizada), 0) as menor_quantidade_realizada,
    coalesce(max(tso.quantidade_realizada), 0) as maior_quantidade_realizada
  from ops_recentes op
  left join turno_setor_operacoes tso on tso.turno_op_id = op.turno_op_id
  group by op.turno_id, op.turno_op_id, op.numero_op, tso.setor_id
),
diagnostico_por_demanda as (
  select
    d.turno_id,
    d.turno_op_id,
    d.numero_op,
    d.setor_codigo,
    d.setor_nome,
    d.quantidade_planejada as demanda_planejada,
    d.quantidade_realizada as demanda_realizada,
    d.quantidade_liberada_setor as demanda_liberada,
    d.demanda_status,
    coalesce(o.apontamentos, 0) as apontamentos,
    coalesce(o.soma_quantidade_realizada, 0) as soma_operacoes_realizada,
    coalesce(o.menor_quantidade_realizada, 0) as menor_operacao_realizada,
    coalesce(o.maior_quantidade_realizada, 0) as maior_operacao_realizada
  from demandas_recentes d
  left join operacoes_recentes o
    on o.turno_op_id = d.turno_op_id
    and o.setor_id = d.setor_id
)
select jsonb_build_object(
  'turnos_recentes', coalesce((select jsonb_agg(turnos_recentes order by iniciado_em desc nulls last, created_at desc) from turnos_recentes), '[]'::jsonb),
  'ops_recentes', coalesce((select jsonb_agg(ops_recentes order by iniciado_em desc nulls last, numero_op) from ops_recentes), '[]'::jsonb),
  'demandas', coalesce((select jsonb_agg(diagnostico_por_demanda order by turno_id, numero_op, setor_codigo) from diagnostico_por_demanda), '[]'::jsonb)
) as diagnostico
`
}

async function main() {
  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const diagnostico = await executarQuery(projectRef, managementApiKey, montarSqlDiagnostico())

  console.log(JSON.stringify(diagnostico, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
