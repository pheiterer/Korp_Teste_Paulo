// k6/scenarios/02-emissao-padrao-2-itens.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, THRESHOLDS } from '../utils/config.js';
import { generateNotaFiscalPayload, getHeadersWithCorrelationId } from '../utils/helpers.js';

export const options = {
    stages: [
        { duration: '5s', target: 15 },
        { duration: '10s', target: 30 },
        { duration: '5s', target: 0 },
    ],
    thresholds: THRESHOLDS.standard,
};

export default function () {
    const url = `${BASE_URL}/api/v1/notas-fiscais`;
    const payload = generateNotaFiscalPayload(10); // 10 itens por nota fiscal
    const headers = getHeadersWithCorrelationId();

    const res = http.post(url, payload, { headers });

    check(res, {
        'status is 201 (Created)': (r) => r.status === 201,
        'retornou id ou uuid da nota': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.success === true || (body.data && (body.data.id || body.data.uuid));
            } catch (e) {
                return false;
            }
        },
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
