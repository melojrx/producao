from inspect import signature

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from shared.permissions import IsQualidadeReviewer
from rest_framework.response import Response

from qualidade.serializers.qualidade import QualidadeRegistroDetailSerializer
from qualidade.serializers.revisao import RevisaoQualidadeOperacionalInputSerializer


class RevisaoQualidadeOperacionalViewSet(viewsets.GenericViewSet):
    """Endpoint isolado para registrar revisao operacional de Qualidade."""

    permission_classes = [IsQualidadeReviewer]
    serializer_class = RevisaoQualidadeOperacionalInputSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            registro = registrar_revisao_qualidade_operacional(
                turno_setor_operacao_id_qualidade=str(dados["turno_setor_operacao_id_qualidade"]),
                revisor_usuario_id=str(request.user.id),
                quantidade_aprovada=dados["quantidade_aprovada"],
                quantidade_reprovada=dados["quantidade_reprovada"],
                origem_lancamento=dados["origem_lancamento"],
                defeitos=[
                    {
                        "turno_setor_operacao_id_origem": str(defeito["turno_setor_operacao_id_origem"]),
                        "qualidade_defeito_id": str(defeito["qualidade_defeito_id"]),
                        "quantidade_defeito": defeito["quantidade_defeito"],
                        "observacao": defeito.get("observacao", ""),
                    }
                    for defeito in dados["defeitos"]
                ],
            )
        except DjangoValidationError as exc:
            raise ValidationError({"detail": _mensagem_erro_dominio(exc)}) from exc
        except Exception as exc:
            if _eh_erro_dominio(exc):
                raise ValidationError({"detail": _mensagem_erro_dominio(exc)}) from exc
            raise

        return Response(QualidadeRegistroDetailSerializer(registro).data, status=status.HTTP_201_CREATED)


def registrar_revisao_qualidade_operacional(**kwargs):
    from qualidade.services import revisoes as revisoes_service

    registrar_revisao = revisoes_service.registrar_revisao_qualidade_operacional
    parametros_service = signature(registrar_revisao).parameters
    kwargs_service = dict(kwargs)

    if hasattr(revisoes_service, "DefeitoRevisaoInput"):
        kwargs_service["defeitos"] = [
            revisoes_service.DefeitoRevisaoInput(
                turno_setor_operacao_origem_id=defeito["turno_setor_operacao_id_origem"],
                defeito_id=defeito["qualidade_defeito_id"],
                quantidade_defeito=defeito["quantidade_defeito"],
                observacao=defeito.get("observacao", ""),
            )
            for defeito in kwargs_service["defeitos"]
        ]

    origem_lancamento = kwargs_service.get("origem_lancamento")
    if "origem_lancamento" not in parametros_service:
        kwargs_service.pop("origem_lancamento", None)
        if origem_lancamento and "observacao" in parametros_service and not kwargs_service.get("observacao"):
            kwargs_service["observacao"] = f"origem_lancamento={origem_lancamento}"

    return registrar_revisao(**kwargs_service)


def _eh_erro_dominio(exc: Exception) -> bool:
    nome_classe = exc.__class__.__name__
    modulo_classe = exc.__class__.__module__

    return (
        isinstance(exc, ValueError)
        or nome_classe.endswith("ServiceError")
        or nome_classe.endswith("DomainError")
        or nome_classe.endswith("ErroDominio")
        or modulo_classe.startswith("qualidade.services")
    )


def _mensagem_erro_dominio(exc: Exception) -> str:
    if isinstance(exc, DjangoValidationError):
        if hasattr(exc, "message"):
            return str(exc.message)
        return "; ".join(str(item) for item in exc.messages)

    return str(exc)
