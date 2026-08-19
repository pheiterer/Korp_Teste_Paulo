# 📦 Korp_Teste_Paulo - Sistema de Emissão de Notas Fiscais e Gestão de Estoque

Este repositório contém a solução completa para o desafio técnico da **Korp**, desenvolvida em uma arquitetura de microsserviços poliglota altamente resiliente com **Angular 19+**, **C# (.NET 10)**, **Go (Golang)**, **YARP API Gateway**, **SignalR WebSockets**, **RabbitMQ**, **Redis**, **PostgreSQL** e **SQL Server**.

---

## 🏛️ Visão Geral da Arquitetura

O sistema foi desenhado seguindo os princípios de **Clean Architecture**, **Domain-Driven Design (DDD)**, **Event-Driven Architecture (EDA)**, **API Gateway Pattern**, **Saga Pattern (Transação Compensatória)** e **Observabilidade Distribuída**:

```
                                  ┌───────────────────────────┐
                                  │   Frontend Angular (Web)  │
                                  │   Porta 4200 (Nginx SPA)  │
                                  └─────────────┬─────────────┘
                                                │ (HTTP / WebSocket)
                                                ▼
                                  ┌───────────────────────────┐
                                  │  YARP API Gateway (C#)    │
                                  │  - SignalR Hub (WS)       │
                                  │  - Correlation ID         │
                                  │  Porta 8080               │
                                  └──────┬─────────────┬──────┘
                                         │             │
                                         ▼             ▼
┌──────────────────────────────────┐         ┌──────────────────────────────────┐
│  Microsserviço de Estoque (C#)   │         │  Microsserviço Faturamento (Go)  │
│  - Clean Architecture & DDD      │         │  - Gin Web Framework & GORM      │
│  - PostgreSQL 16 & Redis Cache   │         │  - SQL Server 2022 & Redis Cache │
│  - Redlock & Idempotência        │         │  - Fail-Fast Cache Pre-Validation│
│  Porta 8081 (Swagger)            │         │  Porta 8082 (Swagger)            │
└────────────────┬─────────────────┘         └────────────────┬─────────────────┘
                 │                                            │
                 └───────────────────┬────────────────────────┘
                                     │ (Eventos Assíncronos RabbitMQ / AMQP)
                                     ▼
                          ┌───────────────────────────┐
                          │   RabbitMQ (Mensageria)   │
                          │   AMQP 5672 | Painel 15672 │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │  Prometheus + Grafana     │
                          │  + Loki + Promtail        │
                          │  Porta 3000 / Porta 9090  │
                          └───────────────────────────┘
```

---

## 📋 Respostas ao Detalhamento Técnico (Especificação Korp - PDF)

Esta seção atende de forma explícita e aprofundada a todas as perguntas e requisitos do documento de especificação técnica do teste (`c_ou_go_+_angular.pdf`):

---

### 1. Quais ciclos de vida do Angular foram utilizados?

Na aplicação Frontend (desenvolvida com a versão mais recente do **Angular**, utilizando arquitetura moderna de **Standalone Components** e **Signals**):

- **`ngOnInit`**: Utilizado para inicializar o estado dos componentes visuais, disparar as cargas reativas de dados iniciais (`carregarNotas()`, `carregarProdutos()`), subscrever a eventos assíncronos e registrar a escuta de eventos push do **SignalR WebSocket**.
- **`ngOnDestroy` e `DestroyRef` (`takeUntilDestroyed`)**:
  - Utilizado no `SignalRService` para realizar o encerramento gracioso (*graceful shutdown*) da conexão WebSocket com o Hub do API Gateway (`stopConnection()`) quando o serviço for destruído.
  - Utilizado nos componentes de listagem e formulários através da injeção de `DestroyRef` combinada com o operador reativo moderno `takeUntilDestroyed(this.destroyRef)` do Angular, garantindo o cancelamento automático de subscrições aos Observables do RxJS e prevenindo vazamentos de memória (*memory leaks*).
- **Angular Signals & Modern Control Flow**: A aplicação adota a nova reatividade de alta performance do Angular com `signal()`, `computed()` e a sintaxe declarativa de fluxo de controle `@if`, `@for (track item.id)` e `@else`, eliminando a necessidade de diretivas legadas (`*ngIf`, `*ngFor`) e otimizando a detecção de mudanças.

---

### 2. Se foi feito uso da biblioteca RxJS e, em caso afirmativo, como?

**SIM**, a biblioteca **RxJS** foi utilizada de forma extensiva e estratégica em todo o ciclo de comunicação reativa do frontend:

- **Desacoplamento de Eventos em Tempo Real (`Subject` e `Observable`)**: No `SignalRService`, foram criados instâncias privadas de `Subject<T>` (`notaFiscalAbatidaSubject` e `abatimentoEstoqueFalhouSubject`) expostas publicamente como Observables somente leitura (`notaFiscalAbatida$` e `abatimentoEstoqueFalhou$`), desacoplando a camada de transporte de rede WebSocket dos componentes visuais da interface.
- **Tratamento Centralizado de Erros (`catchError` e `throwError`)**: Utilizado no `errorInterceptor` global para interceptar respostas HTTP com falha (`HttpErrorResponse`), desmembrar contratos RFC 7807 (`ProblemDetails` e `ValidationProblemDetails`), extrair o `X-Correlation-ID` e propagar a notificação amigável para o `ToastService`.
- **Transformação e Normalização de Dados (`tap` e `map`)**: Utilizado nos serviços `NotaFiscalService` e `ProdutoService` para interceptar as respostas da API de Faturamento em Go (que encapsula os dados em envelopes `{ success: true, data: [...] }`) e unificar a conversão transparente entre propriedades em `snake_case` e `camelCase`.
- **Gerenciamento do Ciclo de Vida Reativo (`takeUntilDestroyed`)**: Aplicado nos pipes de subscrição dos componentes para desinscrever automaticamente dos fluxos assim que o componente for destruído.

---

### 3. Quais outras bibliotecas foram utilizadas e para qual finalidade?

#### No Frontend (Angular):
1. **`@microsoft/signalr` (^10.0.11)**: Cliente oficial de WebSockets do ASP.NET Core SignalR para estabelecer conexão full-duplex e persistente com o API Gateway (`ws://localhost:8080/hubs/notificacoes`), fornecendo reconexão automática resiliente com *exponential backoff* (`[0, 2000, 5000, 10000, 30000] ms`).
2. **`lucide-angular` / `@lucide/angular`**: Biblioteca de ícones vetoriais SVG leves, consistentes e modernos, utilizada em toda a interface (Navbar, Cards, Tabelas de Produtos e Notas, Badges de Status e Toasts).
3. **`@angular/forms` (`ReactiveFormsModule`, `FormBuilder`, `FormArray`, `Validators`)**: Construção de formulários reativos tipados, validações instantâneas de campos obrigatórios e criação dinâmica de múltiplos itens com quantidades em uma mesma nota fiscal através do `FormArray`.
4. **`@angular/router`**: Gerenciamento de navegação cliente (SPA) com rotas standalone e lazy loading.
5. **`@angular/common`**: Diretivas e pipes de formatação monetária brasileira (`CurrencyPipe` para `BRL R$`), formatação de texto e datas.
6. **`vitest` & `jsdom`**: Framework moderno de testes unitários ultrarrápido configurado para a validação da camada de componentes e serviços do frontend.

#### No Backend & Infraestrutura:
- **`MassTransit.RabbitMQ` & `amqp091-go`**: Orquestração e publicação de mensagens e eventos orientados a domínio no RabbitMQ.
- **`StackExchange.Redis` & `RedLock.net`**: Controle de travas distribuídas e controle de concorrência.
- **`go-redis/v9`**: Cliente de cache de alta performance no Go para validação *Fail-Fast* de produtos.
- **`FluentValidation`**: Validação de contratos e regras de negócio com retorno RFC 7807.
- **`Yarp.ReverseProxy`**: API Gateway de alta performance para proxy reverso e injeção de cabeçalhos distribuídos.
- **`prometheus-net` & `client_golang`**: Exportadores de métricas de runtime para Prometheus.
- **`Serilog` & `log/slog`**: Logging estruturado em formato JSON para envio ao Grafana Loki.

---

### 4. Para componentes visuais, quais bibliotecas foram utilizadas?

- **Design System Customizado em SCSS com Glassmorphism Moderno**:
  - Em vez de utilizar bibliotecas de componentes genéricas e pesadas, foi desenvolvido um **Design System proprietário e completo em SCSS**, alinhado com a identidade visual e as cores oficiais da **KORP ERP**:
    - **Vermelho Primário KORP:** `#E60039`
    - **Azul Marinho Corporativo:** `#1E3A52`
    - **Aço Cerúleo:** `#6B93B1`
    - **Grafite Sofisticado:** `#36383A`
  - **Efeitos Visuais de Alto Padrão:** Efeito *Glassmorphism* com `backdrop-filter: blur(12px)`, bordas translúcidas, sombras suaves e micro-animações interativas de hover e loading (`mini-spinner`).
  - **Modo Claro (Light Mode) e Modo Escuro (Dark Mode):** Suporte nativo com persistência de preferências em `localStorage` e alternância suave no Navbar via `ThemeService`.
  - **Componentes Visuais Modulares:**
    - *Dashboard de KPIs*: Contadores estatísticos com atualização em tempo real de produtos e faturamento.
    - *Formulários em Cards*: Inclusão intuitiva de múltiplos itens com totalizadores em tempo real e desativação inteligente de produtos já adicionados.
    - *Tabelas Responsivas com Expansão*: Exibição de notas fiscais com linhas sanfonadas para detalhamento dos itens, cálculo de subtotais e badges de status coloridos.
    - *Sistema Central de Toasts (`ToastService` / `ToastContainerComponent`)*: Notificações push flutuantes para sucesso, aviso, erro de validação e alertas de transação compensatória com exibição do Correlation ID.

---

### 5. Como foi realizado o gerenciamento de dependências no Golang?

O gerenciamento de dependências no microsserviço de **Faturamento** foi realizado através do **Go Modules** (`go.mod` e `go.sum`):
- O arquivo `go.mod` declara o módulo (`faturamento-api`), a versão alvo do Go (`go 1.24`) e todas as dependências diretas e indiretas com hashes criptográficos imutáveis registrados no `go.sum`.
- Permite compilação determinística e builds reproduzíveis em múltiplos estágios dentro do container Docker (`golang:1.24-alpine` para compilação e `alpine:latest` para produção, gerando imagens com menos de 30 MB).
- Comandos utilizados no ciclo de desenvolvimento: `go mod tidy`, `go mod download` e `go test ./...`.

---

### 6. Quais frameworks foram utilizados no Golang ou C#?

#### 🌐 API Gateway (C# .NET 10):
- **YARP (Yet Another Reverse Proxy - `Yarp.ReverseProxy` 2.3.0)**: Roteamento inteligente de requisições, balanceamento e propagação do cabeçalho `X-Correlation-ID`.
- **ASP.NET Core SignalR (`Microsoft.AspNetCore.SignalR`)**: Servidor de WebSockets para notificações push em tempo real para o Frontend.
- **MassTransit 8.3.6 (`MassTransit.RabbitMQ`)**: Consumo de eventos de integração do RabbitMQ e disparo imediato de notificações no Hub SignalR.

#### 🔵 Microsserviço de Estoque (C# .NET 10):
- **ASP.NET Core 10 Web API**: Framework base de desenvolvimento de APIs REST de alto desempenho.
- **Entity Framework Core 10 (`Npgsql.EntityFrameworkCore.PostgreSQL`)**: ORM de persistência no PostgreSQL com suporte a Migrations automáticas na inicialização.
- **MassTransit 8.3.6**: Consumo assíncrono do evento `NotaFiscalEmitidaEvent` e publicação de eventos de sucesso (`NotaFiscalAbatidaEvent`) ou falha (`AbatimentoEstoqueFalhouEvent`).
- **StackExchange.Redis & RedLock.net 2.3.2**: Gerenciamento de trava distribuída (*Distributed Lock*) e controle de idempotência.
- **FluentValidation 12**: Validação de regras e contratos de entrada.
- **NetArchTest.Rules**: *Fitness Functions* automatizadas garantindo os limites arquiteturais do DDD e Clean Architecture.

#### 🟢 Microsserviço de Faturamento (Golang):
- **Gin Web Framework (`github.com/gin-gonic/gin`)**: Roteador HTTP de alta performance e middlewares REST.
- **GORM (`gorm.io/gorm` com `gorm.io/driver/sqlserver`)**: ORM para mapeamento objeto-relacional e persistência no banco de dados **SQL Server 2022**.
- **RabbitMQ AMQP 0-9-1 Client (`github.com/rabbitmq/amqp091-go`)**: Publicação de notas fiscais emitidas e consumo de eventos de resposta (Saga compensatória).
- **Go-Redis Client (`github.com/redis/go-redis/v9`)**: Cache distribuído para validação rápida (*Fail-Fast*) de produtos.
- **Swaggo (`swaggo/swag` & `gin-swagger`)**: Geração automática de documentação Swagger / OpenAPI interativa.

---

### 7. Como foram tratados os erros e exceções no backend?

A solução adota uma estratégia em camadas para tratamento de erros síncronos e assíncronos:

#### Tratamento Síncrono (HTTP REST):
- **No C# (Estoque e Gateway)**:
  - **`ExceptionHandlingMiddleware`**: Intercepta exceções globais não tratadas e formata a resposta no padrão **RFC 7807** (`ProblemDetails` com código de status HTTP 500).
  - **FluentValidation + `ValidationProblemDetails`**: Se o payload de cadastro de produto contiver dados inválidos (ex: código vazio, descrição longa ou saldo negativo), retorna imediatamente `HTTP 400 Bad Request` com a lista estruturada de erros por campo.
- **No Golang (Faturamento)**:
  - **Tratamento Idiomático Explícito**: Todo ponto crítico valida retornos com `if err != nil`, logando com `slog` em JSON estruturado e devolvendo envelopes `{ "success": false, "error": { "code": "...", "message": "..." } }`.
  - **Fail-Fast Cache Pre-Validation**: Antes de abrir transação no SQL Server para criar a nota fiscal, o serviço consulta o Redis (`produto:codigo:{codigo}`). Caso o produto não exista no catálogo, o Faturamento rejeita a requisição imediatamente com `HTTP 400 Bad Request` em sub-milissegundos.

#### Tratamento de Falhas Assíncronas e Resiliência (Requisito Obrigatório #2 do PDF):
1. **Cenário de Falha de Negócio (Saldo Insuficiente de Estoque)**:
   - O usuário clica em "Imprimir Nota" no frontend Angular. O Faturamento altera o status da nota de `"Aberta"` para `"EmProcessamento"` e publica o evento `NotaFiscalEmitidaEvent` no RabbitMQ.
   - O Microsserviço de Estoque consome o evento e adquire uma trava distribuída Redlock.
   - Ao verificar o banco de dados PostgreSQL, detecta que o saldo é insuficiente para atender à nota.
   - O Estoque aborta a transação, libera a trava e publica o evento **`AbatimentoEstoqueFalhouEvent`** na fila de falhas do RabbitMQ.
   - O serviço de Faturamento consome este evento e executa a **Transação Compensatória (Saga Pattern)**, alterando o status da nota fiscal no SQL Server de `"EmProcessamento"` para `"Cancelada"`.
   - Simultaneamente, o **API Gateway** consome o evento no RabbitMQ e envia um push via **SignalR WebSocket (`/hubs/notificacoes`)** diretamente para a interface do Angular, que exibe um Toast de erro em vermelho detalhando o motivo da falha.
2. **Cenário de Queda de Infraestrutura (Microsserviço de Estoque Indisponível)**:
   - Caso o container `estoque-api` esteja offline ou reiniciando no momento da emissão, a mensagem permanece armazenada de forma segura e durável nas filas persistentes do **RabbitMQ**.
   - Assim que o serviço de Estoque volta a ficar ativo, a mensagem é consumida com garantia de entrega e processada normalmente, sem perda de dados e respeitando a trava de idempotência.

---

### 8. Caso a implementação utilize C#, indicar se foi utilizado LINQ e de que forma:

**SIM**, o LINQ (*Language Integrated Query*) foi utilizado amplamente no microsserviço de Estoque em 5 cenários indispensáveis:

1. **Prevenção de Deadlock na Trava Distribuída (Redlock)**:
   ```csharp
   var produtosOrdenados = message.Itens
       .OrderBy(i => i.CodigoProduto)
       .ToList();
   ```
   *Garante que múltiplas threads e nós distribuídos sempre adquiram os locks na mesma ordem alfabética de chave, prevenindo travamentos mútuos (deadlocks).*
2. **Agrupamento e Agregação de Quantidades por Produto**:
   ```csharp
   var quantidadesPorProduto = message.Itens
       .GroupBy(i => i.CodigoProduto)
       .ToDictionary(g => g.Key, g => g.Sum(x => x.Quantidade));
   ```
   *Consolida itens repetidos da mesma nota somando suas quantidades para realizar um único débito atômico por produto.*
3. **Filtros Dinâmicos de Consulta no EF Core**:
   ```csharp
   query = query.Where(p => p.Codigo.Contains(busca) || p.Descricao.Contains(busca));
   ```
4. **Projeções de Mapeamento DTO**:
   ```csharp
   var dtos = await query
       .Select(p => new ProdutoResponseDto(p.Codigo, p.Descricao, p.Saldo))
       .ToListAsync(cancellationToken);
   ```
5. **Validações Assíncronas de Existência**:
   ```csharp
   var existe = await _context.Produtos.AnyAsync(p => p.Codigo == codigo, cancellationToken);
   ```

---

## 🌟 Requisitos Opcionais Implementados (Especificação PDF - Pág. 2)

- **a. Tratamento de Concorrência**:
  - Implementado através do algoritmo de **Distributed Lock (Redlock)** sobre o Redis (`RedisLockService`).
  - No cenário onde duas notas fiscais tentam abater simultaneamente o saldo de um produto com apenas 1 unidade em estoque, o Redlock força a execução sequencial estrita. A primeira nota adquire o lock, debita o saldo (reduzindo a 0) e conclui com sucesso. A segunda nota, ao adquirir o lock em seguida, detecta saldo insuficiente (0 < 1), falha de forma graciosa e aciona a Saga Compensatória (`Cancelada`).
- **c. Implementação de Idempotência**:
  - Implementado via **Redis** (`RedisIdempotencyService`), gravando a chave `idempotency:nota:{NotaFiscalId}` com TTL de 7 dias.
  - Impede que mensagens reentregues pelo RabbitMQ em virtude de reinicializações ou quedas de rede debitem o estoque de uma mesma nota fiscal mais de uma vez.

---

## 📊 Stack de Observabilidade e Acesso aos Serviços

O sistema possui uma stack completa e unificada de monitoramento, roteamento e auditoria:

| Serviço / Aplicação | URL Local | Descrição |
| :--- | :--- | :--- |
| **Frontend Angular (Web)** | [http://localhost:4200](http://localhost:4200) | Interface SPA com Dashboard, Produtos, Notas Fiscais e Modo Escuro |
| **API Gateway (YARP)** | [http://localhost:8080](http://localhost:8080) | Ponto único de entrada, roteamento HTTP e propagação de Correlation ID |
| **SignalR Hub WebSocket** | `ws://localhost:8080/hubs/notificacoes` | Canal bidirecional de notificações em tempo real para o Frontend |
| **Swagger Faturamento (Go)** | [http://localhost:8082/swagger](http://localhost:8082/swagger) | Documentação interativa da API REST de Faturamento |
| **Swagger Estoque (C#)** | [http://localhost:8081/swagger](http://localhost:8081/swagger) | Documentação interativa da API REST de Estoque |
| **RabbitMQ Management** | [http://localhost:15672](http://localhost:15672) *(guest/guest)* | Dashboard de mensageria assíncrona, filas, exchanges e bindings |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | Coleta e consulta de métricas de runtime do Gateway e Microsserviços |
| **Grafana Loki + Explore** | [http://localhost:3000](http://localhost:3000) *(admin/admin)* | Dashboard unificado de métricas e busca de logs estruturados em tempo real |

### 🔍 Rastreamento Distribuído por `X-Correlation-ID` e `UUID`:
Todas as requisições que entram pelo Frontend recebem um `X-Correlation-ID` que é propagado pelo YARP Gateway e injetado nos logs e eventos do RabbitMQ. No Grafana Loki (aba **Explore** ➔ datasource **Loki**), execute a consulta abaixo para auditar o ciclo de vida completo de uma requisição entre todos os microsserviços:
```logql
{container=~"gateway-api|faturamento-api|estoque-api|frontend-web"} |= "SEU-CORRELATION-ID-OU-UUID"
```

---

## 🛠️ Como Executar o Projeto Localmente

### 1. Subir a Solução Completa via Docker Compose
Na raiz do repositório, execute:
```bash
docker compose up -d --build
```
Isso iniciará os 12 containers da solução com verificações de saúde automáticas (**`healthy`**):
- `frontend-web` (Angular 19+ SPA no Nginx Alpine - Porta `4200`)
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

### 2. Suíte de Testes Automatizados

- **Testes Unitários do Frontend (Angular):**
  ```bash
  cd frontend && npm test
  ```
- **Testes do API Gateway & SignalR (C#):**
  ```bash
  dotnet test gateway-api/tests/Gateway.Tests.Unit/Gateway.Tests.Unit.csproj
  ```
- **Testes em Go (Faturamento):**
  ```bash
  cd faturamento-api && go test ./...
  ```
- **Testes em C# (Estoque - Unitários e Fitness Functions):**
  ```bash
  dotnet test estoque-api/Estoque.slnx
  ```

---

### 🧪 Coleção do Postman Pronta para Uso
Arquivo na raiz: [`Korp_Teste_Paulo.postman_collection.json`](file:///home/pheit/Korp_Teste_Paulo/Korp_Teste_Paulo.postman_collection.json)

---

## 📝 Status do Projeto (Roadmap)

- [x] **Épico 1:** Infraestrutura e DevOps (Docker Compose multi-stage, GitHub Actions CI)
- [x] **Épico 2:** Microsserviço de Estoque (C# .NET 10 - Clean Architecture, Redlock, Idempotência, Fitness Functions)
- [x] **Épico 3:** Microsserviço de Faturamento & Observabilidade (Go, GORM, RabbitMQ, Redis Fail-Fast, Prometheus, Grafana Loki, Saga Pattern)
- [x] **Épico 4:** API Gateway YARP, SignalR WebSockets & Correlation ID Middleware
- [x] **Épico 5:** Frontend Angular 19+ (Standalone Components, RxJS, SignalR Client, Design System KORP, Dark Mode)
- [ ] **Épico 7:** Infraestrutura Avançada, Observabilidade e Testes de Carga (Grafana Loki, Dashboards de KPIs Automatizados & Grafana k6)
- [ ] **Épico 6:** Documentação Final e Gravação do Vídeo de Demonstração
