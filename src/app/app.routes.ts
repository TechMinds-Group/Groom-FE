import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/inicio/inicio.component').then((m) => m.InicioComponent),
      },
      {
        path: 'agenda',
        children: [
          {
            path: 'calendario',
            loadComponent: () =>
              import('./features/agenda/calendario/calendario.component').then(
                (c) => c.CalendarioComponent,
              ),
          },
        ],
      },
      {
        path: 'gestao',
        children: [
          {
            path: 'clientes',
            loadComponent: () =>
              import('./features/clientes/components/clientes/clientes.component').then(
                (m) => m.ClientesComponent,
              ),
          },
          {
            path: 'assinantes',
            loadComponent: () =>
              import('./features/assinantes-estabelecimento/components/assinantes-estabelecimento/assinantes-estabelecimento.component').then(
                (m) => m.AssinantesEstabelecimentoComponent,
              ),
          },
          {
            path: 'assinantes/:id',
            loadComponent: () =>
              import('./features/assinantes-estabelecimento/components/assinante-detalhes/assinante-detalhes.component').then(
                (m) => m.AssinanteDetalhesComponent,
              ),
          },
          {
            path: 'profissionais',
            loadComponent: () =>
              import('./features/gestao/profissionais/profissionais.component').then(
                (m) => m.ProfissionaisComponent,
              ),
          },
          {
            path: 'gestao-usuarios',
            loadComponent: () =>
              import('./features/gestao-usuarios/components/gestao-usuarios/gestao-usuarios.component').then(
                (m) => m.GestaoUsuariosComponent,
              ),
          },
          {
            path: 'gestao-usuarios/:id',
            loadComponent: () =>
              import('./features/gestao-usuarios/components/gestao-usuario-detalhes/gestao-usuario-detalhes/gestao-usuario-detalhes.component').then(
                (m) => m.GestaoUsuarioDetalhesComponent,
              ),
          },
        ],
      },
      {
        path: 'servicos',
        children: [
          {
            path: 'planos-estabelecimento',
            loadComponent: () =>
              import('./features/planos-estabelecimento/components/planos-estabelecimento/planos-estabelecimento.component').then(
                (m) => m.PlanosEstabelecimentoComponent,
              ),
          },
          {
            path: 'planos-estabelecimento/:id',
            loadComponent: () =>
              import('./features/planos-estabelecimento/components/plano-detalhes/plano-detalhes.component').then(
                (m) => m.PlanoDetalhesComponent,
              ),
          },
          {
            path: 'catalogo',
            loadComponent: () =>
              import('./features/catalogo/components/catalogo/catalogo.component').then(
                (m) => m.CatalogoComponent,
              ),
          },
          {
            path: 'catalogo/:id',
            loadComponent: () =>
              import('./features/catalogo/components/catalogo-detalhes/catalogo-detalhes/catalogo-detalhes.component').then(
                (m) => m.CatalogoDetalhesComponent,
              ),
          },
        ],
      },
      {
        path: 'assinatura',
        loadComponent: () =>
          import(
            './features/assinatura-sistema/components/assinatura-sistema/assinatura-sistema.component'
          ).then((m) => m.AssinaturaSistemaComponent),
      },
      {
        path: 'guia',
        loadComponent: () =>
          import('./features/guia/components/guia/guia.component').then((m) => m.GuiaComponent),
      },
      {
        path: 'configuracoes',
        loadComponent: () =>
          import('./features/configuracoes/configuracoes.component').then((m) => m.ConfiguracoesComponent),
      },
      {
        path: 'users',
        redirectTo: 'gestao/gestao-usuarios',
        pathMatch: 'full',
      },
      {
        path: 'users/:id',
        redirectTo: 'gestao/gestao-usuarios/:id',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'visualizar/:token',
    loadComponent: () =>
      import('./features/compartilhar/visualizar-assinante/visualizar-assinante.component').then(
        (m) => m.VisualizarAssinanteComponent,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
