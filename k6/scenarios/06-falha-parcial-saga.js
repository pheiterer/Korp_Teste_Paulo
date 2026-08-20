// k6/scenarios/06-falha-parcial-saga.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../utils/config.js';
import { getHeadersWithCorrelationId } from '../utils/helpers.js';

export const options = {
    vus: 5,
    duration: '10s',
};

export default function () {
    const url = `${BASE_URL}/api/v1/notas-fiscais`;
    // Payload com produto com quantidade superior ao estoque para forçar erro de saldo e validar a Saga compensatória
    const payload = JSON.stringify({
        itens: [
            { codigo_produto: 'PROD-001', quantidade: 2, preco_unitario: 150.00 },
            { codigo_produto: 'PROD-002', quantidade: 999999999, preco_unitario: 89.90 }
        ]
    });
    const headers = getHeadersWithCorrelationId();

    const res = http.post(url, payload, { headers });

    check(res, {
        'nota fiscal criada com status Aberto para ser validada na Saga (201)': (r) => r.status === 201,
    });

    if (res.status === 201) {
        try {
            const body = JSON.parse(res.body);
            const notaId = body.data ? (body.data.id || body.data.uuid) : null;
            if (notaId) {
                const printUrl = `${BASE_URL}/api/v1/notas-fiscais/${notaId}/imprimir`;
                http.post(printUrl, null, { headers });
            }
        } catch (e) { }
    }

    sleep(0.2);
}
