import {
  AfterViewInit,
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TableColumn, TmTableComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sg-estabelecimento-usuarios-x7k9p',
  standalone: true,
  imports: [CommonModule, TmTableComponent],
  templateUrl: './sg-estabelecimento-usuarios-x7k9p.component.html',
  styleUrl: './sg-estabelecimento-usuarios-x7k9p.component.scss',
})
export class SgEstabelecimentoUsuariosX7k9pComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(TmToastService);

  protected readonly empresaId = signal<string>('');
  protected readonly empresa = signal<any | null>(null);
  protected readonly usuarios = signal<any[]>([]);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly tamanhoPagina = signal<number>(10);

  @ViewChild('usuarioTemplate', { static: true })
  usuarioTemplate!: TemplateRef<{ $implicit: any }>;

  @ViewChild('celularTemplate', { static: true })
  celularTemplate!: TemplateRef<{ $implicit: any }>;

  @ViewChild('perfilTemplate', { static: true })
  perfilTemplate!: TemplateRef<{ $implicit: any }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: any }>;

  private readonly templatesReady = signal(false);

  protected readonly cols = computed<TableColumn<any>[]>(() => {
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Usuário', template: this.usuarioTemplate, width: '35%' },
      { header: 'Celular', template: this.celularTemplate, width: '30%' },
      { header: 'Perfil', template: this.perfilTemplate, width: '20%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ];
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('empresaId');
    if (id) {
      this.empresaId.set(id);
      this.carregarEmpresa(id);
      this.carregarUsuarios(id);
    } else {
      this.toastService.error('Identificador do estabelecimento inválido.', 'Erro');
      this.router.navigate(['/sg-estabelecimentos-x7k9p']);
    }
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  carregarEmpresa(id: string): void {
    this.authService.getSgEmpresaById(id).subscribe({
      next: (data) => this.empresa.set(data),
      error: () => this.toastService.error('Falha ao carregar informações da empresa.', 'Erro'),
    });
  }

  carregarUsuarios(id: string): void {
    this.isLoading.set(true);
    this.authService.getSgUsuarios(id).subscribe({
      next: (data) => {
        this.usuarios.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.toastService.error('Falha ao carregar usuários do estabelecimento.', 'Erro');
        this.isLoading.set(false);
      },
    });
  }

  verDetalhes(item: any): void {
    this.router.navigate(['/sg-estabelecimento-usuario-detalhes-x7k9p', this.empresaId(), item.id]);
  }

  abrirNovo(): void {
    this.router.navigate(['/sg-usuario-novo-x7k9p', this.empresaId()]);
  }
}
