import fs from 'node:fs'

const TURNO_ORIGEM_ID = '8289f704-bd52-4b6c-82cd-b150f4d8705d'
const TURNO_DESTINO_ID = '655fe974-a09a-4051-b4ad-60a2f0965bc2'

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

function montarSqlReadOnly() {
  return `
with params as (
  select
    '${TURNO_ORIGEM_ID}'::uuid as turno_origem_id,
    '${TURNO_DESTINO_ID}'::uuid as turno_destino_id
),
destino_ops as (
  select
    d.id as turno_op_destino_id,
    d.turno_op_origem_id,
    d.numero_op,
    d.quantidade_planejada as op_destino_planejada,
    d.quantidade_realizada as op_destino_realizada,
    d.quantidade_planejada_remanescente as op_destino_remanescente,
    d.status as op_destino_status
  from turno_ops d
  join params p on p.turno_destino_id = d.turno_id
  where d.turno_op_origem_id is not null
),
origem_ops as (
  select
    o.id as turno_op_origem_row_id,
    o.turno_op_origem_id as turno_op_raiz_id,
    o.numero_op,
    o.quantidade_planejada as op_origem_planejada,
    o.quantidade_realizada as op_origem_realizada,
    o.quantidade_planejada_remanescente as op_origem_remanescente,
    o.status as op_origem_status
  from turno_ops o
  join params p on p.turno_origem_id = o.turno_id
),
origem_demandas as (
  select
  od.id as demanda_origem_id,
    od.turno_op_id as turno_op_origem_row_id,
    od.setor_id,
    s.codigo as setor_codigo,
    s.nome as setor_nome,
    od.quantidade_planejada as origem_planejada,
    od.quantidade_realizada as origem_realizada,
    od.quantidade_liberada_setor as origem_liberada,
    od.status as origem_status
  from turno_setor_demandas od
  join setores s on s.id = od.setor_id
  join params p on p.turno_origem_id = od.turno_id
),
destino_demandas as (
  select
    dd.id as demanda_destino_id,
    dd.turno_op_id as turno_op_destino_id,
    dd.setor_id,
    dd.quantidade_planejada as destino_planejada,
    dd.quantidade_realizada as destino_realizada,
    dd.quantidade_liberada_setor as destino_liberada,
    dd.status as destino_status
  from turno_setor_demandas dd
  join params p on p.turno_destino_id = dd.turno_id
),
operacoes_destino_setor as (
  select
    tso.turno_op_id as turno_op_destino_id,
    tso.setor_id,
    count(*) as apontamentos_destino,
    coalesce(sum(tso.quantidade_realizada), 0) as soma_realizada_destino,
    coalesce(max(tso.quantidade_realizada), 0) as maior_realizada_destino,
    coalesce(min(tso.quantidade_realizada), 0) as menor_realizada_destino
  from turno_setor_operacoes tso
  join params p on p.turno_destino_id = tso.turno_id
  group by tso.turno_op_id, tso.setor_id
)
select
  dop.numero_op,
  dop.turno_op_origem_id,
  oop.turno_op_origem_row_id,
  dop.turno_op_destino_id,
  od.setor_codigo,
  od.setor_nome,
  od.origem_planejada,
  od.origem_realizada,
  od.origem_liberada,
  dd.destino_planejada,
  dd.destino_realizada,
  dd.destino_liberada,
  coalesce(ods.apontamentos_destino, 0) as apontamentos_destino,
  coalesce(ods.soma_realizada_destino, 0) as soma_realizada_destino,
  coalesce(ods.maior_realizada_destino, 0) as maior_realizada_destino,
  coalesce(ods.menor_realizada_destino, 0) as menor_realizada_destino,
  case
    when coalesce(ods.apontamentos_destino, 0) > 0 then 'nao_aplicar_update_direto_tem_apontamento_no_turno_novo'
    when coalesce(od.origem_liberada, 0) > coalesce(dd.destino_liberada, 0) then 'candidato_update_liberacao_destino'
    else 'sem_acao'
  end as acao_recomendada,
  greatest(coalesce(od.origem_liberada, 0) - coalesce(dd.destino_liberada, 0), 0) as delta_liberacao
from destino_ops dop
join origem_ops oop
  on oop.turno_op_origem_row_id = dop.turno_op_origem_id
  or oop.turno_op_raiz_id = dop.turno_op_origem_id
join origem_demandas od on od.turno_op_origem_row_id = oop.turno_op_origem_row_id
left join destino_demandas dd
  on dd.turno_op_destino_id = dop.turno_op_destino_id
  and dd.setor_id = od.setor_id
left join operacoes_destino_setor ods
  on ods.turno_op_destino_id = dop.turno_op_destino_id
  and ods.setor_id = od.setor_id
order by dop.numero_op, od.setor_codigo
`
}

function montarSqlDiagnostico() {
  return `
with params as (
  select
    '${TURNO_ORIGEM_ID}'::uuid as turno_origem_id,
    '${TURNO_DESTINO_ID}'::uuid as turno_destino_id
),
turnos_alvo as (
  select
    t.id,
    t.status,
    t.iniciado_em,
    t.encerrado_em,
    case
      when t.id = (select turno_origem_id from params) then 'origem'
      when t.id = (select turno_destino_id from params) then 'destino'
      else 'outro'
    end as papel
  from turnos t
  join params p on t.id in (p.turno_origem_id, p.turno_destino_id)
),
ops_alvo as (
  select
    turno_id,
    count(*) as total_ops,
    count(*) filter (where turno_op_origem_id is not null) as total_ops_com_origem
  from turno_ops
  where turno_id in (
    (select turno_origem_id from params),
    (select turno_destino_id from params)
  )
  group by turno_id
),
ops_destino as (
  select
    d.id,
    d.numero_op,
    d.turno_op_origem_id,
    d.quantidade_planejada,
    d.quantidade_realizada,
    d.quantidade_planejada_remanescente,
    d.status
  from turno_ops d
  join params p on p.turno_destino_id = d.turno_id
  order by d.numero_op
),
ops_origem as (
  select
    o.id,
    o.numero_op,
    o.turno_op_origem_id,
    o.quantidade_planejada,
    o.quantidade_realizada,
    o.quantidade_planejada_remanescente,
    o.status
  from turno_ops o
  join params p on p.turno_origem_id = o.turno_id
  order by o.numero_op
)
select jsonb_build_object(
  'turnos', coalesce((select jsonb_agg(turnos_alvo order by iniciado_em) from turnos_alvo), '[]'::jsonb),
  'ops_por_turno', coalesce((select jsonb_agg(ops_alvo order by turno_id) from ops_alvo), '[]'::jsonb),
  'ops_origem', coalesce((select jsonb_agg(ops_origem order by numero_op) from ops_origem), '[]'::jsonb),
  'ops_destino', coalesce((select jsonb_agg(ops_destino order by numero_op) from ops_destino), '[]'::jsonb)
) as diagnostico
`
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

async function main() {
  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const diagnostico = await executarQuery(projectRef, managementApiKey, montarSqlDiagnostico())
  const reconciliacao = await executarQuery(projectRef, managementApiKey, montarSqlReadOnly())

  console.log(JSON.stringify({ diagnostico, reconciliacao }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
