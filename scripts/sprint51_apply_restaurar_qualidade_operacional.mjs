import fs from 'node:fs'

const SQL_PATCH_PATH = 'scripts/sprint51_restaurar_qualidade_operacional.sql'
const MARCADOR = 'VALIDACAO_HU_51_11_QUALIDADE_OPERACIONAL'
const PREFIXO_CURTO = 'HU511QO'

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
registros_producao_alvo as (
  select id
  from public.registros_producao
  where observacao = '${MARCADOR}'
     or turno_op_id in (select id from turno_ops_alvo)
),
qualidade_registros_alvo as (
  select id
  from public.qualidade_registros
  where turno_op_id in (select id from turno_ops_alvo)
),
detalhes_removidos as (
  delete from public.qualidade_detalhes
  where qualidade_registro_id in (select id from qualidade_registros_alvo)
  returning id
),
qualidade_registros_removidos as (
  delete from public.qualidade_registros
  where id in (select id from qualidade_registros_alvo)
  returning id
),
lotes_removidos as (
  delete from public.qualidade_lotes
  where registro_producao_id in (select id from registros_producao_alvo)
     or turno_op_id in (select id from turno_ops_alvo)
  returning id
),
registros_producao_removidos as (
  delete from public.registros_producao
  where id in (select id from registros_producao_alvo)
  returning id
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
  (select count(*)::integer from detalhes_removidos) as detalhes,
  (select count(*)::integer from qualidade_registros_removidos) as qualidade_registros,
  (select count(*)::integer from lotes_removidos) as qualidade_lotes,
  (select count(*)::integer from registros_producao_removidos) as registros_producao,
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

function montarSqlValidacaoSchema() {
  return `
select
  exists (
    select 1
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'setor_qualidade_legado'
      and lower(pg_get_functiondef(pg_proc.oid)) like '%select false%'
  ) as qualidade_legado_liberada,
  exists (
    select 1
    from pg_trigger
    where tgname = 'trg_registros_producao_criar_lote_qualidade'
      and not tgisinternal
  ) as trigger_lote_existe,
  exists (
    select 1
    from pg_proc
    where proname = 'registrar_revisao_qualidade_turno_setor_operacao'
  ) as rpc_qualidade_operacional_existe;
`
}

function montarSqlCriarCenario() {
  return `
with setores_base as (
  select
    (
      select id
      from public.setores
      where lower(btrim(nome)) in ('finalizacao', 'finalização')
        and coalesce(modo_apontamento, 'producao_padrao') = 'producao_padrao'
      order by created_at asc nulls last
      limit 1
    ) as setor_finalizacao_id,
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
    'Validação HU 51.11 Finalização para Qualidade',
    2.0000,
    true
  from setores_base
  where setor_finalizacao_id is not null
    and setor_qualidade_id is not null
  returning id
),
operacao_finalizacao as (
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
    '${PREFIXO_CURTO}_FINAL',
    'Validação HU 51.11 Finalização',
    1.000000,
    60,
    480,
    setores_base.setor_finalizacao_id,
    true
  from setores_base
  where setor_finalizacao_id is not null
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
    '${PREFIXO_CURTO}_QUAL',
    'Validação HU 51.11 Qualidade',
    1.000000,
    60,
    480,
    setores_base.setor_qualidade_id,
    true
  from setores_base
  where setor_qualidade_id is not null
  returning id
),
roteiro_finalizacao as (
  insert into public.produto_operacoes (produto_id, operacao_id, sequencia)
  select produto.id, operacao_finalizacao.id, 1
  from produto
  cross join operacao_finalizacao
  returning id
),
roteiro_qualidade as (
  insert into public.produto_operacoes (produto_id, operacao_id, sequencia)
  select produto.id, operacao_qualidade.id, 2
  from produto
  cross join operacao_qualidade
  returning id
),
turno_aberto as (
  select id
  from public.turnos
  where status = 'aberto'
  order by iniciado_em desc nulls last, created_at desc nulls last
  limit 1
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
    turno_aberto.id,
    '${PREFIXO_CURTO}_OP_TURNO',
    produto.id,
    100,
    100,
    100,
    0,
    'planejada'
  from turno_aberto
  cross join produto
  cross join roteiro_finalizacao
  cross join roteiro_qualidade
  returning id, turno_id
)
select id as turno_op_id, turno_id
from turno_op;
`
}

function montarSqlContagensCenario(turnoOpId, turnoId) {
  return `
select
  (
    select count(*)::integer
    from public.turno_setor_ops secao
    join public.setores setor on setor.id = secao.setor_id
    where secao.turno_op_id = '${turnoOpId}'
      and lower(btrim(setor.nome)) in ('finalizacao', 'finalização')
  ) as secoes_finalizacao,
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
      and lower(btrim(setor.nome)) in ('finalizacao', 'finalização')
  ) as operacoes_finalizacao,
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

function montarSqlApontarFinalizacao(turnoOpId) {
  return `
with finalizacao as (
  select operacao_turno.id
  from public.turno_setor_operacoes operacao_turno
  join public.setores setor on setor.id = operacao_turno.setor_id
  where operacao_turno.turno_op_id = '${turnoOpId}'
    and lower(btrim(setor.nome)) in ('finalizacao', 'finalização')
  order by operacao_turno.created_at asc nulls last
  limit 1
),
operador as (
  select id
  from public.operadores
  where status = 'ativo'
  order by created_at asc nulls last
  limit 1
)
select *
from public.registrar_producao_turno_setor_operacao(
  (select id from operador),
  (select id from finalizacao),
  100,
  null,
  'supervisor_manual',
  null,
  '${MARCADOR}'
);
`
}

function montarSqlRevisarQualidade(turnoOpId) {
  return `
with qualidade as (
  select operacao_turno.id
  from public.turno_setor_operacoes operacao_turno
  join public.setores setor on setor.id = operacao_turno.setor_id
  where operacao_turno.turno_op_id = '${turnoOpId}'
    and (
      coalesce(setor.modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
      or lower(btrim(coalesce(setor.nome, ''))) = 'qualidade'
    )
  order by operacao_turno.created_at asc nulls last
  limit 1
),
finalizacao as (
  select operacao_turno.id
  from public.turno_setor_operacoes operacao_turno
  join public.setores setor on setor.id = operacao_turno.setor_id
  where operacao_turno.turno_op_id = '${turnoOpId}'
    and lower(btrim(setor.nome)) in ('finalizacao', 'finalização')
  order by operacao_turno.created_at asc nulls last
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
from public.registrar_revisao_qualidade_turno_setor_operacao(
  (select id from qualidade),
  (select id from revisor),
  95,
  5,
  'manual_qualidade',
  jsonb_build_array(
    jsonb_build_object(
      'turno_setor_operacao_id_origem', (select id from finalizacao),
      'qualidade_defeito_id', (select id from defeito),
      'quantidade_defeito', 5,
      'observacao', 'validacao automatica HU 51.11'
    )
  )
);
`
}

function montarSqlValidarResultado(turnoOpId) {
  return `
with registros_produtivos as (
  select id
  from public.registros_producao
  where turno_op_id = '${turnoOpId}'
    and observacao = '${MARCADOR}'
),
registro_qualidade as (
  select *
  from public.qualidade_registros
  where turno_op_id = '${turnoOpId}'
),
detalhes as (
  select *
  from public.qualidade_detalhes
  where qualidade_registro_id in (select id from registro_qualidade)
),
finalizacao as (
  select operacao_turno.*
  from public.turno_setor_operacoes operacao_turno
  join public.setores setor on setor.id = operacao_turno.setor_id
  where operacao_turno.turno_op_id = '${turnoOpId}'
    and lower(btrim(setor.nome)) in ('finalizacao', 'finalização')
  limit 1
),
qualidade as (
  select operacao_turno.*
  from public.turno_setor_operacoes operacao_turno
  join public.setores setor on setor.id = operacao_turno.setor_id
  where operacao_turno.turno_op_id = '${turnoOpId}'
    and (
      coalesce(setor.modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
      or lower(btrim(coalesce(setor.nome, ''))) = 'qualidade'
    )
  limit 1
)
select
  (select count(*)::integer from registros_produtivos) as registros_finalizacao,
  (
    select count(*)::integer
    from public.qualidade_lotes
    where registro_producao_id in (select id from registros_produtivos)
       or turno_op_id = '${turnoOpId}'
  ) as lotes_criados_por_trigger,
  (select quantidade_realizada::integer from finalizacao) as finalizacao_realizada,
  (select quantidade_realizada::integer from qualidade) as qualidade_revisada,
  (select status from qualidade) as qualidade_status,
  (select count(*)::integer from registro_qualidade) as registros_qualidade,
  (select max(quantidade_aprovada)::integer from registro_qualidade) as quantidade_aprovada,
  (select max(quantidade_reprovada)::integer from registro_qualidade) as quantidade_reprovada,
  (select max(quantidade_revisada)::integer from registro_qualidade) as quantidade_revisada,
  (select count(*)::integer from detalhes) as detalhes,
  (select count(*)::integer from detalhes where qualidade_defeito_id is not null) as detalhes_catalogados,
  (select coalesce(sum(quantidade_defeito), 0)::integer from detalhes) as total_defeitos,
  (select count(*)::integer from detalhes where nullif(btrim(coalesce(observacao, '')), '') is not null) as detalhes_com_observacao;
`
}

function validarSchema(resultado) {
  const linha = resultado[0]

  if (!linha) {
    throw new Error('A validação de schema não retornou resultado.')
  }

  if (linha.qualidade_legado_liberada !== true) {
    throw new Error('A função setor_qualidade_legado ainda não libera Qualidade no fluxo ativo.')
  }

  if (linha.trigger_lote_existe !== false) {
    throw new Error('O trigger de lote automático por registro produtivo ainda existe.')
  }

  if (linha.rpc_qualidade_operacional_existe !== true) {
    throw new Error('A RPC operacional de revisão de qualidade não foi encontrada.')
  }
}

function validarCenario(resultado) {
  const linha = resultado[0]

  if (!linha) {
    throw new Error('A validação do cenário não retornou contagens.')
  }

  const camposMinimos = [
    'secoes_finalizacao',
    'secoes_qualidade',
    'operacoes_finalizacao',
    'operacoes_qualidade',
    'demandas_qualidade',
    'turno_setores_qualidade',
  ]

  for (const campo of camposMinimos) {
    if (linha[campo] < 1) {
      throw new Error(`Esperava ${campo} >= 1, recebeu ${linha[campo]}.`)
    }
  }
}

function validarResultado(resultado) {
  const linha = resultado[0]

  if (!linha) {
    throw new Error('A validação final não retornou resultado.')
  }

  const expectativas = {
    registros_finalizacao: 1,
    lotes_criados_por_trigger: 0,
    finalizacao_realizada: 100,
    qualidade_revisada: 100,
    registros_qualidade: 1,
    quantidade_aprovada: 95,
    quantidade_reprovada: 5,
    quantidade_revisada: 100,
    detalhes: 1,
    detalhes_catalogados: 1,
    total_defeitos: 5,
    detalhes_com_observacao: 1,
  }

  for (const [campo, esperado] of Object.entries(expectativas)) {
    if (linha[campo] !== esperado) {
      throw new Error(`Esperava ${campo}=${esperado}, recebeu ${linha[campo]}.`)
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
  const validacaoSchema = await executarQuery(projectRef, managementApiKey, montarSqlValidacaoSchema(), true)
  validarSchema(validacaoSchema)

  const limpezaAntes = await executarQuery(projectRef, managementApiKey, montarSqlLimpeza())
  const criacao = await executarQuery(projectRef, managementApiKey, montarSqlCriarCenario())
  const turnoOpId = criacao[0]?.turno_op_id
  const turnoId = criacao[0]?.turno_id

  if (!turnoOpId || !turnoId) {
    throw new Error('O cenário temporário de validação não criou turno_op.')
  }

  const contagensCenario = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlContagensCenario(turnoOpId, turnoId),
    true
  )
  validarCenario(contagensCenario)

  const apontamentoFinalizacao = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlApontarFinalizacao(turnoOpId)
  )
  const revisaoQualidade = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlRevisarQualidade(turnoOpId)
  )
  const validacaoResultado = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlValidarResultado(turnoOpId),
    true
  )
  validarResultado(validacaoResultado)
  const limpezaDepois = await executarQuery(projectRef, managementApiKey, montarSqlLimpeza())

  console.log(
    JSON.stringify(
      {
        projectRef,
        patch,
        validacaoSchema,
        limpezaAntes,
        criacao,
        contagensCenario,
        apontamentoFinalizacao,
        revisaoQualidade,
        validacaoResultado,
        limpezaDepois,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
