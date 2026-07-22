import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  ViewChild,
  TemplateRef,
  AfterViewInit,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TmTableComponent,
  TableColumn,
  TmModalComponent,
  TmTextComponent,
  TmSelectComponent,
} from '@techminds-group/tm-angular-lib';
import { LanguageService } from '../../../../core/services/language.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { Usuario } from '../../../../core/models/gestao-usuarios/usuario.model';
import { AuthService } from '../../../../core/services/auth.service';
import { GestaoUsuariosHelperService } from '../../services/gestao-usuarios-helper.service';
import { PerfilBadgePipe } from '../../pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../pipes/status-badge.pipe';

@Component({
  selector: 'app-gestao-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmTableComponent,
    TmModalComponent,
    TmTextComponent,
    TmSelectComponent,
    PerfilBadgePipe,
    StatusBadgePipe,
    TranslatePipe,
  ],
  templateUrl: './gestao-usuarios.component.html',
  styleUrl: './gestao-usuarios.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class GestaoUsuariosComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  protected readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly languageService = inject(LanguageService);

  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly currentUserId = this.authService.currentUserId;

  @ViewChild('usuarioTemplate', { static: true }) usuarioTemplate!: TemplateRef<{
    $implicit: Usuario;
  }>;
  @ViewChild('perfilTemplate', { static: true }) perfilTemplate!: TemplateRef<{
    $implicit: Usuario;
  }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{
    $implicit: Usuario;
  }>;

  private readonly templatesReady = signal(false);

  protected readonly cols = computed<TableColumn<Usuario>[]>(() => {
    // Read currentLang to register dependency
    this.languageService.currentLang();
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: this.languageService.translate('USUARIOS.COLUMNS.USER'), template: this.usuarioTemplate, width: '40%' },
      { header: this.languageService.translate('USUARIOS.COLUMNS.PROFILE'), template: this.perfilTemplate, width: '35%' },
      { header: this.languageService.translate('USUARIOS.COLUMNS.STATUS'), template: this.statusTemplate, width: '25%' },
    ];
  });

  protected readonly tamanhoPagina = signal<number>(5);

  protected readonly showFormModal = signal<boolean>(false);
  protected readonly usuarioSelecionado = signal<Usuario | null>(null);
  protected readonly status = signal<'Ativo' | 'Inativo'>('Ativo');

  protected readonly perfilOptions = signal<{ value: string; label: string }[]>([]);

  protected readonly usuarioForm: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    senha: [''],
    perfil: ['', [Validators.required]],
    status: ['Ativo', [Validators.required]],
  });

  protected readonly perfisNovoUsuario = signal<string[]>([]);

  protected readonly isSalvando = signal<boolean>(false);

  protected onPerfisNovoUsuarioChange(val: unknown): void {
    if (Array.isArray(val)) {
      let selected = val as string[];
      if (selected.length > 2) {
        selected = selected.slice(0, 2);
      }
      if (selected.length === 0 && this.perfilOptions().length > 0) {
        selected = [this.perfilOptions()[0].value];
      }
      this.perfisNovoUsuario.set(selected);
      this.usuarioForm.patchValue({ perfil: selected.length > 0 ? selected[0] : '' });
    }
  }

  async ngOnInit(): Promise<void> {
    await this.gestaoUsuariosService.carregarUsuarios();
    const niveis = await this.gestaoUsuariosService.carregarNiveis();
    const options = niveis.map((n) => ({
      value: n.id,
      label: n.nome,
    }));
    this.perfilOptions.set(options);
    if (options.length > 0 && this.perfisNovoUsuario().length === 0) {
      this.perfisNovoUsuario.set([options[0].value]);
      this.usuarioForm.patchValue({ perfil: options[0].value });
    }
  }

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  abrirNovo(): void {
    if (!this.isAdmin()) {
      return;
    }
    this.usuarioSelecionado.set(null);
    const defaultPerfil = this.perfilOptions().length > 0 ? [this.perfilOptions()[0].value] : [];
    this.perfisNovoUsuario.set(defaultPerfil);
    this.usuarioForm.reset({
      nome: '',
      email: '',
      senha: '',
      perfil: defaultPerfil.length > 0 ? defaultPerfil[0] : '',
      status: 'Ativo',
    });
    this.status.set('Ativo');
    this.usuarioForm.get('senha')?.setValidators([Validators.required]);
    this.usuarioForm.get('senha')?.updateValueAndValidity();
    this.showFormModal.set(true);
  }

  toggleStatus(): void {
    if (!this.isAdmin()) {
      return;
    }
    const current = this.status();
    const newStatus = current === 'Ativo' ? 'Inativo' : 'Ativo';
    this.status.set(newStatus);
    this.usuarioForm.patchValue({ status: newStatus });
  }

  async salvar(): Promise<void> {
    if (!this.isAdmin() || this.isSalvando()) {
      return;
    }

    // Garante que o perfil selecionado esteja sincronizado com a validação do formulário
    const selectedPerfis = this.perfisNovoUsuario();
    if (selectedPerfis.length > 0) {
      this.usuarioForm.patchValue({ perfil: selectedPerfis[0] });
    }

    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    const formVal = this.usuarioForm.getRawValue();
    const primaryPerfilId = selectedPerfis.length > 0 ? selectedPerfis[0] : (this.perfilOptions()[0]?.value || '');
    const secondaryPerfilId = selectedPerfis.length > 1 ? selectedPerfis[1] : null;

    const dadosEnvio = {
      nome: formVal.nome,
      email: formVal.email,
      senha: formVal.senha,
      status: this.usuarioSelecionado() ? this.status() : 'Ativo',
      nivelAcessoId: primaryPerfilId,
      secundarioNivelAcessoId: secondaryPerfilId,
    };

    try {
      this.isSalvando.set(true);
      await this.gestaoUsuariosService.adicionar(dadosEnvio);
      this.showFormModal.set(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar usuário:', err);
    } finally {
      this.isSalvando.set(false);
    }
  }

  verDetalhes(user: Usuario): void {
    this.router.navigate(['/gestao/gestao-usuarios', user.id]);
  }
}
