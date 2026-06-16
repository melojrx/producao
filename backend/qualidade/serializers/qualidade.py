from rest_framework import serializers

from qualidade.models import QualidadeDefeito, QualidadeDetalhe, QualidadeRegistro


class QualidadeDefeitoSerializer(serializers.ModelSerializer):
    """Serializer para QualidadeDefeito - catalogo de defeitos."""

    class Meta:
        model = QualidadeDefeito
        fields = [
            "id",
            "nome",
            "classificacao",
            "ativo",
            "created_at",
            "updated_at",
        ]


class QualidadeDetalheSerializer(serializers.ModelSerializer):
    """Serializer para QualidadeDetalhe - ocorrencia de defeito."""

    defeito_nome = serializers.CharField(source="defeito.nome", read_only=True)
    defeito_classificacao = serializers.CharField(source="defeito.classificacao", read_only=True)
    operacao_nome = serializers.CharField(source="operacao.descricao", read_only=True, allow_null=True)
    setor_nome = serializers.CharField(source="setor.nome", read_only=True, allow_null=True)

    class Meta:
        model = QualidadeDetalhe
        fields = [
            "id",
            "registro",
            "turno_setor_operacao_origem",
            "operacao",
            "operacao_nome",
            "setor",
            "setor_nome",
            "defeito",
            "defeito_nome",
            "defeito_classificacao",
            "quantidade_defeito",
            "observacao",
            "created_at",
            "updated_at",
        ]


class QualidadeRegistroSerializer(serializers.ModelSerializer):
    """Serializer para QualidadeRegistro - revisao de qualidade."""

    revisor_nome = serializers.CharField(source="revisor.username", read_only=True)
    turno_status = serializers.CharField(source="turno.status", read_only=True, allow_null=True)
    numero_op = serializers.CharField(source="turno_op.numero_op", read_only=True)
    operacao_nome = serializers.CharField(source="turno_setor_operacao.operacao.descricao", read_only=True, allow_null=True)

    class Meta:
        model = QualidadeRegistro
        fields = [
            "id",
            "revisor",
            "revisor_nome",
            "turno",
            "turno_status",
            "turno_op",
            "numero_op",
            "turno_setor_operacao",
            "operacao_nome",
            "quantidade_aprovada",
            "quantidade_reprovada",
            "hora_revisao",
            "observacao",
            "created_at",
            "updated_at",
        ]


class QualidadeRegistroDetailSerializer(QualidadeRegistroSerializer):
    """Serializer para QualidadeRegistro com detalhes aninhados."""

    detalhes = QualidadeDetalheSerializer(many=True, read_only=True)

    class Meta(QualidadeRegistroSerializer.Meta):
        fields = QualidadeRegistroSerializer.Meta.fields + ["detalhes"]