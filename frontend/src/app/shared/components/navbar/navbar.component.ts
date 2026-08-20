import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SignalRService } from '../../../core/services/signalr.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
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
