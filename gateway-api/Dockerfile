FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY src/Gateway.Api/Gateway.Api.csproj src/Gateway.Api/
RUN dotnet restore src/Gateway.Api/Gateway.Api.csproj

COPY . .
RUN dotnet publish src/Gateway.Api/Gateway.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview AS final
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Gateway.Api.dll"]
