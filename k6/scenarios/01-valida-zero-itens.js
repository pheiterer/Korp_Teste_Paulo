// k6/scenarios/01-valida-zero-itens.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from '../utils/config.js';
import { getHeadersWithCorrelationId } from '../utils/helpers.js';

export const options = {
    vus: 10,
    duration: '10s',
    thresholds: {
        http_req_duration: ['p(95)<300'],
    },
};

export default function () {
    const url = `${BASE_URL}/api/v1/notas-fiscais`;
    const payload = JSON.stringify({ itens: [] }); // 0 itens
    const headers = getHeadersWithCorrelationId();

    const res = http.post(url, payload, { headers });

    check(res, {
        'status is 400 (Bad Request - 0 itens)': (r) => r.status === 400,
        'resposta contem mensagem de erro': (r) => r.body && r.body.includes('itens') || r.body.includes('required') || r.body.includes('invalido') || r.body.includes('error'),
    });

    sleep(0.1);
}
