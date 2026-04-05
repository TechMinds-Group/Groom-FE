import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/index/pages/index-page/index-page.component').then(m => m.IndexPageComponent)
      }
    ]
  },
  { path: '**', redirectTo: '/' }
];
