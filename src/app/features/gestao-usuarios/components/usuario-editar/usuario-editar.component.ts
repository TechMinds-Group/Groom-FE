import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmSelectComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { Usuario } from '../../../../core/models/gestao-usuarios/usuario.model';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { UsuarioEdicaoPayload } from '../../models/usuario-edicao-payload.model';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ThemeService } from '../../../../core/services/theme.service';
import { EstabelecimentoService } from '../../../../core/services/estabelecimento.service';

@Component({
  selector: 'app-usuario-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmSelectComponent, TranslatePipe],
  templateUrl: './usuario-editar.component.html',
  styleUrl: './usuario-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioEditarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly meEstabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);
  protected readonly themeService = inject(ThemeService);

  protected readonly usuario = signal<Usuario | null>(null);
  protected readonly salvando = signal<boolean>(false);
  protected readonly perfilOptions = signal<{ value: string; label: string }[]>([]);
  protected readonly perfisSelecionados = signal<string[]>([]);

  protected readonly fotoFile = signal<File | null>(null);
  protected readonly fotoPreview = signal<string>('');

  protected readonly fotoVisivel = computed(() => {
    if (this.fotoFile()) {
      return this.fotoPreview();
    }
    const u = this.usuario();
    return u?.fotoUrl ? this.meEstabelecimentoService.resolverUrl(u.fotoUrl) : '';
  });

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    sobrenome: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, Validators.maxLength(15)]],
    status: ['Ativo', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.voltar();
      return;
    }

    const niveis = await this.gestaoUsuariosService.carregarNiveis();
    this.perfilOptions.set(niveis.map((n) => ({ value: n.id, label: n.nome })));

    await this.carregarUsuario(id);
  }

  voltar(): void {
    const id = this.usuario()?.id;
    if (id) {
      this.router.navigate(['/gestao/gestao-usuarios', id]);
    } else {
      this.router.navigate(['/gestao/gestao-usuarios']);
    }
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
    }
  }

  alternarStatus(event: Event): void {
    const alvo = event.target as HTMLInputElement;
    this.form.get('status')?.setValue(alvo.checked ? 'Ativo' : 'Inativo');
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

    const u = this.usuario();
    if (!u) return;

    this.salvando.set(true);
    try {
      const val = this.form.value;
      const selected = this.perfisSelecionados();
      const payload: UsuarioEdicaoPayload = {
        nome: val.nome,
        sobrenome: val.sobrenome,
        email: val.email,
        telefone: (val.telefone ?? '').replace(/\D/g, ''),
        status: val.status,
        nivelAcessoId: selected.length > 0 ? selected[0] : '',
        secundarioNivelAcessoId: selected.length > 1 ? selected[1] : null,
        plano: u.planoAssinatura || undefined,
      };
      await this.gestaoUsuariosService.atualizar(u.id, payload);

      if (this.fotoFile()) {
        await this.gestaoUsuariosService.salvarFoto(u.id, this.fotoFile()!);
      }

      this.toastService.success('Usuário atualizado com sucesso!', 'Sucesso');
      this.router.navigate(['/gestao/gestao-usuarios', u.id]);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregarUsuario(id: string): Promise<void> {
    try {
      if (this.gestaoUsuariosService.usuarios().length === 0) {
        await this.gestaoUsuariosService.carregarUsuarios();
      }
      const user = this.gestaoUsuariosService.usuarios().find((u) => u.id === id);
      if (!user) {
        this.voltar();
        return;
      }

      this.usuario.set(user);

      const selectedValues: string[] = [];
      if (user.nivelAcessoId) {
        selectedValues.push(user.nivelAcessoId);
      }
      if (user.secundarioNivelAcessoId) {
        selectedValues.push(user.secundarioNivelAcessoId);
      }

      if (selectedValues.length === 0) {
        const userPerfis = (user.perfil || '')
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);

        for (const pName of userPerfis) {
          const matched = this.perfilOptions().find((n) => n.label === pName || n.value === pName);
          if (matched && !selectedValues.includes(matched.value)) {
            selectedValues.push(matched.value);
          }
        }
      }

      if (selectedValues.length === 0 && this.perfilOptions().length > 0) {
        selectedValues.push(this.perfilOptions()[0].value);
      }

      this.perfisSelecionados.set(selectedValues.slice(0, 2));

      this.form.patchValue({
        nome: user.nome,
        sobrenome: user.sobrenome ?? '',
        email: user.email,
        telefone: this.formatarTelefone(user.telefone || ''),
        status: user.status,
      });
    } catch {
      this.voltar();
    }
  }

  private formatarTelefone(numero: string): string {
    const digits = numero.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 13 && digits.startsWith('55')) {
      const rest = digits.slice(2);
      return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`;
    }
    return numero;
  }
}