# MDJ-12 — Validacao Turno (abertura e encerramento)

**Data:** 2026-06-15
**Sprint:** MDJ-12 — Turno, fechamento e carry-over
**Escopo validado:** HUs 12.1 a 12.8 (abertura, encerramento, sincronizacao de roteiro, Qualidade como etapa operacional, carry-over, homologacao final)
**Status:** ✅ Concluida

---

## Comandos de validacao

### Suite de testes

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py check
docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb
```

**Resultado (2026-06-15):**
- `manage.py check` — OK
- `makemigrations --check --dry-run` — No changes detected
- `manage.py test --keepdb` — 63 testes passando (16 em `turnos.tests`, incluindo carry-over e Qualidade no roteiro)

### Validacao transacional com dados reais (`pcp_db`)

Cenario executado com `transaction.set_rollback(True)` para nao persistir alteracoes:

1. Baseline: 58 turnos, 1 turno aberto
2. `abrir_turno` com `encerrar_turno_aberto_anterior=True`
3. OP nova `MDJ12-VAL-OP` com produto ativo, quantidade 10
4. Verificar derivacao de roteiro (`TurnoSetorOperacao`)
5. `encerrar_turno` no turno criado
6. Rollback transacional

**Resultado:**

```
RESULT {
  'turno_id': '499f4013-5884-4a40-8b1c-e731359259a1',
  'ops': 1,
  'operacoes': 34,
  'status_apos_encerrar': 'encerrado',
  'turno_anterior_status': 'encerrado'
}
ROLLBACK {'abertos': 1, 'turnos': 58}
BASELINE {'abertos': 1, 'turnos': 58}
```

Baseline preservado apos rollback. Derivation de 34 operacoes confirma sincronizacao do roteiro do produto.

### Homologacao final (HU 12.7)

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py check
docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb
git diff --check
```

**Resultado (2026-06-15):**
- `manage.py check` — OK
- `makemigrations --check --dry-run` — No changes detected
- `manage.py test --keepdb` — 63 testes OK
- `git diff --check` — OK (sem saida)

**Endpoints read-only verificados (HTTP 200 em `localhost:8001`):**
- `GET /health/`
- `GET /api/v1/cadastros/setores/`
- `GET /api/v1/produtos/`
- `GET /api/v1/turnos/`
- `GET /api/v1/producao/registros/`
- `GET /api/v1/qualidade/defeitos/`
- `GET /api/v1/qualidade/registros/`
- `GET /api/v1/relatorios/dashboard/`

---

### Homologacao complementar — Qualidade no roteiro (HU 12.8)

A validacao original encontrou uma lacuna de contrato: a abertura de turno derivava apenas setores produtivos e ignorava `Qualidade` quando ela fazia parte do roteiro vigente. A correcao foi feita via TDD:

1. Teste criado: `test_abre_turno_deriva_qualidade_quando_faz_parte_do_roteiro`
2. RED confirmado: `AssertionError: 1 != 2` ao esperar setor produtivo + setor Qualidade
3. GREEN: `sincronizar_derivacao_turno_op` passou a derivar todos os setores do roteiro vigente
4. Regra preservada: demanda de Qualidade nasce no turno, mas `quantidade_liberada_setor` permanece `0` ate receber saldo operacional da etapa anterior

Resultado complementar:

```bash
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test turnos.tests --keepdb
```

- `turnos.tests` — 16 testes OK

---

## Endpoints novos

| Metodo | Rota | Status |
|--------|------|--------|
| POST | `/api/v1/turnos/abrir/` | Implementado + testado |
| POST | `/api/v1/turnos/<uuid:turno_id>/encerrar/` | Implementado + testado |

Endpoints read-only de turnos permanecem intactos.

---

## Arquivos principais

| Camada | Arquivo |
|--------|---------|
| Dominio | `backend/shared/turno_dominio.py`, `backend/shared/fluxo_sequencial_turno.py` |
| Services | `backend/turnos/services/abertura.py`, `encerramento.py`, `sincronizacao.py`, `carry_over.py` |
| API | `backend/turnos/viewsets/mutacao.py`, `serializers/mutacao.py` |
| Testes | `backend/turnos/tests/test_encerramento_service.py`, `test_mutacao_api.py`, `test_turno_dominio.py`, `test_carry_over_service.py` |

---

## Fora de escopo (confirmado intocado)

- Supabase remoto
- Frontend Next.js
- Server Actions
- Queries Next.js
