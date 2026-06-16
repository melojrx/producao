from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from shared.permissions import IsSupervisor
from rest_framework.response import Response

from turnos.serializers.mutacao import AbrirTurnoInputSerializer, EncerrarTurnoInputSerializer
from turnos.serializers.turno import TurnoDetailSerializer
from turnos.services import TurnoAberturaServiceError, TurnoEncerramentoServiceError, abrir_turno, encerrar_turno


class AbrirTurnoViewSet(viewsets.GenericViewSet):
    permission_classes = [IsSupervisor]
    serializer_class = AbrirTurnoInputSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            turno = abrir_turno(
                operadores_disponiveis=dados["operadores_disponiveis"],
                minutos_turno=dados["minutos_turno"],
                observacao=dados.get("observacao", ""),
                operador_ids=[str(operador_id) for operador_id in dados.get("operador_ids", [])],
                ops=dados.get("ops", []),
                encerrar_turno_aberto_anterior=dados.get("encerrar_turno_aberto_anterior", True),
                carregar_pendencias_turno_anterior=dados.get("carregar_pendencias_turno_anterior", False),
                turno_origem_pendencias_id=(
                    str(dados["turno_origem_pendencias_id"])
                    if dados.get("turno_origem_pendencias_id") is not None
                    else None
                ),
                turno_op_ids_pendentes=[
                    str(turno_op_id) for turno_op_id in dados.get("turno_op_ids_pendentes", [])
                ],
            )
        except TurnoAberturaServiceError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(TurnoDetailSerializer(turno).data, status=status.HTTP_201_CREATED)


class EncerrarTurnoViewSet(viewsets.GenericViewSet):
    permission_classes = [IsSupervisor]
    serializer_class = EncerrarTurnoInputSerializer

    def create(self, request, turno_id=None, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data
        turno_id = turno_id or kwargs.get("pk")

        try:
            turno = encerrar_turno(
                turno_id=str(turno_id),
                encerrado_por_id=(
                    str(dados["encerrado_por_id"]) if dados.get("encerrado_por_id") is not None else None
                ),
            )
        except TurnoEncerramentoServiceError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(TurnoDetailSerializer(turno).data, status=status.HTTP_200_OK)
