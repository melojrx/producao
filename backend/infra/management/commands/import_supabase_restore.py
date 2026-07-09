from __future__ import annotations

import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Iterable

import psycopg2
from psycopg2.extras import RealDictCursor

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import Operador, User
from cadastros.models import Maquina, Operacao, Setor, TipoMaquina
from metas.models import MetaMensal
from producao.models import RegistroProducao
from produtos.models import Produto, ProdutoOperacao
from qualidade.models import QualidadeDefeito, QualidadeDetalhe, QualidadeRegistro
from turnos.models import (
    Turno,
    TurnoOp,
    TurnoOperador,
    TurnoSetor,
    TurnoSetorDemanda,
    TurnoSetorOp,
    TurnoSetorOperacao,
)


RESTORE_DEFAULTS = {
    "host": "postgres_restore",
    "port": 5432,
    "dbname": "supabase_restore_test",
    "user": "restore_user",
    "password": "restore_senha_local",
}

RESTORE_TABLES_WITHOUT_TIMESTAMPS = {"tipos_maquina", "produto_operacoes"}


@dataclass
class ImportReport:
    imported: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    skipped: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    synthetic: dict[str, int] = field(default_factory=lambda: defaultdict(int))
    warnings: list[str] = field(default_factory=list)

    def add_imported(self, name: str, count: int = 1) -> None:
        self.imported[name] += count

    def add_skipped(self, name: str, count: int = 1) -> None:
        self.skipped[name] += count

    def add_synthetic(self, name: str, count: int = 1) -> None:
        self.synthetic[name] += count

    def warn(self, message: str) -> None:
        self.warnings.append(message)


class Command(BaseCommand):
    help = "Importa o snapshot Supabase restaurado para o banco Django local."

    def add_arguments(self, parser) -> None:
        parser.add_argument("--restore-host", default=RESTORE_DEFAULTS["host"])
        parser.add_argument("--restore-port", type=int, default=RESTORE_DEFAULTS["port"])
        parser.add_argument("--restore-db", default=RESTORE_DEFAULTS["dbname"])
        parser.add_argument("--restore-user", default=RESTORE_DEFAULTS["user"])
        parser.add_argument("--restore-password", default=RESTORE_DEFAULTS["password"])
        parser.add_argument("--flush", action="store_true", help="Remove dados importados antes de reimportar.")
        parser.add_argument("--dry-run", action="store_true", help="Executa a importacao dentro de rollback.")

    def handle(self, *args, **options) -> None:
        self.report = ImportReport()
        self.restore = RestoreReader(
            host=options["restore_host"],
            port=options["restore_port"],
            dbname=options["restore_db"],
            user=options["restore_user"],
            password=options["restore_password"],
        )

        try:
            with transaction.atomic():
                if options["flush"]:
                    self.flush_imported_data()

                self.import_all()

                if options["dry_run"]:
                    raise DryRunRollback
        except DryRunRollback:
            self.stdout.write(self.style.WARNING("Dry-run concluido; alteracoes revertidas."))
        finally:
            self.restore.close()

        self.print_report()

    def flush_imported_data(self) -> None:
        for model in [
            QualidadeDetalhe,
            QualidadeRegistro,
            RegistroProducao,
            TurnoSetorOperacao,
            TurnoSetorDemanda,
            TurnoSetorOp,
            TurnoOperador,
            TurnoSetor,
            TurnoOp,
            Turno,
            ProdutoOperacao,
            Produto,
            Operacao,
            Operador,
            Maquina,
            Setor,
            TipoMaquina,
            QualidadeDefeito,
            MetaMensal,
            User,
        ]:
            deleted, _ = model.objects.all().delete()
            if deleted:
                self.report.add_skipped(f"flush:{model.__name__}", deleted)

    def import_all(self) -> None:
        self.import_users()
        self.import_tipos_maquina()
        self.import_setores()
        self.import_maquinas()
        self.import_operadores()
        self.import_operacoes()
        self.import_produtos()
        self.import_produto_operacoes()
        self.import_turnos()
        self.import_turno_ops()
        self.import_turno_setores()
        self.import_turno_setor_ops()
        self.import_turno_operadores()
        self.import_turno_setor_demandas()
        self.create_synthetic_demands()
        self.import_turno_setor_operacoes()
        self.import_registros_producao()
        self.import_qualidade_defeitos()
        self.import_qualidade_registros()
        self.import_qualidade_detalhes()
        self.import_metas_mensais()

    def import_users(self) -> None:
        for row in self.restore.rows("usuarios_sistema"):
            email = row.get("email") or f"usuario-{row['id']}@local.invalid"
            user, _created = User.objects.update_or_create(
                id=row["id"],
                defaults={
                    "email": email,
                    "nome": row.get("nome") or "",
                    "papel": normalize_user_papel(row.get("papel")),
                    "ativo": bool(row.get("ativo")),
                    "is_active": bool(row.get("ativo")),
                    "is_staff": row.get("papel") == "admin",
                    "is_superuser": row.get("papel") == "admin",
                    "pode_revisar_qualidade": bool(row.get("pode_revisar_qualidade")),
                    "supabase_auth_uid": row.get("auth_user_id"),
                },
            )
            if not user.has_usable_password():
                user.set_unusable_password()
                user.save(update_fields=["password"])
            force_timestamps(User, row)
            self.report.add_imported("usuarios_sistema")

    def import_tipos_maquina(self) -> None:
        for row in self.restore.rows("tipos_maquina"):
            TipoMaquina.objects.update_or_create(
                codigo=row["codigo"],
                defaults={"nome": row.get("nome") or row["codigo"], "descricao": row.get("descricao") or ""},
            )
            self.report.add_imported("tipos_maquina")

    def import_setores(self) -> None:
        for row in self.restore.rows("setores"):
            setor, _created = Setor.objects.update_or_create(
                id=row["id"],
                defaults={
                    "codigo": str(row.get("codigo") or row["id"])[:20],
                    "nome": row.get("nome") or f"Setor {row['id']}",
                    "situacao": "ativo" if row.get("ativo") else "inativo",
                    "modo_apontamento": row.get("modo_apontamento") or "producao_padrao",
                    "sequencia_fluxo": 0,
                },
            )
            force_timestamps(Setor, row, setor.id)
            self.report.add_imported("setores")

    def import_maquinas(self) -> None:
        for row in self.restore.rows("maquinas"):
            maquina, _created = Maquina.objects.update_or_create(
                id=row["id"],
                defaults={
                    "codigo": row["codigo"],
                    "modelo": row.get("modelo") or "",
                    "marca": row.get("marca") or "",
                    "numero_patrimonio": row.get("numero_patrimonio") or "",
                    "situacao": normalize_maquina_status(row.get("status")),
                    "qr_code_token": row.get("qr_code_token") or token_for("maquina", row["id"]),
                },
            )
            force_timestamps(Maquina, row, maquina.id)
            self.report.add_imported("maquinas")

    def import_operadores(self) -> None:
        for row in self.restore.rows("operadores"):
            operador, _created = Operador.objects.update_or_create(
                id=row["id"],
                defaults={
                    "nome": row.get("nome") or "",
                    "matricula": row.get("matricula") or str(row["id"])[:20],
                    "funcao": row.get("funcao") or "",
                    "status": row.get("status") or "ativo",
                    "carga_horaria_min": row.get("carga_horaria_min") or 540,
                    "qr_code_token": row.get("qr_code_token") or token_for("operador", row["id"]),
                    "foto_url": row.get("foto_url") or "",
                    "maquina_preferida": None,
                },
            )
            force_timestamps(Operador, row, operador.id)
            self.report.add_imported("operadores")
            if row.get("setor"):
                self.report.warn(f"Operador {row['id']} possui setor textual legado nao importado: {row['setor']}")

    def import_operacoes(self) -> None:
        for row in self.restore.rows("operacoes"):
            setor = get_optional(Setor, row.get("setor_id"))
            if setor is None:
                self.report.add_skipped("operacoes_sem_setor")
                self.report.warn(f"Operacao {row['id']} sem setor importavel.")
                continue

            operacao, _created = Operacao.objects.update_or_create(
                id=row["id"],
                defaults={
                    "codigo": row["codigo"],
                    "descricao": row.get("descricao") or row["codigo"],
                    "setor": setor,
                    "maquina": get_optional(Maquina, row.get("maquina_id")),
                    "tipo_maquina": get_tipo_maquina(row.get("tipo_maquina_codigo")),
                    "tempo_padrao_min": decimal_or_default(row.get("tempo_padrao_min"), "0.0001"),
                    "meta_hora": row.get("meta_hora"),
                    "meta_dia": row.get("meta_dia"),
                    "situacao": "ativa" if row.get("ativa") else "inativa",
                    "imagem_url": row.get("imagem_url") or "",
                    "qr_code_token": row.get("qr_code_token") or token_for("operacao", row["id"]),
                },
            )
            force_timestamps(Operacao, row, operacao.id)
            self.report.add_imported("operacoes")

    def import_produtos(self) -> None:
        for row in self.restore.rows("produtos"):
            produto, _created = Produto.objects.update_or_create(
                id=row["id"],
                defaults={
                    "codigo": row.get("referencia") or str(row["id"])[:30],
                    "nome": row.get("nome") or "",
                    "ativo": bool(row.get("ativo")),
                    "imagem_frente_url": row.get("imagem_frente_url") or "",
                    "imagem_costa_url": row.get("imagem_costa_url") or "",
                    "tp_produto_min": row.get("tp_produto_min"),
                },
            )
            force_timestamps(Produto, row, produto.id)
            self.report.add_imported("produtos")
            if row.get("descricao"):
                self.report.warn(f"Produto {row['id']} possui descricao sem campo Django atual.")
            if row.get("imagem_url"):
                self.report.warn(f"Produto {row['id']} possui imagem_url legado sem destino unico.")

    def import_produto_operacoes(self) -> None:
        for row in self.restore.rows("produto_operacoes"):
            produto = get_optional(Produto, row.get("produto_id"))
            operacao = get_optional(Operacao, row.get("operacao_id"))
            if produto is None or operacao is None:
                self.report.add_skipped("produto_operacoes_fk_invalida")
                continue
            produto_operacao, _created = ProdutoOperacao.objects.update_or_create(
                id=row["id"],
                defaults={
                    "produto": produto,
                    "operacao": operacao,
                    "sequencia": row.get("sequencia") or 1,
                    "versao_roteiro": row.get("versao_roteiro") or 1,
                    "vigente": bool(row.get("vigente")),
                    "substituido_em": row.get("substituido_em"),
                },
            )
            force_timestamps(ProdutoOperacao, row, produto_operacao.id)
            self.report.add_imported("produto_operacoes")

    def import_turnos(self) -> None:
        for row in self.restore.rows("turnos"):
            turno, _created = Turno.objects.update_or_create(
                id=row["id"],
                defaults={
                    "status": row.get("status") or "encerrado",
                    "data_hora_abertura": row["iniciado_em"],
                    "data_hora_encerramento": row.get("encerrado_em"),
                    "operadores_disponiveis": row.get("operadores_disponiveis") or 1,
                    "minutos_turno": row.get("minutos_turno") or 1,
                    "meta_grupo": None,
                    "encerrado_por": None,
                    "observacao": row.get("observacao") or "",
                },
            )
            force_timestamps(Turno, row, turno.id)
            self.report.add_imported("turnos")

    def import_turno_ops(self) -> None:
        for row in self.restore.rows("turno_ops"):
            turno = get_optional(Turno, row.get("turno_id"))
            produto = get_optional(Produto, row.get("produto_id"))
            if turno is None or produto is None:
                self.report.add_skipped("turno_ops_fk_invalida")
                continue
            turno_op, _created = TurnoOp.objects.update_or_create(
                id=row["id"],
                defaults={
                    "turno": turno,
                    "numero_op": row.get("numero_op") or str(row["id"]),
                    "produto": produto,
                    "quantidade_planejada": row.get("quantidade_planejada") or 1,
                    "quantidade_planejada_remanescente": row.get("quantidade_planejada_remanescente"),
                    "quantidade_realizada": row.get("quantidade_realizada") or 0,
                    "status": normalize_turno_op_status(row.get("status")),
                    "turno_op_origem": get_optional(TurnoOp, row.get("turno_op_origem_id")),
                    "tp_produto_min_snapshot": produto.tp_produto_min,
                },
            )
            force_timestamps(TurnoOp, row, turno_op.id)
            self.report.add_imported("turno_ops")

    def import_turno_setores(self) -> None:
        for row in self.restore.rows("turno_setores"):
            turno = get_optional(Turno, row.get("turno_id"))
            setor = get_optional(Setor, row.get("setor_id"))
            if turno is None or setor is None:
                self.report.add_skipped("turno_setores_fk_invalida")
                continue
            turno_setor, _created = TurnoSetor.objects.update_or_create(
                id=row["id"],
                defaults={
                    "turno": turno,
                    "setor": setor,
                    "qr_code_token": row.get("qr_code_token") or token_for("turno-setor", row["id"]),
                    "status": normalize_turno_setor_status(row.get("status")),
                },
            )
            force_timestamps(TurnoSetor, row, turno_setor.id)
            self.report.add_imported("turno_setores")

    def import_turno_setor_ops(self) -> None:
        for row in self.restore.rows("turno_setor_ops"):
            turno = get_optional(Turno, row.get("turno_id"))
            turno_op = get_optional(TurnoOp, row.get("turno_op_id"))
            setor = get_optional(Setor, row.get("setor_id"))
            if turno is None or turno_op is None or setor is None:
                self.report.add_skipped("turno_setor_ops_fk_invalida")
                continue
            turno_setor_op, _created = TurnoSetorOp.objects.update_or_create(
                id=row["id"],
                defaults={
                    "turno": turno,
                    "turno_op": turno_op,
                    "setor": setor,
                    "quantidade_planejada": row.get("quantidade_planejada") or 1,
                    "quantidade_realizada": row.get("quantidade_realizada") or 0,
                    "status": normalize_turno_setor_op_status(row.get("status")),
                    "qr_code_token": row.get("qr_code_token") or token_for("turno-setor-op", row["id"]),
                },
            )
            force_timestamps(TurnoSetorOp, row, turno_setor_op.id)
            self.report.add_imported("turno_setor_ops")

    def import_turno_operadores(self) -> None:
        for row in self.restore.rows("turno_operadores"):
            turno = get_optional(Turno, row.get("turno_id"))
            operador = get_optional(Operador, row.get("operador_id"))
            if turno is None or operador is None:
                self.report.add_skipped("turno_operadores_fk_invalida")
                continue
            turno_operador, _created = TurnoOperador.objects.update_or_create(
                id=row["id"],
                defaults={
                    "turno": turno,
                    "operador": operador,
                    "setor": get_optional(Setor, row.get("setor_id")),
                },
            )
            force_timestamps(TurnoOperador, row, turno_operador.id)
            self.report.add_imported("turno_operadores")

    def import_turno_setor_demandas(self) -> None:
        for row in self.restore.rows("turno_setor_demandas"):
            turno_setor = get_optional(TurnoSetor, row.get("turno_setor_id"))
            turno = get_optional(Turno, row.get("turno_id"))
            turno_op = get_optional(TurnoOp, row.get("turno_op_id"))
            produto = get_optional(Produto, row.get("produto_id"))
            setor = get_optional(Setor, row.get("setor_id"))
            if None in [turno_setor, turno, turno_op, produto, setor]:
                self.report.add_skipped("turno_setor_demandas_fk_invalida")
                continue
            demanda, _created = TurnoSetorDemanda.objects.update_or_create(
                id=row["id"],
                defaults={
                    "turno_setor": turno_setor,
                    "turno": turno,
                    "turno_op": turno_op,
                    "produto": produto,
                    "setor": setor,
                    "turno_setor_op_legacy": get_optional(TurnoSetorOp, row.get("turno_setor_op_legacy_id")),
                    "quantidade_herdada_setor": row.get("quantidade_herdada_setor") or 0,
                    "quantidade_liberada_setor": row.get("quantidade_liberada_setor") or 0,
                    "quantidade_planejada": row.get("quantidade_planejada") or 1,
                    "quantidade_realizada": row.get("quantidade_realizada") or 0,
                    "quantidade_aceita_turno": 0,
                    "quantidade_excedente_turno": 0,
                },
            )
            force_timestamps(TurnoSetorDemanda, row, demanda.id)
            self.report.add_imported("turno_setor_demandas")

    def create_synthetic_demands(self) -> None:
        rows = self.restore.rows(
            "turno_setor_operacoes",
            where="""
                turno_setor_demanda_id IS NULL
                AND NOT EXISTS (
                    SELECT 1 FROM turno_setor_demandas d
                    WHERE d.turno_setor_op_legacy_id = turno_setor_operacoes.turno_setor_op_id
                )
            """,
        )
        by_key = {(row["turno_id"], row["turno_op_id"], row["setor_id"], row["turno_setor_op_id"]) for row in rows}
        for turno_id, turno_op_id, setor_id, turno_setor_op_id in by_key:
            turno = get_optional(Turno, turno_id)
            turno_op = get_optional(TurnoOp, turno_op_id)
            setor = get_optional(Setor, setor_id)
            legado = get_optional(TurnoSetorOp, turno_setor_op_id)
            turno_setor = find_turno_setor(turno_id, setor_id)
            if None in [turno, turno_op, setor, turno_setor]:
                self.report.add_skipped("demandas_sinteticas_fk_invalida")
                continue
            synthetic_id = uuid.uuid5(uuid.NAMESPACE_URL, f"mdj-demanda:{turno_id}:{turno_op_id}:{setor_id}")
            demanda, _created = TurnoSetorDemanda.objects.update_or_create(
                id=synthetic_id,
                defaults={
                    "turno_setor": turno_setor,
                    "turno": turno,
                    "turno_op": turno_op,
                    "produto": turno_op.produto,
                    "setor": setor,
                    "turno_setor_op_legacy": legado,
                    "quantidade_herdada_setor": 0,
                    "quantidade_liberada_setor": 0,
                    "quantidade_planejada": getattr(legado, "quantidade_planejada", turno_op.quantidade_planejada) or 1,
                    "quantidade_realizada": getattr(legado, "quantidade_realizada", 0) or 0,
                    "quantidade_aceita_turno": 0,
                    "quantidade_excedente_turno": 0,
                },
            )
            self.synthetic_demands[(turno_id, turno_op_id, setor_id, turno_setor_op_id)] = demanda
            self.report.add_synthetic("turno_setor_demandas")

    @property
    def synthetic_demands(self) -> dict[tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID], TurnoSetorDemanda]:
        if not hasattr(self, "_synthetic_demands"):
            self._synthetic_demands = {}
        return self._synthetic_demands

    def import_turno_setor_operacoes(self) -> None:
        legacy_demands = {
            demanda.turno_setor_op_legacy_id: demanda
            for demanda in TurnoSetorDemanda.objects.exclude(turno_setor_op_legacy_id=None)
        }
        for row in self.restore.rows("turno_setor_operacoes"):
            demanda = get_optional(TurnoSetorDemanda, row.get("turno_setor_demanda_id"))
            if demanda is None and row.get("turno_setor_op_id"):
                demanda = legacy_demands.get(row["turno_setor_op_id"])
            if demanda is None:
                demanda = self.synthetic_demands.get(
                    (row.get("turno_id"), row.get("turno_op_id"), row.get("setor_id"), row.get("turno_setor_op_id"))
                )
            if demanda is None:
                self.report.add_skipped("turno_setor_operacoes_sem_demanda")
                continue

            turno_setor = get_optional(TurnoSetor, row.get("turno_setor_id")) or demanda.turno_setor
            operacao = get_optional(Operacao, row.get("operacao_id"))
            setor = get_optional(Setor, row.get("setor_id"))
            turno = get_optional(Turno, row.get("turno_id"))
            turno_op = get_optional(TurnoOp, row.get("turno_op_id"))
            if None in [turno, turno_op, turno_setor, operacao, setor]:
                self.report.add_skipped("turno_setor_operacoes_fk_invalida")
                continue
            turno_setor_operacao, _created = TurnoSetorOperacao.objects.update_or_create(
                id=row["id"],
                defaults={
                    "turno": turno,
                    "turno_op": turno_op,
                    "turno_setor": turno_setor,
                    "turno_setor_demanda": demanda,
                    "turno_setor_op": get_optional(TurnoSetorOp, row.get("turno_setor_op_id")),
                    "produto_operacao": get_optional(ProdutoOperacao, row.get("produto_operacao_id")),
                    "operacao": operacao,
                    "setor": setor,
                    "sequencia": row.get("sequencia") or 1,
                    "produto_operacao_id_snapshot": row.get("produto_operacao_id"),
                    "versao_roteiro_snapshot": None,
                    "tempo_padrao_min_snapshot": decimal_or_default(row.get("tempo_padrao_min_snapshot"), "0.0001"),
                    "quantidade_planejada": row.get("quantidade_planejada") or 1,
                    "quantidade_realizada": row.get("quantidade_realizada") or 0,
                    "status": normalize_turno_setor_op_status(row.get("status")),
                },
            )
            force_timestamps(TurnoSetorOperacao, row, turno_setor_operacao.id)
            self.report.add_imported("turno_setor_operacoes")

    def import_registros_producao(self) -> None:
        for row in self.restore.rows("registros_producao"):
            tsope = get_optional(TurnoSetorOperacao, row.get("turno_setor_operacao_id"))
            turno = get_optional(Turno, getattr(tsope, "turno_id", None))
            turno_op = get_optional(TurnoOp, row.get("turno_op_id")) or get_optional(TurnoOp, getattr(tsope, "turno_op_id", None))
            turno_setor = get_optional(TurnoSetor, row.get("turno_setor_id")) or get_optional(
                TurnoSetor, getattr(tsope, "turno_setor_id", None)
            )
            demanda = get_optional(TurnoSetorDemanda, row.get("turno_setor_demanda_id")) or get_optional(
                TurnoSetorDemanda, getattr(tsope, "turno_setor_demanda_id", None)
            )
            operador = get_optional(Operador, row.get("operador_id"))
            operacao = get_optional(Operacao, row.get("operacao_id"))
            if operador is None or operacao is None:
                self.report.add_skipped("registros_producao_fk_invalida")
                continue
            registro, _created = RegistroProducao.objects.update_or_create(
                id=row["id"],
                defaults={
                    "operador": operador,
                    "maquina": get_optional(Maquina, row.get("maquina_id")),
                    "operacao": operacao,
                    "produto": get_optional(Produto, row.get("produto_id")),
                    "quantidade": row.get("quantidade") or 1,
                    "hora_registro": row.get("hora_registro"),
                    "usuario_sistema": get_optional(User, row.get("usuario_sistema_id")),
                    "origem_apontamento": normalize_origem(row.get("origem_apontamento")),
                    "turno": turno,
                    "turno_op": turno_op,
                    "turno_setor": turno_setor,
                    "turno_setor_demanda": demanda,
                    "turno_setor_operacao": tsope,
                    "observacao": row.get("observacao") or "",
                },
            )
            force_timestamps(RegistroProducao, row, registro.id)
            self.report.add_imported("registros_producao")

    def import_qualidade_defeitos(self) -> None:
        for row in self.restore.rows("qualidade_defeitos"):
            defeito, _created = QualidadeDefeito.objects.update_or_create(
                id=row["id"],
                defaults={
                    "nome": row.get("nome") or str(row["id"]),
                    "classificacao": normalize_classificacao(row.get("classificacao")),
                    "ativo": bool(row.get("ativo")),
                },
            )
            force_timestamps(QualidadeDefeito, row, defeito.id)
            self.report.add_imported("qualidade_defeitos")

        if self.restore.exists("qualidade_detalhes", "qualidade_defeito_id IS NULL"):
            QualidadeDefeito.objects.update_or_create(
                id=legacy_defect_id(),
                defaults={
                    "nome": "Defeito nao informado (legado)",
                    "classificacao": "processo",
                    "ativo": False,
                },
            )
            self.report.add_synthetic("qualidade_defeitos")

    def import_qualidade_registros(self) -> None:
        for row in self.restore.rows("qualidade_registros"):
            revisor = get_optional(User, row.get("revisor_usuario_id"))
            turno = get_optional(Turno, row.get("turno_id"))
            turno_op = get_optional(TurnoOp, row.get("turno_op_id"))
            if revisor is None or turno is None or turno_op is None:
                self.report.add_skipped("qualidade_registros_fk_invalida")
                continue
            observacao = ""
            if row.get("origem_lancamento"):
                observacao = f"origem_lancamento={row['origem_lancamento']}"
            registro, _created = QualidadeRegistro.objects.update_or_create(
                id=row["id"],
                defaults={
                    "revisor": revisor,
                    "turno": turno,
                    "turno_op": turno_op,
                    "turno_setor_operacao": get_optional(
                        TurnoSetorOperacao, row.get("turno_setor_operacao_id_qualidade")
                    ),
                    "quantidade_aprovada": row.get("quantidade_aprovada") or 0,
                    "quantidade_reprovada": row.get("quantidade_reprovada") or 0,
                    "hora_revisao": row.get("created_at"),
                    "observacao": observacao,
                },
            )
            force_timestamps(QualidadeRegistro, row, registro.id)
            self.report.add_imported("qualidade_registros")

    def import_qualidade_detalhes(self) -> None:
        for row in self.restore.rows("qualidade_detalhes"):
            registro = get_optional(QualidadeRegistro, row.get("qualidade_registro_id"))
            operacao = get_optional(Operacao, row.get("operacao_id_origem"))
            setor = get_optional(Setor, row.get("setor_id_origem"))
            defeito = get_optional(QualidadeDefeito, row.get("qualidade_defeito_id")) or get_optional(
                QualidadeDefeito, legacy_defect_id()
            )
            if None in [registro, operacao, setor, defeito]:
                self.report.add_skipped("qualidade_detalhes_fk_invalida")
                continue
            detalhe, _created = QualidadeDetalhe.objects.update_or_create(
                id=row["id"],
                defaults={
                    "registro": registro,
                    "turno_setor_operacao_origem": get_optional(
                        TurnoSetorOperacao, row.get("turno_setor_operacao_id_origem")
                    ),
                    "operacao": operacao,
                    "setor": setor,
                    "defeito": defeito,
                    "quantidade_defeito": row.get("quantidade_defeito") or 1,
                    "observacao": row.get("observacao") or "",
                },
            )
            force_timestamps(QualidadeDetalhe, row, detalhe.id)
            self.report.add_imported("qualidade_detalhes")

    def import_metas_mensais(self) -> None:
        for row in self.restore.rows("metas_mensais"):
            meta, _created = MetaMensal.objects.update_or_create(
                id=row["id"],
                defaults={
                    "competencia": row["competencia"],
                    "meta_pecas": row.get("meta_pecas") or 1,
                    "dias_produtivos": row.get("dias_produtivos") or 1,
                    "observacao": row.get("observacao") or "",
                },
            )
            force_timestamps(MetaMensal, row, meta.id)
            self.report.add_imported("metas_mensais")

    def print_report(self) -> None:
        self.stdout.write(self.style.SUCCESS("Importacao concluida."))
        for group_name, values in [
            ("Importados", self.report.imported),
            ("Sinteticos", self.report.synthetic),
            ("Ignorados/flush", self.report.skipped),
        ]:
            if values:
                self.stdout.write(group_name + ":")
                for key in sorted(values):
                    self.stdout.write(f"  {key}: {values[key]}")
        if self.report.warnings:
            self.stdout.write(self.style.WARNING(f"Avisos: {len(self.report.warnings)}"))
            for warning in self.report.warnings[:20]:
                self.stdout.write(f"  - {warning}")
            if len(self.report.warnings) > 20:
                self.stdout.write(f"  ... {len(self.report.warnings) - 20} avisos adicionais")


class DryRunRollback(Exception):
    pass


class RestoreReader:
    def __init__(self, host: str, port: int, dbname: str, user: str, password: str) -> None:
        self.connection = psycopg2.connect(
            host=host,
            port=port,
            dbname=dbname,
            user=user,
            password=password,
            cursor_factory=RealDictCursor,
        )

    def rows(self, table: str, where: str | None = None) -> list[dict]:
        sql = f"SELECT * FROM {table}"
        if where:
            sql += f" WHERE {where}"
        if table not in RESTORE_TABLES_WITHOUT_TIMESTAMPS:
            sql += " ORDER BY created_at NULLS FIRST, id"
        elif table != "tipos_maquina":
            sql += " ORDER BY id"
        with self.connection.cursor() as cursor:
            cursor.execute(sql)
            return list(cursor.fetchall())

    def exists(self, table: str, where: str) -> bool:
        with self.connection.cursor() as cursor:
            cursor.execute(f"SELECT EXISTS (SELECT 1 FROM {table} WHERE {where}) AS exists")
            row = cursor.fetchone()
            return bool(row["exists"])

    def close(self) -> None:
        self.connection.close()


def force_timestamps(model, row: dict, pk=None) -> None:
    pk = row.get("id") if pk is None else pk
    updates = {}
    if row.get("created_at"):
        updates["created_at"] = row["created_at"]
    if row.get("updated_at"):
        updates["updated_at"] = row["updated_at"]
    if updates and hasattr(model, "objects"):
        model.objects.filter(pk=pk).update(**updates)


def get_optional(model, pk):
    if not pk:
        return None
    try:
        return model.objects.get(pk=pk)
    except model.DoesNotExist:
        return None


def get_tipo_maquina(codigo):
    if not codigo:
        return None
    return get_optional(TipoMaquina, codigo)


def find_turno_setor(turno_id, setor_id):
    if not turno_id or not setor_id:
        return None
    return TurnoSetor.objects.filter(turno_id=turno_id, setor_id=setor_id).first()


def decimal_or_default(value, default: str) -> Decimal:
    if value is None or value <= 0:
        return Decimal(default)
    return Decimal(value)


def token_for(prefix: str, value) -> str:
    return uuid.uuid5(uuid.NAMESPACE_URL, f"{prefix}:{value}").hex


def legacy_defect_id() -> uuid.UUID:
    return uuid.uuid5(uuid.NAMESPACE_URL, "mdj:defeito-nao-informado-legado")


def normalize_user_papel(value: str | None) -> str:
    return value if value in {"admin", "supervisor"} else "supervisor"


def normalize_maquina_status(value: str | None) -> str:
    return value if value in {"ativa", "parada", "manutencao", "inativa"} else "ativa"


def normalize_turno_op_status(value: str | None) -> str:
    if value == "encerrada_manualmente":
        return "encerrada"
    return value if value in {"planejada", "em_andamento", "concluida", "encerrada"} else "planejada"


def normalize_turno_setor_status(value: str | None) -> str:
    if value == "encerrada_manualmente":
        return "encerrado"
    return value if value in {"aberto", "em_andamento", "concluido", "encerrado"} else "aberto"


def normalize_turno_setor_op_status(value: str | None) -> str:
    return value if value in {"aberta", "em_andamento", "concluida", "encerrada_manualmente"} else "aberta"


def normalize_origem(value: str | None) -> str:
    return value if value in {"operador_qr", "operador_manual", "supervisor_manual"} else "operador_qr"


def normalize_classificacao(value: str | None) -> str:
    return value if value in {"maquina", "operador", "processo", "materia_prima"} else "processo"
