// k6/scenarios/04-idempotencia.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../utils/config.js';
import { generateNotaFiscalPayload, getHeadersWithCorrelationId, generateUUID } from '../utils/helpers.js';

export const options = {
    vus: 5,
    duration: '10s',
    thresholds: {
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {
    const url = `${BASE_URL}/api/v1/notas-fiscais`;
    const correlationId = generateUUID();
    const headers = getHeadersWithCorrelationId(correlationId);
    const payload = generateNotaFiscalPayload(2);

    // 1. Primeira emissão da Nota Fiscal
    const res1 = http.post(url, payload, { headers });

    check(res1, {
        'primeira criacao retornou 201': (r) => r.status === 201,
    });

    if (res1.status === 201) {
        let notaId;
        try {
            const body = JSON.parse(res1.body);
            notaId = body.data ? (body.data.id || body.data.uuid) : null;
        } catch (e) { }

        if (notaId) {
            // 2. Chamadas consecutivas repetidas de impressão (POST /imprimir idempotente)
            const printUrl = `${BASE_URL}/api/v1/notas-fiscais/${notaId}/imprimir`;

            const printRes1 = http.post(printUrl, null, { headers });
            const printRes2 = http.post(printUrl, null, { headers });

            check(printRes1, {
                'primeira impressao ok (200/202)': (r) => r.status === 200 || r.status === 202,
            });

            check(printRes2, {
                'impressao repetida bloqueada por status invalido (400)': (r) => r.status === 400,
            });
        }
    }

    sleep(0.3);
}
