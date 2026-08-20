// k6/gateway-stress-suite.js
import scenario01 from './scenarios/01-valida-zero-itens.js';
import scenario02 from './scenarios/02-emissao-padrao-2-itens.js';
import scenario03 from './scenarios/03-carga-pesada-100-itens.js';
import scenario04 from './scenarios/04-idempotencia.js';
import scenario05 from './scenarios/05-concorrencia-estoque.js';
import scenario06 from './scenarios/06-falha-parcial-saga.js';
import scenario07 from './scenarios/07-spike-black-friday.js';
import scenario08 from './scenarios/08-soak-sustentacao.js';
import scenario09 from './scenarios/09-signalr-websockets.js';
import scenario10 from './scenarios/10-leitura-consultas.js';

export const options = {
    scenarios: {
        valida_zero_itens: {
            executor: 'constant-vus',
            exec: 'runValidaZero',
            vus: 5,
            duration: '5s',
        },
        emissao_padrao: {
            executor: 'ramping-vus',
            exec: 'runEmissaoPadrao',
            startTime: '5s',
            stages: [
                { duration: '5s', target: 30 },
                { duration: '10s', target: 30 },
                { duration: '5s', target: 0 },
            ],
        },
        carga_pesada_100: {
            executor: 'constant-vus',
            exec: 'runCargaPesada100',
            startTime: '25s',
            vus: 15,
            duration: '10s',
        },
        idempotencia: {
            executor: 'constant-vus',
            exec: 'runIdempotencia',
            startTime: '35s',
            vus: 5,
            duration: '5s',
        },
        concorrencia_estoque: {
            executor: 'constant-vus',
            exec: 'runConcorrenciaEstoque',
            startTime: '40s',
            vus: 40,
            duration: '10s',
        },
        falha_parcial_saga: {
            executor: 'constant-vus',
            exec: 'runFalhaParcialSaga',
            startTime: '50s',
            vus: 5,
            duration: '5s',
        },
        spike_black_friday: {
            executor: 'ramping-vus',
            exec: 'runSpikeBlackFriday',
            startTime: '55s',
            stages: [
                { duration: '3s', target: 5 },
                { duration: '5s', target: 100 },
                { duration: '5s', target: 0 },
            ],
        },
        signalr_websockets: {
            executor: 'constant-vus',
            exec: 'runSignalRWebSockets',
            startTime: '68s',
            vus: 5,
            duration: '5s',
        },
        leitura_consultas: {
            executor: 'ramping-vus',
            exec: 'runLeituraConsultas',
            startTime: '73s',
            stages: [
                { duration: '5s', target: 30 },
                { duration: '10s', target: 0 },
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<1500'],
    },
};

export function runValidaZero() {
    scenario01();
}

export function runEmissaoPadrao() {
    scenario02();
}

export function runCargaPesada100() {
    scenario03();
}

export function runIdempotencia() {
    scenario04();
}

export function runConcorrenciaEstoque() {
    scenario05();
}

export function runFalhaParcialSaga() {
    scenario06();
}

export function runSpikeBlackFriday() {
    scenario07();
}

export function runSoakSustentacao() {
    scenario08();
}

export function runSignalRWebSockets() {
    scenario09();
}

export function runLeituraConsultas() {
    scenario10();
}
