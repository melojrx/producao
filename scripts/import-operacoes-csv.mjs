import fs from 'node:fs/promises'
import path from 'node:path'

const MACHINE_CODE_MAP = {
  '12AG': '12ag',
  '2AG': '2ag',
  BP: 'bp',
  COS: 'cos',
  FIL: 'fil',
  GOL: 'gal',
  INT: 'int',
  MAN: 'man',
  OV: 'ov',
  RT: 'rt',
  TRAV: 'trav',
}

const NULLABLE_MACHINE_CODES = new Set(['bp', 'cos', 'fil', 'int', 'man', 'trav'])

const SETOR_NAME_MAP = {
  Dianteiro: 'Frente',
  Final: 'Finalização',
  Montagem: 'Montagem',
  Preparação: 'Preparação',
  Traseiro: 'Costa',
}

function parseEnvFile(raw) {
  const env = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

function parseCsvNumber(rawValue) {
  const normalized = rawValue.trim().replace(',', '.')
  const parsed = Number.parseFloat(normalized)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Tempo padrão inválido no CSV: "${rawValue}"`)
  }

  return parsed
}

function calcularMetaHora(tempoPadraoMin) {
  if (tempoPadraoMin <= 0) {
    return 0
  }

  return Math.floor(60 / tempoPadraoMin)
}

function calcularMetaDia(tempoPadraoMin, minutosTurno = 540) {
  if (tempoPadraoMin <= 0) {
    return 0
  }

  return Math.floor(minutosTurno / tempoPadraoMin)
}

function normalizeMachineCode(rawValue) {
  return MACHINE_CODE_MAP[rawValue.trim().toUpperCase()] ?? null
}

function normalizeSetorName(rawValue) {
  return SETOR_NAME_MAP[rawValue.trim()] ?? null
}

function escapeSqlLiteral(value) {
  return String(value).replaceAll("'", "''")
}

function toSqlText(value) {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  return `'${escapeSqlLiteral(value)}'`
}

async function loadProjectEnv(projectRoot) {
  const envPath = path.join(projectRoot, '.env.local')
  const envRaw = await fs.readFile(envPath, 'utf8')
  return parseEnvFile(envRaw)
}

async function readCsvRows(projectRoot) {
  const csvPath = path.join(projectRoot, 'docs', 'operacoes.csv')
  const csvRaw = await fs.readFile(csvPath, 'utf8')

  return csvRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const columns = line.split(';')

      if (columns.length !== 5) {
        throw new Error(`Linha ${index + 1} do CSV inválida: esperado 5 colunas, recebido ${columns.length}`)
      }

      const [codigo, setorNome, descricao, machineCodeRaw, tempoPadraoRaw] = columns.map((value) =>
        value.trim()
      )

      const machineCode = normalizeMachineCode(machineCodeRaw)
      if (!machineCode) {
        throw new Error(
          `Linha ${index + 1}: sigla de máquina "${machineCodeRaw}" não está mapeada no script`
        )
      }

      const setorNomeMapeado = normalizeSetorName(setorNome)
      if (!setorNomeMapeado) {
        throw new Error(`Linha ${index + 1}: setor "${setorNome}" não está mapeado no script`)
      }

      return {
        csvLine: index + 1,
        codigo,
        setorNome,
        setorNomeMapeado,
        descricao,
        machineCodeRaw,
        machineCode,
        tempoPadraoMin: parseCsvNumber(tempoPadraoRaw),
      }
    })
}

async function queryManagementApi(projectRef, apiKey, sql, readOnly = true) {
  const route = readOnly ? 'read-only' : ''
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query${route ? `/${route}` : ''}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  const rawText = await response.text()

  if (!response.ok) {
    throw new Error(`Management API ${response.status}: ${rawText}`)
  }

  return rawText ? JSON.parse(rawText) : null
}

function buildValidationSummary(rows, setores, maquinas, operacoesExistentes) {
  const setoresPorNome = new Map(setores.map((setor) => [setor.nome, setor]))
  const maquinasPorPrefixo = new Map(
    maquinas.map((maquina) => [String(maquina.codigo).split('-')[0].toLowerCase(), maquina])
  )
  const operacoesPorCodigo = new Map(operacoesExistentes.map((operacao) => [operacao.codigo, operacao]))

  const mappedRows = rows.map((row) => {
    const setor = setoresPorNome.get(row.setorNomeMapeado) ?? null
    const maquina = maquinasPorPrefixo.get(row.machineCode) ?? null
    const operacaoExistente = operacoesPorCodigo.get(row.codigo) ?? null
    const machineNullable = NULLABLE_MACHINE_CODES.has(row.machineCode)

    return {
      ...row,
      setorId: setor?.id ?? null,
      maquinaId: maquina?.id ?? null,
      maquinaModelo: maquina?.modelo ?? null,
      machineNullable,
      operacaoExistente: operacaoExistente
        ? {
            id: operacaoExistente.id,
            codigo: operacaoExistente.codigo,
            descricao: operacaoExistente.descricao,
            setor_id: operacaoExistente.setor_id,
            maquina_id: operacaoExistente.maquina_id,
            tempo_padrao_min: operacaoExistente.tempo_padrao_min,
          }
        : null,
    }
  })

  const missingSetores = mappedRows.filter((row) => !row.setorId)
  const missingMaquinas = mappedRows.filter((row) => !row.maquinaId && !row.machineNullable)
  const rowsWithNullMachine = mappedRows.filter((row) => !row.maquinaId && row.machineNullable)

  return {
    mappedRows,
    missingSetores,
    missingMaquinas,
    rowsWithNullMachine,
  }
}

function buildUpsertSql(mappedRows) {
  const valuesSql = mappedRows
    .map((row) => {
      const metaHora = calcularMetaHora(row.tempoPadraoMin)
      const metaDia = calcularMetaDia(row.tempoPadraoMin)

      return `(
  ${toSqlText(row.codigo)},
  ${toSqlText(row.descricao)},
  ${toSqlText(row.maquinaId)},
  ${toSqlText(row.setorId)},
  ${row.tempoPadraoMin},
  ${metaHora},
  ${metaDia},
  TRUE
)`
    })
    .join(',\n')

  return `
WITH payload (
  codigo,
  descricao,
  maquina_id,
  setor_id,
  tempo_padrao_min,
  meta_hora,
  meta_dia,
  ativa
) AS (
  VALUES
${valuesSql}
)
INSERT INTO public.operacoes (
  codigo,
  descricao,
  maquina_id,
  setor_id,
  tempo_padrao_min,
  meta_hora,
  meta_dia,
  ativa
)
SELECT
  codigo,
  descricao,
  maquina_id::uuid,
  setor_id::uuid,
  tempo_padrao_min,
  meta_hora,
  meta_dia,
  ativa
FROM payload
ON CONFLICT (codigo) DO UPDATE
SET
  descricao = EXCLUDED.descricao,
  maquina_id = EXCLUDED.maquina_id,
  setor_id = EXCLUDED.setor_id,
  tempo_padrao_min = EXCLUDED.tempo_padrao_min,
  meta_hora = EXCLUDED.meta_hora,
  meta_dia = EXCLUDED.meta_dia,
  ativa = EXCLUDED.ativa
RETURNING id, codigo, descricao, maquina_id, setor_id, tempo_padrao_min;
`.trim()
}

async function main() {
  const projectRoot = process.cwd()
  const env = await loadProjectEnv(projectRoot)
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const apiKey = env.MCP_API_KEY

  if (!supabaseUrl || !apiKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou MCP_API_KEY ausente em .env.local')
  }

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const mode = process.argv.includes('--list-db')
    ? 'list-db'
    : process.argv.includes('--apply')
      ? 'apply'
      : 'dry-run'
  const rows = await readCsvRows(projectRoot)

  const [setores, maquinas, operacoesExistentes] = await Promise.all([
    queryManagementApi(
      projectRef,
      apiKey,
      'select id, codigo, nome, ativo from public.setores order by codigo;',
      true
    ),
    queryManagementApi(
      projectRef,
      apiKey,
      'select id, codigo, modelo, marca, status from public.maquinas order by codigo;',
      true
    ),
    queryManagementApi(
      projectRef,
      apiKey,
      'select id, codigo, descricao, maquina_id, setor_id, tempo_padrao_min from public.operacoes;',
      true
    ),
  ])

  if (mode === 'list-db') {
    const operacoesResumo = await queryManagementApi(
      projectRef,
      apiKey,
      `select
        count(*)::int as total_operacoes,
        count(*) filter (where maquina_id is null)::int as total_sem_maquina,
        count(*) filter (where setor_id is null)::int as total_sem_setor
      from public.operacoes;`,
      true
    )

    console.log(
      JSON.stringify(
        {
          totalCsvRows: rows.length,
          setores,
          maquinas,
          operacoesExistentes: operacoesExistentes.length,
          operacoesResumo,
        },
        null,
        2
      )
    )
    return
  }

  const { mappedRows, missingSetores, missingMaquinas, rowsWithNullMachine } = buildValidationSummary(
    rows,
    setores,
    maquinas,
    operacoesExistentes
  )

  if (missingSetores.length > 0 || missingMaquinas.length > 0) {
    throw new Error(
      JSON.stringify(
        {
          message: 'Mapeamento incompleto para importação',
      missingSetores: missingSetores.map((row) => ({
            csvLine: row.csvLine,
            codigo: row.codigo,
            setorNome: row.setorNome,
            setorNomeMapeado: row.setorNomeMapeado,
          })),
          missingMaquinas: missingMaquinas.map((row) => ({
            csvLine: row.csvLine,
            codigo: row.codigo,
            machineCodeRaw: row.machineCodeRaw,
            machineCode: row.machineCode,
          })),
        },
        null,
        2
      )
    )
  }

  const willInsert = mappedRows.filter((row) => !row.operacaoExistente).length
  const willUpdate = mappedRows.filter((row) => row.operacaoExistente).length

  const summary = {
    mode,
    totalCsvRows: rows.length,
    willInsert,
    willUpdate,
    rowsWithNullMachine: rowsWithNullMachine.length,
    setoresCsv: [...new Set(mappedRows.map((row) => `${row.setorNome} -> ${row.setorNomeMapeado}`))],
    machineCodesCsv: [...new Set(mappedRows.map((row) => `${row.machineCodeRaw} -> ${row.machineCode}`))],
    nullMachineGroups: [...new Set(rowsWithNullMachine.map((row) => `${row.machineCodeRaw} -> NULL`))],
    sample: mappedRows.slice(0, 10).map((row) => ({
      csvLine: row.csvLine,
      codigo: row.codigo,
      descricao: row.descricao,
      setorNome: row.setorNome,
      setorNomeMapeado: row.setorNomeMapeado,
      setorId: row.setorId,
      machineCodeRaw: row.machineCodeRaw,
      machineCode: row.machineCode,
      maquinaId: row.maquinaId,
      maquinaModelo: row.maquinaModelo,
      machineNullable: row.machineNullable,
      tempoPadraoMin: row.tempoPadraoMin,
      existing: Boolean(row.operacaoExistente),
    })),
  }

  if (mode === 'dry-run') {
    console.log(JSON.stringify(summary, null, 2))
    return
  }

  const sql = buildUpsertSql(mappedRows)
  const result = await queryManagementApi(projectRef, apiKey, sql, false)

  console.log(
    JSON.stringify(
      {
        ...summary,
        appliedCount: Array.isArray(result) ? result.length : 0,
        appliedSample: Array.isArray(result) ? result.slice(0, 10) : result,
        nullMachineRowsSample: rowsWithNullMachine.slice(0, 20).map((row) => ({
          csvLine: row.csvLine,
          codigo: row.codigo,
          descricao: row.descricao,
          machineCodeRaw: row.machineCodeRaw,
          machineCode: row.machineCode,
        })),
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
