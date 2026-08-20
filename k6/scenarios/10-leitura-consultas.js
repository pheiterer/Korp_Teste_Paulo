// k6/scenarios/10-leitura-consultas.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from '../utils/config.js';
import { getHeadersWithCorrelationId } from '../utils/helpers.js';

export const options = {
    stages: [
        { duration: '5s', target: 20 },
        { duration: '10s', target: 50 }, // 50 VUs em leitura simultanea
        { duration: '5s', target: 0 },
    ],
    thresholds: THRESHOLDS.standard,
};

export default function () {
    const headers = getHeadersWithCorrelationId();

    // 1. GET /api/produtos (Roteia para Estoque.API via YARP)
    const resProdutos = http.get(`${BASE_URL}/api/produtos`, { headers });
    check(resProdutos, {
        'GET /api/produtos status is 200': (r) => r.status === 200,
    });

    // 2. GET /api/v1/notas-fiscais (Roteia para faturamento-api via YARP)
    const resNotas = http.get(`${BASE_URL}/api/v1/notas-fiscais`, { headers });
    check(resNotas, {
        'GET /api/v1/notas-fiscais status is 200': (r) => r.status === 200,
    });

    sleep(0.1);
}
