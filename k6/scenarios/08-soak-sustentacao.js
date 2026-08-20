// k6/scenarios/08-soak-sustentacao.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from '../utils/config.js';
import { generateNotaFiscalPayload, getHeadersWithCorrelationId } from '../utils/helpers.js';

export const options = {
    stages: [
        { duration: '10s', target: 20 },
        { duration: '2m', target: 20 }, // Carga constante por 2 minutos contínuos (Soak Test)
        { duration: '10s', target: 0 },
    ],
    thresholds: THRESHOLDS.standard,
};

export default function () {
    const url = `${BASE_URL}/api/v1/notas-fiscais`;
    const payload = generateNotaFiscalPayload(2);
    const headers = getHeadersWithCorrelationId();

    const res = http.post(url, payload, { headers });

    check(res, {
        'status is 201 no teste continuo de sustentacao': (r) => r.status === 201,
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
