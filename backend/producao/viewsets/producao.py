from uuid import UUID

from rest_framework import viewsets
from rest_framework import status
from rest_framework.exceptions import ValidationError
from shared.permissions import IsSupervisor
from rest_framework.response import Response

from producao.models import RegistroProducao
from producao.selectors import list_registros_producao
from producao.serializers.producao import ApontamentoOperacaoInputSerializer, RegistroProducaoSerializer
from producao.services import ProducaoServiceError, registrar_apontamento_operacao


class RegistroProducaoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para RegistroProducao - apontamentos."""

    permission_classes = [IsSupervisor]
    serializer_class = RegistroProducaoSerializer
    queryset = RegistroProducao.objects.none()

    def get_queryset(self):
        turno_id = self.request.query_params.get("turno")
        operador_id = self.request.query_params.get("operador")
        return list_registros_producao(turno_id=turno_id, operador_id=operador_id)


class ApontamentoOperacaoViewSet(viewsets.GenericViewSet):
    """Endpoint isolado para apontamento produtivo atomico."""

    permission_classes = [IsSupervisor]
    serializer_class = ApontamentoOperacaoInputSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            registro = registrar_apontamento_operacao(
                turno_setor_operacao_id=str(dados["turno_setor_operacao"]),
                operador_id=str(dados["operador"]),
                quantidade=dados["quantidade"],
                origem_apontamento=dados["origem_apontamento"],
                maquina_id=_uuid_opcional_para_str(dados.get("maquina")),
                usuario_sistema_id=_uuid_opcional_para_str(dados.get("usuario_sistema")),
                observacao=dados.get("observacao", ""),
            )
        except ProducaoServiceError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(RegistroProducaoSerializer(registro).data, status=status.HTTP_201_CREATED)


def _uuid_opcional_para_str(value: UUID | None) -> str | None:
    if value is None:
        return None
    return str(value)
