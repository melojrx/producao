from qualidade.selectors.qualidade import (
    get_qualidade_defeito,
    get_qualidade_registro,
    list_qualidade_defeitos,
    list_qualidade_detalhes,
    list_qualidade_registros,
)
from qualidade.serializers.qualidade import (
    QualidadeDefeitoSerializer,
    QualidadeDetalheSerializer,
    QualidadeRegistroDetailSerializer,
    QualidadeRegistroSerializer,
)
from qualidade.services import (
    QualidadeDefeitoServiceError,
    criar_defeito_qualidade,
    editar_defeito_qualidade,
    inativar_defeito_qualidade,
    reativar_defeito_qualidade,
)
from qualidade.models import QualidadeDefeito, QualidadeDetalhe, QualidadeRegistro
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework import viewsets
from shared.permissions import IsSupervisor
from rest_framework.response import Response


class QualidadeRegistroViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para QualidadeRegistro - revisoes de qualidade."""

    permission_classes = [IsSupervisor]
    serializer_class = QualidadeRegistroSerializer
    queryset = QualidadeRegistro.objects.none()

    def get_queryset(self):
        turno_id = self.request.query_params.get("turno")
        revisor_id = self.request.query_params.get("revisor")
        return list_qualidade_registros(turno_id=turno_id, revisor_id=revisor_id)

    def retrieve(self, request, *args, **kwargs):
        instance = get_qualidade_registro(kwargs["pk"])
        serializer = QualidadeRegistroDetailSerializer(instance)
        return Response(serializer.data)


class QualidadeDetalheViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para QualidadeDetalhe - defeitos por registro."""

    permission_classes = [IsSupervisor]
    serializer_class = QualidadeDetalheSerializer
    queryset = QualidadeDetalhe.objects.none()

    def get_queryset(self):
        registro_id = self.request.query_params.get("registro")
        return list_qualidade_detalhes(registro_id=registro_id)


class QualidadeDefeitoViewSet(viewsets.GenericViewSet):
    """ViewSet para QualidadeDefeito - catalogo de defeitos."""

    permission_classes = [IsSupervisor]
    serializer_class = QualidadeDefeitoSerializer
    queryset = QualidadeDefeito.objects.none()

    def get_queryset(self):
        ativo_param = self.request.query_params.get("ativo")
        ativo = ativo_param.lower() == "true" if ativo_param else True
        return list_qualidade_defeitos(ativo=ativo)

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = get_qualidade_defeito(kwargs["pk"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        defeito = self._executar_service(
            criar_defeito_qualidade,
            nome=serializer.validated_data["nome"],
            classificacao=serializer.validated_data["classificacao"],
            ativo=serializer.validated_data.get("ativo", True),
        )
        return Response(self.get_serializer(defeito).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = get_qualidade_defeito(kwargs["pk"])
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        defeito = self._executar_service(
            editar_defeito_qualidade,
            defeito_id=str(instance.id),
            nome=serializer.validated_data.get("nome"),
            classificacao=serializer.validated_data.get("classificacao"),
            ativo=serializer.validated_data.get("ativo"),
        )
        return Response(self.get_serializer(defeito).data)

    def inativar(self, request, *args, **kwargs):
        defeito = self._executar_service(inativar_defeito_qualidade, defeito_id=str(kwargs["pk"]))
        return Response(self.get_serializer(defeito).data)

    def reativar(self, request, *args, **kwargs):
        defeito = self._executar_service(reativar_defeito_qualidade, defeito_id=str(kwargs["pk"]))
        return Response(self.get_serializer(defeito).data)

    def _executar_service(self, service, **kwargs):
        try:
            return service(**kwargs)
        except QualidadeDefeitoServiceError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
