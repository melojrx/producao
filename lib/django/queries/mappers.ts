import type {
  MaquinaListItem,
  OperacaoListItem,
  OperadorListItem,
  ProdutoListItem,
  ProdutoRoteiroItem,
  SetorListItem,
} from '@/types'

export interface DjangoOperadorJson {
  id: string
  nome: string
  matricula: string
  funcao: string
  status: string
  carga_horaria_min: number
  qr_code_token: string
  foto_url: string
  maquina_preferida: string | null
  maquina_preferida_codigo: string | null
  created_at: string
  updated_at: string
}

export interface DjangoMaquinaJson {
  id: string
  codigo: string
  modelo: string
  marca: string
  numero_patrimonio: string
  situacao: string
  qr_code_token: string
  created_at: string
  updated_at: string
}

export interface DjangoSetorJson {
  id: string
  codigo: string
  nome: string
  situacao: string
  modo_apontamento: string
  sequencia_fluxo: number
  created_at: string
  updated_at: string
}

export interface DjangoOperacaoJson {
  id: string
  codigo: string
  descricao: string
  setor: string
  setor_nome: string
  maquina: string | null
  maquina_codigo: string | null
  tipo_maquina: string | null
  tipo_maquina_nome: string | null
  tempo_padrao_min: string | number
  meta_hora: number | null
  meta_dia: number | null
  situacao: string
  imagem_url: string
  qr_code_token: string
  created_at: string
  updated_at: string
}

export interface DjangoProdutoJson {
  id: string
  codigo: string
  nome: string
  ativo: boolean
  imagem_frente_url: string
  imagem_costa_url: string
  tp_produto_min: string | number | null
  created_at: string
  updated_at: string
}

export interface DjangoProdutoOperacaoJson {
  id: string
  produto: string
  produto_codigo: string
  operacao: string
  operacao_codigo: string
  operacao_descricao: string
  operacao_setor_nome: string
  operacao_tempo_padrao: string | number
  sequencia: number
  versao_roteiro: number
  vigente: boolean
  substituido_em: string | null
  created_at: string
  updated_at: string
}

export interface DjangoProdutoDetailJson extends DjangoProdutoJson {
  roteiro?: DjangoProdutoOperacaoJson[]
}

function textoOuNull(valor: string | null | undefined): string | null {
  if (!valor || !valor.trim()) {
    return null
  }

  return valor
}

function numeroOuNull(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') {
    return null
  }

  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : null
}

export function mapearCodigoSetorParaNumero(codigo: string): number {
  const convertido = Number.parseInt(codigo, 10)
  return Number.isNaN(convertido) ? 0 : convertido
}

export function mapearSituacaoParaAtivo(situacao: string): boolean {
  return situacao === 'ativo' || situacao === 'ativa'
}

export function mapearOperadorDjango(django: DjangoOperadorJson): OperadorListItem {
  return {
    id: django.id,
    nome: django.nome,
    matricula: django.matricula,
    funcao: textoOuNull(django.funcao),
    status: django.status,
    carga_horaria_min: django.carga_horaria_min,
    qr_code_token: django.qr_code_token,
    foto_url: textoOuNull(django.foto_url),
    setor: null,
    created_at: django.created_at,
    updated_at: django.updated_at,
  }
}

export function mapearMaquinaDjango(django: DjangoMaquinaJson): MaquinaListItem {
  return {
    id: django.id,
    codigo: django.codigo,
    modelo: textoOuNull(django.modelo),
    marca: textoOuNull(django.marca),
    numero_patrimonio: textoOuNull(django.numero_patrimonio),
    status: django.situacao,
    qr_code_token: django.qr_code_token,
    created_at: django.created_at,
    updated_at: django.updated_at,
  }
}

export function mapearSetorDjango(django: DjangoSetorJson): SetorListItem {
  return {
    id: django.id,
    codigo: mapearCodigoSetorParaNumero(django.codigo),
    nome: django.nome,
    ativo: mapearSituacaoParaAtivo(django.situacao),
    modo_apontamento: django.modo_apontamento,
    created_at: django.created_at,
    updated_at: django.updated_at,
  }
}

export function mapearOperacaoDjango(
  django: DjangoOperacaoJson,
  maquinasPorId: Map<string, MaquinaListItem>,
  setoresPorId: Map<string, SetorListItem>
): OperacaoListItem {
  const maquina = django.maquina ? maquinasPorId.get(django.maquina) : null
  const setor = setoresPorId.get(django.setor)

  return {
    id: django.id,
    codigo: django.codigo,
    descricao: django.descricao,
    setor_id: django.setor,
    maquina_id: django.maquina,
    tempo_padrao_min: Number(django.tempo_padrao_min),
    meta_hora: django.meta_hora,
    meta_dia: django.meta_dia,
    ativa: mapearSituacaoParaAtivo(django.situacao),
    imagem_url: textoOuNull(django.imagem_url),
    qr_code_token: django.qr_code_token,
    tipo_maquina_codigo: django.tipo_maquina,
    created_at: django.created_at,
    maquinaCodigo: django.maquina_codigo ?? maquina?.codigo ?? null,
    maquinaModelo: maquina?.modelo ?? null,
    setorCodigo: setor?.codigo ?? null,
    setorNome: django.setor_nome ?? setor?.nome ?? null,
  }
}

export function mapearOperacoesDjango(
  operacoes: DjangoOperacaoJson[],
  maquinas: MaquinaListItem[],
  setores: SetorListItem[]
): OperacaoListItem[] {
  const maquinasPorId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))
  const setoresPorId = new Map(setores.map((setor) => [setor.id, setor]))

  return operacoes.map((operacao) => mapearOperacaoDjango(operacao, maquinasPorId, setoresPorId))
}

function normalizarContratoImagensProduto(
  produto: Omit<ProdutoListItem, 'roteiro' | 'setoresEnvolvidos'>
): Omit<ProdutoListItem, 'roteiro' | 'setoresEnvolvidos'> {
  const imagemLegada = produto.imagem_url ?? null

  return {
    ...produto,
    descricao: produto.descricao ?? null,
    imagem_frente_url: produto.imagem_frente_url ?? imagemLegada,
    imagem_costa_url: produto.imagem_costa_url ?? null,
  }
}

export function mapearProdutoBaseDjango(django: DjangoProdutoJson): Omit<ProdutoListItem, 'roteiro' | 'setoresEnvolvidos'> {
  const imagemFrente = textoOuNull(django.imagem_frente_url)

  return normalizarContratoImagensProduto({
    id: django.id,
    referencia: django.codigo,
    nome: django.nome,
    ativo: django.ativo,
    descricao: null,
    imagem_frente_url: imagemFrente,
    imagem_costa_url: textoOuNull(django.imagem_costa_url),
    imagem_url: imagemFrente,
    tp_produto_min: numeroOuNull(django.tp_produto_min),
    created_at: django.created_at,
    updated_at: django.updated_at,
  })
}

export function mapearProdutosComRoteiroDjango(
  produtos: DjangoProdutoJson[],
  produtoOperacoes: DjangoProdutoOperacaoJson[],
  operacoes: DjangoOperacaoJson[],
  maquinas: MaquinaListItem[],
  setores: SetorListItem[]
): ProdutoListItem[] {
  const operacoesPorId = new Map(operacoes.map((operacao) => [operacao.id, operacao]))
  const maquinasPorId = new Map(maquinas.map((maquina) => [maquina.id, maquina]))
  const setoresPorId = new Map(setores.map((setor) => [setor.id, setor]))
  const roteiroPorProduto = new Map<string, ProdutoRoteiroItem[]>()

  produtoOperacoes.forEach((item) => {
    if (!item.produto || !item.operacao || !item.vigente) {
      return
    }

    const operacao = operacoesPorId.get(item.operacao)
    if (!operacao) {
      return
    }

    const setor = setoresPorId.get(operacao.setor)
    const maquina = operacao.maquina ? maquinasPorId.get(operacao.maquina) ?? null : null
    const roteiroAtual = roteiroPorProduto.get(item.produto) ?? []

    roteiroAtual.push({
      produtoOperacaoId: item.id,
      operacaoId: operacao.id,
      sequencia: item.sequencia,
      codigo: operacao.codigo,
      descricao: operacao.descricao,
      tempoPadraoMin: Number(operacao.tempo_padrao_min),
      maquinaId: operacao.maquina,
      maquinaCodigo: operacao.maquina_codigo ?? maquina?.codigo ?? null,
      maquinaModelo: maquina?.modelo ?? null,
      setorId: operacao.setor,
      setorCodigo: setor?.codigo ?? null,
      setorNome: operacao.setor_nome ?? setor?.nome ?? null,
    })
    roteiroPorProduto.set(item.produto, roteiroAtual)
  })

  return produtos.map((produto) => {
    const roteiro = (roteiroPorProduto.get(produto.id) ?? []).sort(
      (primeiro, segundo) => primeiro.sequencia - segundo.sequencia
    )

    return {
      ...mapearProdutoBaseDjango(produto),
      roteiro,
      setoresEnvolvidos: Array.from(
        new Set(
          roteiro
            .map((item) => item.setorNome)
            .filter((setorNome): setorNome is string => Boolean(setorNome))
        )
      ),
    }
  })
}

export function mapearProdutoComRoteiroDetailDjango(
  produto: DjangoProdutoDetailJson,
  operacoes: DjangoOperacaoJson[],
  maquinas: MaquinaListItem[],
  setores: SetorListItem[]
): ProdutoListItem {
  const roteiroVigente = (produto.roteiro ?? []).filter((item) => item.vigente)

  return mapearProdutosComRoteiroDjango([produto], roteiroVigente, operacoes, maquinas, setores)[0]
}
