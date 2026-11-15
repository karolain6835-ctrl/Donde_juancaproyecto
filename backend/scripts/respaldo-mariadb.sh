#!/usr/bin/env bash
# Respaldo completo (estructura + datos + rutinas + triggers) de la base DB_NAME
# y verificación por restauración en una base temporal. SOLO LECTURA sobre el origen.
#
# Uso (con las variables DB_* apuntando a la base a respaldar):
#   bash backend/scripts/respaldo-mariadb.sh [directorio_salida]
# Para Railway, ejecutar con el proxy TCP público de mariadb o `railway run`
# y un cliente mysql/mariadb local (mysqldump >= 10.4).
set -euo pipefail
: "${DB_HOST:?}" "${DB_PORT:?}" "${DB_USER:?}" "${DB_PASSWORD:?}" "${DB_NAME:?}"
OUT="${1:-./respaldos}"; mkdir -p "$OUT"
SELLO="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVO="$OUT/${DB_NAME}_${SELLO}.sql.gz"
export MYSQL_PWD="$DB_PASSWORD"
CONN=(-h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")

mysqldump "${CONN[@]}" --single-transaction --quick --routines --triggers --events \
  --hex-blob --default-character-set=utf8mb4 --databases "$DB_NAME" | gzip -9 > "$ARCHIVO"
gzip -t "$ARCHIVO"

# Conteo de filas por tabla en el origen (exacto, dentro de una lectura consistente).
conteos() {
  local db="$1" t
  for t in $(mysql "${CONN[@]}" -N -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$db' AND TABLE_TYPE='BASE TABLE' ORDER BY 1"); do
    echo "$t $(mysql "${CONN[@]}" -N -e "SELECT COUNT(*) FROM \`$db\`.\`$t\`")"
  done
}
conteos "$DB_NAME" > "$ARCHIVO.conteos-origen.txt"

# Restauración de prueba en una base temporal (se borra al terminar).
TMP="verif_resp_${SELLO,,}"
mysql "${CONN[@]}" -e "CREATE DATABASE \`$TMP\`"
trap 'mysql "${CONN[@]}" -e "DROP DATABASE IF EXISTS \`$TMP\`"' EXIT
gunzip -c "$ARCHIVO" | sed -e "s/\`$DB_NAME\`/\`$TMP\`/g" -e '/^CREATE DATABASE/d' -e '/^USE /d' | mysql "${CONN[@]}" "$TMP"
conteos "$TMP" > "$ARCHIVO.conteos-restaurado.txt"

if diff -q "$ARCHIVO.conteos-origen.txt" "$ARCHIVO.conteos-restaurado.txt" >/dev/null; then
  sha256sum "$ARCHIVO" | tee "$ARCHIVO.sha256"
  echo "RESPALDO VERIFICADO: $ARCHIVO ($(wc -l < "$ARCHIVO.conteos-origen.txt") tablas, conteos idénticos tras restaurar)"
else
  echo "FALLO: los conteos restaurados difieren del origen" >&2
  diff "$ARCHIVO.conteos-origen.txt" "$ARCHIVO.conteos-restaurado.txt" >&2 || true
  exit 1
fi
