import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TmTextComponent, TmSelectComponent, TmSelectOption, TmToastService } from '@techminds-group/tm-angular-lib';
import { ClubesService, ClubeConfig } from '../../../../core/services/clubes.service';
import { EstabelecimentoService, validarImagemArquivo } from '../../../../core/services/estabelecimento.service';
import { BeneficiosService } from '../../../../core/services/beneficios.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { PlanoPayload } from '../../models/plano-payload.model';

@Component({
  selector: 'app-plano-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmSelectComponent],
  templateUrl: './plano-editar.component.html',
  styleUrl: './plano-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanoEditarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly clubesService = inject(ClubesService);
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly beneficiosService = inject(BeneficiosService);
  private readonly toastService = inject(TmToastService);
  protected readonly themeService = inject(ThemeService);

  protected readonly plano = signal<ClubeConfig | null>(null);
  protected readonly salvando = signal<boolean>(false);
  protected readonly uploadingSlot = signal<number | null>(null);
  protected readonly imagemUrl = signal<string | null>(null);
  protected readonly imagemUrl2 = signal<string | null>(null);
  protected readonly imagemUrl3 = signal<string | null>(null);
  protected readonly mostrarSlot2 = signal<boolean>(false);
  protected readonly mostrarSlot3 = signal<boolean>(false);
  protected readonly opcoesBeneficios = signal<{ value: string; label: string }[]>([]);

  protected readonly imagemVisivel1 = computed(() =>
    this.estabelecimentoService.resolverUrl(this.imagemUrl() || undefined),
  );
  protected readonly imagemVisivel2 = computed(() =>
    this.estabelecimentoService.resolverUrl(this.imagemUrl2() || undefined),
  );
  protected readonly imagemVisivel3 = computed(() =>
    this.estabelecimentoService.resolverUrl(this.imagemUrl3() || undefined),
  );

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(50)]],
    preco: ['', [Validators.required]],
    frequencia: ['mensal', [Validators.required]],
    descricao: ['', [Validators.maxLength(200)]],
    beneficios: [[], [Validators.required]],
    status: ['Ativo', [Validators.required]],
  });

  protected readonly frequenciaOptions: TmSelectOption[] = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'mensal', label: 'Mensal' },
    { value: 'anual', label: 'Anual' },
  ];

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.voltar();
      return;
    }
    await this.carregarPlano(id);
    await this.carregarBeneficiosGlobais();
  }

  voltar(): void {
    const id = this.plano()?.id;
    if (id) {
      this.router.navigate(['/servicos/planos-estabelecimento', id]);
    } else {
      this.router.navigate(['/servicos/planos-estabelecimento']);
    }
  }

  alternarStatus(event: Event): void {
    const alvo = event.target as HTMLInputElement;
    this.form.get('status')?.setValue(alvo.checked ? 'Ativo' : 'Inativo');
  }

  triggerUpload(input: HTMLInputElement): void {
    input.click();
  }

  adicionarMaisFoto(): void {
    if (!this.mostrarSlot2()) {
      this.mostrarSlot2.set(true);
    } else if (!this.mostrarSlot3()) {
      this.mostrarSlot3.set(true);
    }
  }

  async onImagemSelected(event: Event, slot: 1 | 2 | 3): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!validarImagemArquivo(file, this.toastService)) {
      input.value = '';
      return;
    }

    this.uploadingSlot.set(slot);
    try {
      const result = await this.estabelecimentoService.uploadImagemItem(file, 'plano');
      if (slot === 1) {
        this.imagemUrl.set(result.imagemUrl);
      } else if (slot === 2) {
        this.imagemUrl2.set(result.imagemUrl);
        this.mostrarSlot2.set(true);
      } else if (slot === 3) {
        this.imagemUrl3.set(result.imagemUrl);
        this.mostrarSlot3.set(true);
      }
      this.toastService.success(`Imagem ${slot} enviada com sucesso!`, 'Sucesso');
    } catch (err: any) {
      const message = err?.error?.message || 'Falha ao enviar imagem. Verifique se o arquivo é válido (máx 3MB).';
      this.toastService.error(message, 'Erro');
    } finally {
      this.uploadingSlot.set(null);
      input.value = '';
    }
  }

  removerImagem(slot: 1 | 2 | 3): void {
    if (slot === 1) {
      this.imagemUrl.set(null);
    } else if (slot === 2) {
      this.imagemUrl2.set(null);
      this.mostrarSlot2.set(false);
    } else if (slot === 3) {
      this.imagemUrl3.set(null);
      this.mostrarSlot3.set(false);
    }
  }

  removerUltimaFoto(): void {
    if (this.mostrarSlot3() || this.imagemUrl3()) {
      this.imagemUrl3.set(null);
      this.mostrarSlot3.set(false);
    } else if (this.mostrarSlot2() || this.imagemUrl2()) {
      this.imagemUrl2.set(null);
      this.mostrarSlot2.set(false);
    } else if (this.imagemUrl()) {
      this.imagemUrl.set(null);
    }
  }

  async adicionarNovoBeneficio(term: string): Promise<void> {
    const val = term.trim();
    if (!val || val.length > 70) return;
    const current = this.form.get('beneficios')?.value || [];
    if (current.some((b: string) => b.toLowerCase() === val.toLowerCase())) return;
    try {
      await firstValueFrom(this.beneficiosService.addBeneficio(val));
      this.form.patchValue({ beneficios: [...current, val] });
      if (!this.opcoesBeneficios().some((o) => o.label.toLowerCase() === val.toLowerCase())) {
        this.opcoesBeneficios.update((opts) => [...opts, { value: val, label: val }]);
      }
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    }
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const p = this.plano();
    if (!p) return;

    const formVal = this.form.value;
    const recursos = [...new Set<string>(formVal.beneficios || [])];
    if (recursos.length === 0) return;

    this.salvando.set(true);
    try {
      const payload: PlanoPayload = {
        nome: formVal.nome,
        preco: this.parseCurrency(formVal.preco),
        frequencia: formVal.frequencia,
        descricao: formVal.descricao,
        recursos,
        status: formVal.status,
        imagemUrl: this.imagemUrl() || null,
        imagemUrl2: this.imagemUrl2() || null,
        imagemUrl3: this.imagemUrl3() || null,
      };
      await firstValueFrom(this.clubesService.atualizar(p.id, payload));
      this.toastService.success('Plano atualizado com sucesso!', 'Sucesso');
      this.router.navigate(['/servicos/planos-estabelecimento', p.id]);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregarPlano(id: string): Promise<void> {
    try {
      if (this.clubesService.clubes().length === 0) {
        await firstValueFrom(this.clubesService.carregarClubes());
      }
      const plano = this.clubesService.clubes().find((c) => c.id === id);
      if (!plano) {
        this.voltar();
        return;
      }

      this.plano.set(plano);
      this.imagemUrl.set(plano.imagemUrl || null);
      this.imagemUrl2.set(plano.imagemUrl2 || null);
      this.imagemUrl3.set(plano.imagemUrl3 || null);
      this.mostrarSlot2.set(!!plano.imagemUrl2);
      this.mostrarSlot3.set(!!plano.imagemUrl3);

      this.form.patchValue({
        nome: plano.nome,
        preco: plano.preco,
        frequencia: plano.frequencia,
        descricao: plano.descricao,
        beneficios: [...plano.recursos],
        status: plano.status,
      });
    } catch {
      this.voltar();
    }
  }

  private async carregarBeneficiosGlobais(): Promise<void> {
    try {
      const beneficios = await firstValueFrom(this.beneficiosService.getBeneficios());
      this.opcoesBeneficios.set(beneficios.map((b: string) => ({ value: b, label: b })));
    } catch {
      this.opcoesBeneficios.set([]);
    }
  }

  private parseCurrency(value: string | number | null): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = value.replace(/\D/g, '');
    return Number(clean) / 100;
  }
}