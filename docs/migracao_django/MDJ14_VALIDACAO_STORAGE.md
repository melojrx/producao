# MDJ14_VALIDACAO_STORAGE.md — Sprint MDJ-14

> Validacao da migracao de storage de imagens para Django local.
> Data: 2026-06-15

---

## Escopo implementado

- Storage local via `MEDIA_ROOT` / `MEDIA_URL` com volume Docker `media_data`
- Validacao de imagens (jpeg/png/webp, max 5 MB) portada de `lib/constants.ts`
- Upload/remocao transacional para produtos (frente/costa) e operacoes
- URLs publicas Django em `/media/{bucket}/...` preservando padrao de path
- Compatibilidade de extracao de caminho para URLs Supabase legadas e Django

---

## Configuracao

| Variavel | Valor local |
|---|---|
| `MEDIA_ROOT` | `/app/media` (volume `media_data`) |
| `MEDIA_URL` | `/media/` |
| `MEDIA_BASE_URL` | `http://localhost:8001` |

---

## Endpoints

| Metodo | Endpoint | Descricao |
|---|---|---|
| `POST` | `/api/v1/produtos/{id}/imagens/frente/` | Upload imagem frente |
| `DELETE` | `/api/v1/produtos/{id}/imagens/frente/` | Remove imagem frente |
| `POST` | `/api/v1/produtos/{id}/imagens/costa/` | Upload imagem costa |
| `DELETE` | `/api/v1/produtos/{id}/imagens/costa/` | Remove imagem costa |
| `POST` | `/api/v1/cadastros/operacoes/{id}/imagem/` | Upload imagem operacao |
| `DELETE` | `/api/v1/cadastros/operacoes/{id}/imagem/` | Remove imagem operacao |

Permissao: `IsSupervisor` (JWT obrigatorio).

Payload multipart: campo `arquivo`.

---

## Padrao de path

```
produtos/{produto_id}/{tipo}/{timestamp}-{uuid}.{ext}
operacoes/{operacao_id}/{timestamp}-{uuid}.{ext}
```

Tipos de produto: `frente`, `costa`.

---

## Arquivos principais

| Camada | Arquivo |
|---|---|
| Constantes | `backend/shared/storage_constants.py` |
| Validacao/path | `backend/shared/imagens.py` |
| Storage generico | `backend/infra/services/arquivos.py` |
| Service produto | `backend/produtos/services/imagens.py` |
| Service operacao | `backend/cadastros/services/imagens_operacao.py` |
| API produto | `backend/produtos/viewsets/imagens.py` |
| API operacao | `backend/cadastros/viewsets/imagens_operacao.py` |

---

## Comandos de homologacao

```bash
docker compose -f docker-compose.dev.yml build backend
docker compose -f docker-compose.dev.yml up -d backend
docker compose -f docker-compose.dev.yml exec -T backend python manage.py check
docker compose -f docker-compose.dev.yml exec -T backend python manage.py makemigrations --check --dry-run
docker compose -f docker-compose.dev.yml exec -T backend python manage.py test --keepdb
git diff --check
```

---

## Resultado em 2026-06-15

| Verificacao | Resultado |
|---|---|
| `manage.py check` | OK |
| `makemigrations --check --dry-run` | No changes detected |
| Suite completa | 96 testes OK (+25 novos) |
| `GET /health/` | HTTP 200 |
| Endpoints read-only MDJ-7/8 | HTTP 200 com JWT |
| `git diff --check` | OK |

---

## HU 14.7 — Homologacao complementar

Ajuste realizado em `2026-06-15` para evitar rollback indevido depois do commit do banco:

- falha ao remover a imagem anterior nao apaga a nova imagem ja persistida
- o upload de produto e operacao retorna sucesso mantendo a nova URL
- a falha de limpeza do arquivo antigo fica registrada em log de warning

Testes adicionados:

- `produtos.tests.test_imagem_service.ProdutoImagemServiceTests.test_upload_mantem_nova_imagem_quando_remocao_da_antiga_falha`
- `cadastros.tests.test_imagem_operacao_service.OperacaoImagemServiceTests.test_upload_mantem_nova_imagem_quando_remocao_da_antiga_falha`

---

## Fora de escopo (preservado)

- Frontend Next.js
- Server Actions Supabase (`lib/actions/produtos.ts`, `lib/actions/operacoes.ts`)
- Supabase Storage remoto
- Migracao em massa de arquivos do backup (MDJ-16 / cutover)
- django-storages + S3 (MDJ-15)

---

## Proximo passo

MDJ-15 — Infra VPS, EasyPanel, observabilidade e storage configuravel em producao (S3/volume nginx).
