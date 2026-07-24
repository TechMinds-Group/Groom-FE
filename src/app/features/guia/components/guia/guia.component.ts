import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Topico {
  icone: string;
  titulo: string;
  descricao: string;
}

interface Versao {
  versao: string;
  data: string;
  welcome?: string;
  topicos?: Topico[];
  novidades?: Topico[];
  mudancas?: Topico[];
  removidos?: Topico[];
}

@Component({
  selector: 'app-guia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guia.component.html',
  styleUrl: './guia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuiaComponent {
  protected readonly versoes: Versao[] = [
    {
      versao: '1.0.0',
      data: 'Julho 2026',
      welcome: 'Bem-vindo ao Groom! Esta é a versão inicial do sistema, projetada para ajudar barbearias a gerenciar seus clientes, profissionais e serviços de forma simples e eficiente.',
      topicos: [
        {
          icone: 'fas fa-th-large',
          titulo: 'Dashboard',
          descricao: 'Visão geral do negócio. Acompanhe o faturamento mensal, total de assinantes, planos ativos e gráficos de evolução. Aqui você monitora os indicadores da barbearia sem precisar fazer nada — é só consultar.',
        },
        {
          icone: 'fas fa-users',
          titulo: 'Clientes > Assinantes',
          descricao: 'Gerencie os clientes que possuem plano de assinatura. Cadastre novos assinantes, veja detalhes de cada um, acompanhe o histórico de pagamentos e edite ou exclua quando necessário. Use a busca para encontrar rapidamente.',
        },

        {
          icone: 'fas fa-list',
          titulo: 'Serviços > Catálogo',
          descricao: 'Cadastre os serviços que a barbearia oferece (corte, barba, hidratação, etc.). Cada serviço tem nome, preço e duração. É daqui que saem os benefícios que você pode incluir nos planos de assinatura.',
        },
        {
          icone: 'fas fa-award',
          titulo: 'Serviços > Planos',
          descricao: 'Crie planos de assinatura para seus clientes combinando serviços do catálogo como benefícios. Defina nome, preço e frequência. Se precisar de um benefício que ainda não existe, crie na hora que ele é salvo automaticamente no catálogo. Planos com assinantes vinculados não podem ser excluídos.',
        },

        {
          icone: 'fas fa-users-gear',
          titulo: 'Menu do Perfil > Gestão de Usuários',
          descricao: 'Gerencie os usuários da barbearia com acesso ao sistema. Cadastre, edite ou remova profissionais e defina permissões de acesso.',
        },
        {
          icone: 'fas fa-credit-card',
          titulo: 'Menu do Perfil > Assinatura',
          descricao: 'Consulte o plano contratado do sistema Groom e acompanhe o uso da licença (limite de profissionais e clientes). Nesta versão, pagamentos e histórico financeiro não estão disponíveis — apenas a visualização do plano atual e dos usos.',
        },
        {
          icone: 'fas fa-language',
          titulo: 'Menu do Perfil > Idioma',
          descricao: 'Altere o idioma do sistema entre português, inglês e espanhol.',
        },
        {
          icone: 'fas fa-circle-half-stroke',
          titulo: 'Menu do Perfil > Tema',
          descricao: 'Alterne entre tema claro e escuro.',
        },
        {
          icone: 'fas fa-right-from-bracket',
          titulo: 'Menu do Perfil > Sair',
          descricao: 'Encerre sua sessão no sistema com segurança. O acesso ao Groom será bloqueado até o próximo login.',
        },
      ],
    },
  ];

  protected readonly versaoSelecionada = signal<Versao>(this.versoes[0]);

  protected selecionarVersao(v: Versao): void {
    this.versaoSelecionada.set(v);
  }
}
