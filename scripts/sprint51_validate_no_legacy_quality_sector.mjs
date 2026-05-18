import fs from 'node:fs'

const SQL_PATCH_PATH = 'scripts/sprint51_remover_qualidade_legado_fluxo_ativo.sql'
const MARCADOR = 'VALIDACAO_HU_51_9_SEM_QUALIDADE_LEGADO'
const PREFIXO_CURTO = 'HU519QL'

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

function montarSqlLimpeza() {
  return `
with produtos_alvo as (
  select id
  from public.produtos
  where referencia like '${PREFIXO_CURTO}%'
),
turnos_alvo as (
  select id
  from public.turnos
  where observacao = '${MARCADOR}'
),
turno_ops_alvo as (
  select id
  from public.turno_ops
  where produto_id in (select id from produtos_alvo)
     or turno_id in (select id from turnos_alvo)
),
turno_setor_operacoes_removidas as (
  delete from public.turno_setor_operacoes
  where turno_op_id in (select id from turno_ops_alvo)
  returning id
),
turno_setor_demandas_removidas as (
  delete from public.turno_setor_demandas
  where turno_op_id in (select id from turno_ops_alvo)
  returning id
),
turno_setor_ops_removidas as (
  delete from public.turno_setor_ops
  where turno_op_id in (select id from turno_ops_alvo)
  returning id
),
turno_setores_removidos as (
  delete from public.turno_setores
  where turno_id in (select id from turnos_alvo)
  returning id
),
turno_ops_removidas as (
  delete from public.turno_ops
  where id in (select id from turno_ops_alvo)
  returning id
),
turnos_removidos as (
  delete from public.turnos
  where id in (select id from turnos_alvo)
  returning id
),
produto_operacoes_removidas as (
  delete from public.produto_operacoes
  where produto_id in (select id from produtos_alvo)
  returning id
),
operacoes_removidas as (
  delete from public.operacoes
  where codigo like '${PREFIXO_CURTO}%'
  returning id
),
produtos_removidos as (
  delete from public.produtos
  where id in (select id from produtos_alvo)
  returning id
)
select
  (select count(*)::integer from turno_setor_operacoes_removidas) as turno_setor_operacoes,
  (select count(*)::integer from turno_setor_demandas_removidas) as turno_setor_demandas,
  (select count(*)::integer from turno_setor_ops_removidas) as turno_setor_ops,
  (select count(*)::integer from turno_setores_removidos) as turno_setores,
  (select count(*)::integer from turno_ops_removidas) as turno_ops,
  (select count(*)::integer from turnos_removidos) as turnos,
  (select count(*)::integer from produto_operacoes_removidas) as produto_operacoes,
  (select count(*)::integer from operacoes_removidas) as operacoes,
  (select count(*)::integer from produtos_removidos) as produtos;
`
}

function montarSqlValidacao() {
  return `
with setores_base as (
  select
    (
      select id
      from public.setores
      where coalesce(modo_apontamento, 'producao_padrao') <> 'revisao_qualidade'
        and lower(btrim(nome)) <> 'qualidade'
      order by codigo asc nulls last, created_at asc nulls last
      limit 1
    ) as setor_produtivo_id,
    (
      select id
      from public.setores
      where coalesce(modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
         or lower(btrim(nome)) = 'qualidade'
      order by lower(btrim(nome)) = 'qualidade' desc, created_at asc nulls last
      limit 1
    ) as setor_qualidade_id
),
produto as (
  insert into public.produtos (referencia, nome, tp_produto_min, ativo)
  select
    '${PREFIXO_CURTO}_PROD',
    'Validação HU 51.9 produto com Qualidade legado',
    1.0000,
    true
  from setores_base
  where setor_produtivo_id is not null
    and setor_qualidade_id is not null
  returning id
),
operacao_produtiva as (
  insert into public.operacoes (
    codigo,
    descricao,
    tempo_padrao_min,
    meta_hora,
    meta_dia,
    setor_id,
    ativa
  )
  select
    '${PREFIXO_CURTO}_OP_PROD',
    'Validação HU 51.9 operação produtiva',
    1.000000,
    60,
    480,
    setores_base.setor_produtivo_id,
    true
  from setores_base
  where setor_produtivo_id is not null
  returning id
),
operacao_qualidade as (
  insert into public.operacoes (
    codigo,
    descricao,
    tempo_padrao_min,
    meta_hora,
    meta_dia,
    setor_id,
    ativa
  )
  select
    '${PREFIXO_CURTO}_OP_QUAL',
    'Validação HU 51.9 operação Qualidade legado',
    1.000000,
    60,
    480,
    setores_base.setor_qualidade_id,
    true
  from setores_base
  where setor_qualidade_id is not null
  returning id
),
roteiro_produtivo as (
  insert into public.produto_operacoes (produto_id, operacao_id, sequencia)
  select produto.id, operacao_produtiva.id, 1
  from produto
  cross join operacao_produtiva
  returning id
),
roteiro_qualidade as (
  insert into public.produto_operacoes (produto_id, operacao_id, sequencia)
  select produto.id, operacao_qualidade.id, 2
  from produto
  cross join operacao_qualidade
  returning id
),
turno as (
  insert into public.turnos (
    operadores_disponiveis,
    minutos_turno,
    status,
    observacao
  )
  values (1, 480, 'encerrado', '${MARCADOR}')
  returning id
),
turno_op as (
  insert into public.turno_ops (
    turno_id,
    numero_op,
    produto_id,
    quantidade_planejada,
    quantidade_planejada_original,
    quantidade_planejada_remanescente,
    quantidade_realizada,
    status
  )
  select
    turno.id,
    '${PREFIXO_CURTO}_OP_TURNO',
    produto.id,
    10,
    10,
    10,
    0,
    'planejada'
  from turno
  cross join produto
  cross join roteiro_produtivo
  cross join roteiro_qualidade
  returning id, turno_id
)
select id as turno_op_id, turno_id
from turno_op;
`
}

function montarSqlContagens(turnoOpId, turnoId) {
  return `
select
  1::integer as turno_ops_criadas,
  (
    select count(*)::integer
    from public.turno_setor_ops secao
    join public.setores setor on setor.id = secao.setor_id
    where secao.turno_op_id = '${turnoOpId}'
      and not (
        coalesce(setor.modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
        or lower(btrim(coalesce(setor.nome, ''))) = 'qualidade'
      )
  ) as secoes_produtivas,
  (
    select count(*)::integer
    from public.turno_setor_ops secao
    join public.setores setor on setor.id = secao.setor_id
    where secao.turno_op_id = '${turnoOpId}'
      and (
        coalesce(setor.modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
        or lower(btrim(coalesce(setor.nome, ''))) = 'qualidade'
      )
  ) as secoes_qualidade,
  (
    select count(*)::integer
    from public.turno_setor_operacoes operacao_turno
    join public.setores setor on setor.id = operacao_turno.setor_id
    where operacao_turno.turno_op_id = '${turnoOpId}'
      and (
        coalesce(setor.modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
        or lower(btrim(coalesce(setor.nome, ''))) = 'qualidade'
      )
  ) as operacoes_qualidade,
  (
    select count(*)::integer
    from public.turno_setor_demandas demanda
    join public.setores setor on setor.id = demanda.setor_id
    where demanda.turno_op_id = '${turnoOpId}'
      and (
        coalesce(setor.modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
        or lower(btrim(coalesce(setor.nome, ''))) = 'qualidade'
      )
  ) as demandas_qualidade,
  (
    select count(*)::integer
    from public.turno_setores turno_setor
    join public.setores setor on setor.id = turno_setor.setor_id
    where turno_setor.turno_id = '${turnoId}'
      and (
        coalesce(setor.modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
        or lower(btrim(coalesce(setor.nome, ''))) = 'qualidade'
      )
  ) as turno_setores_qualidade;
`
}

function validarResultado(resultado) {
  const linha = resultado[0]

  if (!linha) {
    throw new Error('A validação não retornou contagens.')
  }

  if (linha.turno_ops_criadas !== 1) {
    throw new Error(`Esperava 1 OP de validação, recebeu ${linha.turno_ops_criadas}.`)
  }

  if (linha.secoes_produtivas < 1) {
    throw new Error('Nenhuma seção produtiva foi derivada para a OP de validação.')
  }

  const camposZero = [
    'secoes_qualidade',
    'operacoes_qualidade',
    'demandas_qualidade',
    'turno_setores_qualidade',
  ]

  for (const campo of camposZero) {
    if (linha[campo] !== 0) {
      throw new Error(`Esperava ${campo}=0, recebeu ${linha[campo]}.`)
    }
  }
}

async function main() {
  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const sqlPatch = fs.readFileSync(SQL_PATCH_PATH, 'utf8')

  const patch = await executarQuery(projectRef, managementApiKey, sqlPatch)
  const limpezaAntes = await executarQuery(projectRef, managementApiKey, montarSqlLimpeza())
  const criacao = await executarQuery(projectRef, managementApiKey, montarSqlValidacao())
  const turnoOpId = criacao[0]?.turno_op_id
  const turnoId = criacao[0]?.turno_id

  if (!turnoOpId || !turnoId) {
    throw new Error('O cenário temporário de validação não criou turno_op.')
  }

  const validacao = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlContagens(turnoOpId, turnoId),
    true
  )
  validarResultado(validacao)
  const limpezaDepois = await executarQuery(projectRef, managementApiKey, montarSqlLimpeza())

  console.log(
    JSON.stringify({ projectRef, patch, limpezaAntes, criacao, validacao, limpezaDepois }, null, 2)
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
