# Planejamento do Projeto (Épicos e Issues)

## Épico 1: Infraestrutura e DevOps (Base)

### Issue 1: Configuração do Ambiente Local (Docker Compose) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Criar a infraestrutura base de containers necessária para rodar todos os serviços locais.
- **Stack:** Docker.
- **Tarefas:**
  - [x] Criar arquivo `docker-compose.yml`.
  - [x] Adicionar container do PostgreSQL (Banco do Serviço de Estoque).
  - [x] Adicionar container do SQL Server (Banco do Serviço de Faturamento).
  - [x] Adicionar container do RabbitMQ (Mensageria para comunicação assíncrona).
  - [x] Adicionar container do Redis (Cache e controle de concorrência).
  - [x] Adicionar containers do Prometheus e Grafana (Observabilidade).
- **Critério de Aceite:** O comando `docker-compose up -d` deve subir todos os serviços sem erros de porta ou rede.

### Issue 2: Automação de CI Poliglota (GitHub Actions) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Configurar o pipeline de CI/CD para garantir a validação e o build dos três projetos (Angular, C# e Go) a cada nova integração.
- **Stack:** GitHub Actions, .NET CLI, Node.js, Go.
- **Tarefas:**
  - [x] Criar o workflow em `.github/workflows/ci.yml`.
  - [x] **Step Angular:** Configurar o setup do Node.js, rodar `npm install` e `npm run build` na pasta do frontend.
  - [x] **Step C# (Estoque):** Configurar o setup do .NET 10, rodar `dotnet restore` e `dotnet build` na pasta da API de Estoque.
  - [x] **Step Go (Faturamento):** Configurar o setup do Go (ação `actions/setup-go`), rodar `go mod download`, `go build` e `go test` na pasta da API de Faturamento.
- **Critério de Aceite:** O pipeline deve executar com sucesso os três ambientes em paralelo (ou em sequência) a cada push ou Pull Request na branch `main`.

---

## Épico 2: Microsserviço de Estoque (Gestão de Produtos)

### Issue 3: Setup do Projeto, Arquitetura Limpa e Fitness Functions (Estoque) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Inicializar a Web API do Serviço de Estoque utilizando os princípios de Clean Architecture (DDD), configurando a estrutura de camadas, logs estruturados, documentação OpenAPI/Swagger, testes unitários e testes de aptidão arquitetural (Fitness Functions).
- **Stack:** C# .NET 10, xUnit, NetArchTest.Rules, Moq/NSubstitute, FluentAssertions, Serilog, Swashbuckle.
- **Tarefas:**
  - [x] **Estrutura de Solução & Arquitetura Limpa:**
    - Criar a solução `Estoque.sln` e os projetos de classe/API desacoplados:
      - `Estoque.Domain` (Entidades, Interfaces de Repositório, Validações de Negócio - *zero dependências externas*).
      - `Estoque.Application` (Casos de Uso/Services, DTOs, Interfaces - depende apenas do `Domain`).
      - `Estoque.Infrastructure` (Persistência EF Core, Implementações de Repositório, Comunicação Externa - depende do `Application` e `Domain`).
      - `Estoque.API` (Controllers/Endpoints, Middlewares, Injeção de Dependência - ponto de entrada da aplicação).
      - `Estoque.Tests.Unit` (Projeto de testes unitários para Application e Domain).
      - `Estoque.Tests.Architecture` (Projeto de testes de arquitetura e Fitness Functions).
  - [x] **Fitness Functions (Validação Arquitetural Automatizada):**
    - Configurar pacote `NetArchTest.Rules` no projeto `Estoque.Tests.Architecture`.
    - Escrever testes de aptidão arquitetural para garantir regras de dependência rígidas:
      - `Domain` não deve ter dependência de nenhuma outra camada (`Application`, `Infrastructure`, `API`).
      - `Application` não deve depender da camada de `Infrastructure` ou `API`.
      - Interfaces de repositório devem residir em `Domain` ou `Application` e suas implementações exclusivamente em `Infrastructure`.
      - Controllers na `API` devem interagir apenas através dos serviços da `Application`.
  - [x] **Setup de Testes Unitários:**
    - Criar o projeto `Estoque.Tests.Unit` utilizando `xUnit`, `FluentAssertions` e `Moq` (ou `NSubstitute`).
    - Configurar a estrutura básica para testes de unidade de regras de domínio e casos de uso da aplicação.
  - [x] **Observabilidade & Boas Práticas:**
    - Configurar o **Serilog** para geração de logs estruturados (Console e Arquivo JSON) com enriquecimento de metadados e suporte a `CorrelationId`.
    - Configurar o **Swagger / OpenAPI** com documentação interativa da API e comentários XML.
    - Configurar o container nativo de **Injeção de Dependência** (`IServiceCollection`) promovendo desacoplamento de interfaces e Inversão de Controle (`IoC`).

### Issue 4: Domínio e Persistência de Produtos (Estoque) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Modelar a entidade de Produto e configurar o banco de dados.
- **Stack:** EF Core, PostgreSQL.
- **Tarefas:**
  - [x] Criar a entidade `Produto` com Código, Descrição e Saldo.
  - [x] Configurar o mapeamento do EF Core (Fluent API).
  - [x] Gerar e aplicar as Migrations no PostgreSQL.
- **Critério de Aceite:** Tabela de produtos criada com sucesso no banco de dados.

### Issue 5: Endpoints REST e Regras de Negócio (Estoque) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Implementar os casos de uso para o cadastro e consulta de produtos.
- **Stack:** C# .NET 10, LINQ, FluentValidation.
- **Tarefas:**
  - [x] Criar endpoint `POST /api/produtos` para Cadastro de Produtos.
  - [x] Criar endpoint `GET /api/produtos` para listagem com suporte a filtros via querystring (`?busca=...`).
  - [x] Instalar a biblioteca FluentValidation (`FluentValidation.DependencyInjectionExtensions`) via NuGet.
  - [x] Criar a classe `CreateProdutoRequestValidator` para garantir as regras: Código (obrigatório, max 50), Descrição (obrigatória, max 200) e Saldo (obrigatório e não pode ser negativo).
  - [x] Integrar o FluentValidation ao pipeline de requisições para retornar erro `400 Bad Request` com `ValidationProblemDetails` caso o payload seja inválido.
  - [x] Utilizar LINQ extensivamente nas consultas ao banco para posterior documentação.
  - [x] Implementar middleware global de tratamento de erros (*Exception Handling Middleware*) para padronizar as respostas de falha em formato RFC 7807 (`ProblemDetails` e `ValidationProblemDetails`).
  - [x] Configurar aplicação automática das EF Core Migrations (`Database.MigrateAsync()`) na inicialização da aplicação (`Program.cs`) para resiliência no Docker.
  - [x] Ajustar resolução de DNS de rede Docker (`ConnectionStrings__DefaultConnection`) no `docker-compose.yml` para comunicação container-to-container (`Host=postgres`).
  - [x] Criar e atualizar o arquivo de testes de requisições HTTP (`Estoque.API.http`) com exemplos práticos de requisições e validação.



### Issue 6: Tratamento de Concorrência e Mensageria (Estoque) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Preparar o serviço para deduzir saldos de forma segura e assíncrona, garantindo resiliência, idempotência e controle de concorrência distribuída.
- **Stack:** MassTransit (RabbitMQ), StackExchange.Redis (RedLock.net), EF Core (PostgreSQL).
- **Tarefas:**
  - [x] Instalar e configurar pacotes NuGet do MassTransit (`MassTransit.RabbitMQ`) e Redis (`RedLock.net` e `StackExchange.Redis`).
  - [x] Configurar Consumer `NotaFiscalEmitidaConsumer` no MassTransit para processar o evento `NotaFiscalEmitidaEvent`.
  - [x] Implementar verificação de idempotência no consumidor (utilizando o Redis para registrar `IdempotencyKey:NotaFiscalId`) impedindo o reprocessamento de mensagens duplicadas.
  - [x] Implementar Distributed Lock com Redis (padrão Redlock com `WaitTime` e `ExpiryTime`) por produto (`lock:produto:{id}`) para garantir controle de concorrência em débitos simultâneos.
  - [x] Executar a atualização de saldo de múltiplos itens da nota de forma atômica dentro de uma transação de banco de dados (`IDbContextTransaction`).
  - [x] Configurar política de resiliência e retry com *Exponential Backoff* no MassTransit.
  - [x] Em caso de falha definitiva no débito de estoque (ex: saldo insuficiente), redirecionar a mensagem para a fila de erro (`_error`) e publicar o evento `AbatimentoEstoqueFalhouEvent` para acionar a saga compensatória.

### Issue 6.1: Observabilidade, Health Checks e Correlation ID (Estoque) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Implementar o monitoramento de saúde abrangente (PostgreSQL, Redis e RabbitMQ), métricas Prometheus e rastreabilidade distribuída via Correlation ID no microsserviço de Estoque.
- **Stack:** C# .NET 10, Microsoft.Extensions.Diagnostics.HealthChecks, HealthChecks.NpgSql, HealthChecks.Redis, HealthChecks.RabbitMQ, Serilog, prometheus-net.
- **Tarefas:**
  - [x] Configurar Health Checks nativos para PostgreSQL, Redis e RabbitMQ expostos no endpoint `/health` com resposta JSON detalhada (`UIResponseWriter`).
  - [x] Criar o `CorrelationIdMiddleware` para interceptar requisições HTTP, gerenciar o cabeçalho `X-Correlation-ID` e enriquecer o `LogContext` do Serilog.
  - [x] Configurar o MassTransit para propagar e registrar o `CorrelationId` durante a publicação e consumo de mensagens do RabbitMQ.
  - [x] Adicionar o middleware de métricas do Prometheus (`prometheus-net.AspNetCore`) exposto em `/metrics`.

---

## Épico 3: Microsserviço de Faturamento / Nota Fiscal (Go / Golang)

### Issue 7: Setup e Estrutura Base (Faturamento - Go) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Inicializar a API REST de Faturamento utilizando Go.
- **Stack:** Go (Golang), Gin, GORM, testify.
- **Tarefas:**
  - [x] Inicializar o projeto executando `go mod init faturamento-api` para controle de dependências, garantindo o requisito de detalhamento técnico.
  - [x] Estruturar o projeto seguindo o padrão de pastas da comunidade Go (`/cmd`, `/internal/domain`, `/internal/handlers`).
  - [x] Configurar o framework web Gin para roteamento REST e middleware global de tratamento de erros.
  - [x] Configurar o pacote de logs estruturados nativo `log/slog` (formato JSON).
  - [x] Implementar o tratamento explícito de erros nativo do Go (`if err != nil`) nos handlers, padronizando o retorno das exceções em JSON.
  - [x] Configurar tags de struct do GORM para mapeamento explícito de tipos de dados compatíveis com o SQL Server (ex: IDs e inteiros `type:bigint`, decimais `type:decimal(18,2)`).
  - [x] Criar testes unitários para a struct de domínio (`domain/nota_fiscal_test.go`) e para os handlers HTTP (`handlers/health_test.go`) usando o pacote `testing` e a biblioteca `testify/assert`.


### Issue 8: Domínio, Persistência e Swagger (Faturamento - Go)
- **Descrição:** Implementar a entidade de Nota Fiscal e conectar ao SQL Server.
- **Stack:** Go, GORM, SQL Server, Swaggo.
- **Tarefas:**
  - [x] Criar as structs referentes à `NotaFiscal` (Numeração, Status Aberta/Fechada) e `NotaFiscalItem`.
  - [x] Configurar a conexão com o SQL Server utilizando o ORM GORM (`gorm.io/driver/sqlserver`).
  - [x] Integrar a biblioteca Swaggo (`swaggo/swag`) para gerar a documentação e visualização da API via Swagger.

### Issue 9: Impressão e Mensageria (Faturamento - Go) - [✅ Concluído]
- **Status:** ✅ Concluído (Máquina de Estados Assíncrona: Aberta ➔ EmProcessamento ➔ Fechada / Cancelada)
- **Descrição:** Construir a lógica de transição de estados da Nota Fiscal, envio de eventos para o RabbitMQ, pré-validação no Redis e confirmação/cancelamento assíncrono.
- **Stack:** Go, RabbitMQ (`amqp091-go`), Redis (`go-redis/v9`), C# (.NET 10).
- **Tarefas:**
  - [x] Criar os endpoints `POST /api/v1/notas-fiscais` e `GET /api/v1/notas-fiscais` para criação e listagem de Notas Fiscais com status inicial "Aberta".
  - [x] Sincronizar produtos no Redis (`produto:codigo:{codigo}`) com TTL sliding de 24h e pré-validar no Go rejeitando itens não cadastrados com HTTP `400 Bad Request`.
  - [x] Atualizar endpoint `POST /api/v1/notas-fiscais/:id/imprimir` para alterar status de "Aberta" ➔ "EmProcessamento" ao publicar no RabbitMQ.
  - [x] Implementar trava distribuída Redlock e verificação de Idempotência (7 dias) no consumidor C# (`NotaFiscalEmitidaConsumer`).
  - [x] Implementar confirmação no C# (`NotaFiscalAbatidaEvent`) e consumidor em Go para alterar de "EmProcessamento" ➔ "Fechada" em caso de sucesso.
  - [x] Implementar consumidor de falha em Go (`AbatimentoEstoqueFalhouEvent`) para alterar de "EmProcessamento" ➔ "Cancelada" em caso de erro no estoque (Transação Compensatória / Saga).

### Issue 9.1: Observabilidade, Correlation ID, Loki e Transação Compensatória (Faturamento - Go & Estoque - C#) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Implementar monitoramento de saúde, rastreabilidade ponta a ponta via Correlation ID/UUID, agregador de logs Grafana Loki + Promtail, healthchecks nativos no Docker Compose e resiliência via Saga Pattern (Transação Compensatória).
- **Stack:** Go (Golang), C# (.NET 10), `log/slog`, Serilog, RabbitMQ (`amqp091-go`), Redis, SQL Server, PostgreSQL, Prometheus, Grafana Loki, Promtail.
- **Tarefas:**
  - [x] Criar rotas `/health` em Go e C# realizando `Ping()` no SQL Server, PostgreSQL, Redis e RabbitMQ para monitoramento do sistema.
  - [x] Configurar `healthcheck` nativo no `docker-compose.yml` para os containers `faturamento-api` e `estoque-api` reportarem status `(healthy)` ao Docker.
  - [x] Implementar middleware de Correlation ID (`X-Correlation-ID`) para extração/geração automática, injeção nos logs de `slog` (Go) e Serilog (C#) e propagação nos eventos do RabbitMQ.
  - [x] Exportar métricas Prometheus (`/metrics`) via `promhttp` no Go e `prometheus-net` no C# para coleta de dados de execução HTTP e runtime.
  - [x] Corrigir raspagem do Prometheus apontando para as portas internas corretas dos containers (`estoque-api:8080` e `faturamento-api:8082`).
  - [x] Integrar Grafana Loki (`loki:3100`) e Promtail (`promtail`) no Docker Compose para agregação centralizada de logs dos containers Docker.
  - [x] Configurar provisionamento automático de fontes de dados no Grafana (`grafana/provisioning/datasources/` para Prometheus e Loki).
  - [x] Registrar o `uuid` da Nota Fiscal em todas as etapas da máquina de estados para rastreamento completo de ciclo de vida (criação ➔ emissão ➔ débito ➔ fechamento) no Grafana Loki.
  - [x] Padronizar Message Templates estruturados de logging no C# (`NotaFiscalEmitidaConsumer.cs`) para correlação de eventos com `{CorrelationId}` e `{NotaFiscalId}` no Loki.
  - [x] Configurar política de expiração (TTL de 24 horas) para o cache de produtos no Redis (`RedisProdutoCacheService.cs`).
  - [x] Criar consumidor em Go para a fila de falhas de estoque (`AbatimentoEstoqueFalhouEvent`) para executar a transação compensatória (alterar status da nota fiscal no SQL Server de "EmProcessamento" para "Cancelada").

---

## Épico 4: API Gateway e Comunicação em Tempo Real

### Issue 10: API Gateway (YARP) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Centralizar as chamadas do Frontend e unificar a entrada dos microsserviços de Estoque e Faturamento.
- **Stack:** YARP (Yet Another Reverse Proxy) no .NET 10.
- **Tarefas:**
  - [x] Criar projeto `gateway-api` em .NET 10 e instalar pacotes do YARP (`Yarp.ReverseProxy`), MassTransit (`MassTransit.RabbitMQ`), Serilog e Prometheus.
  - [x] Configurar rotas e clusters do YARP no `appsettings.json` para mapear:
    - `/api/produtos/{**catch-all}` ➔ `http://estoque-api:8080/api/produtos/{**catch-all}`
    - `/api/v1/notas-fiscais/{**catch-all}` e `/api/notas-fiscais/{**catch-all}` ➔ `http://faturamento-api:8082/api/v1/notas-fiscais/{**catch-all}`
    - `/health/estoque` e `/health/faturamento` ➔ endpoints de healthcheck dos microsserviços downstream.
  - [x] Criar `Dockerfile` multi-stage para a `gateway-api` e registrar o container no `docker-compose.yml` exposto na porta `8080`.
  - [x] Configurar exportação de métricas Prometheus (`/metrics`) e endpoint `/health` nativo do Gateway.

### Issue 11: Feedback de Falhas (SignalR) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Fornecer feedback assíncrono em tempo real ao usuário sobre o status das notas fiscais e falhas de estoque.
- **Stack:** SignalR & MassTransit (RabbitMQ).
- **Tarefas:**
  - [x] Configurar o `NotificationHub` no API Gateway exposto na rota `/hubs/notificacoes`.
  - [x] Configurar suporte a WebSockets e Session Affinity no YARP/ASP.NET Core para manter as conexões ativas.
  - [x] Criar consumidores de eventos MassTransit (`AbatimentoEstoqueFalhouConsumer` e `NotaFiscalAbatidaConsumer`) no Gateway para escutar o RabbitMQ.
  - [x] Notificar os clientes frontend conectados no SignalR Hub em tempo real quando ocorrer falha de saldo insuficiente ou sucesso no abatimento de estoque.

### Issue 11.1: Geração e Propagação de Correlation ID (API Gateway) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Garantir que todas as requisições de entrada recebam um Correlation ID para rastreamento distribuído fim a fim.
- **Stack:** YARP (.NET 10) Middleware & Transforms.
- **Tarefas:**
  - [x] Criar `CorrelationIdMiddleware` no YARP Gateway para extrair ou gerar um GUID único (`X-Correlation-ID`).
  - [x] Injetar o `CorrelationId` no contexto de log do Serilog e configurar YARP Transforms para propagar o cabeçalho `X-Correlation-ID` em todas as requisições HTTP downstream enviadas aos microsserviços.
  - [x] Desenvolver testes unitários para validar o middleware de Correlation ID e o fluxo de envio de notificações no SignalR.


---

## Épico 5: Frontend Angular

### Issue 12: Setup do Projeto, Arquitetura Standalone, Interceptors & SignalR Client - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Estruturar a aplicação cliente Angular 19+ utilizando Standalone Components, biblioteca visual, gerenciamento de serviços, interceptors HTTP globais (Correlation ID e Tratamento de Erros) e integração WebSocket com SignalR.
- **Stack:** Angular 19+ (Standalone Components), RxJS, `@microsoft/signalr`, Lucide Icons, SCSS Design System.
- **Tarefas:**
  - [x] Criar o projeto Angular standalone via Angular CLI na pasta `frontend` (`ng new` com roteamento e SCSS).
  - [x] Configurar biblioteca de componentes visuais, ícones e sistema de design SCSS para formulários, dialogs, snackbars, toasters e tabelas responsivas.
  - [x] Implementar o `CorrelationIdInterceptor` global no Angular para gerar/injetar o cabeçalho `X-Correlation-ID` (UUID v4) em todas as requisições HTTP enviadas ao API Gateway.
  - [x] Implementar o `ErrorInterceptor` global para capturar respostas no padrão `ProblemDetails` / `ValidationProblemDetails` (HTTP 400 Bad Request e 500 Internal Server Error) vindas do YARP Gateway e exibir alertas amigáveis para o usuário na interface.
  - [x] Criar o `SignalRService` injetável para gerenciar a conexão WebSocket com o API Gateway (`http://localhost:8080/hubs/notificacoes`), garantindo reconexão automática e limpeza de subscrições no ciclo de vida (`ngOnInit`/`ngOnDestroy`).

### Issue 13: Telas e Formulários Reativos (Produtos e Notas Fiscais) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Desenvolver as interfaces de formulários reativos para cadastro e visualização em tempo real de Produtos e Notas Fiscais, além do Dashboard gerencial.
- **Stack:** ReactiveFormsModule, FormBuilder, RxJS, SCSS Design System (Glassmorphism), Lucide/SVG Icons.
- **Tarefas:**
  - [x] Criar o componente `ProdutoCadastroComponent` (inputs validados de Código, Descrição e Saldo Inicial com sanitização numérica).
  - [x] Criar o componente `ProdutoListComponent` para exibição reativa da tabela de produtos e saldos atualizados de estoque.
  - [x] Criar o componente `NotaFiscalCadastroComponent` com formulário reativo flexível (`FormArray`) para permitir múltiplos itens na mesma nota fiscal.
  - [x] Integrar seleção dinâmica de produtos cadastrados (`GET /api/produtos`) no formulário de notas fiscais com sincronização em tempo real de saldos via SignalR.
  - [x] Garantir sincronização contínua entre o `FormControl` e o `<select>` do navegador, suportando cadastros consecutivos sem perda de seleção do produto.
  - [x] Criar o componente `NotaFiscalListComponent` para visualização das notas fiscais com badges de status (`Aberta`, `EmProcessamento`, `Fechada`, `Cancelada`) e expansão detalhada de itens.
  - [x] Criar o `DashboardComponent` com duas boards principais (Top 10 Produtos em estoque e Top 10 Notas Fiscais emitidas) com atualização reativa em tempo real.
  - [x] Implementar normalização de envelopes de resposta da API de Faturamento (`{ success: true, data: [...] }`) e suporte bidirecional a campos `snake_case` e `camelCase`.
  - [x] Implementar o `ThemeService` com suporte a Modo Claro (padrão) e Modo Escuro, aplicando a paleta oficial de valores da KORP ERP (Vermelho `#E60039`, Azul Marinho `#1E3A52`, Aço Cerúleo `#6B93B1` e Grafite `#36383A`), com botão de alternância suave no Navbar e persistência em `localStorage`.

### Issue 14: Tela de Impressão, Transições de Estado (Saga) e Reatividade em Tempo Real (SignalR & RxJS) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Implementar a ação de impressão/emissão de nota fiscal, controle de loading reativo, manipulação de streams com RxJS e consumo de eventos em tempo real via SignalR.
- **Stack:** RxJS (`switchMap`, `catchError`, `tap`, `takeUntilDestroyed`), `@microsoft/signalr`.
- **Tarefas:**
  - [x] Criar o botão "Imprimir Nota" acionando o endpoint `POST /api/v1/notas-fiscais/:id/imprimir` via YARP Gateway.
  - [x] Alterar o status da nota imediatamente para `"EmProcessamento"` na interface e ativar indicador de carregamento/spinner reativo.
  - [x] Utilizar operadores do RxJS (`switchMap`, `catchError`, `tap`, `takeUntilDestroyed`) para gerenciar as chamadas assíncronas e desinscrições no ciclo de vida.
  - [x] Escutar os eventos do `SignalRService`:
    - Evento `NotaFiscalAbatida`: Atualizar status da nota fiscal para `"Fechada"`, emitir alerta de sucesso e atualizar o saldo de estoque dos produtos na tabela e no formulário de cadastro.
    - Evento `AbatimentoEstoqueFalhou`: Processar o retorno da Saga compensatória na UI, alterando o status da nota para `"Cancelada"` e exibindo Toast de erro detalhando o motivo (ex: Saldo Insuficiente).
  - [x] Eliminar emissões duplicadas de SignalR no API Gateway (`NotaFiscalAbatidaConsumer` e `AbatimentoEstoqueFalhouConsumer`), garantindo exatamente 1 notificação por evento.
  - [x] Aprimorar o `ErrorInterceptor` para traduzir e formatar amigavelmente erros de validação RFC 7807 (`ValidationProblemDetails`) do ASP.NET Core e erros de regras de negócio do Go.
  - [x] Corrigir self-deadlock de Redlock no `NotaFiscalEmitidaConsumer` do Estoque (C#) através de travamento em chaves distintas e agregação de quantidades por produto.
  - [x] Adicionar validação de unicidade de produtos por nota no backend (Go) e desativação visual automática no `<select>` do formulário para impedir inclusão de itens duplicados.
  - [x] Implementar extração resiliente de payload e persistência de status no consumidor do Faturamento (`consumer.go` em Go), garantindo a transição definitiva para `"Cancelada"` no banco SQL Server durante a Saga compensatória sem reversões na UI.
  - [x] Redesenhar o layout dos itens do formulário de Nota Fiscal em cards individuais com visualização completa dos produtos, espaçamento confortável e margens aprimoradas para botões e totalizadores.
  - [x] Formatar o rótulo de status de `"EmProcessamento"` para `"Em Processamento"` em todos os componentes visuais para aprimorar a experiência do usuário (UX).

### Issue 14.1: Containerização Docker (Nginx), Configuração de Ambiente e Health Check (Frontend) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Preparar a aplicação cliente Angular 19+ para rodar em container Docker multi-stage com Nginx Alpine otimizado, suporte a SPA, WebSockets para SignalR, cabeçalhos de cache e integração total ao ecossistema `docker-compose.yml`.
- **Stack:** Docker, Nginx Alpine, Angular CLI, Docker Compose.
- **Tarefas:**
  - [x] Criar o arquivo `Dockerfile` multi-stage (Stage 1: `node:20-alpine` para compilação; Stage 2: `nginx:alpine` para servir a aplicação).
  - [x] Criar a configuração `nginx.conf` pré-configurada para roteamento SPA (`try_files`), suporte a WebSockets/SignalR (`Upgrade`/`Connection`), compressão `gzip` e endpoint `/health`.
  - [x] Configurar os arquivos `environment.ts` e `environment.prod.ts` com o endpoint base do YARP API Gateway (`http://localhost:8080`).
  - [x] Adicionar o serviço `frontend-web` no `docker-compose.yml` exposto na porta `4200:80` com `healthcheck` nativo e dependência resiliente do `gateway-api`.

---

## Épico 7: Dashboards Automatizados (Grafana) e Testes de Carga (k6)

### Issue 15: Dashboard Automatizado no Grafana (KPIs de Saúde, Latência e Tempo de Processamento) - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Provisionar automaticamente no Grafana um Dashboard executivo/técnico pré-configurado contendo gráficos de tempo médio de resposta por requisição, vazão (RPS), taxa de erro (%), tempo de processamento de emissão/abatimento de Nota Fiscal e status de saúde dos microsserviços.
- **Stack:** Grafana Provisioning, Prometheus, Loki, JSON Dashboard Schema.
- **Tarefas:**
  - [x] Criar o provedor de dashboards `grafana/provisioning/dashboards/dashboards.yml`.
  - [x] Criar o arquivo JSON de dashboard `grafana/dashboards/kpi-health-dashboard.json` com painéis de:
    - Média de tempo de resposta por requisição (HTTP Latency - p50/p95/p99).
    - Vazão de requisições por segundo (RPS) por endpoint e microsserviço.
    - Taxa de Erros HTTP (4xx / 5xx).
    - Tempo total de processamento da Nota Fiscal (Ciclo de Vida da máquina de estados e mensageria).
    - Status de disponibilidade dos containers (`up`).
  - [x] Criar middleware de métricas no Faturamento em Go (`metrics.go`) para coletar `http_requests_received_total` e `http_request_duration_seconds` no mesmo padrão do C#.
  - [x] Implementar Tabela de Auditoria de Correlation ID com Data Links direto para o Explore no Grafana.
  - [x] Configurar o fluxo completo de Dead Letter Queue (`_error`), Fault Consumer no Gateway e conversor resiliente JSON (`TolerantIntConverter`) para garantir que mensagens com falhas críticas ou erros de payload cancelem a nota automaticamente e notifiquem o frontend via SignalR sem deixar o processo pendente.
  - [x] Atualizar o `docker/compose.observability.yml` montando os volumes do provedor e definições JSON de dashboards para carregamento automático ao iniciar o Grafana.

### Issue 16: Testes E2E Automatizados com Newman/Postman CLI e Detalhamento do Motivo de Cancelamento - [✅ Concluído]
- **Status:** ✅ Concluído
- **Descrição:** Desenvolver e integrar a suíte automatizada de testes E2E (End-to-End) cobrindo fluxos felizes, múltiplos itens por nota fiscal, transição de estado da Saga compensatória por falta de estoque e tratamento detalhado de erros por produto no backend (Go/SQL Server e C#/Postgres) e no frontend Angular.
- **Stack:** Newman CLI, Postman Collection, Go (GORM), C# (.NET 10), Angular 19 (Signals & Standalone Components).
- **Tarefas:**
  - [x] Criar a coleção Postman máster `tests/e2e/e2e_postman_collection.json` com 4 cenários de teste automatizados (Healthcheck, Múltiplos Itens, Cancelamento por Saga Compensatória e Validação de Erros de Negócio/HTTP 400).
  - [x] Criar o script de execução automatizado `scripts/run-e2e.sh` e o atalho `npm run test:e2e` utilizando o `newman` (35/35 asserções aprovadas com 100% de sucesso).
  - [x] Implementar a varredura e acúmulo de erros de estoque para múltiplos itens no consumidor C# (`NotaFiscalEmitidaConsumer`) e no backend Go (`faturamento-api`).
  - [x] Persistir a coluna `motivo_cancelamento` na tabela `notas_fiscais` do SQL Server via GORM AutoMigrate.
  - [x] Criar componente visual no Angular (`nota-fiscal-list.component`) com banner de alerta estilizado em vermelho exibindo os motivos de cancelamento formatados com marcadores (`•`), fonte monospaçada e espaçamento limpo.
  - [x] Atualizar a documentação Swagger e validar os logs estruturados no Grafana Loki.

### Issue 17: Testes de Carga, Estresse e Concorrência Distribuída com Grafana k6
- **Status:** ⏳ Pendente
- **Descrição:** Criar e executar scripts de teste de carga automatizados com **Grafana k6** para validar o desempenho dos microsserviços, a resiliência do API Gateway YARP, o controle de concorrência com Redlock e a idempotência do consumidor RabbitMQ, alimentando os gráficos do Grafana em tempo real.
- **Stack:** Grafana k6, JavaScript/ES6, Docker.
- **Tarefas:**
  - [ ] Criar a pasta `k6/` no repositório com scripts de teste de carga:
    - `k6/produtos-load-test.js`: Teste de carga e estresse nos endpoints REST de cadastro (`POST /api/produtos`) e consulta de produtos (`GET /api/produtos`).
    - `k6/faturamento-concurrency-test.js`: Teste de alta concorrência simulando múltiplas emissões e impressões simultâneas de notas fiscais (`POST /api/v1/notas-fiscais` e `/imprimir`) utilizando o mesmo produto com estoque limitado para validar o Redlock e a Saga compensatória.
  - [ ] Executar os testes de carga do k6 integrados ao ecossistema dockerizado para visualizar a alimentação dos dashboards do Grafana em tempo real e validar métricas de vazão (RPS), latência p95/p99 e taxa de erro.
  - [ ] Documentar os cenários de testes k6 e os resultados obtidos no relatório final da solução.

---

## Épico 8: Documentação e Entrega Final

### Issue 18: Relatório Técnico Final e Vídeo (Atualizada)
- **Status:** ⏳ Pendente
- **Descrição:** Criar o documento Markdown respondendo explicitamente aos novos requisitos inseridos pelo uso do Go e gravar o vídeo de demonstração.
- **Tarefas:**
  - Escrever o arquivo Markdown final respondendo explicitamente a todas as perguntas e requisitos:
    - Explicar como foi realizado o gerenciamento de dependências no Golang utilizando o `go mod`.
    - Detalhar como foram tratados os erros e exceções no backend em Go (`if err != nil`).
    - Manter as explicações sobre os ciclos de vida do Angular, bibliotecas visuais, RxJS e a utilização do LINQ no Serviço de Estoque em C#.
  - Gravar o vídeo demonstrando: Telas, Cadastro, Impressão, o Dashboard do Grafana, e a simulação de desligar o container do Estoque para mostrar a mensagem enfileirada e o sistema não caindo (Tratamento de Falhas).