from rest_framework import serializers


ORIGENS_LANCAMENTO_QUALIDADE = (
    ("scanner_qualidade", "Scanner qualidade"),
    ("manual_qualidade", "Manual qualidade"),
)


class DefeitoRevisaoQualidadeInputSerializer(serializers.Serializer):
    turno_setor_operacao_id_origem = serializers.UUIDField()
    qualidade_defeito_id = serializers.UUIDField()
    quantidade_defeito = serializers.IntegerField(min_value=1)
    observacao = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)


class RevisaoQualidadeOperacionalInputSerializer(serializers.Serializer):
    turno_setor_operacao_id_qualidade = serializers.UUIDField()
    revisor_usuario_id = serializers.UUIDField(required=False)
    quantidade_aprovada = serializers.IntegerField(min_value=0)
    quantidade_reprovada = serializers.IntegerField(min_value=0)
    origem_lancamento = serializers.ChoiceField(choices=ORIGENS_LANCAMENTO_QUALIDADE)
    defeitos = DefeitoRevisaoQualidadeInputSerializer(many=True)

    def validate(self, attrs):
        quantidade_aprovada = attrs["quantidade_aprovada"]
        quantidade_reprovada = attrs["quantidade_reprovada"]
        defeitos = attrs["defeitos"]

        if quantidade_aprovada + quantidade_reprovada <= 0:
            raise serializers.ValidationError(
                {"detail": "A revisao precisa informar ao menos uma peca aprovada ou reprovada."}
            )

        if quantidade_reprovada > 0 and not defeitos:
            raise serializers.ValidationError(
                {"detail": "Informe ao menos uma operacao de origem para as pecas reprovadas."}
            )

        if quantidade_reprovada == 0 and defeitos:
            raise serializers.ValidationError(
                {"detail": "Nao informe defeitos quando a revisao nao possuir pecas reprovadas."}
            )

        chaves_defeito: set[tuple[str, str]] = set()
        for defeito in defeitos:
            chave = (
                str(defeito["turno_setor_operacao_id_origem"]),
                str(defeito["qualidade_defeito_id"]),
            )
            if chave in chaves_defeito:
                raise serializers.ValidationError(
                    {"detail": "Cada combinacao de operacao e tipo de defeito pode aparecer apenas uma vez."}
                )
            chaves_defeito.add(chave)

        return attrs
