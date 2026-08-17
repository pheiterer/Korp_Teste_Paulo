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

### Issue 3: Setup do Projeto e Arquitetura Base (Estoque)
- **Descrição:** Inicializar a Web API do Serviço de Estoque utilizando Clean Architecture/DDD.
- **Stack:** C# .NET 10.
- **Tarefas:**
  - Criar a solução e os projetos lógicos (Domain, Application, Infrastructure, API).
  - Configurar a injeção de dependência.
  - Configurar o Swagger/OpenAPI para visualização e teste interativo da API.
  - Configurar o Serilog para gerar logs estruturados (console e arquivo), garantindo o rastreamento das requisições.

### Issue 4: Domínio e Persistência de Produtos (Estoque)
- **Descrição:** Modelar a entidade de Produto e configurar o banco de dados.
- **Stack:** EF Core, PostgreSQL.
- **Tarefas:**
  - Criar a entidade `Produto` com Código, Descrição e Saldo.
  - Configurar o mapeamento do EF Core (Fluent API).
  - Gerar e aplicar as Migrations no PostgreSQL.
- **Critério de Aceite:** Tabela de produtos criada com sucesso no banco de dados.

### Issue 5: Endpoints REST e Regras de Negócio (Estoque)
- **Descrição:** Implementar os casos de uso para o cadastro e consulta de produtos.
- **Stack:** C# .NET 10, LINQ.
- **Tarefas:**
  - Criar endpoint `POST /api/produtos` para Cadastro de Produtos.
  - Criar endpoint `GET /api/produtos` para listagem.
  - Utilizar LINQ extensivamente nas consultas ao banco para posterior documentação.
  - Implementar middleware global de tratamento de erros (*Exception Handling Middleware*) para padronizar as respostas de falha.

### Issue 6: Tratamento de Concorrência e Mensageria (Estoque)
- **Descrição:** Preparar o serviço para deduzir saldos de forma segura e assíncrona.
- **Stack:** MassTransit (RabbitMQ), StackExchange.Redis.
- **Tarefas:**
  - Configurar o MassTransit para consumir a fila de `NotaFiscalImpressaEvent`.
  - Ao receber o evento, implementar lógica para atualizar o saldo dos produtos.
  - Implementar Distributed Lock com Redis (padrão Redlock) para garantir que, se dois eventos tentarem alterar o mesmo produto com saldo 1 simultaneamente, um deles aguarde ou falhe de forma controlada.

---

## Épico 3: Microsserviço de Faturamento / Nota Fiscal (Go / Golang)

### Issue 7: Setup e Estrutura Base (Faturamento - Go)
- **Descrição:** Inicializar a API REST de Faturamento utilizando Go.
- **Stack:** Go (Golang), Gin/Fiber.
- **Tarefas:**
  - Inicializar o projeto executando `go mod init faturamento-api` para controle de dependências, garantindo o requisito de detalhamento técnico.
  - Estruturar o projeto seguindo o padrão de pastas da comunidade Go (`/cmd`, `/internal/domain`, `/internal/handlers`).
  - Configurar o framework web Gin ou Fiber para roteamento REST.
  - Configurar o pacote de logs estruturados nativo `log/slog`.
  - Implementar o tratamento explícito de erros nativo do Go (`if err != nil`) nos handlers, padronizando o retorno das exceções em JSON.

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
  - Se o Serviço de Estoque falhar ao processar a mensagem do RabbitMQ (ex: saldo insuficiente), ele publica um evento de erro. O Gateway consome e avisa o Frontend via WebSocket em tempo real.

---

## Épico 5: Frontend Angular

### Issue 12: Setup do Projeto e Arquitetura
- **Descrição:** Estruturar a aplicação cliente.
- **Stack:** Angular 17+ (Standalone Components).
- **Tarefas:**
  - Criar projeto via Angular CLI.
  - Configurar biblioteca visual (ex: Angular Material ou PrimeNG) para os componentes visuais.
  - Criar os services para comunicação HTTP com o API Gateway utilizando o ciclo de vida adequado (`ngOnInit`, `ngOnDestroy`).

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