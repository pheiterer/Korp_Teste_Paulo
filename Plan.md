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
  - Criar as structs referentes à `NotaFiscal` (Numeração, Status Aberta/Fechada) e `NotaFiscalItem`.
  - Configurar a conexão com o SQL Server utilizando o ORM GORM (`gorm.io/driver/sqlserver`).
  - Integrar a biblioteca Swaggo (`swaggo/swag`) para gerar a documentação e visualização da API via Swagger.

### Issue 9: Impressão e Mensageria (Faturamento - Go)
- **Descrição:** Construir a lógica de finalização da nota e envio de eventos para o RabbitMQ.
- **Stack:** Go, RabbitMQ (`amqp091-go`).
- **Tarefas:**
  - Criar o endpoint para a criação da Nota Fiscal, definindo o Status inicial como "Aberta".
  - Criar o endpoint de Impressão, adicionando a validação para verificar se o status está "Aberta" antes de alterar para "Fechada" no banco.
  - Instalar e utilizar o pacote `amqp091-go` para publicar o evento `NotaFiscalEmitida` no RabbitMQ, delegando a responsabilidade de atualizar o saldo para o Serviço de Estoque (que roda em C#) de forma assíncrona, simulando o cenário de recuperação de falhas.

### Issue 9.1: Observabilidade, Correlation ID e Transação Compensatória (Faturamento - Go)
- **Descrição:** Implementar monitoramento de saúde, rastreabilidade ponta a ponta e resiliência via Saga Pattern (Transação Compensatória) em Go.
- **Stack:** Go (Golang), `log/slog`, RabbitMQ (`amqp091-go`), SQL Server.
- **Tarefas:**
  - Criar rota `/health` em Go realizando `Ping()` no SQL Server e no RabbitMQ para monitoramento pelo Prometheus.
  - Extrair o `X-Correlation-ID` do cabeçalho da requisição HTTP, incluir nos logs de `slog` e injetar nos metadados do evento publicado no RabbitMQ.
  - Criar um consumer em Go para a fila de falhas de estoque (`AbatimentoEstoqueFalhouEvent`) para executar a transação compensatória (alterar status da nota fiscal no SQL Server de "Fechada" para "Cancelada/Erro").

---

## Épico 4: API Gateway e Comunicação em Tempo Real

### Issue 10: API Gateway (YARP)
- **Descrição:** Centralizar as chamadas do Frontend.
- **Stack:** YARP (Yet Another Reverse Proxy) no .NET.
- **Tarefas:**
  - Criar um projeto .NET vazio e configurar o pacote do YARP.
  - Roteamento: Mapear `/api/produtos` para o container do Estoque e `/api/notas` para o Faturamento.

### Issue 11: Feedback de Falhas (SignalR)
- **Descrição:** Atender ao requisito de fornecer feedback apropriado em caso de falhas assíncronas.
- **Stack:** SignalR.
- **Tarefas:**
  - Configurar um Hub do SignalR no API Gateway.
  - Configurar a propriedade de Session Affinity e habilitar o suporte a WebSockets nas diretivas do YARP para garantir o fluxo contínuo de mensagens do SignalR downstream.
  - Se o Serviço de Estoque falhar ao processar a mensagem do RabbitMQ (ex: saldo insuficiente), ele publica um evento de erro. O Gateway consome e avisa o Frontend via WebSocket em tempo real.

### Issue 11.1: Geração e Propagação de Correlation ID (API Gateway)
- **Descrição:** Garantir que todas as requisições de entrada recebam um Correlation ID para rastreamento distribuído.
- **Stack:** YARP (.NET 10).
- **Tarefas:**
  - Configurar middleware no YARP Gateway para gerar um GUID único (`X-Correlation-ID`) caso não esteja presente na requisição e propagá-lo nos cabeçalhos HTTP enviados para os microsserviços downstream.


---

## Épico 5: Frontend Angular

### Issue 12: Setup do Projeto e Arquitetura
- **Descrição:** Estruturar a aplicação cliente.
- **Stack:** Angular 17+ (Standalone Components).
- **Tarefas:**
  - Criar projeto via Angular CLI.
  - Configurar biblioteca visual (ex: Angular Material ou PrimeNG) para os componentes visuais.
  - Criar os services para comunicação HTTP com o API Gateway utilizando o ciclo de vida adequado (`ngOnInit`, `ngOnDestroy`).
  - Implementar um `HttpInterceptor` global no Angular para interceptar respostas de erro (400 Bad Request, 500 Internal Server Error) vindas do YARP Gateway e exibir alertas amigáveis para o usuário na interface (utilizando os componentes da biblioteca visual escolhida).

### Issue 13: Telas de Cadastro (Produto e Nota Fiscal)
- **Descrição:** Desenvolver as interfaces de usuário solicitadas.
- **Tarefas:**
  - Criar tela "Cadastro de Produtos" (Inputs de Código, Descrição e Saldo).
  - Criar tela "Cadastro de Notas Fiscais" com formulário reativo para permitir múltiplos itens na mesma nota.

### Issue 14: Tela de Impressão e Reatividade
- **Descrição:** Lidar com chamadas assíncronas e feedback visual.
- **Stack:** RxJS.
- **Tarefas:**
  - Criar o botão "Imprimir Nota" em tela.
  - Implementar o uso extensivo do RxJS (operadores como `switchMap`, `catchError`, `tap`) para gerenciar as chamadas e o loading spinner.
  - Ouvir os eventos do SignalR para atualizar o status da nota (Aberta -> Fechada) e atualizar os saldos na interface.

---

## Épico 6: Documentação e Entrega Final

### Issue 15: Relatório Técnico Final e Vídeo (Atualizada)
- **Descrição:** Criar o documento Markdown respondendo explicitamente aos novos requisitos inseridos pelo uso do Go e gravar o vídeo de demonstração.
- **Tarefas:**
  - Escrever o arquivo Markdown final respondendo explicitamente a todas as perguntas e requisitos:
    - Explicar como foi realizado o gerenciamento de dependências no Golang utilizando o `go mod`.
    - Detalhar como foram tratados os erros e exceções no backend em Go (`if err != nil`).
    - Manter as explicações sobre os ciclos de vida do Angular, bibliotecas visuais, RxJS e a utilização do LINQ no Serviço de Estoque em C#.
  - Gravar o vídeo demonstrando: Telas, Cadastro, Impressão, o Dashboard do Grafana, e a simulação de desligar o container do Estoque para mostrar a mensagem enfileirada e o sistema não caindo (Tratamento de Falhas).