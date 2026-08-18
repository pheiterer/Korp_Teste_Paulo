# 📦 Korp_Teste_Paulo - Sistema de Emissão de Notas Fiscais e Gestão de Estoque

Este repositório contém a solução completa para o teste técnico da Korp, desenvolvida em uma arquitetura de microsserviços poliglota com **C# (.NET 10)**, **Go (Golang)** e **Angular**.

---

## 🏛️ Visão Geral da Arquitetura

O sistema é composto pelos seguintes componentes principais:

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
│  - Clean Architecture & DDD      │         │  - GORM & SQL Server             │
│  - PostgreSQL & Redis            │         │  - Emissão de Notas Fiscais      │
└────────────────┬─────────────────┘         └────────────────┬─────────────────┘
                 │                                            │
                 └───────────────────┬────────────────────────┘
                                     │ (Eventos Assíncronos)
                                     ▼
                          ┌───────────────────────────┐
                          │   RabbitMQ (Mensageria)   │
                          └───────────────────────────┘
```

---

## 📋 Respostas ao Roteiro de Detalhamento Técnico (Especificação Korp - PDF)

Esta seção atende explicitamente às perguntas e requisitos do documento de especificação técnica do teste:

### 1. Quais frameworks foram utilizados no Golang ou C#?
- **Backend Estoque (C#):**
  - **Framework Web:** .NET 10 Web API (`Microsoft.AspNetCore.App`)
  - **ORM & Persistência:** Entity Framework Core 10 (`Npgsql.EntityFrameworkCore.PostgreSQL`)
  - **Mensageria Assíncrona:** MassTransit 8.3.6 (`MassTransit.RabbitMQ`)
  - **Cache & Distributed Lock:** StackExchange.Redis 3.1 & RedLock.net 2.3.2
  - **Validação de Contrato:** FluentValidation 12
  - **Observabilidade & Métricas:** Serilog 10, Microsoft Health Checks, prometheus-net.AspNetCore
- **Backend Faturamento (Golang - Épico 3):**
  - Framework Gin/Fiber, ORM GORM conectado ao SQL Server 2022.

### 2. Como foram tratados os erros e exceções no backend?
- Implementação do middleware global `ExceptionHandlingMiddleware` que intercepta exceções não tratadas e erros de validação do FluentValidation.
- Todas as falhas são formatadas estritamente no padrão internacional **RFC 7807** (`ValidationProblemDetails` e `ProblemDetails`), retornando `status`, `title`, `detail`, `instance` e um `traceId` único por requisição.
- Regras de negócio lançam `DomainException`, capturada de forma limpa pelo consumidor MassTransit para acionar eventos compensatórios (`AbatimentoEstoqueFalhouEvent`).

### 3. Caso a implementação utilize C#, indicar se foi utilizado LINQ e de que forma:
- **SIM**, o LINQ (Language Integrated Query) foi utilizado extensivamente no microsserviço de Estoque:
  1. **Ordenação Preventiva de Concorrência (Deadlock Prevention):** `message.Itens.OrderBy(i => i.CodigoProduto)` no `NotaFiscalEmitidaConsumer` para ordenar as travas do Redlock alfabeticamente.
  2. **Filtros Dinâmicos de Busca:** `Where(p => p.Codigo.Contains(busca) || p.Descricao.Contains(busca))` na consulta de produtos no `ProdutoRepository`.
  3. **Projeções de Mapeamento DTO:** Expressões LINQ `Select(...)` para conversão de entidades de domínio em objetos de resposta HTTP (`ProdutoResponse`).
  4. **Consultas de Validação:** `AnyAsync(p => p.Codigo == codigo)` no `ProdutoService` para verificar unicidade de código antes do cadastro.

### 4. Requisitos Opcionais Implementados (Atendendo ao PDF Korp - Pág. 2)
- **a. Tratamento de Concorrência:** Implementado via **Redlock** distribuído (`RedisLockService`), garantindo que se dois eventos tentarem utilizar o saldo de um mesmo produto simultaneamente, as operações sejam executadas de forma sequencial e segura.
- **c. Implementação de Idempotência:** Implementado via **Redis** (`RedisIdempotencyService`), onde a chave `idempotency:{NotaFiscalId}` é gravada com expiração de 7 dias, garantindo que o reprocessamento de mensagens duplicadas no RabbitMQ não cause débitos duplos.

---

## ⚡ Microsserviço de Estoque (`estoque-api`) - [✅ 100% Concluído]

O microsserviço de Estoque é responsável pela gestão de produtos, controle de saldos, tratamento de concorrência distribuída e processamento assíncrono de abatimento de estoque na emissão de notas fiscais.

### 📂 Estrutura de Arquitetura Limpa (Clean Architecture & DDD)

```
estoque-api/
├── src/
│   ├── Estoque.Domain/           # Core de Negócio (Entidades, Interfaces, DomainExceptions) [Zero dependências]
│   ├── Estoque.Application/      # Casos de Uso (Services, DTOs, Contracts, Validators)
│   ├── Estoque.Infrastructure/   # Implementação EF Core, Redlock, Redis Idempotency, MassTransit Consumers
│   └── Estoque.API/              # Endpoints REST, Middlewares (Correlation ID, Exceptions), Health & Metrics
└── tests/
    ├── Estoque.Tests.Unit/        # 27 Testes Unitários de Domínio, Aplicação, Consumidores e Middlewares
    └── Estoque.Tests.Architecture/# 3 Testes de Aptidão Arquitetural (Fitness Functions)
```

---

## 🛠️ Como Executar o Projeto Localmente

### 1. Subir a Infraestrutura via Docker Compose
Certifique-se de ter o Docker instalado e execute na raiz do repositório:
```bash
docker compose up -d --build
```
Isso inicializará os containers:
- `estoque-api` (Porta `8081`)
- `estoque-db` (PostgreSQL - Porta `5432`)
- `redis` (Porta `6379`)
- `rabbitmq` (AMQP `5672` | Painel `15672`)
- `faturamento-db` (SQL Server - Porta `1433`)
- `prometheus` (Porta `9090`)
- `grafana` (Porta `3000`)

---

### 2. Executar a Suíte de Testes (.NET)
Para executar todos os **27 testes unitários** e **3 testes de arquitetura**:
```bash
dotnet test estoque-api/Estoque.slnx
```

---

### 🧪 Coleção de Requisições do Postman
Foi disponibilizada uma coleção completa pronta para teste dos endpoints do microsserviço de Estoque:

📌 **Arquivo:** [`estoque-api/Estoque_Postman_Collection.json`](file:///home/pheit/Korp_Teste_Paulo/estoque-api/Estoque_Postman_Collection.json)

#### Endpoints Principais:
| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/health` | Health Check detalhado (PostgreSQL, Redis, RabbitMQ) |
| `GET` | `/metrics` | Métricas no formato Prometheus |
| `POST` | `/api/produtos` | Cadastro de produto (`codigo`, `descricao`, `saldoInicial`) |
| `GET` | `/api/produtos` | Listagem com busca opcional (`?busca=Parafuso`) |
| `GET` | `/api/produtos/codigo/{codigo}` | Consulta de produto por código |
| `GET` | `/api/produtos/{id}` | Consulta de produto por ID (GUID) |

---

## 📝 Status do Projeto (Roadmap)

- [x] **Épico 1:** Infraestrutura e DevOps (Docker Compose, GitHub Actions)
- [x] **Épico 2:** Microsserviço de Estoque (C# .NET 10 - Issues 3, 4, 5, 6 e 6.1 Concluídas)
- [ ] **Épico 3:** Microsserviço de Faturamento (Go / Golang - Próxima Etapa)
- [ ] **Épico 4:** API Gateway YARP
- [ ] **Épico 5:** Frontend Angular
