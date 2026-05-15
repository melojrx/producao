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

async function executarQuery(projectRef, managementApiKey, query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
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

const OBSERVACAO_VALIDACAO = 'VALIDACAO_HU_51_3_TRIGGER_LOTE_QUALIDADE'

function montarSqlLimpezaValidacao() {
  return `
with registros_alvo as (
  select id
  from public.registros_producao
  where observacao = '${OBSERVACAO_VALIDACAO}'
),
lotes_removidos as (
  delete from public.qualidade_lotes
  where registro_producao_id in (select id from registros_alvo)
  returning id
),
registros_removidos as (
  delete from public.registros_producao
  where id in (select id from registros_alvo)
  returning id
)
select
  (select count(*)::integer from lotes_removidos) as lotes_removidos,
  (select count(*)::integer from registros_removidos) as registros_removidos;
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
    and saldo.saldo_fisico >= 1
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
  1,
  turno_op_id,
  turno_setor_op_id,
  turno_setor_operacao_id,
  'supervisor_manual',
  '${OBSERVACAO_VALIDACAO}'
from candidato
returning id;
`
}

function montarSqlValidarLoteCriado(registroId) {
  return `
select
  count(*)::integer as lotes_criados,
  max(quantidade_lote)::integer as quantidade_lote,
  max(status) as status_lote
from public.qualidade_lotes
where registro_producao_id = '${registroId}';
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
    throw new Error('Nenhum registro produtivo candidato foi inserido para validar o trigger.')
  }

  const validacao = await executarQuery(projectRef, managementApiKey, montarSqlValidarLoteCriado(registroId))
  const limpezaDepois = await executarQuery(projectRef, managementApiKey, montarSqlLimpezaValidacao())

  console.log(JSON.stringify({ projectRef, limpezaAntes, insercao, validacao, limpezaDepois }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
