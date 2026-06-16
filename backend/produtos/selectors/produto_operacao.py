from produtos.models import ProdutoOperacao


def list_produto_operacoes(produto_id=None, vigente=None):
    """Lista operacoes de produto com filtros."""
    qs = ProdutoOperacao.objects.select_related("produto", "operacao", "operacao__setor")
    if produto_id:
        qs = qs.filter(produto_id=produto_id)
    if vigente is not None:
        qs = qs.filter(vigente=vigente)
    return qs.order_by("produto", "sequencia")


def get_produto_operacao(produto_operacao_id):
    """Retorna um ProdutoOperacao pelo ID."""
    return (
        ProdutoOperacao.objects
        .select_related("produto", "operacao", "operacao__setor")
        .filter(id=produto_operacao_id)
        .first()
    )


def get_operacoes_do_produto(produto_id, vigente=True):
    """Retorna operacoes do produto ordenadas por sequencia."""
    return (
        ProdutoOperacao.objects
        .select_related("operacao", "operacao__setor")
        .filter(produto_id=produto_id, vigente=vigente)
        .order_by("sequencia")
    )