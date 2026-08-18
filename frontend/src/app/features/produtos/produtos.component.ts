import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card">
      <h2>Módulo de Cadastro de Produtos</h2>
      <p style="color: #94a3b8; margin-top: 0.5rem;">
        Esta tela será totalmente desenvolvida na <strong>Issue 13</strong> com formulários reativos, validações e tabela de saldos em tempo real.
      </p>
    </div>
  `
})
export class ProdutosComponent {}
