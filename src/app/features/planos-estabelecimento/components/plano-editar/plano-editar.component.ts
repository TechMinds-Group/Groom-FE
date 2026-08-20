import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TmTextComponent, TmSelectComponent, TmSelectOption, TmToastService } from '@techminds-group/tm-angular-lib';
import { ClubesService, ClubeConfig } from '../../../../core/services/clubes.service';
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
  private readonly beneficiosService = inject(BeneficiosService);
  private readonly toastService = inject(TmToastService);
  protected readonly themeService = inject(ThemeService);

  protected readonly plano = signal<ClubeConfig | null>(null);
  protected readonly salvando = signal<boolean>(false);
  protected readonly opcoesBeneficios = signal<{ value: string; label: string }[]>([]);

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