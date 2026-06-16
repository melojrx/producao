from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.serializers.auth import LoginInputSerializer, LoginResponseSerializer, UsuarioAutenticadoSerializer
from accounts.services.auth import AuthServiceError, autenticar_usuario_administrativo


class LoginViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]
    serializer_class = LoginInputSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data

        try:
            usuario = autenticar_usuario_administrativo(
                email=dados["email"],
                senha=dados["senha"],
            )
        except AuthServiceError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        refresh = RefreshToken.for_user(usuario)
        payload = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UsuarioAutenticadoSerializer(usuario).data,
        }
        return Response(LoginResponseSerializer(payload).data, status=status.HTTP_200_OK)


class UsuarioAtualViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UsuarioAutenticadoSerializer

    def retrieve(self, request, *args, **kwargs):
        return Response(UsuarioAutenticadoSerializer(request.user).data)


class RefreshTokenView(TokenRefreshView):
    permission_classes = [AllowAny]
