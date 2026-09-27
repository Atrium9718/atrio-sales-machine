# Respaldos de Postgres: pg_dump diario con retención y copia opcional fuera del VPS (rclone).
FROM postgres:16-alpine
RUN apk add --no-cache rclone tzdata
COPY backup.sh run.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/run.sh
ENTRYPOINT ["/usr/local/bin/run.sh"]
