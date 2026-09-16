#!/bin/sh
set -eu

REPOSITORY_ROOT=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
HOMELAB_HOST='melojr@100.93.170.120'
PRODUCAO_ROOT='/srv/producao'

. "$REPOSITORY_ROOT/scripts/homelab/load-env.sh"

stage_only=false
case "$#" in
  2)
    backend_image=$1
    frontend_image=$2
    ;;
  3)
    [ "$1" = '--stage-only' ] || { printf '%s\n' 'Usage: scripts/deploy-homelab.sh [--stage-only] <backend-digest> <frontend-digest>' >&2; exit 1; }
    stage_only=true
    backend_image=$2
    frontend_image=$3
    ;;
  *)
    printf '%s\n' 'Usage: scripts/deploy-homelab.sh [--stage-only] <backend-digest> <frontend-digest>' >&2
    exit 1
    ;;
esac
validate_producao_image backend "$backend_image"
validate_producao_image frontend "$frontend_image"

backend_digest=${backend_image#ghcr.io/melojrx/producao-backend@sha256:}
frontend_digest=${frontend_image#ghcr.io/melojrx/producao-frontend@sha256:}
release_directory="$PRODUCAO_ROOT/releases/sha256-$backend_digest-$frontend_digest"
ssh -o BatchMode=yes "$HOMELAB_HOST" "sudo /usr/local/sbin/stage-producao-release '$backend_image' '$frontend_image'"
printf '%s\n' "Release staged at $release_directory"

[ "$stage_only" = true ] && exit 0
ssh -o BatchMode=yes "$HOMELAB_HOST" "sudo /usr/local/sbin/deploy-producao-release '$release_directory'"
