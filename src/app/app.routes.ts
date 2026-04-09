import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/inicio/inicio.component').then(m => m.InicioComponent)
  }
];
