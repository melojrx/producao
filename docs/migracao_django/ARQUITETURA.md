# ARQUITETURA.md — Backend Django para Migracao PCP

> Documento vinculante de arquitetura do backend Django para migracao do sistema PCP do Supabase.
> Toda decisao aqui e contratual para as sprints MDJ-4 em diante.
> Mantido em `docs/migracao_django/ARQUITETURA.md`.

---

## 0. Estrutura do Projeto

```
/projeto
├── app/                    # Next.js (NÃO renomear — convenção oficial App Router)
│   ├── (auth)/
│   ├── (admin)/
│   ├── (operador)/
│   └── next.config.ts      # outputFileTracingRoot para monorepo
├── backend/                 # Django (novo)
│   ├── pcp_project/        # Django project root
│   │   └── config/         # Settings modular
│   │       ├── base.py    # Comum a todos ambientes
│   │       ├── local.py   # Desenvolvimento (Docker)
│   │       └── production.py # Produção
│   ├── accounts/
│   ├── cadastros/
│   ├── produtos/
│   ├── turnos/
│   ├── producao/
│   ├── qualidade/
│   ├── metas/
│   ├── relatorios/
│   ├── scanner/
│   ├── infra/
│   ├── shared/
│   ├── Dockerfile           # Multi-stage build
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── requirements.txt
├── docker-compose.yml       # Desenvolvimento completo
└── .env.example
```

**Notas sobre estrutura:**
- `app/` **NÃO** deve ser renomeado — convenção oficial Next.js App Router
- Para monorepo: configurar `outputFileTracingRoot` no `next.config.ts`
- `backend/` criado novo, separado do frontend
- Docker Compose na raiz para orchestrar todos os serviços

---

## 1. Visao Geral

```
Next.js (frontend existente em app/)
   app/admin, app/scanner, app/tv, app/api
              |
              |  HTTPS + JSON + OpenAPI 3.1
              |  Authorization: Bearer <JWT>
              v
Django 5 + Django REST Framework
  apps de dominio
  serializers  (validacao de entrada/saida)
  viewsets     (endpoints API)
  selectors    (read models)
  services     (transactional)
  Django Admin
              |
              |  ORM + transaction.atomic()
              v
PostgreSQL 16 (banco em container Docker)
  migrations versionadas
  constraints de dominio
  indices otimizados
  auditoria via django-auditlog
```

---

## 2. Docker — Estrutura e Padrões

Nota operacional em `2026-06-04`: a estratégia de Docker da aplicação está documentada para backend, frontend e banco PostgreSQL da aplicação Django. O restore dos dados Supabase deve usar container PostgreSQL isolado, documentado em `docs/migracao_django/PLANO_BACKUP_RESTORE.md`, e não deve compartilhar volume, credenciais ou porta interna com o banco da aplicação.

### 2.1 Docker Compose (desenvolvimento)

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: development
    ports:
      - "8000:8000"
    environment:
      - DEBUG=1
      - POSTGRES_DB=pcp_db
      - POSTGRES_USER=pcp_user
      - POSTGRES_PASSWORD=pcp_password
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
    depends_on:
      db:
        condition: service_healthy
    develop:
      watch:
        - action: sync
          path: ./backend
          target: /app
          ignore:
            - __pycache__/
            - "*.pyc"
            - .git/
            - .venv/

  frontend:
    build:
      context: ./app
      dockerfile: Dockerfile
      target: development
    ports:
      - "3000:3000"
    environment:
      - WATCHPACK_POLLING=true
    depends_on:
      - backend

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql
    environment:
      - POSTGRES_DB=pcp_db
      - POSTGRES_USER=pcp_user
      - POSTGRES_PASSWORD=pcp_password
    healthcheck:
      test: ["CMD", "pg_isready -U pcp_user -d pcp_db"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 2.1.1 Banco da aplicação vs banco de restore

| Banco | Finalidade | Compose/Container | Porta local | Volume |
|---|---|---|---|---|
| `db` | Banco principal do backend Django em desenvolvimento | `docker-compose.dev.yml` | `5432` ou rede interna | `postgres_data` |
| `postgres_restore` | Restore isolado dos dados Supabase para validação/importação | `docker-compose.restore.yml` | `5433` | `postgres_restore_data` |

O banco `postgres_restore` é fonte temporária de comparação/importação, não banco operacional da aplicação. Ele pode ser recriado quando necessário a partir dos dumps do Supabase e deve permanecer fora do compose de produção.

### 2.2 Docker Compose (produção)

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_HOST=db
      - POSTGRES_PORT=5432
      - DEBUG=0
      - ALLOWED_HOSTS=${ALLOWED_HOSTS}
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./app
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD", "pg_isready -U pcp_user -d pcp_db"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 2.3 Dockerfile Backend (multi-stage)

```dockerfile
# syntax=docker/dockerfile:1

# ============================================
# Builder: Instala dependências
# ============================================
FROM python:3.13-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ============================================
# Development: Servidor de desenvolvimento
# ============================================
FROM builder AS development

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/ .

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ============================================
# Production: Gunicorn
# ============================================
FROM python:3.13-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gunicorn \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY backend/ .

EXPOSE 8000
CMD ["gunicorn", "pcp_project.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### 2.4 Dockerfile Frontend (multi-stage Next.js)

```dockerfile
# syntax=docker/dockerfile:1

# ============================================
# Dependencies: Instala dependências npm
# ============================================
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY app/package*.json ./
RUN npm ci

# ============================================
# Builder: Build Next.js
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY app/ .

ENV NODE_ENV=production
RUN npm run build

# ============================================
# Runner: Imagem mínima de produção
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN mkdir .next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 3. Stack Tecnologica

| Camada | Tecnologia | Versao minima |
|---|---|---|
| Framework Web | Django | 5.0 |
| API REST | Django REST Framework | 3.15+ |
| Auth API | djangorestframework-simplejwt | 5.x |
| Auth Web | django.contrib.auth | shipped |
| Banco | PostgreSQL | 16 |
| Migrations | Django migrations | shipped |
| Auditoria | django-auditlog | latest |
| Testing | pytest + pytest-django + factory-boy | latest |
| API Docs | OpenAPI 3.1 via drf-spectacular | — |
| WSGI Server | Gunicorn (produção) | latest |
| Container | Docker + Docker Compose | latest |
| File storage | django-storages + boto3 | futuro |
| Background tasks | Django Q2 ou Celery | futuro |

**Justificativa DRF:** maturidade, ecossistema vasto, ViewSets prontos para CRUD, extensivel para operacoes customizadas, suporte a Browsable API para desenvolvimento, serializers robustos com validacao aninhada, integracao nativa com Django Admin e permission system.

---

## 4. Divisao de Apps Django

### 4.1 Mapa de Apps e Responsabilidades

```
pcp_project/               # Django project root (settings/, urls.py, wsgi.py)
├── accounts/             # User (AbstractUser), Operador, vinculo Supabase UID
├── cadastros/            # Setor, Operacao, TipoMaquina, Maquina
├── produtos/             # Produto, ProdutoOperacao (roteiro versionado)
├── turnos/               # Turno, TurnoOp, TurnoSetor, TurnoSetorDemanda,
│                         #   TurnoSetorOperacao, TurnoSetorOp, TurnoOperador
├── producao/             # RegistroProducao (apontamentos)
├── qualidade/            # QualidadeRegistro, QualidadeDetalhe, QualidadeDefeito
├── metas/                # MetaMensal
├── relatorios/           # selectors apenas (leitura cross-domain)
├── scanner/              # selectors + views read-only (leitura por QR token)
├── infra/                # healthcheck, auditoria, suporte operacional
└── shared/               # exceptions, permissions, constants, formulas (pacote, NAO app)
```

### 4.2 Regra de Cross-App Imports

```
accounts      -> nenhum outro app (autenticacao e base)
cadastros     -> accounts (created_by referencia User)
produtos      -> cadastros (Operacao referencia Setor)
turnos        -> cadastros, produtos (derivacao de setores via roteiro)
producao      -> turnos, cadastros, produtos (apontamento sobre estrutura)
qualidade     -> turnos, producao, cadastros (revisao sobre estrutura)
metas         -> turnos, producao (calculos de atingimento)
relatorios    -> TODOS (leitura cross-domain — folha, nao folha)
scanner       -> cadastros, turnos, produtos (leitura leve)
infra         -> TODOS (leitura de auditlog e health)
```

**Regra:** dominio nao pode importar de `relatorios` ou `scanner`. O inverso (dominio importando de folhas de leitura) e **proibido**.

---

## 5. Estrutura de Camadas por App

Cada app segue a mesma estrutura de camadas:

```
app/
  models/         # 1 arquivo por modelo (ex: turno.py, turno_op.py)
  selectors/      # funcoes puras de leitura (querysets + agregacoes)
  services/       # logica transacional (@transaction.atomic)
  serializers/    # DRF serializers (validacao e representacao)
  viewsets/       # DRF ViewSets (endpoints API)
  urls.py         # roteamento API do app
  admin/          # Django Admin (customizacao por grupo)
  __init__.py
apps.py
```

**Models** ficam em `models/` subdivididos por arquivo, nao em `models.py` unico.
**Services** e **selectors** sao modulos Python (`.py`), cada um com sua responsabilidade.
**Viewsets** sao DRF ViewSets com actions customizadas.
**Serializers** definem validacao de entrada e representacao de saida.

---

## 6. App `shared/` — Biblioteca de Dominio

`shared/` e um pacote Python (nao `django-admin startapp`) com utilities cross-app:

```
shared/
  exceptions.py     # DomainError, ValidationError, NotFoundError, ConcurrencyError
                    # + OpFisicaJaExisteError, SaldoFisicoInsuficienteError,
                    #   TurnoFechadoError, PermissaoRevisaoQualidadeError
  permissions.py    # IsAdmin, IsSupervisor, IsQualidadeReviewer, HasScanToken
  constants.py      # MINUTOS_TURNO_PADRAO, CLASSIFICACOES_DEFEITO, STATUS_TURNO
  formulas.py       # meta_hora(), meta_individual(), meta_grupo(), eficiencia(),
                    #   progresso_operacional_ponderado()
  validators.py     # Validacoes de dominio reutilizaveis
  pagination.py    # Custom page size
```

---

## 7. Models Django — Padroes Base

### 7.1 Base Mixins

```python
# shared/models.py (pseudo-codigo — arquivo real em shared/)

class BaseTimestampModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseUserAuditModel(BaseTimestampModel):
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="%(class)s_created",
    )

    class Meta:
        abstract = True
```

### 8.2 Padroes por Tipo de Model

**Entidades de negocio** (UUID como PK):
```python
class Meta:
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
```

**Enums** via `models.TextChoices` — sem inteiros magicos:
```python
class Status(models.TextChoices):
    ABERTO = "aberto", "Aberto"
    ENCERRADO = "encerrado", "Encerrado"
```

**Constraints** de dominio no `Meta.constraints` alem do banco:
```python
class Meta:
    constraints = [
        models.UniqueConstraint(
            fields=["turno", "numero_op"],
            name="unique_turno_numero_op"
        )
    ]
```

**Indexes** compounds para queries frequentes:
```python
class Meta:
    indexes = [
        models.Index(fields=["turno", "status"]),
    ]
```

### 8.3 App `accounts/`

**Models:**
- `User(AbstractUser)` — usuario Django com `papel`, `pode_revisar_qualidade`, `ativo`, `supabase_auth_uid`
- `Operador` — operador do chao com `matricula`, `nome`, `ativo`, `qr_code_token`, `maquina_preferida`

**Tabela mapeada:** `usuarios_sistema` (User) e `operadores` (Operador).

### 7.4 App `cadastros/`

**Models:**
- `Setor` — setor fisico com `codigo`, `nome`, `situacao`, `modo_apontamento` (producao_padrao ou revisao_qualidade), `sequencia_fluxo`
- `Operacao` — operacao tecnica com `codigo`, `descricao`, `setor`, `tempo_padrao_min`, `situacao`, `imagem_url`, `qr_code_token`
- `TipoMaquina` — tipo de maquina (legado, referenciado por `operacao.tipo_maquina_codigo`)
- `Maquina` — maquina patrimonial com `codigo`, `modelo`, `marca`, `situacao`, `qr_code_token`

**Tabela mapeada:** `setores`, `operacoes`, `tipos_maquina`, `maquinas`.

### 7.5 App `produtos/`

**Models:**
- `Produto` — produto confecionado com `codigo`, `nome`, `ativo`, `imagem_frente_url`, `imagem_costa_url`, `tp_produto_min` (snapshot)
- `ProdutoOperacao` — roteiro versionado com `produto`, `operacao`, `versao_roteiro`, `vigente`, `substituido_em`, `sequencia`

**Constraints criticos:**
- `unique_produto_vigente_unico`: apenas um roteiro vigente por produto
- `unique_produto_vigente_sequencia`: sequencia unica dentro do roteiro vigente
- `operacao_tempo_padrao_positivo`: CheckConstraint

**Tabela mapeada:** `produtos`, `produto_operacoes`.

### 7.6 App `turnos/`

**Models:**
- `Turno` — cabecalho com `status` (aberto/encerrado), `data_hora_abertura`, `data_hora_encerramento`, `operadores_disponiveis`, `minutos_turno`, `meta_grupo`, `encerrado_por`
- `TurnoOperador` — vinculo turno × operador
- `TurnoOp` — OP planejada com `numero_op`, `produto`, `quantidade_planejada`, `status`, `turno_op_origem` (carry-over), `quantidade_planejada_remanescente`, `tp_produto_min_snapshot`
- `TurnoSetor` — setor ativo no turno com `qr_code_token` (QR operacional)
- `TurnoSetorDemanda` — demanda interna OP/produto dentro do setor com `quantidade_herdada_setor`, `quantidade_liberada_setor`, `quantidade_planejada`, `quantidade_realizada`, `quantidade_aceita_turno`, `quantidade_excedente_turno`
- `TurnoSetorOperacao` — operacao atomica com `produto_operacao_id_snapshot`, `versao_roteiro_snapshot`, `tempo_padrao_min_snapshot`, `quantidade_planejada`, `quantidade_realizada`

**Constraints criticos:**
- `unique_turno_numero_op`: numero_op unico dentro do turno
- `unique_turno_setor`: setor nao duplica dentro do turno
- `unique_demanda_operacao`: operacao unica dentro da demanda
- `unique_turno_setor_demanda`: demanda unica por setor+op

**Tabela mapeada:** `turnos`, `turno_operadores`, `turno_ops`, `turno_setores`, `turno_setor_demandas`, `turno_setor_operacoes`.

### 7.7 App `producao/`

**Models:**
- `RegistroProducao` — fonte de verdade dos apontamentos com `operador`, `operacao`, `produto`, `quantidade`, `hora_registro`, `usuario_sistema`, `origem_apontamento` (operador_qr / operador_manual / supervisor_manual), `turno`, `turno_op`, `turno_setor`, `turno_setor_demanda`, `turno_setor_operacao`, `observacao`

**Indexes:** compound em (turno, hora_registro), (operador, hora_registro), (turno_op, operacao).

**Tabela mapeada:** `registros_producao`.

### 7.8 App `qualidade/`

**Models:**
- `QualidadeRegistro` — revisao com `revisor`, `turno`, `turno_op`, `turno_setor_operacao`, `quantidade_aprovada`, `quantidade_reprovada`, `hora_revisao`
- `QualidadeDetalhe` — ocorrencia de defeito com `registro`, `turno_setor_operacao_origem`, `operacao`, `defeito`, `quantidade_defeito`, `observacao`
- `QualidadeDefeito` — catalogo de defeitos com `nome`, `classificacao` (maquina/operador/processo/materia_prima), `ativo`

**Constraints:** `unique_defeito_ativo_nome` (defeito ativo com nome unico).

**Tabela mapeada:** `qualidade_registros`, `qualidade_detalhes`, `qualidade_defeitos`.

### 7.9 App `metas/`

**Models:**
- `MetaMensal` — meta gerencial com `competencia` (primeiro dia do mes), `meta_pecas`, `dias_produtivos`, `observacao`

**Constraints:** `unique_competencia_meta_mensal`, `meta_mensal_dias_validos`.

**Tabela mapeada:** `metas_mensais`.

---

## 8. Auth: Django + SimpleJWT

### 8.1 Model User

```python
class User(AbstractUser):
    class Papel(models.TextChoices):
        ADMIN = "admin", "Administrador"
        SUPERVISOR = "supervisor", "Supervisor"

    papel = models.CharField(max_length=20, choices=Papel, default=Papel.SUPERVISOR)
    pode_revisar_qualidade = models.BooleanField(default=False)
    ativo = models.BooleanField(default=True)
    supabase_auth_uid = models.UUIDField(null=True, blank=True, unique=True)
```

### 8.2 Login/logout (API)

- `POST /api/v1/accounts/login/` — username + senha → `{access, refresh, user}`
- `POST /api/v1/accounts/logout/` — invalida refresh token
- `POST /api/v1/accounts/refresh/` — refresh token → novo access token

### 8.3 Scanner (sem auth pesado)

- `GET /api/v1/scanner/operador/{token}/` — busca operador por QR token (publico, sem Bearer)
- `GET /api/v1/scanner/setor/{token}/` — busca setor ativo por QR token
- Mutacoes do scanner usam JWT normal (mesmo fluxo de operadorlogado)

### 7.4 Migracao de Auth Supabase

1. Exportar `auth.users` do Supabase Management API
2. Para cada usuario: criar `User` com `set_unusable_password()` + `supabase_auth_uid`
3. Gerar token de reset de senha e enviar por email
4. Alternativa: forcar reset coletivo via management command `import_supabase_auth`

---

## 9. API — Django REST Framework

### 8.1 URL Convention

```
/api/v1/{app}/                          # list + create
/api/v1/{app}/{id}/                     # retrieve + update + partial_update + destroy
/api/v1/{app}/{id}/acao-custom/          # actions customizadas
```

**Exemplos:**
- `GET /api/v1/cadastros/setores/` — listar setores
- `GET /api/v1/cadastros/setores/{id}/` — detalhe do setor
- `POST /api/v1/turnos/abrir/` — action customizada abrir turno
- `POST /api/v1/producao/registrar/` — action customizada registrar apontamento

### 8.2 Exception Handling

```python
# shared/exceptions.py
from rest_framework.exceptions import APIException

class DomainError(APIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Erro de dominio."
    default_code = "domain_error"

    def __init__(self, message, code, details=None):
        self.detail = {"error": message, "code": code, "details": details or {}}


class NotFoundError(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Recurso nao encontrado."
    default_code = "not_found"


class ValidationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Erro de validacao."
    default_code = "validation_error"


class ConcurrencyError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Conflito de concorrencia."
    default_code = "concurrency_error"
```

### 8.3 Response Padrao

DRF serializaautomaticamente. Error responses seguem o formato:

```json
{
  "error": "Mensagem descritiva",
  "code": "CODIGO_ERRO",
  "details": {}
}
```

### 8.4 Autenticacao e Permissoes

```python
# settings/base.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "EXCEPTION_HANDLER": "shared.exception_handler.custom_exception_handler",
}
```

### 8.5 OpenAPI via drf-spectacular

```python
# settings/base.py
SPECTACULAR_SETTINGS = {
    "TITLE": "PCP API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
```

Schema OpenAPI gerado via:
```bash
python manage.py spectacular --file schema.yml
```

---

## 10. Transacoes e Concorrencia

### 9.1 Tabela de Padroes por Operacao

| Operacao | Padrao |
|---|---|
| Apontamento produtivo | `transaction.atomic()` + `select_for_update()` em `TurnoSetorOperacao` |
| Revisao de qualidade | `transaction.atomic()` completo (registro + detalhes + update saldos) |
| Abertura/edicao de turno | `transaction.atomic()` + validacao de OP fisica |
| Adicionar OP ao turno | `transaction.atomic()` + validacao de roteiro vigente |
| Encerramento de turno | `transaction.atomic()` |
| CRUD cadastros simples | atomicidade implicita do ORM |

### 9.2 Idempotencia

Mutacoes criticas (apontamentos, qualidade) aceitam header `X-Idempotency-Key`.

```python
@transaction.atomic
def registrar_apontamento(request, validated_data):
    idempotency_key = request.headers.get("X-Idempotency-Key")

    if idempotency_key:
        existente = ApontamentoIdempotency.objects.filter(key=idempotency_key).first()
        if existente:
            return existente.response_data

    # ... executa operacao ...

    ApontamentoIdempotency.objects.create(
        key=idempotency_key,
        request_hash=hash_payload(validated_data),
        response_data=serializer.data,
    )
    return response
```

### 9.3 select_for_update

```python
tso = (
    TurnoSetorOperacao.objects
    .select_for_update()
    .select_related("demanda__turno_setor", "demanda__turno_op", "operacao")
    .get(id=turno_setor_operacao_id)
)
```

---

## 11. Services — Invariantes Implementadas

### 10.1 TurnoService

**`abrir_turno(operadores_disponiveis, minutos_turno, operadores_ids)`**
- Valida que nao existe turno aberto
- Cria Turno e vincula operadores
- Retorna Turno criado

**`adicionar_op_ao_turno(turno_id, numero_op, produto_id, quantidade_planejada, turno_op_origem_id)`**
- IMPLEMENTA INV-OP-01: recusa OP concluida ja existente
- IMPLEMENTA INV-OP-02: recusa OP com saldo pendente se nao houver carry-over
- Valida roteiro vigente do produto
- Deriva setores via `derivar_setores_e_operacoes()`
- Atualiza meta_grupo do turno

**`encerrar_turno(turno_id, encerrado_por_id)`**
- `select_for_update` no turno
- Atualiza `data_hora_encerramento` e `status = encerrado`

### 10.2 ProducaoService

**`registrar_apontamento_operacao(...)`**
- IMPLEMENTA INV-SF-01 e INV-SF-02: valida saldo fisico considerando linhagem completa (raiz + carry-overs)
- `select_for_update` no `TurnoSetorOperacao`
- Valida turno aberto
- Cria `RegistroProducao`
- Atualiza `quantidade_realizada` no cadeia: operacao → demanda → setor → op

### 10.3 QualidadeService

**`registrar_revisao_qualidade(...)`**
- IMPLEMENTA INV-QU-01: `quantidade_aprovada + quantidade_reprovada > 0`
- IMPLEMENTA INV-QU-02: defeitos obrigatorios quando `reprovada > 0`
- IMPLEMENTA INV-QU-03: unicidade operacao+tipo por revisao
- IMPLEMENTA INV-QU-04: `pode_revisar_qualidade == True`
- IMPLEMENTA INV-SF-03: saldo fisico validado (apenas `quantidade_aprovada` consome)
- IMPLEMENTA INV-QU-05 a INV-QU-07: rastreabilidade e formulas

### 10.4 CarryOverService

**`carregar_pendencias_turno_anterior(turno_origem_id, turno_destino_id)`**
- IMPLEMENTA INV-CO-01 a INV-CO-05: carry-over setorial parcelado
- Identifica OPs nao concluidas
- Para cada OP: calcula saldo fisico remanescente
- Cria `TurnoOp` filha com `turno_op_origem` e `quantidade_planejada_remanescente`
- Deriva setores automaticamente para a OP filha

---

## 12. Selectors — Read Models

### 11.1 Principio

Selectors sao funcoes **puras** que retornam dados. Nunca mutam estado.
Vivem em `app/selectors/nome.py` e representam uma leitura de dominio.

### 11.2 Padrao de ViewSet com Selectors

```python
# turnos/viewsets/turno.py
class TurnoViewSet(ModelViewSet):
    serializer_class = TurnoSerializer

    def get_queryset(self):
        return selectors.list_turnos(
            status=self.request.query_params.get("status"),
            data_inicio=self.request.query_params.get("data_inicio"),
            data_fim=self.request.query_params.get("data_fim"),
        )

    @action(detail=False, methods=["get"])
    def aberto(self, request):
        turno = selectors.get_turno_aberto()
        if not turno:
            raise NotFoundError("Nenhum turno aberto.")
        serializer = self.get_serializer(turno)
        return Response(serializer.data)
```

### 11.3 Exemplos de Selectors

**`get_turno_aberto()`** — retorna turno com status=aberto ou None.

**`get_turno_completo(turno_id)`** — turno com todos os recursos otimizados:
```python
Turno.objects
  .select_related("encerrado_por")
  .prefetch_related(
      "turno_ops__produto",
      "turno_ops__turno_setor_operacoes__operacao",
      "setores_turno__setor",
      "setores_turno__demandas__turno_op",
  )
  .get(id=turno_id)
```

**`get_saldo_fisico_op(turno_op_id)`** — calcula saldo fisico considerando linhagem raiz+carry-overs (INV-SF-01/02):
1. Encontrar raiz da OP seguindo `turno_op_origem`
2. Buscar todas as OPs da linhagem
3. Somar producao acumulada por operacao na linhagem
4. Retornar saldo restante

**`buscar_operador_por_qr_token(token)`** — scanner read-only.

### 11.4 Selectors Cross-Domain (Relatorios)

Selectors de `relatorios/` leem de todos os dominios. Exemplo:
- `get_eficiencia_por_hora(turno_id)` — agrega producao por hora
- `get_indicadores_qualidade_turno(turno_id)` — revisoes, defeitos, taxas
- `get_meta_mensal_evolucao(competencia)` — producao diaria vs meta

---

## 13. Formulas de Dominio

```python
# shared/formulas.py

def meta_hora(tempo_padrao_min: Decimal) -> int:
    """Meta horaria: floor(60 / tpOperacao)"""
    if tempo_padrao_min <= 0:
        return 0
    return int(60 / float(tempo_padrao_min))


def meta_individual(minutos_turno: int, tempo_padrao_min: Decimal) -> int:
    """Meta individual: floor(minutosTurno / tpOperacao)"""
    return int(minutos_turno / float(tempo_padrao_min))


def meta_grupo(funcionarios_ativos: int, minutos_turno: int, tp_produto_min: Decimal) -> int:
    """Meta do grupo: floor((funcionariosAtivos * minutosTurno) / tpProduto)"""
    if tp_produto_min <= 0:
        return 0
    return int((funcionarios_ativos * minutos_turno) / float(tp_produto_min))


def eficiencia(quantidade_produzida: int, tp_operacao: Decimal, minutos_trabalhados: int) -> float:
    """Eficiencia: (qtd * tpOperacao / minutos) * 100"""
    if minutos_trabalhados <= 0:
        return 0.0
    return round((quantidade_produzida * float(tp_operacao) / minutos_trabalhados) * 100, 2)


def progresso_operacional_ponderado(turno_op_id: UUID) -> float:
    """Progresso operacional ponderado pela sequencia do roteiro."""
    # Soma ponderada: (quantidade_realizada / quantidade_planejada) * peso_sequencia
    # para todas as operacoes da OP
```

---

## 14. Permissions

```python
# shared/permissions.py
from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.papel == "admin"


class IsSupervisor(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.papel in ("admin", "supervisor")
        )


class IsQualidadeReviewer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.pode_revisar_qualidade


class AllowAnyForScan(permissions.BasePermission):
    """Permite leitura publica para scanner (QR token)."""
    def has_permission(self, request, view):
        return True


# No ViewSet:
class TurnoSetorOperacaoViewSet(ModelViewSet):
    permission_classes = [IsSupervisor]
```

---

## 15. Testes — 3 Camadas

### 14.1 Estrutura

```
tests/
  unit/
    accounts/
    cadastros/
    produtos/
    turnos/
    producao/
    qualidade/
    metas/
  integration/
    test_turnos_api.py     # APIClient DRF
    test_producao_api.py
    test_qualidade_api.py
  parity/
    test_invariantes_op_fisica.py    # oraculo: op-fisica.test.ts
    test_invariantes_saldo_fisico.py # oraculo: saldo-fisico-op.test.ts
    test_invariantes_carry_over.py   # oraculo: carry-over-turno.test.ts
    test_invariantes_qualidade.py    # oraculo: qualidade-operacional.test.ts
    test_invariantes_formulas.py     # oraculo: os 30 arquivos .test.ts
```

### 14.2 Fixtures (factory-boy)

```python
# tests/factories.py

import factory
from accounts.models import User, Operador
from turnos.models import Turno, TurnoOp
from produtos.models import Produto, ProdutoOperacao

class AdminUserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    username = factory.Sequence(lambda n: f"admin{n}")
    email = factory.LazyAttribute(lambda o: f"{o.username}@example.com")
    papel = "admin"
    ativo = True

class TurnoAbertoFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Turno
    status = "aberto"
    operadores_disponiveis = 10
    minutos_turno = 480

class ProdutoComRoteiroVigenteFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Produto
    # ... + cria ProdutoOperacao com vigente=True
```

### 14.3 Teste de Paridade

Cada teste de paridade:
1. Recria o cenario exato do `.test.ts` de origem
2. Executa a mesma operacao via service Django
3. Compara resultado com expectativa do teste TypeScript

---

## 16. Django Admin — Escopo

Admin ativo para: cadastros (CRUD total), produtos (leitura + log de alteracoes), usuarios do sistema (suporte), auditoria (`auditlog`), configuracao de turno (`cadastros`).

Admin **nao** exposto para: apontamentos operacionais, revisao de qualidade, abertura/encerramento de turno. Esses fluxos devem passar pela API.

---

## 17. Settings — Modularizacao

```
pcp_project/
  config/
    __init__.py
    base.py       # apps, DRF, SimpleJWT, auditlog, spectacular, formulas
    local.py      # DEBUG=True, banco Docker (POSTGRES_* via env vars)
    production.py # DEBUG=False, ALLOWED_HOSTS, Sentry, segurança
    test.py       # SQLite in-memory, coverage
```

**local.py** conecta via env vars do Docker Compose:
```python
import os
from .base import *

DEBUG = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "pcp_db"),
        "USER": os.environ.get("POSTGRES_USER", "pcp_user"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "pcp_password"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}
```

---

## 18. Dependencias (requirements.txt)

```
Django>=5.0,<7.0
djangorestframework>=3.15
djangorestframework-simplejwt>=5.0
drf-spectacular>=0.27
psycopg2-binary
django-auditlog
gunicorn
django-environ
pytest
pytest-django
factory-boy
```

---

## 19. Integracao gradual com Next.js

### 19.1 Principio

O frontend Next.js atual continua usando Supabase como origem principal ate que cada modulo Django prove paridade funcional, backup/restore validado e rollback operacional. A troca de origem de dados deve ser feita por modulo, nunca por big bang.

### 19.2 Feature flags por modulo

Cada integracao Django deve ser controlada por feature flag explicita em variavel de ambiente, com fallback para Supabase quando a flag estiver desligada.

| Modulo | Flag proposta | Origem padrao | Origem alternativa |
|---|---|---|---|
| Scanner read-only | `NEXT_PUBLIC_USE_DJANGO_SCANNER_READS` | Supabase | Django `/api/v1/scanner/*` |
| Cadastros read-only | `NEXT_PUBLIC_USE_DJANGO_CADASTROS_READS` | Supabase | Django `/api/v1/cadastros/*`, `/api/v1/produtos/*` |
| Metas mensais read-only | `NEXT_PUBLIC_USE_DJANGO_METAS_READS` | Supabase | Django `/api/v1/metas/*` |
| Dashboard operacional | `NEXT_PUBLIC_USE_DJANGO_DASHBOARD_READS` | Supabase | Django selectors expostos em `/api/v1/relatorios/*` e `/api/v1/turnos/*` |
| Mutacoes administrativas simples | `NEXT_PUBLIC_USE_DJANGO_ADMIN_WRITES` | Supabase Server Actions | Django DRF |
| Apontamentos produtivos | `NEXT_PUBLIC_USE_DJANGO_PRODUCAO_WRITES` | Supabase RPC | Django `ProducaoService` |
| Qualidade | `NEXT_PUBLIC_USE_DJANGO_QUALIDADE_WRITES` | Supabase RPC | Django `QualidadeService` |

Regra obrigatoria: flags de escrita critica so podem ser ligadas depois de testes de paridade, testes de concorrencia, backup restaurado e plano de rollback aceito.

### 19.3 Endpoints iniciais read-only

A primeira integracao deve evitar escrita e priorizar endpoints de leitura comparaveis com o sistema atual:

1. `GET /api/v1/scanner/operador/{token}/`
2. `GET /api/v1/scanner/setor/{token}/`
3. `GET /api/v1/scanner/setor/{token}/demandas/`
4. `GET /api/v1/cadastros/operadores/`
5. `GET /api/v1/cadastros/maquinas/`
6. `GET /api/v1/cadastros/setores/`
7. `GET /api/v1/cadastros/operacoes/`
8. `GET /api/v1/produtos/`
9. `GET /api/v1/metas/mensais/{competencia}/resumo/`

Esses endpoints permitem comparar payload, contagens e comportamento sem risco de corromper dados de homologacao.

### 19.4 Fallback e rollback por modulo

O fallback padrao e desligar a feature flag do modulo e retornar imediatamente ao caminho Supabase existente. Nenhum modulo Django deve remover o caminho Supabase antes do cutover definitivo e homologado.

Critérios de rollback:
- divergencia de payload em campo contratual
- divergencia de contagem em leitura read-only
- erro de permissao/autenticacao nao previsto
- latencia operacional incompatível com scanner, dashboard ou apontamentos
- qualquer falha de escrita critica em ambiente de homologacao

### 19.5 Criterios de cutover por modulo

Um modulo so pode trocar oficialmente para Django quando cumprir todos os criterios abaixo:

- backup e restore da base Supabase validados
- endpoints Django documentados no OpenAPI
- testes de paridade cobrindo invariantes aplicaveis
- comparacao com Supabase atual sem divergencias relevantes
- feature flag testada em ligado/desligado
- plano de rollback documentado para o modulo
- aceite explicito do usuario antes de desligar o caminho Supabase

---

## 20. Proximos Passos (MDJ-4+)

1. **MDJ-4** — Scaffold Django + Docker Compose
   - `django-admin startproject pcp_project backend/`
   - Criar apps com estrutura de camadas
   - Configurar `config/local.py` com env vars do Docker
   - Criar Dockerfile multi-stage (development + production)
   - Criar `docker-compose.dev.yml` e `docker-compose.prod.yml`
   - Validar: `docker compose up` → Django responde em localhost:8000

2. **MDJ-5** — Modelagem inicial e migrations
   - Criar todos os models conforme secao 7
   - `makemigrations` e `migrate` dentro do container
   - Validar que migrations geram SQL equivalente ao schema restaurado

3. **MDJ-6** — Importacao read-only
   - Script de importacao dos dados do container restore
   - Validacao de contagens e integridade

4. **MDJ-7** — API read-only de cadastros e scanner
   - Expor selectors como ViewSets
   - Comparar respostas com Supabase atual

---

*Documento atualizado com estrutura Docker profissional baseada em documentação oficial (Context7).*
