from produtos.models import Produto, ProdutoOperacao


def list_produtos(ativo=None):
    """Lista produtos com filtro opcional por ativo."""
    qs = Produto.objects.all()
    if ativo is not None:
        qs = qs.filter(ativo=ativo)
    return qs


def get_produto(produto_id):
    """Retorna um produto pelo ID com roteiro vigente."""
    return (
        Produto.objects
        .prefetch_related("roteiro")
        .filter(id=produto_id)
        .first()
    )


def get_produto_por_codigo(codigo):
    """Retorna um produto pelo codigo."""
    return Produto.objects.filter(codigo=codigo).first()


def list_produtos_com_roteiro_vigente():
    """Lista produtos que tem roteiro vigente."""
    return Produto.objects.filter(roteiro__vigente=True).distinct()


def get_roteiro_vigente(produto_id):
    """Retorna o roteiro vigente de um produto."""
    return (
        ProdutoOperacao.objects
        .select_related("operacao", "operacao__setor")
        .filter(produto_id=produto_id, vigente=True)
        .order_by("sequencia")
    )