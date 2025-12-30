FROM alpine:3.19

RUN apk add --no-cache \
    bash \
    postgresql16-client \
    curl \
    jq \
    tar \
    gzip

COPY backup.sh /backup.sh
COPY restore.sh /restore.sh
RUN chmod +x /backup.sh /restore.sh

WORKDIR /backup

ENTRYPOINT ["/bin/bash"]
