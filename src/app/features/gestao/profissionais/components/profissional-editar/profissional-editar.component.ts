import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TmSelectComponent, TmSelectOption, TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { ClubesService } from '../../../../../core/services/clubes.service';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';
import { ThemeService } from '../../../../../core/services/theme.service';
import { DisponibilidadeComponent } from '../../../../disponibilidade/components/disponibilidade/disponibilidade.component';

@Component({
  selector: 'app-profissional-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmSelectComponent, DisponibilidadeComponent],
  templateUrl: './profissional-editar.component.html',
  styleUrl: './profissional-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfissionalEditarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly clubesService = inject(ClubesService);
  private readonly meEstabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);
  protected readonly themeService = inject(ThemeService);

  protected readonly profissional = signal<Usuario | null>(null);
  protected readonly salvando = signal<boolean>(false);
  protected readonly servicosOptions = signal<TmSelectOption[]>([]);
  protected readonly planosOptions = signal<TmSelectOption[]>([]);

  protected readonly fotoFile = signal<File | null>(null);
  protected readonly fotoPreview = signal<string>('');

  protected readonly fotoVisivel = computed(() => {
    if (this.fotoFile()) {
      return this.fotoPreview();
    }
    const p = this.profissional();
    return p?.fotoUrl ? this.meEstabelecimentoService.resolverUrl(p.fotoUrl) : '';
  });

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    sobrenome: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    numeroWhatsApp: ['', [Validators.required, Validators.maxLength(15)]],
    status: ['Ativo'],
    servicoIds: [[], [Validators.required]],
    planoIds: [[]],
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.voltar();
      return;
    }
    await this.carregarProfissional(id);
    await Promise.all([this.carregarAtuacao(id), this.carregarServicos(), this.carregarPlanos()]);
  }

  voltar(): void {
    const id = this.profissional()?.id;
    if (id) {
      this.router.navigate(['/gestao/profissionais', id]);
    } else {
      this.router.navigate(['/gestao/profissionais']);
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

    const p = this.profissional();
    if (!p) return;

    const digitsWhatsApp = (this.form.value.numeroWhatsApp ?? '').replace(/\D/g, '');
    if (!digitsWhatsApp || digitsWhatsApp.length < 10 || digitsWhatsApp.length > 13) {
      this.toastService.error('O número de WhatsApp é obrigatório e deve ter entre 10 e 13 dígitos.', 'Erro');
      return;
    }

    this.salvando.set(true);
    try {
      const raw = this.form.value;
      await this.gestaoUsuariosService.atualizar(p.id, {
        nome: raw.nome,
        sobrenome: raw.sobrenome,
        email: raw.email,
        telefone: digitsWhatsApp,
        status: raw.status,
        nivelAcessoId: p.nivelAcessoId,
        secundarioNivelAcessoId: p.secundarioNivelAcessoId ?? null,
      });

      if (this.fotoFile()) {
        await this.gestaoUsuariosService.salvarFoto(p.id, this.fotoFile()!);
      }

      await this.gestaoUsuariosService.salvarAtuacao({
        profissionalId: p.id,
        servicoIds: raw.servicoIds ?? [],
        planoIds: raw.planoIds ?? [],
      });

      this.toastService.success('Profissional atualizado com sucesso!', 'Sucesso');
      this.router.navigate(['/gestao/profissionais', p.id]);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregarAtuacao(id: string): Promise<void> {
    try {
      const atuacao = await this.gestaoUsuariosService.carregarAtuacao(id);
      this.form.patchValue({ servicoIds: atuacao.servicoIds, planoIds: atuacao.planoIds });
    } catch {
      // Falha no carregamento da atuação não impede a edição dos demais campos
    }
  }

  private async carregarServicos(): Promise<void> {
    try {
      if (this.catalogoService.servicos().length === 0) {
        await this.catalogoService.carregarServicos();
      }
      const ativos = this.catalogoService.servicos().filter((s) => s.status === 'Ativo');
      this.servicosOptions.set(ativos.map((s) => ({ value: s.id, label: s.nome })));
    } catch {
      this.servicosOptions.set([]);
    }
  }

  private async carregarPlanos(): Promise<void> {
    try {
      const planos = await firstValueFrom(this.clubesService.carregarClubes());
      const ativos = planos.filter((p) => p.status === 'Ativo');
      this.planosOptions.set(ativos.map((p) => ({ value: p.id, label: p.nome })));
    } catch {
      this.planosOptions.set([]);
    }
  }

  private async carregarProfissional(id: string): Promise<void> {
    try {
      // Cache da lista: preenche o formulário imediatamente quando disponível
      const cached = this.gestaoUsuariosService.usuarios().find((u) => u.id === id);
      if (cached) {
        this.preencherFormulario(cached);
        return;
      }

      await this.gestaoUsuariosService.carregarUsuarios();
      const user = this.gestaoUsuariosService.usuarios().find((u) => u.id === id);
      if (!user) {
        this.toastService.error('Profissional não encontrado.', 'Erro');
        this.voltar();
        return;
      }
      this.preencherFormulario(user);
    } catch {
      this.voltar();
    }
  }

  private formatarWhatsApp(numero: string): string {
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

  private preencherFormulario(user: Usuario): void {
    this.profissional.set(user);
    this.form.patchValue({
      nome: user.nome,
      sobrenome: user.sobrenome ?? '',
      email: user.email,
      numeroWhatsApp: this.formatarWhatsApp(user.telefone ?? ''),
      status: user.status,
    });
  }
}
