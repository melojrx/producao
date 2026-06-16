from django.db import models


class TipoMaquina(models.Model):
    codigo = models.CharField(max_length=10, primary_key=True)
    nome = models.CharField(max_length=50)
    descricao = models.TextField(blank=True)

    class Meta:
        ordering = ["codigo"]

    def __str__(self) -> str:
        return f"{self.codigo} - {self.nome}"
