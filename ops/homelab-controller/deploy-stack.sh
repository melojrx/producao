#!/bin/sh
set -eu

CONTROLLER_ROOT='/usr/local/lib/producao'
PRODUCAO_ROOT='/srv/producao'
CONFIGURATION_FILE="$PRODUCAO_ROOT/producao.env"
STACK_NAME='producao'
EDGE_STACK_NAME='producao-edge'
MIGRATE_SERVICE="${STACK_NAME}_migrate"
BACKEND_SERVICE="${STACK_NAME}_backend"
FRONTEND_SERVICE="${STACK_NAME}_frontend"

. "$CONTROLLER_ROOT/load-env.sh"

fail() { printf '%s\n' "$1" >&2; exit 1; }

read_release_images() {
  backend_image=''
  frontend_image=''
  while IFS= read -r line || [ -n "$line" ]; do
    key=${line%%=*}
    value=${line#*=}
    case "$key" in
      PRODUCAO_BACKEND_IMAGE) [ -z "$backend_image" ] || fail 'Duplicate backend image.'; backend_image=$value ;;
      PRODUCAO_FRONTEND_IMAGE) [ -z "$frontend_image" ] || fail 'Duplicate frontend image.'; frontend_image=$value ;;
      *) fail 'Invalid release image declaration.' ;;
    esac
  done < "$1"
  [ -n "$backend_image" ] && [ -n "$frontend_image" ] || fail 'Release images are incomplete.'
  validate_producao_image backend "$backend_image"
  validate_producao_image frontend "$frontend_image"
}

wait_for_service_replicas() { service=$1; expected=$2; attempt=1; while [ "$attempt" -le 60 ]; do replicas=$(docker service ls --filter "name=$service" --format '{{.Replicas}}'); [ "$replicas" = "$expected" ] && return 0; sleep 2; attempt=$((attempt + 1)); done; return 1; }
wait_for_migration() { attempt=1; while [ "$attempt" -le 60 ]; do states=$(docker service ps --no-trunc --format '{{.CurrentState}}|{{.Error}}' "$MIGRATE_SERVICE" | sed -n '1p'); printf '%s\n' "$states" | grep -q '^Complete' && return 0; printf '%s\n' "$states" | grep -Eq '^(Failed|Rejected)' && return 1; sleep 2; attempt=$((attempt + 1)); done; return 1; }
wait_for_container_health() { service=$1; attempt=1; while [ "$attempt" -le 60 ]; do container_id=$(docker ps --filter "label=com.docker.swarm.service.name=$service" --filter status=running --format '{{.ID}}' | sed -n '1p'); if [ -n "$container_id" ]; then health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container_id"); [ "$health" = healthy ] && return 0; [ "$health" = unhealthy ] && return 1; fi; sleep 2; attempt=$((attempt + 1)); done; return 1; }
show_service_diagnostics() { docker service ps --no-trunc "$1" >&2 || :; docker service logs --tail 100 "$1" >&2 || :; }

[ "$#" -eq 1 ] || fail 'Usage: deploy-stack.sh <release-directory>'
release_directory=$1
case "$release_directory" in "$PRODUCAO_ROOT"/releases/sha256-*) ;; *) fail 'Invalid release directory.' ;; esac
[ -r "$release_directory/images.env" ] || fail 'Release images are not readable.'
read_release_images "$release_directory/images.env"
[ -r "$CONFIGURATION_FILE" ] || fail "Configuration file is not readable: $CONFIGURATION_FILE"
stack_file="$CONTROLLER_ROOT/deploy/swarm/producao.yml"
edge_file="$CONTROLLER_ROOT/deploy/swarm/producao-edge.yml"
[ -r "$stack_file" ] && [ -r "$edge_file" ] || fail 'Root-owned manifests are not readable.'

load_env_file "$CONFIGURATION_FILE"
export PRODUCAO_BACKEND_IMAGE="$backend_image" PRODUCAO_FRONTEND_IMAGE="$frontend_image"
[ "$(docker info --format '{{.Swarm.LocalNodeState}}')" = active ] || fail 'Docker Swarm is not active.'
docker network inspect edge >/dev/null 2>&1 || fail 'Required network is missing: edge'
for secret in producao_django_secret_key producao_postgres_password producao_cloudflared_tunnel_token; do docker secret inspect "$secret" >/dev/null 2>&1 || fail "Required secret is missing: $secret"; done

docker pull "$PRODUCAO_BACKEND_IMAGE"; docker pull "$PRODUCAO_FRONTEND_IMAGE"
docker stack deploy --with-registry-auth --resolve-image never -c "$edge_file" "$EDGE_STACK_NAME"
if ! docker service inspect "$BACKEND_SERVICE" >/dev/null 2>&1; then docker stack deploy --with-registry-auth --resolve-image never -c "$stack_file" "$STACK_NAME"; docker service scale "$BACKEND_SERVICE=0" "$FRONTEND_SERVICE=0"; fi
if ! wait_for_service_replicas "${STACK_NAME}_postgres" '1/1' || ! wait_for_container_health "${STACK_NAME}_postgres"; then show_service_diagnostics "${STACK_NAME}_postgres"; fail 'PostgreSQL did not become healthy.'; fi
docker service update --with-registry-auth --image "$PRODUCAO_BACKEND_IMAGE" --force --update-monitor 0s --detach=true "$MIGRATE_SERVICE"; docker service scale --detach=true "$MIGRATE_SERVICE=1"
if ! wait_for_migration; then show_service_diagnostics "$MIGRATE_SERVICE"; docker service scale --detach=true "$MIGRATE_SERVICE=0" || :; fail 'Migration did not complete successfully.'; fi
docker service scale --detach=true "$MIGRATE_SERVICE=0"
docker stack deploy --with-registry-auth --resolve-image never -c "$stack_file" "$STACK_NAME"
if ! wait_for_service_replicas "$BACKEND_SERVICE" '1/1' || ! wait_for_service_replicas "$FRONTEND_SERVICE" '1/1' || ! wait_for_container_health "$BACKEND_SERVICE" || ! wait_for_container_health "$FRONTEND_SERVICE"; then show_service_diagnostics "$BACKEND_SERVICE"; show_service_diagnostics "$FRONTEND_SERVICE"; docker service rollback "$BACKEND_SERVICE" || :; docker service rollback "$FRONTEND_SERVICE" || :; fail 'Release did not reach the expected replica count.'; fi
backend_container=$(docker ps --filter "label=com.docker.swarm.service.name=$BACKEND_SERVICE" --filter status=running --format '{{.ID}}' | sed -n '1p'); [ -n "$backend_container" ] || fail 'Backend container is not running.'
docker exec "$backend_container" python -c "import urllib.request; request=urllib.request.Request('http://127.0.0.1:8000/health/', headers={'X-Forwarded-Proto': 'https'}); urllib.request.urlopen(request, timeout=5)" >/dev/null
printf '%s\n' "Produção release is ready: $PRODUCAO_BACKEND_IMAGE $PRODUCAO_FRONTEND_IMAGE"
