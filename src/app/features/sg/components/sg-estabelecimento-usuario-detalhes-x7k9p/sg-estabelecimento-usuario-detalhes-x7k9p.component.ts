import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TmTextComponent, TmSelectComponent, TmToastService, TmModalComponent } from '@techminds-group/tm-angular-lib';
import { ThemeService } from '../../../../core/services/theme.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sg-estabelecimento-usuario-detalhes-x7k9p',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmTextComponent,
    TmSelectComponent,
    TmModalComponent
  ],
  templateUrl: './sg-estabelecimento-usuario-detalhes-x7k9p.component.html',
  styleUrl: './sg-estabelecimento-usuario-detalhes-x7k9p.component.scss'
})
export class SgEstabelecimentoUsuarioDetalhesX7k9pComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(TmToastService);
  protected themeService = inject(ThemeService);

  protected empresaId = signal<string>('');
  protected usuarioId = signal<string>('');
  protected usuario = signal<any | null>(null);
  protected niveis = signal<any[]>([]);
  protected modoEdicao = signal<boolean>(false);
  protected salvando = signal<boolean>(false);
  protected showDeleteModal = signal<boolean>(false);

  protected perfisSelecionados = signal<string[]>([]);

  protected niveisOptions = computed(() =>
    this.niveis().map(n => ({ value: n.id, label: n.nome }))
  );

  protected form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(50)]],
    sobrenome: ['', [Validators.maxLength(50)]],
    email: [''],
    telefone: ['', [Validators.maxLength(20)]],
    senha: [''],
    perfil: ['', [Validators.required]],
    status: ['Ativo']
  });

  ngOnInit(): void {
    const empId = this.route.snapshot.paramMap.get('empresaId');
    const uId = this.route.snapshot.paramMap.get('id');

    if (empId && uId) {
      this.empresaId.set(empId);
      this.usuarioId.set(uId);
      this.carregarNiveis(empId);
      this.carregarUsuario(uId);
    } else {
      this.toastService.error('Parâmetros inválidos.', 'Erro');
      this.router.navigate(['/sg-estabelecimentos-x7k9p']);
    }
  }

  carregarNiveis(empId: string): void {
    this.authService.getSgNiveisAcesso(empId).subscribe({
      next: (data) => this.niveis.set(data || [])
    });
  }

  carregarUsuario(uId: string): void {
    this.authService.getSgUsuarioById(uId).subscribe({
      next: (data) => {
        this.usuario.set(data);
        this.preencherForm(data);
      },
      error: () => {
        this.toastService.error('Falha ao carregar informações do usuário.', 'Erro');
        this.voltar();
      }
    });
  }

  preencherForm(user: any): void {
    const selected: string[] = [];
    if (user.nivelAcessoId) {
      selected.push(user.nivelAcessoId);
    }
    if (user.secundarioNivelAcessoId) {
      selected.push(user.secundarioNivelAcessoId);
    }
    this.perfisSelecionados.set(selected);

    this.form.patchValue({
      nome: user.nome || '',
      sobrenome: user.sobrenome || '',
      email: user.email || '',
      telefone: user.telefone || '',
      perfil: selected.length > 0 ? selected[0] : '',
      status: user.status || 'Ativo'
    });
  }

  onPerfisChange(val: unknown): void {
    if (Array.isArray(val)) {
      let selected = val as string[];
      if (selected.length > 2) {
        selected = selected.slice(0, 2);
      }
      if (selected.length === 0 && this.niveisOptions().length > 0) {
        selected = [this.niveisOptions()[0].value];
      }
      this.perfisSelecionados.set(selected);
      this.form.patchValue({ perfil: selected.length > 0 ? selected[0] : '' });
    }
  }

  habilitarEdicao(): void {
    this.modoEdicao.set(true);
  }

  cancelarEdicao(): void {
    this.modoEdicao.set(false);
    if (this.usuario()) {
      this.preencherForm(this.usuario());
    }
  }

  voltar(): void {
    this.router.navigate(['/sg-estabelecimento-usuarios-x7k9p', this.empresaId()]);
  }

  alternarStatus(event: any): void {
    const isChecked = event.target.checked;
    this.form.patchValue({ status: isChecked ? 'Ativo' : 'Inativo' });
  }

  async salvarGeral(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Preencha os campos obrigatórios.', 'Atenção');
      return;
    }

    this.salvando.set(true);
    try {
      const raw = this.form.getRawValue();
      const selected = this.perfisSelecionados();

      await this.authService.updateSgUsuario(this.usuarioId(), {
        nome: raw.nome,
        sobrenome: raw.sobrenome || '',
        email: raw.email,
        telefone: (raw.telefone || '').replace(/\D/g, ''),
        nivelAcessoId: selected.length > 0 ? selected[0] : '',
        secundarioNivelAcessoId: selected.length > 1 ? selected[1] : null,
        senha: raw.senha || null
      }).toPromise();

      if (raw.status !== this.usuario()?.status) {
        await this.authService.toggleSgUsuarioStatus(this.usuarioId()).toPromise();
      }

      this.toastService.success('Usuário atualizado com sucesso!', 'Sucesso');
      this.modoEdicao.set(false);
      this.carregarUsuario(this.usuarioId());
    } catch (err: any) {
      const msg = err?.error?.message || 'Erro ao atualizar usuário.';
      this.toastService.error(msg, 'Erro');
    } finally {
      this.salvando.set(false);
    }
  }

  excluir(): void {
    this.showDeleteModal.set(true);
  }

  cancelarExcluir(): void {
    this.showDeleteModal.set(false);
  }

  async confirmarExcluir(): Promise<void> {
    this.showDeleteModal.set(false);
    try {
      await this.authService.deleteSgUsuario(this.usuarioId()).toPromise();
      this.toastService.success('Usuário excluído com sucesso!', 'Sucesso');
      this.voltar();
    } catch (err: any) {
      const msg = err?.error?.message || 'Erro ao excluir usuário.';
      this.toastService.error(msg, 'Erro');
    }
  }

  obterLinkWhatsapp(phone: string): string {
    const clean = (phone || '').replace(/\D/g, '');
    return `https://wa.me/55${clean}`;
  }
}