// k6/scenarios/05-concorrencia-estoque.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../utils/config.js';
import { generateNotaFiscalPayload, getHeadersWithCorrelationId } from '../utils/helpers.js';

export const options = {
    vus: 50, // 50 VUs em paralelo disputando estoque simultaneamente
    duration: '10s',
    thresholds: {
        http_req_duration: ['p(95)<1000'],
    },
};

export default function () {
    const url = `${BASE_URL}/api/v1/notas-fiscais`;
    const payload = generateNotaFiscalPayload(10); // 10 itens por nota fiscal
    const headers = getHeadersWithCorrelationId();

    const res = http.post(url, payload, { headers });

    check(res, {
        'requisicao aceita sem crash (201)': (r) => r.status === 201,
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

    sleep(0.1);
}
