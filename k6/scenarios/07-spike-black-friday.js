// k6/scenarios/07-spike-black-friday.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../utils/config.js';
import { generateNotaFiscalPayload, getHeadersWithCorrelationId } from '../utils/helpers.js';

export const options = {
    stages: [
        { duration: '3s', target: 5 },    // Aquecimento inicial
        { duration: '5s', target: 100 },  // Spike Black Friday (100 VUs)
        { duration: '10s', target: 100 }, // Sustenta o pico de tráfego
        { duration: '5s', target: 5 },    // Descompressão
        { duration: '2s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.15'],
    },
};

export default function () {
    const url = `${BASE_URL}/api/v1/notas-fiscais`;
    const payload = generateNotaFiscalPayload(10); // 10 itens por nota fiscal
    const headers = getHeadersWithCorrelationId();

    const res = http.post(url, payload, { headers });

    check(res, {
        'status ok no spike (201 ou 503 controlado)': (r) => r.status === 201 || r.status === 503 || r.status === 429,
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

    sleep(0.05);
}
