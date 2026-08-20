import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmSelectComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-usuario-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmSelectComponent, TranslatePipe],
  templateUrl: './usuario-novo.component.html',
  styleUrl: './usuario-novo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioNovoComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly toastService = inject(TmToastService);
  protected readonly themeService = inject(ThemeService);

  protected readonly salvando = signal<boolean>(false);
  protected readonly perfilOptions = signal<{ value: string; label: string }[]>([]);
  protected readonly perfisSelecionados = signal<string[]>([]);

  protected readonly fotoFile = signal<File | null>(null);
  protected readonly fotoPreview = signal<string>('');

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    sobrenome: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]],
    telefone: ['', [Validators.required, Validators.maxLength(15)]],
    perfil: ['', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    const niveis = await this.gestaoUsuariosService.carregarNiveis();
    const options = niveis.map((n) => ({
      value: n.id,
      label: n.nome,
    }));
    this.perfilOptions.set(options);
    if (options.length > 0) {
      this.perfisSelecionados.set([options[0].value]);
      this.form.patchValue({ perfil: options[0].value });
    }
  }

  voltar(): void {
    this.router.navigate(['/gestao/gestao-usuarios']);
  }

  onPerfisChange(val: unknown): void {
    if (Array.isArray(val)) {
      let selected = val as string[];
      if (selected.length > 2) {
        selected = selected.slice(0, 2);
      }
      if (selected.length === 0 && this.perfilOptions().length > 0) {
        selected = [this.perfilOptions()[0].value];
      }
      this.perfisSelecionados.set(selected);
      this.form.patchValue({ perfil: selected.length > 0 ? selected[0] : '' });
    }
  }

  onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('A imagem de perfil deve ter no máximo 5MB.', 'Erro');
        return;
      }
      this.fotoFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.fotoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    try {
      const raw = this.form.value;
      const selected = this.perfisSelecionados();
      const id = await this.gestaoUsuariosService.adicionar({
        nome: raw.nome,
        sobrenome: raw.sobrenome,
        email: raw.email,
        senha: raw.senha,
        telefone: (raw.telefone ?? '').replace(/\D/g, ''),
        status: 'Ativo',
        nivelAcessoId: selected.length > 0 ? selected[0] : (this.perfilOptions()[0]?.value || ''),
        secundarioNivelAcessoId: selected.length > 1 ? selected[1] : null,
      });

      if (this.fotoFile() && id) {
        await this.gestaoUsuariosService.salvarFoto(id, this.fotoFile()!);
      }

      this.toastService.success('Usuário cadastrado com sucesso!', 'Sucesso');
      this.router.navigate(['/gestao/gestao-usuarios']);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }
}
