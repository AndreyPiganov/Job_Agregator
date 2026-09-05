FROM golang:1.25-alpine AS base

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

FROM base AS development

RUN CGO_ENABLED=0 go build -o /usr/local/bin/vacancy-healthcheck ./cmd/healthcheck

EXPOSE 50051

CMD ["go", "run", "./cmd/api"]

FROM base AS builder

RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/vacancy-service ./cmd/api
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/vacancy-healthcheck ./cmd/healthcheck

FROM alpine:3.22 AS production

RUN apk add --no-cache ca-certificates su-exec tzdata \
    && addgroup -S app \
    && adduser -S -G app app \
    && mkdir -p /var/log/vacancy-service \
    && chown -R app:app /var/log/vacancy-service

COPY --from=builder /out/vacancy-service /usr/local/bin/vacancy-service
COPY --from=builder /out/vacancy-healthcheck /usr/local/bin/vacancy-healthcheck
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

EXPOSE 50051

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["/usr/local/bin/vacancy-service"]
