import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SignalRService } from '../../../core/services/signalr.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar-header">
      <div class="navbar-container">
        <!-- Logo / Title -->
        <a routerLink="/" class="navbar-brand">
          <div class="brand-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div class="brand-text">
            <span class="brand-title">Korp<span class="brand-accent">ERP</span></span>
            <span class="brand-subtitle">Gestão de Estoque & Faturamento</span>
          </div>
        </a>

        <!-- Desktop Navigation -->
        <nav class="navbar-nav desktop-only">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a routerLink="/produtos" routerLinkActive="active" class="nav-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            Produtos
          </a>
          <a routerLink="/notas-fiscais" routerLinkActive="active" class="nav-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Notas Fiscais
          </a>
        </nav>

        <!-- Right Side: Theme Switcher & Status WebSocket SignalR -->
        <div class="navbar-actions">
          <!-- Theme Toggle Button -->
          <button
            type="button"
            class="theme-toggle-btn"
            (click)="themeService.toggleTheme()"
            [title]="themeService.currentTheme() === 'light' ? 'Alternar para Modo Escuro' : 'Alternar para Modo Claro'"
            [attr.aria-label]="themeService.currentTheme() === 'light' ? 'Modo Escuro' : 'Modo Claro'"
          >
            @if (themeService.currentTheme() === 'light') {
              <!-- Moon Icon for switching to dark -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon moon-icon">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
              </svg>
            } @else {
              <!-- Sun Icon for switching to light -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon sun-icon">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            }
            <span class="theme-label desktop-only">{{ themeService.currentTheme() === 'light' ? 'Escuro' : 'Claro' }}</span>
          </button>

          <!-- SignalR Connection Badge -->
          <div class="signalr-badge" [ngClass]="'status-' + signalRService.connectionStatus().toLowerCase()" (click)="reconnectSignalR()">
            <span class="status-pulse"></span>
            <span class="status-text">
              @switch (signalRService.connectionStatus()) {
                @case ('Connected') { Tempo Real }
                @case ('Connecting') { Conectando... }
                @case ('Reconnecting') { Reconectando... }
                @default { Off-line }
              }
            </span>
          </div>

          <!-- Mobile Hamburger Toggle -->
          <button class="mobile-toggle mobile-only" (click)="toggleMobileMenu()" [attr.aria-expanded]="mobileMenuOpen" aria-label="Abrir menu de navegação">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              @if (!mobileMenuOpen) {
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              } @else {
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              }
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Dropdown Navigation -->
      <div class="mobile-menu" [class.open]="mobileMenuOpen">
        <nav class="mobile-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" (click)="closeMobileMenu()" class="mobile-nav-link">
            Dashboard
          </a>
          <a routerLink="/produtos" routerLinkActive="active" (click)="closeMobileMenu()" class="mobile-nav-link">
            Produtos & Saldo
          </a>
          <a routerLink="/notas-fiscais" routerLinkActive="active" (click)="closeMobileMenu()" class="mobile-nav-link">
            Emitir & Consultar Notas
          </a>
        </nav>
      </div>
    </header>
  `,
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  readonly signalRService = inject(SignalRService);
  readonly themeService = inject(ThemeService);
  mobileMenuOpen = false;

  ngOnInit(): void {
    this.signalRService.startConnection();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  reconnectSignalR(): void {
    if (this.signalRService.connectionStatus() === 'Disconnected') {
      this.signalRService.startConnection();
    }
  }
}
