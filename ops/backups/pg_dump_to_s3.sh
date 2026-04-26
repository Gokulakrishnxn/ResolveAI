#!/usr/bin/env bash
# ResolveAI nightly Postgres backup -> S3 with 30-day retention.
#
# Usage (typically from a cron / k8s CronJob / Railway scheduled job):
#   DATABASE_URL=postgres://...  \
#   AWS_S3_BUCKET=resolveai-backups \
#   AWS_REGION=us-east-1 \
#   BACKUP_RETENTION_DAYS=30 \
#   ./ops/backups/pg_dump_to_s3.sh
#
# Requires: pg_dump >= 14, awscli v2, gzip.
#
# The script is idempotent: a single run produces a single dump file
# named with the UTC timestamp; subsequent runs upload independent
# dumps. A separate `aws s3 rm --recursive` step prunes anything
# older than BACKUP_RETENTION_DAYS based on object LastModified.

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${AWS_S3_BUCKET:?AWS_S3_BUCKET is required}"
: "${AWS_REGION:?AWS_REGION is required}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
PREFIX="${BACKUP_PREFIX:-postgres}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
filename="resolveai-${stamp}.sql.gz"
tmp="/tmp/${filename}"
key="${PREFIX}/${filename}"

echo "[backup] dumping database -> ${tmp}"
pg_dump --format=plain --no-owner --no-privileges "${DATABASE_URL}" \
  | gzip -9 > "${tmp}"
size_bytes=$(stat -c%s "${tmp}" 2>/dev/null || stat -f%z "${tmp}")
echo "[backup] dump size: ${size_bytes} bytes"

echo "[backup] uploading -> s3://${AWS_S3_BUCKET}/${key}"
aws s3 cp "${tmp}" "s3://${AWS_S3_BUCKET}/${key}" \
  --region "${AWS_REGION}" \
  --storage-class STANDARD_IA \
  --no-progress \
  --metadata "service=resolveai,kind=postgres-dump,retention_days=${RETENTION_DAYS}"

rm -f "${tmp}"

echo "[backup] pruning objects older than ${RETENTION_DAYS} days"
cutoff_ts=$(date -u -d "${RETENTION_DAYS} days ago" +%s 2>/dev/null \
  || date -u -v-"${RETENTION_DAYS}"d +%s)

aws s3api list-objects-v2 \
  --bucket "${AWS_S3_BUCKET}" \
  --prefix "${PREFIX}/" \
  --region "${AWS_REGION}" \
  --query 'Contents[].[Key,LastModified]' \
  --output text 2>/dev/null \
  | while read -r obj_key obj_modified; do
      [ -z "${obj_key}" ] && continue
      obj_ts=$(date -u -d "${obj_modified}" +%s 2>/dev/null \
        || date -u -j -f "%Y-%m-%dT%H:%M:%S+00:00" "${obj_modified%.*}+00:00" +%s 2>/dev/null \
        || echo 0)
      if [ "${obj_ts}" -gt 0 ] && [ "${obj_ts}" -lt "${cutoff_ts}" ]; then
        echo "[backup] pruning s3://${AWS_S3_BUCKET}/${obj_key}"
        aws s3 rm "s3://${AWS_S3_BUCKET}/${obj_key}" --region "${AWS_REGION}"
      fi
    done

echo "[backup] done"
