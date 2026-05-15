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

const OBSERVACAO_VALIDACAO = 'VALIDACAO_HU_51_4_REVISAO_LOTE_QUALIDADE'

function montarSqlLimpezaValidacao() {
  return `
with registros_alvo as (
  select id
  from public.registros_producao
  where observacao = '${OBSERVACAO_VALIDACAO}'
),
lotes_alvo as (
  select id
  from public.qualidade_lotes
  where registro_producao_id in (select id from registros_alvo)
),
detalhes_removidos as (
  delete from public.qualidade_detalhes
  where qualidade_registro_id in (
    select id
    from public.qualidade_registros
    where qualidade_lote_id in (select id from lotes_alvo)
  )
  returning id
),
registros_qualidade_removidos as (
  delete from public.qualidade_registros
  where qualidade_lote_id in (select id from lotes_alvo)
  returning id
),
lotes_removidos as (
  delete from public.qualidade_lotes
  where id in (select id from lotes_alvo)
  returning id
),
registros_producao_removidos as (
  delete from public.registros_producao
  where id in (select id from registros_alvo)
  returning id
)
select
  (select count(*)::integer from detalhes_removidos) as detalhes_removidos,
  (select count(*)::integer from registros_qualidade_removidos) as registros_qualidade_removidos,
  (select count(*)::integer from lotes_removidos) as lotes_removidos,
  (select count(*)::integer from registros_producao_removidos) as registros_producao_removidos;
`
}

function montarSqlInserirRegistroTeste() {
  return `
with candidato as (
  select
    operacao_secao.id as turno_setor_operacao_id,
    operacao_secao.turno_op_id,
    operacao_secao.turno_setor_op_id,
    operacao_secao.operacao_id,
    turno_op.produto_id,
    operador.id as operador_id
  from public.turno_setor_operacoes as operacao_secao
  join public.turno_ops as turno_op
    on turno_op.id = operacao_secao.turno_op_id
  join public.setores as setor
    on setor.id = operacao_secao.setor_id
  cross join lateral (
    select saldo_fisico
    from public.calcular_saldo_fisico_operacao_op(operacao_secao.id)
    limit 1
  ) as saldo
  cross join lateral (
    select id
    from public.operadores
    where status = 'ativo'
    order by created_at asc nulls last
    limit 1
  ) as operador
  where coalesce(setor.modo_apontamento, 'producao_padrao') <> 'revisao_qualidade'
    and operacao_secao.status <> 'encerrada_manualmente'
    and saldo.saldo_fisico >= 2
  order by operacao_secao.updated_at desc nulls last, operacao_secao.created_at desc nulls last
  limit 1
)
insert into public.registros_producao (
  operador_id,
  operacao_id,
  produto_id,
  quantidade,
  turno_op_id,
  turno_setor_op_id,
  turno_setor_operacao_id,
  origem_apontamento,
  observacao
)
select
  operador_id,
  operacao_id,
  produto_id,
  2,
  turno_op_id,
  turno_setor_op_id,
  turno_setor_operacao_id,
  'supervisor_manual',
  '${OBSERVACAO_VALIDACAO}'
from candidato
returning id;
`
}

function montarSqlRevisarLote(registroId) {
  return `
with lote as (
  select id
  from public.qualidade_lotes
  where registro_producao_id = '${registroId}'
  limit 1
),
revisor as (
  select id
  from public.usuarios_sistema
  where pode_revisar_qualidade = true
    and coalesce(ativo, true) = true
  order by created_at asc nulls last
  limit 1
),
defeito as (
  select id
  from public.qualidade_defeitos
  where ativo = true
  order by ordem asc, nome asc
  limit 1
)
select *
from public.registrar_revisao_lote_qualidade(
  (select id from lote),
  (select id from revisor),
  1,
  1,
  'manual_qualidade',
  jsonb_build_array(
    jsonb_build_object(
      'qualidade_defeito_id', (select id from defeito),
      'quantidade_defeito', 1,
      'observacao', 'validacao automatica HU 51.4'
    )
  )
);
`
}

function montarSqlValidarRevisao(registroId) {
  return `
with lote as (
  select *
  from public.qualidade_lotes
  where registro_producao_id = '${registroId}'
),
registro_qualidade as (
  select *
  from public.qualidade_registros
  where qualidade_lote_id in (select id from lote)
),
detalhes as (
  select *
  from public.qualidade_detalhes
  where qualidade_registro_id in (select id from registro_qualidade)
)
select
  (select count(*)::integer from lote) as lotes,
  (select max(status) from lote) as status_lote,
  (select count(*)::integer from registro_qualidade) as registros_qualidade,
  (select max(quantidade_aprovada)::integer from registro_qualidade) as quantidade_aprovada,
  (select max(quantidade_reprovada)::integer from registro_qualidade) as quantidade_reprovada,
  (select count(*)::integer from detalhes) as detalhes,
  (select count(*)::integer from detalhes where qualidade_defeito_id is not null) as detalhes_catalogados;
`
}

async function main() {
  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const limpezaAntes = await executarQuery(projectRef, managementApiKey, montarSqlLimpezaValidacao())
  const insercao = await executarQuery(projectRef, managementApiKey, montarSqlInserirRegistroTeste())
  const registroId = insercao[0]?.id

  if (!registroId) {
    throw new Error('Nenhum registro produtivo candidato foi inserido para validar a revisão do lote.')
  }

  const revisao = await executarQuery(projectRef, managementApiKey, montarSqlRevisarLote(registroId))
  const validacao = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlValidarRevisao(registroId),
    true
  )
  const limpezaDepois = await executarQuery(projectRef, managementApiKey, montarSqlLimpezaValidacao())

  console.log(
    JSON.stringify({ projectRef, limpezaAntes, insercao, revisao, validacao, limpezaDepois }, null, 2)
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
