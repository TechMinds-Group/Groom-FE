import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { clienteAuthGuard } from './core/guards/cliente-auth.guard';
import { tenantResolver } from './core/services/tenant-resolver.service';
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
        path: 'agendamento-estabelecimento',
        loadComponent: () =>
          import(
            './features/agendamento-estabelecimento/components/agendamento-estabelecimento/agendamento-estabelecimento.component'
          ).then((m) => m.AgendamentoEstabelecimentoComponent),
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
            path: 'clientes/novo',
            loadComponent: () =>
              import('./features/clientes/components/cliente-novo/cliente-novo.component').then(
                (m) => m.ClienteNovoComponent,
              ),
          },
          {
            path: 'clientes/:id',
            loadComponent: () =>
              import('./features/clientes/components/cliente-detalhes/cliente-detalhes.component').then(
                (m) => m.ClienteDetalhesComponent,
              ),
          },
          {
            path: 'clientes/:id/editar',
            loadComponent: () =>
              import('./features/clientes/components/cliente-editar/cliente-editar.component').then(
                (m) => m.ClienteEditarComponent,
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
            path: 'assinantes/novo',
            loadComponent: () =>
              import('./features/assinantes-estabelecimento/components/assinante-novo/assinante-novo.component').then(
                (m) => m.AssinanteNovoComponent,
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
              import('./features/gestao/profissionais/components/profissionais/profissionais.component').then(
                (m) => m.ProfissionaisComponent,
              ),
          },
          {
            path: 'profissionais/:id',
            loadComponent: () =>
              import('./features/gestao/profissionais/components/profissional-detalhes/profissional-detalhes.component').then(
                (m) => m.ProfissionalDetalhesComponent,
              ),
          },
          {
            path: 'profissionais/:id/editar',
            loadComponent: () =>
              import('./features/gestao/profissionais/components/profissional-editar/profissional-editar.component').then(
                (m) => m.ProfissionalEditarComponent,
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
            path: 'gestao-usuarios/novo',
            loadComponent: () =>
              import('./features/gestao-usuarios/components/usuario-novo/usuario-novo.component').then(
                (m) => m.UsuarioNovoComponent,
              ),
          },
          {
            path: 'gestao-usuarios/:id/editar',
            loadComponent: () =>
              import('./features/gestao-usuarios/components/usuario-editar/usuario-editar.component').then(
                (m) => m.UsuarioEditarComponent,
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
            path: 'planos-estabelecimento/novo',
            loadComponent: () =>
              import('./features/planos-estabelecimento/components/plano-novo/plano-novo.component').then(
                (m) => m.PlanoNovoComponent,
              ),
          },
          {
            path: 'planos-estabelecimento/:id/editar',
            loadComponent: () =>
              import('./features/planos-estabelecimento/components/plano-editar/plano-editar.component').then(
                (m) => m.PlanoEditarComponent,
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
            path: 'catalogo/novo',
            loadComponent: () =>
              import('./features/catalogo/components/catalogo-novo/catalogo-novo.component').then(
                (m) => m.CatalogoNovoComponent,
              ),
          },
          {
            path: 'catalogo/:id/editar',
            loadComponent: () =>
              import('./features/catalogo/components/catalogo-editar/catalogo-editar.component').then(
                (m) => m.CatalogoEditarComponent,
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
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/configuracoes/configuracoes.component').then((m) => m.ConfiguracoesComponent),
          },
          {
            path: 'estabelecimento',
            loadComponent: () =>
              import(
                './features/configuracoes/components/estabelecimento-config/estabelecimento-config.component'
              ).then((m) => m.EstabelecimentoConfigComponent),
          },
          {
            path: 'whatsapp',
            loadComponent: () =>
              import('./features/whatsapp-integracao/components/whatsapp-integracao/whatsapp-integracao.component').then(
                (m) => m.WhatsappIntegracaoComponent,
              ),
          },
          {
            path: 'feriados',
            loadComponent: () =>
              import(
                './features/configuracoes/components/feriados-config/feriados-config.component'
              ).then((m) => m.FeriadosConfigComponent),
          },
          {
            path: 'logs',
            loadComponent: () =>
              import('./features/logs-sistema/components/logs-sistema/logs-sistema.component').then(
                (m) => m.LogsSistemaComponent,
              ),
          },
        ],
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
      {
        path: 'sg-estabelecimentos-x7k9p',
        loadComponent: () =>
          import('./features/sg/components/sg-estabelecimentos-x7k9p/sg-estabelecimentos-x7k9p.component').then(
            (m) => m.SgEstabelecimentosX7k9pComponent,
          ),
      },
      {
        path: 'sg-estabelecimento-detalhes-x7k9p/:id',
        loadComponent: () =>
          import('./features/sg/components/sg-estabelecimento-detalhes-x7k9p/sg-estabelecimento-detalhes-x7k9p.component').then(
            (m) => m.SgEstabelecimentoDetalhesX7k9pComponent,
          ),
      },
      {
        path: 'sg-estabelecimento-novo-x7k9p',
        loadComponent: () =>
          import('./features/sg/components/sg-estabelecimento-novo-x7k9p/sg-estabelecimento-novo-x7k9p.component').then(
            (m) => m.SgEstabelecimentoNovoX7k9pComponent,
          ),
      },
      {
        path: 'sg-estabelecimento-usuarios-x7k9p/:empresaId',
        loadComponent: () =>
          import('./features/sg/components/sg-estabelecimento-usuarios-x7k9p/sg-estabelecimento-usuarios-x7k9p.component').then(
            (m) => m.SgEstabelecimentoUsuariosX7k9pComponent,
          ),
      },
      {
        path: 'sg-estabelecimento-usuario-detalhes-x7k9p/:empresaId/:id',
        loadComponent: () =>
          import('./features/sg/components/sg-estabelecimento-usuario-detalhes-x7k9p/sg-estabelecimento-usuario-detalhes-x7k9p.component').then(
            (m) => m.SgEstabelecimentoUsuarioDetalhesX7k9pComponent,
          ),
      },
      {
        path: 'sg-usuario-novo-x7k9p/:empresaId',
        loadComponent: () =>
          import('./features/sg/components/sg-usuario-novo-x7k9p/sg-usuario-novo-x7k9p.component').then(
            (m) => m.SgUsuarioNovoX7k9pComponent,
          ),
      },
      {
        path: 'sg-planos-x7k9p',
        loadComponent: () =>
          import('./features/sg/components/sg-planos-x7k9p/sg-planos-x7k9p.component').then(
            (m) => m.SgPlanosX7k9pComponent,
          ),
      },
      {
        path: 'sg-plano-novo-x7k9p',
        loadComponent: () =>
          import('./features/sg/components/sg-plano-novo-x7k9p/sg-plano-novo-x7k9p.component').then(
            (m) => m.SgPlanoNovoX7k9pComponent,
          ),
      },
      {
        path: 'sg-plano-editar-x7k9p/:id',
        loadComponent: () =>
          import('./features/sg/components/sg-plano-editar-x7k9p/sg-plano-editar-x7k9p.component').then(
            (m) => m.SgPlanoEditarX7k9pComponent,
          ),
      },
      {
        path: 'sg-perfil-x7k9p',
        loadComponent: () =>
          import('./features/sg/components/sg-perfil-x7k9p/sg-perfil-x7k9p.component').then(
            (m) => m.SgPerfilX7k9pComponent,
          ),
      },
    ],
  },
  {
    path: 'sg-auth-x7k9p',
    loadComponent: () =>
      import('./features/sg/components/sg-login-x7k9p/sg-login-x7k9p.component').then((m) => m.SgLoginX7k9pComponent),
  },
  {
    path: 'sg-login',
    redirectTo: 'sg-auth-x7k9p',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'agendamento/:estabelecimento',
    resolve: { tenant: tenantResolver },
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/agendamento-publico/components/login-cliente/login-cliente.component').then(
            (m) => m.LoginClienteComponent,
          ),
      },
      {
        path: 'novo',
        canActivate: [clienteAuthGuard],
        loadComponent: () =>
          import('./features/agendamento-publico/components/novo-agendamento/novo-agendamento.component').then(
            (m) => m.NovoAgendamentoComponent,
          ),
      },
    ],
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
