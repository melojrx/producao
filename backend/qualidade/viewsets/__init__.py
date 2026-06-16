from qualidade.viewsets.qualidade import (
    QualidadeDefeitoViewSet,
    QualidadeDetalheViewSet,
    QualidadeRegistroViewSet,
)
from qualidade.viewsets.revisao import RevisaoQualidadeOperacionalViewSet

__all__ = [
    "QualidadeRegistroViewSet",
    "QualidadeDetalheViewSet",
    "QualidadeDefeitoViewSet",
    "RevisaoQualidadeOperacionalViewSet",
]
