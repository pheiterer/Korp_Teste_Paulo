// k6/scenarios/03-carga-pesada-100-itens.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from '../utils/config.js';
import { generateNotaFiscalPayload, getHeadersWithCorrelationId } from '../utils/helpers.js';

export const options = {
    stages: [
        { duration: '5s', target: 5 },
        { duration: '10s', target: 15 },
        { duration: '5s', target: 0 },
    ],
    thresholds: THRESHOLDS.heavy,
};

export default function () {
    const url = `${BASE_URL}/api/v1/notas-fiscais`;
    const payload = generateNotaFiscalPayload(100); // 100 itens
    const headers = getHeadersWithCorrelationId();

    const res = http.post(url, payload, { headers });

    check(res, {
        'status is 201 (Created 100 items payload)': (r) => r.status === 201,
        'tempo de resposta aceitável (<2000ms)': (r) => r.timings.duration < 2000,
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

    sleep(0.5);
}
