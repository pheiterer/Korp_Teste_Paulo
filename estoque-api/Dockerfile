FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

# Copy project files
COPY Estoque.slnx ./
COPY src/Estoque.Domain/Estoque.Domain.csproj src/Estoque.Domain/
COPY src/Estoque.Application/Estoque.Application.csproj src/Estoque.Application/
COPY src/Estoque.Infrastructure/Estoque.Infrastructure.csproj src/Estoque.Infrastructure/
COPY src/Estoque.API/Estoque.API.csproj src/Estoque.API/
COPY tests/Estoque.Tests.Unit/Estoque.Tests.Unit.csproj tests/Estoque.Tests.Unit/
COPY tests/Estoque.Tests.Architecture/Estoque.Tests.Architecture.csproj tests/Estoque.Tests.Architecture/

# Restore dependencies
RUN dotnet restore Estoque.slnx

# Copy source code
COPY . .

# Build and Publish
RUN dotnet publish src/Estoque.API/Estoque.API.csproj -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Estoque.API.dll"]
