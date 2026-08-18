import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notas-fiscais',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card">
      <h2>Módulo de Emissão & Impressão de Notas Fiscais</h2>
      <p style="color: #94a3b8; margin-top: 0.5rem;">
        Esta tela será totalmente desenvolvida nas <strong>Issues 13 e 14</strong> com suporte a múltiplos itens (FormArray), emissão assíncrona, botão Imprimir e feedback de status via SignalR.
      </p>
    </div>
  `
})
export class NotasFiscaisComponent {}
