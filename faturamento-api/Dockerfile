# Stage 1: Build
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copia arquivos de dependencias
COPY go.mod go.sum* ./
RUN go mod download

# Copia o codigo fonte
COPY . .

# Compila o binario estatico
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o faturamento-api ./cmd/api

# Stage 2: Runtime
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/faturamento-api .

EXPOSE 8082

ENV PORT=8082 \
    GIN_MODE=release

ENTRYPOINT ["./faturamento-api"]
