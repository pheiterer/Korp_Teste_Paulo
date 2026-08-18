# 📦 Korp_Teste_Paulo - Sistema de Emissão de Notas Fiscais e Gestão de Estoque

Este repositório contém a solução completa para o desafio técnico da **Korp**, desenvolvida em uma arquitetura de microsserviços poliglota resiliente com **C# (.NET 10)**, **Go (Golang)**, **YARP API Gateway**, **SignalR WebSockets** e **Angular**.

---

## 🏛️ Visão Geral da Arquitetura

O sistema foi desenhado seguindo os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)**, **Event-Driven Architecture (EDA)**, **API Gateway Pattern** e **Observabilidade Distribuída**:

```
                                  ┌───────────────────────────┐
                                  │   Frontend Angular (Web)  │
                                  └─────────────┬─────────────┘
                                                │ (HTTP / WebSocket)
                                                ▼
                                  ┌───────────────────────────┐
                                  │  YARP API Gateway (C#)    │
                                  │  - SignalR Hub (WS)       │
                                  │  - Correlation ID         │
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
                                     │ (Eventos Assíncronos RabbitMQ / AMQP)
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

Esta seção atende explicitamente a todas as perguntas e requisitos do documento de especificação técnica do teste (`c_ou_go_+_angular.pdf`):

### 1. Quais frameworks e bibliotecas foram utilizados no Golang ou C#?

#### 🌐 API Gateway & Real-Time Server (C# .NET 10):
- **Reverse Proxy:** YARP - Yet Another Reverse Proxy (`Yarp.ReverseProxy` 2.3.0)
- **Comunicação em Tempo Real:** ASP.NET Core SignalR (`Microsoft.AspNetCore.SignalR`)
- **Mensageria Assíncrona:** MassTransit 8.3.6 (`MassTransit.RabbitMQ`)
- **Logging & Tracing:** Serilog 9.0 (`Serilog.AspNetCore`, `Serilog.Sinks.Console`)
- **Métricas:** Prometheus (`prometheus-net.AspNetCore` 8.2.1)

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
- **Logging Estruturado:** `log/slog` (Biblioteca padrão do Go para logs JSON estruturados)
- **Documentação Swagger:** Swaggo (`github.com/swaggo/swag`, `gin-swagger`)
- **Métricas & Health:** Prometheus Go Client (`github.com/prometheus/client_golang`)
- **UUIDs:** `github.com/google/uuid`

---

### 2. Como foi realizado o gerenciamento de dependências no Golang?
Foi utilizado o **Go Modules** (`go.mod` e `go.sum`), garantindo o versionamento exato, reprodutibilidade das dependências e builds determinísticos em containers Docker multi-stage (`golang:alpine`).

---

### 3. Como foram tratados os erros e exceções no backend?

- **No C# (Estoque & Gateway):**
  - **ExceptionHandlingMiddleware & RFC 7807:** Intercepta exceções não tratadas e formata no padrão `ProblemDetails` e `ValidationProblemDetails`.
  - **DomainExceptions:** Exceções de regra de negócio (ex: saldo insuficiente) lançam `DomainException`, capturadas pelo consumidor MassTransit para publicar o evento `AbatimentoEstoqueFalhouEvent`.

- **No Golang (Faturamento):**
  - **Envelopes JSON Padronizados:** Respostas estruturadas via `SendError()` e `SendSuccess()` no padrão `{ "success": false, "error": { "code": "...", "message": "..." } }`.
  - **Pré-Validação Fail-Fast:** Validação instantânea no Redis Cache antes de persistir a nota fiscal no SQL Server. Se o produto não existir no cache, rejeita com `HTTP 400 Bad Request` em sub-milissegundos.

- **Tratamento de Falhas Assíncronas e Feedback ao Usuário (Requisito Obrigatório #2 do PDF):**
  1. O usuário emite a nota fiscal via Frontend/Gateway.
  2. O serviço de Estoque tenta debitar o saldo sob trava distribuída Redlock. Se o saldo for insuficiente, lança uma falha e publica o evento `AbatimentoEstoqueFalhouEvent` no RabbitMQ.
  3. O serviço de **Faturamento em Go** consome o evento e executa a **Transação Compensatória (Saga Pattern)**, alterando o status da nota no SQL Server de `"EmProcessamento"` para `"Cancelada"`.
  4. O **API Gateway** consome o mesmo evento via MassTransit e envia imediatamente uma notificação Push via **SignalR WebSocket (`/hubs/notificacoes`)** para a interface do usuário Angular exibir o alerta em tempo real.

---

### 4. Caso a implementação utilize C#, indicar se foi utilizado LINQ e de que forma:
**SIM**, o LINQ foi utilizado em 4 cenários vitais:
1. **Prevenção de Deadlock (Redlock):** `message.Itens.OrderBy(i => i.CodigoProduto)` ordenando as chaves de trava alfabeticamente antes da aquisição do Redlock.
2. **Filtros Dinâmicos de Busca:** `Where(p => p.Codigo.Contains(busca) || p.Descricao.Contains(busca))` na consulta de produtos no EF Core.
3. **Projeções de Mapeamento DTO:** Expressões `.Select(...)` para conversão de entidades de domínio para DTOs de resposta.
4. **Validações de Existência:** `.AnyAsync(p => p.Codigo == codigo)` no repositório de produtos.

---

### 5. Quais ciclos de vida e bibliotecas serão utilizados no Frontend Angular?
- **Framework & Arquitetura:** Angular 17+ utilizando **Standalone Components**.
- **Ciclos de Vida:** `ngOnInit` para inicialização de inscrições e escuta de notificações SignalR; `ngOnDestroy` para encerramento limpo de conexões WebSocket e unsubscribes de Observables.
- **RxJS:** Uso intensivo de operadores (`switchMap`, `catchError`, `tap`, `shareReplay`) para gerenciamento reativo de chamadas HTTP, loading spinners e escuta de eventos.
- **Componentes Visuais:** Biblioteca de UI moderna (Angular Material / PrimeNG) para formulários reativos, tabelas e dialogs de alerta.
- **SignalR Client:** `@microsoft/signalr` para estabelecer conexão com o Hub do API Gateway (`/hubs/notificacoes`).

---

### 6. Requisitos Opcionais Implementados (Especificação PDF - Pág. 2)

- **a. Tratamento de Concorrência:** Implementado via **Redlock** distribuído (`RedisLockService`), garantindo que solicitações simultâneas de abatimento de saldo para o mesmo produto por notas diferentes sejam processadas sequencialmente sem *race conditions*.
- **c. Implementação de Idempotência:** Implementado via **Redis** (`RedisIdempotencyService`), gravando a chave `idempotency:{NotaFiscalId}` com TTL de 7 dias no consumidor C# para evitar débitos duplos em caso de reentrega de mensagens do RabbitMQ.

---

## 📊 Stack de Observabilidade Centralizada

O sistema possui uma stack completa de monitoramento, roteamento e auditoria:

| Ferramenta / Serviço | URL Local | Descrição |
| :--- | :--- | :--- |
| **API Gateway (YARP)** | [http://localhost:8080](http://localhost:8080) | Ponto único de entrada, roteamento HTTP e propagação de Correlation ID |
| **SignalR Hub WebSocket** | `ws://localhost:8080/hubs/notificacoes` | Canal de notificações em tempo real para o Frontend |
| **Swagger Faturamento (Go)** | [http://localhost:8082/swagger](http://localhost:8082/swagger) | Documentação interativa da API REST de Faturamento |
| **Swagger Estoque (C#)** | [http://localhost:8081/swagger](http://localhost:8081/swagger) | Documentação interativa da API REST de Estoque |
| **RabbitMQ Management** | [http://localhost:15672](http://localhost:15672) *(guest/guest)* | Dashboard de mensageria assíncrona, trocas e filas |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | Coleta e consulta de métricas de runtime do Gateway e Microsserviços |
| **Grafana Loki + Explore** | [http://localhost:3000](http://localhost:3000) *(admin/admin)* | Dashboard unificado de métricas e busca de logs estruturados em tempo real |

### 🔍 Rastreamento por `X-Correlation-ID` e `UUID` da Nota:
Todas as requisições que entram pelo Gateway recebem ou preservam um `X-Correlation-ID`. No Grafana Loki (aba **Explore** ➔ datasource **Loki**), utilize a consulta abaixo para rastrear o ciclo de vida completo de uma requisição:
```logql
{container=~"gateway-api|faturamento-api|estoque-api"} |= "SEU-CORRELATION-ID-OU-UUID"
```

---

## 🛠️ Como Executar o Projeto Localmente

### 1. Subir a Infraestrutura Completa via Docker Compose
Na raiz do repositório, execute:
```bash
docker compose up -d --build
```
Isso iniciará os 11 containers da solução com verificações de saúde (**`healthy`**):
- `gateway-api` (API Gateway YARP & SignalR - Porta `8080`)
- `faturamento-api` (Go - Porta `8082`)
- `estoque-api` (C# .NET 10 - Porta `8081`)
- `faturamento-db` (SQL Server 2022 - Porta `1433`)
- `estoque-db` (PostgreSQL 16 - Porta `5432`)
- `redis` (Redis Cache & Lock - Porta `6379`)
- `rabbitmq` (RabbitMQ AMQP `5672` | Painel `15672`)
- `prometheus` (Porta `9090`)
- `loki` (Grafana Loki - Porta `3100`)
- `promtail` (Coletor de Logs Docker)
- `grafana` (Grafana Dashboard - Porta `3000`)

---

### 2. Suíte de Testes Unitários
- **Testes do API Gateway & SignalR (C#):**
  ```bash
  dotnet test gateway-api/tests/Gateway.Tests.Unit/Gateway.Tests.Unit.csproj
  ```
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

- [x] **Épico 1:** Infraestrutura e DevOps (Docker Compose multi-stage, GitHub Actions CI)
- [x] **Épico 2:** Microsserviço de Estoque (C# .NET 10 - Clean Architecture, Redlock, Idempotência)
- [x] **Épico 3:** Microsserviço de Faturamento & Observabilidade (Go, GORM, RabbitMQ, Redis Fail-Fast, Prometheus, Grafana Loki, Saga Pattern)
- [x] **Épico 4:** API Gateway YARP, SignalR WebSockets & Correlation ID Middleware
- [ ] **Épico 5:** Frontend Angular 17+ (Standalone Components, RxJS, SignalR Client)
- [ ] **Épico 6:** Documentação Final e Gravação do Vídeo de Demonstração
