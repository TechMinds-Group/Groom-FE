import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ServicoPayload } from '../../models/servico-payload.model';

@Component({
  selector: 'app-catalogo-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent],
  templateUrl: './catalogo-novo.component.html',
  styleUrl: './catalogo-novo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoNovoComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly catalogoService = inject(CatalogoService);
  private readonly toastService = inject(TmToastService);

  protected readonly salvando = signal<boolean>(false);

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    preco: ['', [Validators.required]],
    duracao: [''],
  });

  ngOnInit(): void {
    if (this.catalogoService.servicos().length === 0) {
      this.catalogoService.carregarServicos().catch(() => undefined);
    }
  }

  voltar(): void {
    this.router.navigate(['/servicos/catalogo']);
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    try {
      const val = this.form.getRawValue();
      const payload: ServicoPayload = {
        nome: val.nome,
        preco: this.parseCurrency(val.preco),
        duracao: val.duracao ? Number(val.duracao) : null,
        status: 'Ativo',
      };
      await this.catalogoService.adicionar(payload);
      this.toastService.success('Serviço cadastrado com sucesso!', 'Sucesso');
      this.router.navigate(['/servicos/catalogo']);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private parseCurrency(value: string | number | null): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = value.replace(/\D/g, '');
    return Number(clean) / 100;
  }
}