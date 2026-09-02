import { ChangeDetectionStrategy, Component, output, signal, inject, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TmSidebarComponent, MenuItem, ProfileMenuItem, SidebarUser } from '@techminds-group/tm-angular-lib';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { ALL_SIDEBAR_MENU_ITEMS, VISIBLE_SIDEBAR_MENUS, PROFILE_MENU_ITEMS, filterMenuByRoles } from '../../core/config/menu.config';
import { SidebarModalIdiomaComponent } from './components/modais/sidebar-modal-idioma/sidebar-modal-idioma.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, TmSidebarComponent, SidebarModalIdiomaComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  public themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private languageService = inject(LanguageService);
  private router = inject(Router);
  protected isCollapsed = signal(false);
  protected avatarColor = signal('0D8ABC');
  protected showIdiomaModal = signal(false);
  protected currentPath = signal<string>(window.location.pathname);
  @ViewChild(TmSidebarComponent) sidebar!: TmSidebarComponent;

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentPath.set(event.urlAfterRedirects || event.url);
    });
  }

  protected readonly menuItems = computed<MenuItem[]>(() => {
    const currentUser = this.authService.currentUser();
    const roles = currentUser?.roles ?? [];
    const role = currentUser?.role ?? '';
    const path = this.currentPath();
    const isSuperAdmin = role === 'SuperAdmin' || roles.includes('SuperAdmin') || currentUser?.email === 'micheladm@fasto.com' || currentUser?.email?.startsWith('micheladm') || path.includes('/sg-');

    if (isSuperAdmin) {
      if (path.includes('/sg-estabelecimento-')) {
        const match = path.match(/\/sg-estabelecimento-(?:detalhes|usuarios|usuario-novo|usuario-detalhes|usuario-editar)-x7k9p\/([a-f0-9-]+)/i);
        const empId = match ? match[1] : '';

        return [
          {
            label: 'Voltar',
            icon: 'fas fa-arrow-left',
            route: '/sg-estabelecimentos-x7k9p',
          },
          {
            label: 'Usuários',
            icon: 'fas fa-users',
            route: empId ? `/sg-estabelecimento-usuarios-x7k9p/${empId}` : '#',
          },
          {
            label: 'Sair',
            icon: 'fas fa-sign-out-alt',
            route: '/sg-auth-x7k9p',
          },
        ];
      }

      return [
        {
          label: 'Estabelecimentos',
          icon: 'fas fa-store',
          route: '/sg-estabelecimentos-x7k9p',
        },
        {
          label: 'Planos',
          icon: 'fas fa-crown',
          route: '/sg-planos-x7k9p',
        },
        {
          label: 'Perfil',
          icon: 'fas fa-user-shield',
          route: '/sg-perfil-x7k9p',
        },
        {
          label: 'Sair',
          icon: 'fas fa-sign-out-alt',
          route: '/sg-auth-x7k9p',
        },
      ];
    }

    const acessos = (currentUser as any)?.acessosMenu || (currentUser as any)?.AcessosMenu || {};
    const gestaoSub = acessos?.gestao_sub || {};
    const servicosSub = acessos?.servicos_sub || {};
    const agendamentoSub = acessos?.agendamento_online_sub || {};
    const configuracoesSub = acessos?.configuracoes_sub || {};

    const filteredByRoles = filterMenuByRoles(
      ALL_SIDEBAR_MENU_ITEMS.filter(item =>
        VISIBLE_SIDEBAR_MENUS.includes(item.label)
      ),
      roles,
    );

    return filteredByRoles
      .filter(item => {
        if (item.label === 'Dashboard' && acessos.dashboard === false) return false;
        if (item.label === 'Agenda' && acessos.agenda === false) return false;
        if (item.label === 'Gestão' && acessos.gestao === false) return false;
        if (item.label === 'Serviços' && acessos.servicos === false) return false;
        if (item.label === 'Agendamento Online' && acessos.agendamento_online === false) return false;
        if (item.label === 'Configurações' && acessos.configuracoes === false) return false;
        return true;
      })
      .map(item => {
        if (!item.subItems) return item;

        let filteredSubs = [...item.subItems];

        if (item.label === 'Gestão') {
          filteredSubs = filteredSubs.filter(sub => {
            if (sub.label === 'Clientes' && gestaoSub.clientes === false) return false;
            if (sub.label === 'Assinantes' && gestaoSub.assinantes === false) return false;
            if (sub.label === 'Profissionais' && gestaoSub.profissionais === false) return false;
            if (sub.label === 'Usuários' && gestaoSub.usuarios === false) return false;
            return true;
          });
        } else if (item.label === 'Serviços') {
          filteredSubs = filteredSubs.filter(sub => {
            if (sub.label === 'Catálogo' && servicosSub.catalogo === false) return false;
            if (sub.label === 'Planos' && servicosSub.planos === false) return false;
            return true;
          });
        } else if (item.label === 'Agendamento Online') {
          filteredSubs = filteredSubs.filter(sub => {
            if (sub.label === 'Link do Cliente' && agendamentoSub.link_cliente === false) return false;
            return true;
          });
        } else if (item.label === 'Configurações') {
          filteredSubs = filteredSubs.filter(sub => {
            if (sub.label === 'Estabelecimento' && configuracoesSub.estabelecimento === false) return false;
            if (sub.label === 'WhatsApp' && configuracoesSub.whatsapp === false) return false;
            if (sub.label === 'Minha Assinatura' && configuracoesSub.assinatura === false) return false;
            if (sub.label === 'Logs do Sistema' && configuracoesSub.logs === false) return false;
            return true;
          });
        }

        return { ...item, subItems: filteredSubs };
      })
      .filter(item => !item.subItems || item.subItems.length > 0);
  });

  protected readonly profileMenuItems = computed<ProfileMenuItem[]>(() => {
    return PROFILE_MENU_ITEMS;
  });

  protected readonly currentUser = computed<SidebarUser | undefined>(() => {
    return undefined;
  });

  logout = output<void>();
  themeToggle = output<void>();
  collapseChange = output<boolean>();

  handleLogout(): void {
    this.logout.emit();
  }

  handleToggleCollapse(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
    this.collapseChange.emit(collapsed);
  }

  handleThemeToggle(): void {
    this.themeService.toggleTheme();
    this.themeToggle.emit();
    this.sidebar.isProfileOpen.set(false);
  }

  handleLanguageChange(_langCode: string): void {
    this.showIdiomaModal.set(true);
    this.sidebar.isProfileOpen.set(false);
  }

  handleItemClick(item: MenuItem): void {
    if (item.label === 'Voltar') {
      this.router.navigate(['/sg-estabelecimentos-x7k9p']);
      return;
    }
    if (item.label === 'Sair' || item.route === '/login' || item.route === '/sg-auth-x7k9p') {
      this.handleLogout();
    }
  }
}
