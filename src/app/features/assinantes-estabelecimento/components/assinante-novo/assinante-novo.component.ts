import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmSelectComponent, TmDateComponent, TmSelectOption, TmToastService } from '@techminds-group/tm-angular-lib';
import { AssinantesService } from '../../../../core/services/assinantes.service';
import { ClubesService } from '../../../../core/services/clubes.service';
import { ClientesService } from '../../../../core/services/clientes.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { AssinanteEdicaoPayload } from '../modais/assinante-modal-editar/assinante-modal-editar.component';

const NOVO_CLIENTE_VALUE = '__novo_cliente__';

@Component({
  selector: 'app-assinante-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmSelectComponent, TmDateComponent],
  templateUrl: './assinante-novo.component.html',
  styleUrl: './assinante-novo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssinanteNovoComponent {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly assinantesService = inject(AssinantesService);
  private readonly clubesService = inject(ClubesService);
  private readonly clientesService = inject(ClientesService);
  private readonly toastService = inject(TmToastService);

  protected readonly themeService = inject(ThemeService);

  protected readonly salvando = signal<boolean>(false);

  protected readonly clienteOptions = computed<TmSelectOption[]>(() => {
    const opcoes = this.clientesService.clientes().map((c) => ({
      value: c.id,
      label: `${c.nome} (${c.celular})`,
    }));
    return [...opcoes, { value: NOVO_CLIENTE_VALUE, label: '+ Cadastrar novo cliente' }];
  });

  protected readonly clubeOptions = computed<TmSelectOption[]>(() => {
    return this.clubesService
      .clubes()
      .filter((c) => c.status === 'Ativo')
      .map((clube) => ({
        value: clube.id,
        label: `${clube.nome} (R$ ${clube.preco.toFixed(2).replace('.', ',')})`,
      }));
  });

  protected readonly form: FormGroup = this.fb.group({
    cliente: ['', [Validators.required]],
    clubeId: ['', [Validators.required]],
    dataInicio: [new Date().toISOString().substring(0, 10), [Validators.required]],
  });

  constructor() {
    this.clientesService.carregarClientes();
    this.clubesService.carregarClubes().subscribe();
  }

  voltar(): void {
    this.router.navigate(['/gestao/assinantes']);
  }

  onClienteChange(valor: unknown): void {
    if (valor === NOVO_CLIENTE_VALUE) {
      this.form.get('cliente')?.setValue('');
      this.router.navigate(['/gestao/clientes/novo'], { queryParams: { origem: 'assinantes' } });
    }
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;
    const cliente = this.clientesService.clientes().find((c) => c.id === raw.cliente);
    if (!cliente) return;

    this.salvando.set(true);
    try {
      const payload: AssinanteEdicaoPayload = {
        clienteNome: cliente.nome,
        celular: cliente.celular,
        clienteEmail: cliente.email,
        clubeId: raw.clubeId,
        dataInicio: raw.dataInicio,
      };
      await this.assinantesService.adicionar(payload);
      this.toastService.success('Assinante cadastrado com sucesso!', 'Sucesso');
      this.router.navigate(['/gestao/assinantes']);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }
}
