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

const NOME_INICIAL = 'VALIDACAO HU 51.8 TIPO DEFEITO'
const NOME_EDITADO = 'VALIDACAO HU 51.8 TIPO DEFEITO EDITADO'

function montarSqlLimpeza() {
  return `
delete from public.qualidade_defeitos
where nome in ('${NOME_INICIAL}', '${NOME_EDITADO}')
returning id;
`
}

function montarSqlCriar() {
  return `
insert into public.qualidade_defeitos (nome, classificacao, ordem, ativo)
values ('${NOME_INICIAL}', 'processo', 9100, true)
returning id, nome, classificacao, ordem, ativo;
`
}

function montarSqlBuscar(id) {
  return `
select count(*)::integer as busca_total
from public.qualidade_defeitos
where id = '${id}'
  and nome ilike '%HU 51.8%';
`
}

function montarSqlEditar(id) {
  return `
update public.qualidade_defeitos
set
  nome = '${NOME_EDITADO}',
  classificacao = 'operador',
  ordem = 9101,
  updated_at = now()
where id = '${id}'
returning id, nome, classificacao, ordem, ativo;
`
}

function montarSqlAlterarStatus(id, ativo) {
  return `
update public.qualidade_defeitos
set ativo = ${ativo ? 'true' : 'false'}, updated_at = now()
where id = '${id}'
returning id, ativo;
`
}

function montarSqlContarCatalogoAtivo(id) {
  return `
select count(*)::integer as catalogo_ativo
from public.qualidade_defeitos
where id = '${id}'
  and ativo = true;
`
}

function montarSqlExcluir(id) {
  return `
delete from public.qualidade_defeitos
where id = '${id}'
  and not exists (
    select 1
    from public.qualidade_detalhes
    where qualidade_defeito_id = '${id}'
  )
returning id;
`
}

async function main() {
  const env = carregarEnvLocal()
  const supabaseUrl = obterValorObrigatorio(env, 'NEXT_PUBLIC_SUPABASE_URL')
  const managementApiKey = obterValorObrigatorio(env, 'MCP_API_KEY')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const limpezaAntes = await executarQuery(projectRef, managementApiKey, montarSqlLimpeza())
  const criado = await executarQuery(projectRef, managementApiKey, montarSqlCriar())
  const id = criado[0]?.id

  if (!id) {
    throw new Error('Tipo de defeito temporario nao foi criado para validacao.')
  }

  const busca = await executarQuery(projectRef, managementApiKey, montarSqlBuscar(id), true)
  const editado = await executarQuery(projectRef, managementApiKey, montarSqlEditar(id))
  const inativado = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlAlterarStatus(id, false)
  )
  const catalogoAtivoAposInativar = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlContarCatalogoAtivo(id),
    true
  )
  const reativado = await executarQuery(
    projectRef,
    managementApiKey,
    montarSqlAlterarStatus(id, true)
  )
  const excluido = await executarQuery(projectRef, managementApiKey, montarSqlExcluir(id))
  const limpezaDepois = await executarQuery(projectRef, managementApiKey, montarSqlLimpeza())

  console.log(
    JSON.stringify(
      {
        projectRef,
        limpezaAntes,
        criado,
        busca,
        editado,
        inativado,
        catalogoAtivoAposInativar,
        reativado,
        excluido,
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
