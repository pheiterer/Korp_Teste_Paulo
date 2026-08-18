import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SignalRService } from '../../core/services/signalr.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-page">
      <!-- Hero Header -->
      <section class="hero-card glass-card">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            Arquitetura Poliglota & Resiliente
          </div>
          <h1 class="hero-title">Sistema de Emissão de Notas & Estoque</h1>
          <p class="hero-description">
            Plataforma desacoplada integrando <strong>C# (.NET 10)</strong>, <strong>Golang</strong>, <strong>YARP API Gateway</strong>, <strong>RabbitMQ</strong> e <strong>SignalR WebSockets</strong>.
          </p>

          <div class="hero-actions">
            <a routerLink="/produtos" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Gerenciar Produtos
            </a>
            <a routerLink="/notas-fiscais" class="btn btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Emitir Nota Fiscal
            </a>
          </div>
        </div>
      </section>

      <!-- Status & Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">API Gateway</span>
            <div class="stat-icon icon-blue">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
            </div>
          </div>
          <div class="stat-value">Porta 8080</div>
          <div class="stat-meta">YARP Proxy & Correlation ID Middleware</div>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">Estoque (C# .NET)</span>
            <div class="stat-icon icon-purple">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
          </div>
          <div class="stat-value">Clean Architecture</div>
          <div class="stat-meta">PostgreSQL, Redlock & Idempotência</div>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">Faturamento (Go)</span>
            <div class="stat-icon icon-cyan">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          </div>
          <div class="stat-value">Gin & GORM</div>
          <div class="stat-meta">SQL Server, Redis Fail-Fast & Saga</div>
        </div>

        <div class="stat-card glass-card">
          <div class="stat-header">
            <span class="stat-label">SignalR WebSocket</span>
            <div class="stat-icon icon-emerald">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
          </div>
          <div class="stat-value">
            <span class="status-indicator" [ngClass]="'indicator-' + signalRService.connectionStatus().toLowerCase()"></span>
            {{ signalRService.connectionStatus() }}
          </div>
          <div class="stat-meta">Feedback em tempo real ativado</div>
        </div>
      </div>

      <!-- Feature Highlights -->
      <section class="features-section">
        <h2 class="section-title">Recursos de Integração & Rastreabilidade</h2>
        <div class="features-grid">
          <div class="feature-card glass-card">
            <div class="feature-icon">🔍</div>
            <h3>Correlation ID Interceptor</h3>
            <p>Todas as requisições geram automaticamente um cabeçalho <code>X-Correlation-ID</code> para auditoria distribuída no Grafana Loki.</p>
          </div>
          <div class="feature-card glass-card">
            <div class="feature-icon">⚡</div>
            <h3>SignalR WebSockets</h3>
            <p>Recebimento imediato dos eventos de <code>NotaFiscalAbatida</code> e <code>AbatimentoEstoqueFalhou</code> diretamente na interface.</p>
          </div>
          <div class="feature-card glass-card">
            <div class="feature-icon">🔄</div>
            <h3>Transação Compensatória</h3>
            <p>Se o saldo de estoque for insuficiente, o microsserviço de faturamento altera a nota para <code>Cancelada</code> via padrão Saga.</p>
          </div>
        </div>
      </section>
    </div>
  `,
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  readonly signalRService = inject(SignalRService);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    // Exibe notificação de boas-vindas
    this.toastService.info(
      'Sistema Inicializado (Issue 12)',
      'Arquitetura Standalone Angular 19 pronta com Correlation ID Interceptor & SignalR.'
    );
  }
}
