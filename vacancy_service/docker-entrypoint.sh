#!/bin/sh
set -eu

mkdir -p "${LOG_DIR:-/var/log/vacancy-service}"
chown -R app:app "${LOG_DIR:-/var/log/vacancy-service}"

exec su-exec app "$@"
