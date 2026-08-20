// k6/utils/helpers.js
import { DEFAULT_HEADERS } from './config.js';

export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function getHeadersWithCorrelationId(correlationId) {
    return {
        ...DEFAULT_HEADERS,
        'X-Correlation-ID': correlationId || generateUUID(),
    };
}

export function generateNotaFiscalPayload(itemsCount = 2, customItems = null) {
    if (customItems) {
        return JSON.stringify({
            itens: customItems
        });
    }

    const items = [];
    const knownProducts = [
        { codigo: 'PROD-001', preco: 150.00 },
        { codigo: 'PROD-002', preco: 89.90 },
        { codigo: 'PROD-003', preco: 299.99 },
        { codigo: 'PROD-004', preco: 45.50 },
        { codigo: 'PROD-005', preco: 12.00 },
    ];

    const startOffset = Math.floor(Math.random() * 100);
    for (let i = 0; i < itemsCount; i++) {
        const prodIndex = ((startOffset + i) % 100) + 1;
        const numStr = String(prodIndex).padStart(3, '0');
        const codigo = `PROD-${numStr}`;
        const preco = Number((10 + (prodIndex % 10) * 15).toFixed(2));
        items.push({
            codigo_produto: codigo,
            quantidade: Math.floor(Math.random() * 3) + 1,
            preco_unitario: preco
        });
    }

    return JSON.stringify({
        itens: items
    });
}
