import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TmTextComponent, TmSelectComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ThemeService } from '../../../../core/services/theme.service';
import { AuthService } from '../../../../core/services/auth.service';

interface SubmenuConfig {
  chave: string;
  label: string;
  ativo: boolean;
}

interface MenuConfig {
  chave: string;
  label: string;
  icon: string;
  ativo: boolean;
  submenus: SubmenuConfig[];
}

interface WhatsAppOptionConfig {
  chave: string;
  label: string;
  icon: string;
  ativo: boolean;
}

const MENU_DEFS = [
  { chave: 'dashboard', label: 'Dashboard', icon: 'fas fa-th-large', submenus: [] },
  { chave: 'agenda', label: 'Agenda / Calendário', icon: 'fas fa-calendar-alt', submenus: [] },
  {
    chave: 'gestao', label: 'Gestão', icon: 'fas fa-users', submenus: [
      { chave: 'clientes', label: 'Clientes' },
      { chave: 'assinantes', label: 'Assinantes' },
      { chave: 'profissionais', label: 'Profissionais' },
      { chave: 'usuarios', label: 'Usuários' }
    ]
  },
  {
    chave: 'servicos', label: 'Serviços & Planos', icon: 'fas fa-cut', submenus: [
      { chave: 'catalogo', label: 'Catálogo de Serviços' },
      { chave: 'planos', label: 'Planos do Estabelecimento' }
    ]
  },
  {
    chave: 'agendamento_online', label: 'Agendamento Online', icon: 'fas fa-globe', submenus: [
      { chave: 'link_cliente', label: 'Link do Cliente' }
    ]
  },
  {
    chave: 'configuracoes', label: 'Configurações do Sistema', icon: 'fas fa-cog', submenus: [
      { chave: 'estabelecimento', label: 'Dados do Estabelecimento' },
      { chave: 'whatsapp', label: 'Integração WhatsApp' },
      { chave: 'assinatura', label: 'Minha Assinatura' },
      { chave: 'logs', label: 'Logs do Sistema' }
    ]
  }
];

const WHATSAPP_DEFS = [
  { chave: 'opc1AgendarSite', label: 'Agendar no Site', icon: 'fas fa-globe' },
  { chave: 'opc2AgendarWhatsapp', label: 'Agendar por WhatsApp', icon: 'fab fa-whatsapp' },
  { chave: 'opc3MeusAgendamentos', label: 'Meus Agendamentos', icon: 'fas fa-calendar-check' },
  { chave: 'opc6Atendente', label: 'Falar com Atendente', icon: 'fas fa-headset' }
];

@Component({
  selector: 'app-sg-plano-editar-x7k9p',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmSelectComponent],
  templateUrl: './sg-plano-editar-x7k9p.component.html',
  styleUrl: './sg-plano-editar-x7k9p.component.scss'
})
export class SgPlanoEditarX7k9pComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(TmToastService);
  protected themeService = inject(ThemeService);

  protected planoId = signal<string>('');
  protected isLoading = signal<boolean>(true);
  protected salvando = signal<boolean>(false);

  protected menus = signal<MenuConfig[]>([]);
  protected whatsappOptions = signal<WhatsAppOptionConfig[]>([]);

  protected cicloOptions = [
    { value: 'Mensal', label: 'Mensal' },
    { value: 'Anual', label: 'Anual' },
    { value: 'Semestral', label: 'Semestral' },
    { value: 'Trimestral', label: 'Trimestral' }
  ];

  protected statusOptions = [
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Inativo', label: 'Inativo' }
  ];

  protected form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(100)]],
    descricao: ['', [Validators.maxLength(500)]],
    valor: [0, [Validators.required, Validators.min(0)]],
    ciclo: ['Mensal', [Validators.required]],
    status: ['Ativo', [Validators.required]],
    limiteProfissionais: [5, [Validators.required, Validators.min(1)]],
    limiteClientes: [100, [Validators.required, Validators.min(1)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.planoId.set(id);
      this.carregarPlano(id);
    } else {
      this.toastService.error('ID do plano inválido.', 'Erro');
      this.voltar();
    }
  }

  carregarPlano(id: string): void {
    this.isLoading.set(true);
    this.authService.getSgPlanoById(id).subscribe({
      next: (data) => {
        this.form.patchValue({
          nome: data.nome || '',
          descricao: data.descricao || '',
          valor: data.valor || 0,
          ciclo: data.ciclo || 'Mensal',
          status: data.status || 'Ativo',
          limiteProfissionais: data.limiteProfissionais || 5,
          limiteClientes: data.limiteClientes || 100
        });

        // Extrai permissões personalizadas salvas no plano
        let acessosObj: any = {};
        let waObj: any = {};

        if (data.permissoesJson) {
          try {
            const parsed = JSON.parse(data.permissoesJson);
            acessosObj = parsed.acessosMenu || {};
            waObj = parsed.fluxosWhatsApp || {};
          } catch { }
        }

        const gSub = acessosObj.gestao_sub || {};
        const sSub = acessosObj.servicos_sub || {};
        const aSub = acessosObj.agendamento_online_sub || {};
        const cSub = acessosObj.configuracoes_sub || {};

        const montadosMenus: MenuConfig[] = MENU_DEFS.map(def => {
          const mainAtivo = acessosObj[def.chave] !== false;
          let subList: SubmenuConfig[] = [];

          if (def.chave === 'gestao') {
            subList = def.submenus.map(s => ({ ...s, ativo: gSub[s.chave] !== false }));
          } else if (def.chave === 'servicos') {
            subList = def.submenus.map(s => ({ ...s, ativo: sSub[s.chave] !== false }));
          } else if (def.chave === 'agendamento_online') {
            subList = def.submenus.map(s => ({ ...s, ativo: aSub[s.chave] !== false }));
          } else if (def.chave === 'configuracoes') {
            subList = def.submenus.map(s => ({ ...s, ativo: cSub[s.chave] !== false }));
          }

          return { ...def, ativo: mainAtivo, submenus: subList };
        });

        const montadosWa: WhatsAppOptionConfig[] = WHATSAPP_DEFS.map(def => ({
          ...def,
          ativo: waObj[def.chave] !== false
        }));

        this.menus.set(montadosMenus);
        this.whatsappOptions.set(montadosWa);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Falha ao carregar plano.', 'Erro');
        this.voltar();
      }
    });
  }

  toggleMenu(chave: string): void {
    this.menus.update(items =>
      items.map(item => {
        if (item.chave === chave) {
          const novo = !item.ativo;
          return { ...item, ativo: novo, submenus: item.submenus.map(s => ({ ...s, ativo: novo })) };
        }
        return item;
      })
    );
  }

  toggleSubmenu(menuChave: string, subChave: string): void {
    this.menus.update(items =>
      items.map(item => {
        if (item.chave === menuChave) {
          const updated = item.submenus.map(s => s.chave === subChave ? { ...s, ativo: !s.ativo } : s);
          return { ...item, ativo: updated.some(s => s.ativo), submenus: updated };
        }
        return item;
      })
    );
  }

  toggleWhatsAppOption(chave: string): void {
    this.whatsappOptions.update(opts =>
      opts.map(o => o.chave === chave ? { ...o, ativo: !o.ativo } : o)
    );
  }

  voltar(): void {
    this.router.navigate(['/sg-planos-x7k9p']);
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Preencha os campos obrigatórios.', 'Atenção');
      return;
    }

    this.salvando.set(true);
    try {
      const raw = this.form.value;
      const mItems = this.menus();
      const getM = (k: string) => mItems.find(i => i.chave === k);
      const getS = (mk: string, sk: string) => getM(mk)?.submenus.find(s => s.chave === sk)?.ativo ?? true;

      const acessosMenuPayload = {
        dashboard: getM('dashboard')?.ativo ?? true,
        agenda: getM('agenda')?.ativo ?? true,
        gestao: getM('gestao')?.ativo ?? true,
        gestao_sub: {
          clientes: getS('gestao', 'clientes'),
          assinantes: getS('gestao', 'assinantes'),
          profissionais: getS('gestao', 'profissionais'),
          usuarios: getS('gestao', 'usuarios')
        },
        servicos: getM('servicos')?.ativo ?? true,
        servicos_sub: {
          catalogo: getS('servicos', 'catalogo'),
          planos: getS('servicos', 'planos')
        },
        agendamento_online: getM('agendamento_online')?.ativo ?? true,
        agendamento_online_sub: {
          link_cliente: getS('agendamento_online', 'link_cliente')
        },
        configuracoes: getM('configuracoes')?.ativo ?? true,
        configuracoes_sub: {
          estabelecimento: getS('configuracoes', 'estabelecimento'),
          whatsapp: getS('configuracoes', 'whatsapp'),
          assinatura: getS('configuracoes', 'assinatura'),
          logs: getS('configuracoes', 'logs')
        }
      };

      const waOpts = this.whatsappOptions();
      const getWa = (k: string) => waOpts.find(o => o.chave === k)?.ativo ?? true;

      const fluxosWhatsAppPayload = {
        opc1AgendarSite: getWa('opc1AgendarSite'),
        opc2AgendarWhatsapp: getWa('opc2AgendarWhatsapp'),
        opc3MeusAgendamentos: getWa('opc3MeusAgendamentos'),
        opc6Atendente: getWa('opc6Atendente')
      };

      await this.authService.updateSgPlano(this.planoId(), {
        nome: raw.nome,
        descricao: raw.descricao || null,
        valor: raw.valor,
        ciclo: raw.ciclo,
        status: raw.status,
        limiteProfissionais: raw.limiteProfissionais,
        limiteClientes: raw.limiteClientes,
        acessosMenu: acessosMenuPayload,
        fluxosWhatsApp: fluxosWhatsAppPayload
      }).toPromise();

      this.toastService.success('Plano e permissões atualizados com sucesso!', 'Sucesso');
      this.voltar();
    } catch (err: any) {
      const msg = err?.error?.message || 'Erro ao atualizar plano.';
      this.toastService.error(msg, 'Erro');
    } finally {
      this.salvando.set(false);
    }
  }
}
