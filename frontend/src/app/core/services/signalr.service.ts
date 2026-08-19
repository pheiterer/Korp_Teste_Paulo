import { Injectable, signal, OnDestroy } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

export type SignalRConnectionStatus = 'Disconnected' | 'Connecting' | 'Connected' | 'Reconnecting';

export interface NotaFiscalAbatidaNotification {
  notaFiscalId: string;
  correlationId?: string;
  message?: string;
  timestamp?: string;
}

export interface AbatimentoEstoqueFalhouNotification {
  notaFiscalId: string;
  reason: string;
  details?: string;
  correlationId?: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService implements OnDestroy {
  private hubConnection?: HubConnection;
  readonly connectionStatus = signal<SignalRConnectionStatus>('Disconnected');

  private readonly notaFiscalAbatidaSubject = new Subject<NotaFiscalAbatidaNotification>();
  readonly notaFiscalAbatida$: Observable<NotaFiscalAbatidaNotification> = this.notaFiscalAbatidaSubject.asObservable();

  private readonly abatimentoEstoqueFalhouSubject = new Subject<AbatimentoEstoqueFalhouNotification>();
  readonly abatimentoEstoqueFalhou$: Observable<AbatimentoEstoqueFalhouNotification> = this.abatimentoEstoqueFalhouSubject.asObservable();

  constructor(private toastService: ToastService) {}

  startConnection(): void {
    if (this.hubConnection && this.hubConnection.state !== HubConnectionState.Disconnected) {
      return;
    }

    const hubUrl = `${environment.apiGatewayUrl}/hubs/notificacoes`;
    this.connectionStatus.set('Connecting');

    try {
      this.hubConnection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(LogLevel.Information)
        .build();

      this.registerEventHandlers();

      this.hubConnection.start()
        .then(() => {
          this.connectionStatus.set('Connected');
          this.toastService.info('WebSocket Conectado', 'Conexão em tempo real estabelecida com o API Gateway.');
        })
        .catch(err => {
          console.warn('Erro ao conectar no Hub SignalR:', err);
          this.connectionStatus.set('Disconnected');
        });

      this.hubConnection.onreconnecting(() => {
        this.connectionStatus.set('Reconnecting');
      });

      this.hubConnection.onreconnected(() => {
        this.connectionStatus.set('Connected');
        this.toastService.success('WebSocket Reconectado', 'Conexão em tempo real restabelecida.');
      });

      this.hubConnection.onclose(() => {
        this.connectionStatus.set('Disconnected');
      });
    } catch (e) {
      console.warn('Falha ao inicializar o cliente SignalR:', e);
      this.connectionStatus.set('Disconnected');
    }
  }

  private registerEventHandlers(): void {
    if (!this.hubConnection) return;

    // Escuta evento NotaFiscalAbatida (Sucesso)
    this.hubConnection.on('NotaFiscalAbatida', (data: any) => {
      const notification: NotaFiscalAbatidaNotification = {
        notaFiscalId: data?.notaFiscalId ?? data?.id ?? data?.NotaFiscalId ?? 'N/A',
        correlationId: data?.correlationId ?? data?.CorrelationId,
        message: data?.message ?? data?.Message ?? 'Abatimento de estoque realizado com sucesso.',
        timestamp: new Date().toISOString()
      };

      this.notaFiscalAbatidaSubject.next(notification);
      this.toastService.success(
        `Nota Fiscal #${notification.notaFiscalId} Fechada`,
        notification.message || 'Estoque abatido com sucesso!',
        notification.correlationId
      );
    });

    // Escuta evento AbatimentoEstoqueFalhou (Falha na Saga)
    this.hubConnection.on('AbatimentoEstoqueFalhou', (data: any) => {
      const notification: AbatimentoEstoqueFalhouNotification = {
        notaFiscalId: data?.notaFiscalId ?? data?.id ?? data?.NotaFiscalId ?? 'N/A',
        reason: data?.reason ?? data?.Reason ?? 'Saldo Insuficiente de Estoque',
        details: data?.details ?? data?.Details ?? 'A transação compensatória cancelou a Nota Fiscal.',
        correlationId: data?.correlationId ?? data?.CorrelationId,
        timestamp: new Date().toISOString()
      };

      this.abatimentoEstoqueFalhouSubject.next(notification);
      this.toastService.error(
        `Nota Fiscal #${notification.notaFiscalId} Cancelada`,
        `Falha de Estoque: ${notification.reason}`,
        notification.correlationId
      );
    });
  }

  stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().catch(() => {});
      this.connectionStatus.set('Disconnected');
    }
  }

  ngOnDestroy(): void {
    this.stopConnection();
  }
}
