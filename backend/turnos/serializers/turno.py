from rest_framework import serializers

from cadastros.serializers import SetorSerializer
from produtos.serializers import ProdutoSerializer


class TurnoSerializer(serializers.ModelSerializer):
    """Serializer para Turno - leitura basica."""

    class Meta:
        from turnos.models import Turno
        model = Turno
        fields = [
            "id",
            "status",
            "data_hora_abertura",
            "data_hora_encerramento",
            "operadores_disponiveis",
            "minutos_turno",
            "meta_grupo",
            "encerrado_por",
            "observacao",
            "created_at",
            "updated_at",
        ]


class TurnoDetailSerializer(serializers.ModelSerializer):
    """Serializer para Turno com recursos aninhados."""

    encerrado_por_nome = serializers.CharField(source="encerrado_por.username", read_only=True, allow_null=True)

    class Meta:
        from turnos.models import Turno
        model = Turno
        fields = [
            "id",
            "status",
            "data_hora_abertura",
            "data_hora_encerramento",
            "operadores_disponiveis",
            "minutos_turno",
            "meta_grupo",
            "encerrado_por",
            "encerrado_por_nome",
            "observacao",
            "created_at",
            "updated_at",
        ]


class TurnoOpSerializer(serializers.ModelSerializer):
    """Serializer para TurnoOp - OP planejada no turno."""

    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True)

    class Meta:
        from turnos.models import TurnoOp
        model = TurnoOp
        fields = [
            "id",
            "turno",
            "numero_op",
            "produto",
            "produto_nome",
            "produto_codigo",
            "quantidade_planejada",
            "quantidade_planejada_remanescente",
            "quantidade_realizada",
            "status",
            "turno_op_origem",
            "tp_produto_min_snapshot",
            "created_at",
            "updated_at",
        ]


class TurnoSetorSerializer(serializers.ModelSerializer):
    """Serializer para TurnoSetor - setor ativo no turno."""

    setor_nome = serializers.CharField(source="setor.nome", read_only=True)
    setor_codigo = serializers.CharField(source="setor.codigo", read_only=True)

    class Meta:
        from turnos.models import TurnoSetor
        model = TurnoSetor
        fields = [
            "id",
            "turno",
            "setor",
            "setor_nome",
            "setor_codigo",
            "qr_code_token",
            "status",
            "created_at",
            "updated_at",
        ]


class TurnoSetorDemandaSerializer(serializers.ModelSerializer):
    """Serializer para TurnoSetorDemanda - demanda OP/produto no setor."""

    produto_nome = serializers.CharField(source="produto.nome", read_only=True)
    numero_op = serializers.CharField(source="turno_op.numero_op", read_only=True)

    class Meta:
        from turnos.models import TurnoSetorDemanda
        model = TurnoSetorDemanda
        fields = [
            "id",
            "turno_setor",
            "turno",
            "turno_op",
            "numero_op",
            "produto",
            "produto_nome",
            "setor",
            "quantidade_herdada_setor",
            "quantidade_liberada_setor",
            "quantidade_planejada",
            "quantidade_realizada",
            "quantidade_aceita_turno",
            "quantidade_excedente_turno",
            "created_at",
            "updated_at",
        ]


class TurnoSetorOperacaoSerializer(serializers.ModelSerializer):
    """Serializer para TurnoSetorOperacao - operacao atomica no setor."""

    operacao_nome = serializers.CharField(source="operacao.nome", read_only=True)
    operacao_codigo = serializers.CharField(source="operacao.codigo", read_only=True)

    class Meta:
        from turnos.models import TurnoSetorOperacao
        model = TurnoSetorOperacao
        fields = [
            "id",
            "turno",
            "turno_op",
            "turno_setor",
            "turno_setor_demanda",
            "operacao",
            "operacao_nome",
            "operacao_codigo",
            "sequencia",
            "produto_operacao_id_snapshot",
            "versao_roteiro_snapshot",
            "tempo_padrao_min_snapshot",
            "quantidade_planejada",
            "quantidade_realizada",
            "status",
            "created_at",
            "updated_at",
        ]


class TurnoOperadorSerializer(serializers.ModelSerializer):
    """Serializer para TurnoOperador - vinculo turno x operador."""

    operador_nome = serializers.CharField(source="operador.nome", read_only=True)
    operador_matricula = serializers.CharField(source="operador.matricula", read_only=True)

    class Meta:
        from turnos.models import TurnoOperador
        model = TurnoOperador
        fields = [
            "id",
            "turno",
            "operador",
            "operador_nome",
            "operador_matricula",
            "created_at",
        ]