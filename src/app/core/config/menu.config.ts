import { MenuItem, ProfileMenuItem } from '@techminds-group/tm-angular-lib';

/**
 * Definição centralizada de todos os menus disponíveis na sidebar.
 */
export const ALL_SIDEBAR_MENU_ITEMS: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'fas fa-th-large',
    route: '/dashboard',
  },
  {
    label: 'Agenda',
    icon: 'fas fa-calendar-alt',
    roles: ['Administrador', 'Profissional'],
    subItems: [
      { label: 'Minha Agenda', icon: 'fas fa-calendar-day', route: '/agenda/calendario' },
      { label: 'Disponibilidade', icon: 'fas fa-clock', route: '/agenda/disponibilidade' },
    ],
  },
  {
    label: 'Gestão',
    icon: 'fas fa-users',
    roles: ['Administrador', 'Profissional'],
    subItems: [
      { label: 'Clientes', icon: 'fas fa-user', route: '/gestao/clientes' },
      { label: 'Assinantes', icon: 'fas fa-user-check', route: '/gestao/assinantes' },
      { label: 'Profissionais', icon: 'fas fa-user-tie', route: '/gestao/profissionais' },
      { label: 'Usuários', icon: 'fas fa-user-shield', route: '/gestao/gestao-usuarios', roles: ['Administrador'] },
    ],
  },
  {
    label: 'Serviços',
    icon: 'fas fa-cut',
    roles: ['Administrador', 'Profissional'],
    subItems: [
      { label: 'Catálogo', icon: 'fas fa-list', route: '/servicos/catalogo' },
      { label: 'Planos', icon: 'fas fa-award', route: '/servicos/planos-estabelecimento' },
    ],
  },
  {
    label: 'Agendamento Online',
    icon: 'fas fa-globe',
    roles: ['Administrador', 'Profissional'],
    subItems: [
      {
        label: 'Link do Cliente',
        icon: 'fas fa-external-link-alt',
        route: '/agendamento-estabelecimento',
      },
    ],
  },
  {
    label: 'Configurações',
    icon: 'fas fa-cog',
    roles: ['Administrador'],
    subItems: [
      { label: 'Estabelecimento', icon: 'fas fa-store', route: '/configuracoes/estabelecimento' },
      { label: 'WhatsApp', icon: 'fab fa-whatsapp', route: '/configuracoes/whatsapp' },
      { label: 'Minha Assinatura', icon: 'fas fa-credit-card', route: '/assinatura' },
    ],
  },
  {
    label: 'Sair',
    icon: 'fas fa-sign-out-alt',
    route: '/login',
  },
];

/**
 * Lista de controle centralizada dos menus que devem ser exibidos na sidebar.
 */
export const VISIBLE_SIDEBAR_MENUS: string[] = [
  'Dashboard',
  'Agenda',
  'Gestão',
  'Serviços',
  'Agendamento Online',
  'Configurações',
  'Sair',
];

/**
 * Filtra itens de menu pela visibilidade baseada em perfil.
 */
export function filterMenuByRoles(items: MenuItem[], roles: string[]): MenuItem[] {
  return items
    .filter((item) => !item.roles || item.roles.some((r) => roles.includes(r)))
    .map((item) =>
      item.subItems
        ? { ...item, subItems: filterMenuByRoles(item.subItems, roles) }
        : item,
    );
}

/**
 * Menu do perfil desativado para remover o bloco e o menu popup do rodapé da sidebar.
 */
export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [];
