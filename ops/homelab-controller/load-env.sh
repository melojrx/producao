#!/bin/sh

load_env_file() {
  [ "$#" -eq 1 ] || { printf '%s\n' 'Usage: load_env_file <configuration-file>' >&2; return 1; }
  file=$1; [ -r "$file" ] || { printf 'Configuration file is not readable: %s\n' "$file" >&2; return 1; }
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|'#'*) continue ;; *=*) ;; *) printf 'Invalid configuration line: %s\n' "$line" >&2; return 1 ;; esac
    key=${line%%=*}; value=${line#*=}; printf '%s\n' "$key" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$' || { printf 'Invalid configuration key: %s\n' "$key" >&2; return 1; }; export "$key=$value"
  done < "$file"
}

validate_producao_image() {
  [ "$#" -eq 2 ] || return 1; component=$1; image_reference=$2
  case "$component" in backend|frontend) ;; *) return 1 ;; esac
  prefix="ghcr.io/melojrx/producao-$component@sha256:"; case "$image_reference" in "$prefix"*) digest=${image_reference#"$prefix"} ;; *) return 1 ;; esac
  case "$digest" in ''|*[!0123456789abcdef]*) return 1 ;; esac; [ "${#digest}" -eq 64 ]
}
