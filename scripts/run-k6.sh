#!/usr/bin/env bash

# Exit immediately on error
set -e

GATEWAY_URL=${GATEWAY_URL:-"http://localhost:8080"}
SCENARIO=${1:-"suite"}

echo "===================================================="
echo "🚀 Executando Teste de Estresse k6 no API Gateway"
echo "URL do Gateway: ${GATEWAY_URL}"
echo "Cenário Selecionado: ${SCENARIO}"
echo "===================================================="

# Seeding de produtos com saldo inicial reduzido (50 unidades) para forçar esgotamento e cancelamento via Saga
echo "🌱 Inicializando/semeando produtos de teste (PROD-001 a PROD-100) com saldo de 50 unidades..."
for i in $(seq -f "%03g" 1 100); do
    curl -s -X POST "${GATEWAY_URL}/api/produtos" \
        -H "Content-Type: application/json" \
        -d "{\"codigo\":\"PROD-$i\",\"descricao\":\"Produto Teste $i\",\"saldoInicial\":50}" > /dev/null || true
done
echo "✅ 100 produtos cadastrados/garantidos com saldo de 50 unidades cada!"

if [[ "${SCENARIO}" == "suite" || "${SCENARIO}" == "all" ]]; then
    echo "▶️  Executando Suíte Completa (k6/gateway-stress-suite.js)..."
    if command -v k6 &> /dev/null; then
        GATEWAY_URL="${GATEWAY_URL}" k6 run k6/gateway-stress-suite.js
    else
        docker run --rm -i --net=host -w /k6 -e GATEWAY_URL="${GATEWAY_URL}" -v "$(pwd):/k6" grafana/k6 run k6/gateway-stress-suite.js
    fi
else
    SCRIPT_PATH=""
    case "${SCENARIO}" in
        suite|all) SCRIPT_PATH="k6/gateway-stress-suite.js" ;;
        01|zero) SCRIPT_PATH="k6/scenarios/01-valida-zero-itens.js" ;;
        02|padrao|2) SCRIPT_PATH="k6/scenarios/02-emissao-padrao-2-itens.js" ;;
        03|pesada|100) SCRIPT_PATH="k6/scenarios/03-carga-pesada-100-itens.js" ;;
        04|idempotencia) SCRIPT_PATH="k6/scenarios/04-idempotencia.js" ;;
        05|concorrencia) SCRIPT_PATH="k6/scenarios/05-concorrencia-estoque.js" ;;
        06|saga|falha) SCRIPT_PATH="k6/scenarios/06-falha-parcial-saga.js" ;;
        07|spike) SCRIPT_PATH="k6/scenarios/07-spike-black-friday.js" ;;
        08|soak) SCRIPT_PATH="k6/scenarios/08-soak-sustentacao.js" ;;
        09|signalr|ws) SCRIPT_PATH="k6/scenarios/09-signalr-websockets.js" ;;
        10|leitura) SCRIPT_PATH="k6/scenarios/10-leitura-consultas.js" ;;
        *) SCRIPT_PATH="${SCENARIO}" ;;
    esac

    echo "▶️  Executando script: ${SCRIPT_PATH}..."
    if command -v k6 &> /dev/null; then
        GATEWAY_URL="${GATEWAY_URL}" k6 run "${SCRIPT_PATH}"
    else
        docker run --rm -i --net=host -w /k6 -e GATEWAY_URL="${GATEWAY_URL}" -v "$(pwd):/k6" grafana/k6 run "${SCRIPT_PATH}"
    fi
fi

echo "===================================================="
echo "✅ Teste concluído com sucesso!"
echo "===================================================="
