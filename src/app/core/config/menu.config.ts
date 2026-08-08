import { MenuItem, ProfileMenuItem } from '@techminds-group/tm-angular-lib';

/**
 * Definição centralizada de todos os menus disponíveis na sidebar.
 * Adicione novos itens de menu aqui para disponibilizá-los no sistema.
 */
export const ALL_SIDEBAR_MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard', icon: 'fas fa-th-large', route: '/dashboard' },
  {
    label: 'Agenda',
    icon: 'fas fa-calendar-alt',
    roles: ['Profissional'],
    subItems: [
      { label: 'Calendário', icon: 'fas fa-calendar-day', route: '/agenda/calendario' },
    ],
  },
  {
    label: 'Agendamento',
    icon: 'fas fa-calendar-check',
    subItems: [
      {
        label: 'Link do Cliente',
        icon: 'fas fa-link',
        route: '/agendamento-estabelecimento',
      },
    ],
  },
  {
    label: 'Gestão',
    icon: 'fas fa-users',
    subItems: [
      { label: 'Clientes', icon: 'fas fa-user', route: '/gestao/clientes' },
      { label: 'Assinantes', icon: 'fas fa-user-check', route: '/gestao/assinantes' }
    ],
  },
  {
    label: 'Equipe',
    icon: 'fas fa-user-tie',
    subItems: [
      { label: 'Profissionais', icon: 'fas fa-id-badge', route: '/gestao/profissionais' },
      { label: 'Gestão de Usuários', icon: 'fas fa-users', route: '/gestao/gestao-usuarios' }
    ],
  },
  {
    label: 'Serviços',
    icon: 'fas fa-cut',
    subItems: [
      { label: 'Catálogo', icon: 'fas fa-list', route: '/servicos/catalogo' },
      { label: 'Planos', icon: 'fas fa-award', route: '/servicos/planos-estabelecimento' },
    ],
  },
  {
    label: 'Minha Assinatura',
    icon: 'fas fa-credit-card',
    route: '/assinatura',
  },
  {
    label: 'Configurações',
    icon: 'fas fa-cog',
    route: '/configuracoes',
  }
];

/**
 * Lista de controle centralizada dos menus que devem ser exibidos na sidebar.
 * Apenas os menus cujos 'label' estejam nesta lista serão visíveis.
 */
export const VISIBLE_SIDEBAR_MENUS: string[] = ['Dashboard', 'Agenda', 'Agendamento', 'Gestão', 'Serviços', 'Configurações'];

/**
 * Filtra itens de menu pela visibilidade baseada em perfil:
 * itens com `roles` definido só são exibidos se o usuário tiver um dos perfis (qualquer nível).
 */
export function filterMenuByRoles(items: MenuItem[], roles: string[]): MenuItem[] {
  return items
    .filter(item => !item.roles || item.roles.some(r => roles.includes(r)))
    .map(item => item.subItems
      ? { ...item, subItems: filterMenuByRoles(item.subItems, roles) }
      : item);
}

/**
 * Itens do menu do usuário (dropdown no perfil da sidebar).
 * Use `hidden: true` para ocultar sem remover do config.
 */
export const PROFILE_MENU_ITEMS: ProfileMenuItem[] = [
  { label: 'Gestão de Usuários', icon: 'fas fa-users', route: '/users' },
  { label: 'Minha Assinatura', icon: 'fas fa-credit-card', route: '/assinatura' },
  { label: 'Idioma', icon: 'fas fa-globe', action: 'language' },
  { label: 'Modo de Tela', icon: 'fas fa-moon', action: 'theme-toggle' },
];
