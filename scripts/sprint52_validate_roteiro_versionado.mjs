import fs from 'node:fs'

const MARCADOR = 'VALIDACAO_HU_52_ROTEIRO_VERSIONADO'
const PREFIXO = 'HU52RV'

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
  select id from public.produtos where referencia like '${PREFIXO}%'
),
turnos_alvo as (
  select id from public.turnos where observacao = '${MARCADOR}'
),
turno_ops_alvo as (
  select id from public.turno_ops
  where produto_id in (select id from produtos_alvo)
     or turno_id in (select id from turnos_alvo)
),
turno_setor_operacoes_removidas as (
  delete from public.turno_setor_operacoes where turno_op_id in (select id from turno_ops_alvo) returning id
),
turno_setor_demandas_removidas as (
  delete from public.turno_setor_demandas where turno_op_id in (select id from turno_ops_alvo) returning id
),
turno_setor_ops_removidas as (
  delete from public.turno_setor_ops where turno_op_id in (select id from turno_ops_alvo) returning id
),
turno_setores_removidos as (
  delete from public.turno_setores where turno_id in (select id from turnos_alvo) returning id
),
turno_ops_removidas as (
  delete from public.turno_ops where id in (select id from turno_ops_alvo) returning id
),
turnos_removidos as (
  delete from public.turnos where id in (select id from turnos_alvo) returning id
),
produto_operacoes_removidas as (
  delete from public.produto_operacoes where produto_id in (select id from produtos_alvo) returning id
),
operacoes_removidas as (
  delete from public.operacoes where codigo like '${PREFIXO}%' returning id
),
produtos_removidos as (
  delete from public.produtos where id in (select id from produtos_alvo) returning id
),
setores_removidos as (
  delete from public.setores where nome like '${PREFIXO}%' returning id
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
  (select count(*)::integer from produtos_removidos) as produtos,
  (select count(*)::integer from setores_removidos) as setores;
`
}

function montarSqlSetup() {
  return `
with setor_a as (
  insert into public.setores (codigo, nome, modo_apontamento, ativo)
  values (9801, '${PREFIXO} Setor A', 'producao_padrao', true)
  returning id
),
setor_b as (
  insert into public.setores (codigo, nome, modo_apontamento, ativo)
  values (9802, '${PREFIXO} Setor B', 'producao_padrao', true)
  returning id
),
op_a as (
  insert into public.operacoes (codigo, descricao, tempo_padrao_min, setor_id, ativa)
  select '${PREFIXO}-OP-A', 'Operacao A v1 e v2', 1.25, id, true from setor_a
  returning id
),
op_b as (
  insert into public.operacoes (codigo, descricao, tempo_padrao_min, setor_id, ativa)
  select '${PREFIXO}-OP-B', 'Operacao B somente v1', 2.5, id, true from setor_b
  returning id
),
op_c as (
  insert into public.operacoes (codigo, descricao, tempo_padrao_min, setor_id, ativa)
  select '${PREFIXO}-OP-C', 'Operacao C somente v2', 3.75, id, true from setor_b
  returning id
),
produto as (
  insert into public.produtos (referencia, nome, descricao, tp_produto_min, ativo)
  values ('${PREFIXO}-PROD', 'Produto Validacao HU 52', '${MARCADOR}', 3.75, true)
  returning id
),
roteiro_v1_a as (
  insert into public.produto_operacoes (produto_id, operacao_id, sequencia, versao_roteiro, vigente)
  select produto.id, op_a.id, 1, 1, true from produto, op_a
  returning id
),
roteiro_v1_b as (
  insert into public.produto_operacoes (produto_id, operacao_id, sequencia, versao_roteiro, vigente)
  select produto.id, op_b.id, 2, 1, true from produto, op_b
  returning id
)
select
  (select id from produto) as produto_id,
  (select id from op_a) as op_a_id,
  (select id from op_b) as op_b_id,
  (select id from op_c) as op_c_id;
`
}

function montarSqlCriarTurno(numeroOp, produtoId) {
  return `
with turno as (
  insert into public.turnos (operadores_disponiveis, minutos_turno, observacao, status)
  values (2, 480, '${MARCADOR}', 'encerrado')
  returning id
),
turno_op as (
  insert into public.turno_ops (turno_id, produto_id, numero_op, quantidade_planejada, quantidade_planejada_original, quantidade_planejada_remanescente, status)
  select turno.id, '${produtoId}'::uuid, '${numeroOp}', 10, 10, 10, 'planejada' from turno
  returning id
)
select
  (select id from turno) as turno_id,
  (select id from turno_op) as turno_op_id,
  (
    select count(*)::integer
    from public.turno_setor_ops secao
    join turno_op on turno_op.id = secao.turno_op_id
  ) as setores_sincronizados,
  (
    select count(*)::integer
    from public.turno_setor_operacoes operacao_secao
    join turno_op on turno_op.id = operacao_secao.turno_op_id
  ) as operacoes_sincronizadas;
`
}

function montarSqlVersionar(produtoId, opAId, opCId) {
  return `
with desativar_vigente as (
  update public.produto_operacoes
  set vigente = false,
      substituido_em = now()
  where produto_id = '${produtoId}'::uuid
    and vigente = true
  returning id
),
roteiro_v2_a as (
  insert into public.produto_operacoes (produto_id, operacao_id, sequencia, versao_roteiro, vigente)
  values ('${produtoId}'::uuid, '${opAId}'::uuid, 1, 2, true)
  returning id
),
roteiro_v2_c as (
  insert into public.produto_operacoes (produto_id, operacao_id, sequencia, versao_roteiro, vigente)
  values ('${produtoId}'::uuid, '${opCId}'::uuid, 2, 2, true)
  returning id
),
produto_atualizado as (
  update public.produtos
  set tp_produto_min = 5,
      updated_at = now()
  where id = '${produtoId}'::uuid
  returning id
)
select
  (select count(*)::integer from desativar_vigente) as linhas_v1_desativadas,
  (select count(*)::integer from roteiro_v2_a) + (select count(*)::integer from roteiro_v2_c) as linhas_v2_criadas;
`
}

function montarSqlSnapshot(turnoOpId) {
  return `
select
  count(*)::integer as total_operacoes,
  array_agg(operacao.codigo order by tso.sequencia) as codigos,
  array_agg(produto_operacao.versao_roteiro order by tso.sequencia) as versoes,
  bool_and(produto_operacao.vigente) as todas_linhas_vigentes_agora
from public.turno_setor_operacoes tso
join public.operacoes operacao on operacao.id = tso.operacao_id
join public.produto_operacoes produto_operacao on produto_operacao.id = tso.produto_operacao_id
where tso.turno_op_id = '${turnoOpId}'::uuid;
`
}

async function main() {
  console.log('=== HU 52.3/52.4 — Validação de roteiro versionado ===\n')

  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

  console.log(`Projeto: ${projectRef}\n`)

  console.log('--- Limpeza inicial ---')
  console.log(JSON.stringify((await executarQuery(projectRef, managementApiKey, montarSqlLimpeza()))[0], null, 2))

  try {
    console.log('\n--- Setup produto + roteiro v1 ---')
    const setup = (await executarQuery(projectRef, managementApiKey, montarSqlSetup()))[0]
    console.log(JSON.stringify(setup, null, 2))

    console.log('\n--- Criar turno atual com roteiro v1 ---')
    const turnoAtual = (await executarQuery(
      projectRef,
      managementApiKey,
      montarSqlCriarTurno(`${PREFIXO}-OP-ATUAL`, setup.produto_id)
    ))[0]
    console.log(JSON.stringify(turnoAtual, null, 2))

    const snapshotAtualAntes = (await executarQuery(
      projectRef,
      managementApiKey,
      montarSqlSnapshot(turnoAtual.turno_op_id),
      true
    ))[0]
    console.log('\nSnapshot turno atual antes da versão v2:')
    console.log(JSON.stringify(snapshotAtualAntes, null, 2))

    console.log('\n--- Versionar roteiro para v2 ---')
    const versionamento = (await executarQuery(
      projectRef,
      managementApiKey,
      montarSqlVersionar(setup.produto_id, setup.op_a_id, setup.op_c_id)
    ))[0]
    console.log(JSON.stringify(versionamento, null, 2))

    const snapshotAtualDepois = (await executarQuery(
      projectRef,
      managementApiKey,
      montarSqlSnapshot(turnoAtual.turno_op_id),
      true
    ))[0]
    console.log('\nSnapshot turno atual depois da versão v2:')
    console.log(JSON.stringify(snapshotAtualDepois, null, 2))

    console.log('\n--- Criar novo turno com roteiro vigente v2 ---')
    const turnoNovo = (await executarQuery(
      projectRef,
      managementApiKey,
      montarSqlCriarTurno(`${PREFIXO}-OP-NOVA`, setup.produto_id)
    ))[0]
    console.log(JSON.stringify(turnoNovo, null, 2))

    const snapshotNovo = (await executarQuery(
      projectRef,
      managementApiKey,
      montarSqlSnapshot(turnoNovo.turno_op_id),
      true
    ))[0]
    console.log('\nSnapshot novo turno:')
    console.log(JSON.stringify(snapshotNovo, null, 2))

    const turnoAtualPreservado =
      snapshotAtualAntes.codigos.join(',') === `${PREFIXO}-OP-A,${PREFIXO}-OP-B` &&
      snapshotAtualDepois.codigos.join(',') === `${PREFIXO}-OP-A,${PREFIXO}-OP-B` &&
      snapshotAtualDepois.versoes.every((versao) => versao === 1)

    const novoTurnoUsaVigente =
      snapshotNovo.codigos.join(',') === `${PREFIXO}-OP-A,${PREFIXO}-OP-C` &&
      snapshotNovo.versoes.every((versao) => versao === 2) &&
      snapshotNovo.todas_linhas_vigentes_agora === true

    if (!turnoAtualPreservado || !novoTurnoUsaVigente) {
      throw new Error('Validação de preservação/vigência falhou.')
    }

    console.log('\n✅ HU 52.3/52.4 — Turno atual preservado e novo turno usando roteiro vigente.')
  } finally {
    console.log('\n--- Limpeza final ---')
    console.log(JSON.stringify((await executarQuery(projectRef, managementApiKey, montarSqlLimpeza()))[0], null, 2))
  }
}

main().catch((erro) => {
  console.error('Erro fatal:', erro.message)
  process.exit(1)
})
