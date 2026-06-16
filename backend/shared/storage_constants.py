IMAGEM_MIME_TYPES = ("image/jpeg", "image/png", "image/webp")

IMAGEM_MAX_BYTES = 5 * 1024 * 1024

EXTENSAO_POR_MIME_TYPE: dict[str, str] = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

PRODUTO_IMAGENS_DIR = "produtos"
OPERACAO_IMAGENS_DIR = "operacoes"

PRODUTO_IMAGEM_TIPOS = ("frente", "costa")
