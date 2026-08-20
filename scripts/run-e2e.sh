#!/bin/bash
# ==============================================================================
# Script de Execução Automatizada de Testes E2E com Newman
# ==============================================================================

set -e

echo "🚀 Iniciando Execução dos Testes E2E (End-to-End)..."
echo "=============================================================================="

# Garantir que o diretório de relatórios exista
mkdir -p tests/e2e/reports

# Executar a Coleção E2E com Newman (CLI + HTML Extra Reporter se instalado)
if npx --no-install newman-reporter-htmlextra --version > /dev/null 2>&1; then
    npx -y newman run tests/e2e/e2e_postman_collection.json \
        -r cli,htmlextra \
        --reporter-htmlextra-export tests/e2e/reports/e2e-report.html
else
    npx -y newman run tests/e2e/e2e_postman_collection.json -r cli
fi

echo "=============================================================================="
echo "✅ Testes E2E concluídos com sucesso!"
