// k6/scenarios/09-signalr-websockets.js
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { BASE_URL } from '../utils/config.js';

export const options = {
    vus: 10,
    duration: '10s',
};

export default function () {
    // 1. Testar o Handshake / Negotiate HTTP do SignalR Hub
    const negotiateUrl = `${BASE_URL}/hubs/notificacoes/negotiate?negotiateVersion=1`;
    const res = http.post(negotiateUrl, null, {
        headers: { 'Content-Type': 'application/json' }
    });

    check(res, {
        'SignalR negotiate status is 200': (r) => r.status === 200,
        'retornou connectionToken/connectionId': (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.connectionId || body.connectionToken;
            } catch (e) {
                return false;
            }
        }
    });

    // 2. Testar Handshake via WebSocket caso a biblioteca k6/ws esteja disponível
    const wsUrl = BASE_URL.replace('http', 'ws') + '/hubs/notificacoes';
    const wsRes = ws.connect(wsUrl, null, function (socket) {
        socket.on('open', function () {
            // SignalR JSON protocol handshake message (fim com char 0x1E / ascii 30)
            socket.send('{"protocol":"json","version":1}\x1e');
        });

        socket.on('message', function (data) {
            // Resposta de handshake do SignalR Hub
            socket.close();
        });

        socket.setTimeout(function () {
            socket.close();
        }, 1000);
    });

    check(wsRes, {
        'WebSocket conectado com sucesso no Hub SignalR': (r) => r && r.status === 101 || r.status === 200,
    });

    sleep(0.5);
}
