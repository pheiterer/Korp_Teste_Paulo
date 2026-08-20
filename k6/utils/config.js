// k6/utils/config.js
export const BASE_URL = __ENV.GATEWAY_URL || 'http://localhost:8080';

export const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
};

export const THRESHOLDS = {
    standard: {
        http_req_failed: ['rate<0.05'], // taxa de erro < 5%
        http_req_duration: ['p(95)<500'], // 95% das requisições < 500ms
    },
    heavy: {
        http_req_failed: ['rate<0.10'],
        http_req_duration: ['p(95)<2000'],
    },
    validation: {
        http_req_failed: ['rate<0.01'],
    }
};
