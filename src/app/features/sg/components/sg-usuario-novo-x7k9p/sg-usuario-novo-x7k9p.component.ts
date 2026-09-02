import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TmTextComponent, TmSelectComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ThemeService } from '../../../../core/services/theme.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sg-usuario-novo-x7k9p',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmSelectComponent],
  templateUrl: './sg-usuario-novo-x7k9p.component.html',
  styleUrl: './sg-usuario-novo-x7k9p.component.scss'
})
export class SgUsuarioNovoX7k9pComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(TmToastService);
  protected themeService = inject(ThemeService);

  protected empresaId = signal<string>('');
  protected empresa = signal<any | null>(null);
  protected niveis = signal<any[]>([]);
  protected salvando = signal<boolean>(false);

  protected perfisSelecionados = signal<string[]>([]);

  protected niveisOptions = computed(() =>
    this.niveis().map(n => ({ value: n.id, label: n.nome }))
  );

  protected form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(50)]],
    sobrenome: ['', [Validators.maxLength(50)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    telefone: ['', [Validators.maxLength(20)]],
    perfil: ['', [Validators.required]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('empresaId');
    if (id) {
      this.empresaId.set(id);
      this.carregarEmpresa(id);
      this.carregarNiveis(id);
    } else {
      this.toastService.error('Empresa não especificada.', 'Erro');
      this.router.navigate(['/sg-estabelecimentos-x7k9p']);
    }
  }

  carregarEmpresa(id: string): void {
    this.authService.getSgEmpresaById(id).subscribe({
      next: (data) => this.empresa.set(data)
    });
  }

  carregarNiveis(id: string): void {
    this.authService.getSgNiveisAcesso(id).subscribe({
      next: (data) => {
        this.niveis.set(data || []);
        if (data && data.length > 0) {
          this.perfisSelecionados.set([data[0].id]);
          this.form.patchValue({ perfil: data[0].id });
        }
      }
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

  voltar(): void {
    this.router.navigate(['/sg-estabelecimento-detalhes-x7k9p', this.empresaId()]);
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
      const selected = this.perfisSelecionados();
      await this.authService.createSgUsuario(this.empresaId(), {
        nome: raw.nome,
        sobrenome: raw.sobrenome || '',
        email: raw.email,
        senha: raw.senha,
        telefone: (raw.telefone || '').replace(/\D/g, ''),
        nivelAcessoId: selected.length > 0 ? selected[0] : (this.niveisOptions()[0]?.value || ''),
        secundarioNivelAcessoId: selected.length > 1 ? selected[1] : null
      }).toPromise();

      this.toastService.success('Usuário criado com sucesso!', 'Sucesso');
      this.voltar();
    } catch (err: any) {
      const msg = err?.error?.message || 'Erro ao cadastrar usuário.';
      this.toastService.error(msg, 'Erro');
    } finally {
      this.salvando.set(false);
    }
  }
}
