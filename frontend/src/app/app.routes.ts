import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'produtos',
    loadComponent: () => import('./features/produtos/produtos.component').then(m => m.ProdutosComponent)
  },
  {
    path: 'notas-fiscais',
    loadComponent: () => import('./features/notas-fiscais/notas-fiscais.component').then(m => m.NotasFiscaisComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
