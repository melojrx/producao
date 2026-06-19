from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from scanner.selectors.scanner import (
    agregar_quantidades_turno_setor,
    buscar_operador_por_qr_token,
    buscar_turno_setor_aberto_por_id,
    buscar_turno_setor_por_qr_token,
    listar_demandas_turno_setor,
)
from scanner.serializers.scanner import (
    OperadorScannerSerializer,
    TurnoSetorDemandaScannerSerializer,
    TurnoSetorScannerSerializer,
)


class ScannerOperadorDetailView(APIView):
    """Leitura publica de operador ativo por token QR."""

    permission_classes = [AllowAny]

    def get(self, _request, token: str) -> Response:
        operador = buscar_operador_por_qr_token(token)
        if not operador:
            return Response({"detail": "Operador nao encontrado."}, status=404)
        return Response(OperadorScannerSerializer(operador).data)


class ScannerSetorDetailView(APIView):
    """Leitura publica de turno-setor aberto por token QR."""

    permission_classes = [AllowAny]

    def get(self, _request, token: str) -> Response:
        turno_setor = buscar_turno_setor_por_qr_token(token)
        if not turno_setor:
            return Response({"detail": "Setor de turno nao encontrado."}, status=404)

        quantidade_planejada, quantidade_realizada = agregar_quantidades_turno_setor(turno_setor)
        payload = TurnoSetorScannerSerializer(
            turno_setor,
            context={
                "quantidade_planejada": quantidade_planejada,
                "quantidade_realizada": quantidade_realizada,
            },
        ).data
        return Response(payload)


class ScannerSetorDemandasView(APIView):
    """Leitura publica de demandas do turno-setor escaneado."""

    permission_classes = [AllowAny]

    def get(self, _request, token: str) -> Response:
        turno_setor = buscar_turno_setor_por_qr_token(token)
        if not turno_setor:
            return Response({"detail": "Setor de turno nao encontrado."}, status=404)

        demandas = listar_demandas_turno_setor(str(turno_setor.id))
        serializer = TurnoSetorDemandaScannerSerializer(demandas, many=True)
        return Response(serializer.data)


class ScannerTurnoSetorDemandasByIdView(APIView):
    """Leitura publica de demandas por ID do turno-setor aberto."""

    permission_classes = [AllowAny]

    def get(self, _request, turno_setor_id: str) -> Response:
        turno_setor = buscar_turno_setor_aberto_por_id(turno_setor_id)
        if not turno_setor:
            return Response({"detail": "Setor de turno nao encontrado."}, status=404)

        demandas = listar_demandas_turno_setor(str(turno_setor.id))
        serializer = TurnoSetorDemandaScannerSerializer(demandas, many=True)
        return Response(serializer.data)
