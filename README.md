# 📦 Korp_Teste_Paulo - Sistema de Emissão de Notas Fiscais e Gestão de Estoque

Este repositório contém a solução completa para o desafio técnico da **Korp**, desenvolvida em uma arquitetura de microsserviços poliglota com **C# (.NET 10)**, **Go (Golang)** e **Angular**.

---

## 🏛️ Visão Geral da Arquitetura

O sistema foi desenhado seguindo os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)**, **Event-Driven Architecture (EDA)** e **Observabilidade Distribuída**:

```
                                  ┌───────────────────────────┐
                                  │   Frontend Angular (Web)  │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │     YARP API Gateway      │
                                  └──────┬─────────────┬──────┘
                                         │             │
                                         ▼             ▼
┌──────────────────────────────────┐         ┌──────────────────────────────────┐
│  Microsserviço de Estoque (C#)   │         │  Microsserviço Faturamento (Go)  │
│  - Clean Architecture & DDD      │         │  - Gin Web Framework & GORM      │
│  - PostgreSQL & Redis Cache      │         │  - SQL Server & Redis Cache      │
│  - Redlock & Idempotência        │         │  - Fail-Fast Cache Pre-Validation│
└────────────────┬─────────────────┘         └────────────────┬─────────────────┘
                 │                                            │
                 └───────────────────┬────────────────────────┘
                                     │ (Eventos Assíncronos RabbitMQ)
                                     ▼
                          ┌───────────────────────────┐
                          │   RabbitMQ (Mensageria)   │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │  Prometheus + Grafana     │
                          │  + Loki + Promtail        │
                          └───────────────────────────┘
```

---

## 📋 Respostas ao Detalhamento Técnico (Especificação Korp - PDF)

Esta seção atende explicitamente a todas as perguntas e requisitos do documento de especificação técnica do teste:

### 1. Quais frameworks e bibliotecas foram utilizados no Golang ou C#?

#### 🔵 Backend Estoque (C# .NET 10):
- **Framework Web:** ASP.NET Core 10 Web API (`Microsoft.AspNetCore.App`)
- **ORM & Persistência:** Entity Framework Core 10 (`Npgsql.EntityFrameworkCore.PostgreSQL`)
- **Mensageria Assíncrona:** MassTransit 8.3.6 (`MassTransit.RabbitMQ`)
- **Cache & Concorrência:** StackExchange.Redis 3.1 & RedLock.net 2.3.2
- **Validação de Contrato:** FluentValidation 12
- **Observabilidade & Métricas:** Serilog 10, Microsoft Health Checks, prometheus-net.AspNetCore

#### 🟢 Backend Faturamento (Golang):
- **Framework Web:** Gin Web Framework (`github.com/gin-gonic/gin`)
- **ORM & Persistência:** GORM (`gorm.io/gorm`) com driver SQL Server (`gorm.io/driver/sqlserver`)
- **Mensageria Assíncrona:** RabbitMQ AMQP 0-9-1 Client (`github.com/rabbitmq/amqp091-go`)
- **Cache Redis Client:** `github.com/redis/go-redis/v9`
- **Logging Estruturado:** `log/slog` (Biblioteca padrão do Go para logs JSON)
- **Documentação Swagger:** Swaggo (`github.com/swaggo/swag`, `gin-swagger`)
- **Métricas & Health:** Prometheus Go Client (`github.com/prometheus/client_golang`)
- **UUIDs:** `github.com/google/uuid`

---

### 2. Como foi realizado o gerenciamento de dependências no Golang?
Foi utilizado o **Go Modules** (`go.mod` e `go.sum`), garantindo o versionamento exato, reprodutibilidade das dependências e builds determinísticos em containers Docker multi-stage (`golang:1.24-alpine`).

---

### 3. Como foram tratados os erros e exceções no backend?

- **No C# (Estoque):**
  - **ExceptionHandlingMiddleware:** Intercepta exceções não tratadas e formata no padrão **RFC 7807** (`ProblemDetails` e `ValidationProblemDetails`).
  - **DomainExceptions:** Exceções de regra de negócio lançam `DomainException`, capturadas pelo consumidor MassTransit para acionar o evento de falha compensatória (`AbatimentoEstoqueFalhouEvent`).

- **No Golang (Faturamento):**
  - **Envelopes JSON Padronizados:** Respostas padronizadas via `SendError()` e `SendSuccess()` no padrão `{ "success": false, "error": { "code": "...", "message": "..." } }`.
  - **Pré-Validação Fail-Fast:** Validação instantânea no Redis Cache antes de persistir a nota fiscal no SQL Server. Se o produto não existir no cache, rejeita com `HTTP 400 Bad Request` em sub-milissegundos.
  - **Saga Pattern / Transação Compensatória:** Se o consumo no Estoque falhar por saldo insuficiente, o Go consome o evento de falha e reverte o status da nota no SQL Server de `"EmProcessamento"` para `"Cancelada"`.

---

### 4. Caso a implementação utilize C#, indicar se foi utilizado LINQ e de que forma:
**SIM**, o LINQ foi utilizado em 4 cenários vitais:
1. **Prevenção de Deadlock (Redlock):** `message.Itens.OrderBy(i => i.CodigoProduto)` ordenando as chaves de trava alfabeticamente.
2. **Filtros Dinâmicos de Busca:** `Where(p => p.Codigo.Contains(busca) || p.Descricao.Contains(busca))` na consulta de produtos no EF Core.
3. **Projeções de Mapeamento DTO:** Expressões `.Select(...)` para conversão de entidades de domínio para DTOs.
4. **Validações de Existência:** `.AnyAsync(p => p.Codigo == codigo)` no repositório de produtos.

---

### 5. Requisitos Opcionais Implementados (Especificação PDF - Pág. 2)

- **a. Tratamento de Concorrência:** Implementado via **Redlock** distribuído (`RedisLockService`), garantindo que solicitações simultâneas de abatimento de saldo para o mesmo produto sejam processadas sequencialmente sem *race conditions*.
- **c. Implementação de Idempotência:** Implementado via **Redis** (`RedisIdempotencyService`), gravando a chave `idempotency:{NotaFiscalId}` com validade de 7 dias no consumidor C# para evitar débitos duplos caso mensagens do RabbitMQ sejam reentregues.

---

## 📊 Stack de Observabilidade Centralizada

O sistema possui uma stack completa de monitoramento e auditoria:

| Ferramenta | URL Local | Descrição |
| :--- | :--- | :--- |
| **Swagger Faturamento (Go)** | [http://localhost:8082/swagger](http://localhost:8082/swagger) | Teste interativo dos endpoints REST em Go |
| **Swagger Estoque (C#)** | [http://localhost:8081/swagger](http://localhost:8081/swagger) | Teste interativo dos endpoints REST em C# |
| **RabbitMQ Management** | [http://localhost:15672](http://localhost:15672) *(guest/guest)* | Dashboard de filas, trocas e mensagens assíncronas |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | Coleta e consulta de métricas de runtime (`up`, `go_goroutines`, etc.) |
| **Grafana Loki + Explore** | [http://localhost:3000](http://localhost:3000) *(admin/admin)* | Dashboard unificado de métricas e busca de logs em tempo real |

### 🔍 Rastreamento por `X-Correlation-ID` e `UUID` da Nota:
Todas as requisições geram ou propagam um `X-Correlation-ID`. No Grafana Loki (aba **Explore** ➔ datasource **Loki**), digite a consulta abaixo para visualizar **a jornada completa da nota fiscal** desde o recebimento HTTP até a mensageria e o banco de dados:
```logql
{container=~"faturamento-api|estoque-api"} |= "SEU-UUID-OU-CORRELATION-ID"
```

---

## 🛠️ Como Executar o Projeto Localmente

### 1. Subir a Infraestrutura Completa via Docker Compose
Na raiz do repositório, execute:
```bash
docker compose up -d --build
```
Isso iniciará os 10 containers da solução com verificações de saúde (**`healthy`**):
- `faturamento-api` (Go - Porta `8082`)
- `estoque-api` (C# .NET 10 - Porta `8081`)
- `faturamento-db` (SQL Server 2022 - Porta `1433`)
- `estoque-db` (PostgreSQL 16 - Porta `5432`)
- `redis` (Redis Cache & Lock - Porta `6379`)
- `rabbitmq` (RabbitMQ AMQP `5672` | Painel `15672`)
- `prometheus` (Porta `9090`)
- `loki` (Grafana Loki - Porta `3100`)
- `promtail` (Docker Log Collector)
- `grafana` (Grafana Dashboard - Porta `3000`)

---

### 2. Suíte de Testes Unitários
- **Testes em Go (Faturamento):**
  ```bash
  cd faturamento-api && go test ./...
  ```
- **Testes em C# (Estoque):**
  ```bash
  dotnet test estoque-api/Estoque.slnx
  ```

---

### 🧪 Coleção do Postman Pronta para Uso
Arquivo na raiz: [`Korp_Teste_Paulo.postman_collection.json`](file:///home/pheit/Korp_Teste_Paulo/Korp_Teste_Paulo.postman_collection.json)

---

## 📝 Status do Projeto (Roadmap)

- [x] **Épico 1:** Infraestrutura e DevOps (Docker Compose multi-stage, GitHub Actions)
- [x] **Épico 2:** Microsserviço de Estoque (C# .NET 10 - Clean Architecture, Redlock, Idempotência)
- [x] **Épico 3:** Microsserviço de Faturamento & Observabilidade (Go, GORM, RabbitMQ, Redis Fail-Fast, Prometheus, Grafana Loki, Saga Pattern)
- [ ] **Épico 4:** API Gateway YARP & WebSockets SignalR
- [ ] **Épico 5:** Frontend Angular 17+ (Standalone Components)
