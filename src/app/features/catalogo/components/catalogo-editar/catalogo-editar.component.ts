import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ServicoCatalogo } from '../../../../core/models/catalogo/servico.model';
import { ServicoPayload } from '../../models/servico-payload.model';

@Component({
  selector: 'app-catalogo-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent],
  templateUrl: './catalogo-editar.component.html',
  styleUrl: './catalogo-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoEditarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly catalogoService = inject(CatalogoService);
  private readonly toastService = inject(TmToastService);

  protected readonly servico = signal<ServicoCatalogo | null>(null);
  protected readonly salvando = signal<boolean>(false);

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    preco: ['', [Validators.required]],
    duracao: [''],
    status: ['Ativo', [Validators.required]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.voltar();
      return;
    }
    this.carregarServico(id);
  }

  voltar(): void {
    const id = this.servico()?.id;
    if (id) {
      this.router.navigate(['/servicos/catalogo', id]);
    } else {
      this.router.navigate(['/servicos/catalogo']);
    }
  }

  alternarStatus(event: Event): void {
    const alvo = event.target as HTMLInputElement;
    this.form.get('status')?.setValue(alvo.checked ? 'Ativo' : 'Inativo');
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const s = this.servico();
    if (!s) return;

    this.salvando.set(true);
    try {
      const val = this.form.getRawValue();
      const payload: ServicoPayload = {
        nome: val.nome,
        preco: this.parseCurrency(val.preco),
        duracao: val.duracao ? Number(val.duracao) : null,
        status: val.status,
      };
      await this.catalogoService.atualizar(s.id, payload);
      this.toastService.success('Serviço atualizado com sucesso!', 'Sucesso');
      this.router.navigate(['/servicos/catalogo', s.id]);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregarServico(id: string): Promise<void> {
    try {
      if (this.catalogoService.servicos().length === 0) {
        await this.catalogoService.carregarServicos();
      }
      const s = this.catalogoService.servicos().find((c) => c.id === id);
      if (!s) {
        this.voltar();
        return;
      }

      this.servico.set(s);
      this.form.patchValue({
        nome: s.nome,
        preco: s.preco,
        duracao: s.duracao ?? '',
        status: s.status,
      });
    } catch {
      this.voltar();
    }
  }

  private parseCurrency(value: string | number | null): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = value.replace(/\D/g, '');
    return Number(clean) / 100;
  }
}