import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmDateComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ClientesService } from '../../../../core/services/clientes.service';
import { Cliente } from '../../../../core/models/clientes/cliente.model';
import { ClienteEdicaoPayload } from '../../models/cliente-edicao-payload.model';
import { ClientesHelperService } from '../../services/clientes-helper.service';

@Component({
  selector: 'app-cliente-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmDateComponent],
  templateUrl: './cliente-editar.component.html',
  styleUrl: './cliente-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientesHelperService],
})
export class ClienteEditarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly clientesService = inject(ClientesService);
  private readonly toastService = inject(TmToastService);
  private readonly helper = inject(ClientesHelperService);

  protected readonly cliente = signal<Cliente | null>(null);
  protected readonly salvando = signal<boolean>(false);

  protected readonly form: FormGroup = this.fb.group({
    primeiroNome: ['', [Validators.required, Validators.maxLength(50)]],
    sobrenome: ['', [Validators.required, Validators.maxLength(50)]],
    celular: ['', [Validators.required, Validators.maxLength(15), Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
    email: ['', [Validators.email]],
    cpf: ['', [Validators.maxLength(14)]],
    dataNascimento: [''],
    observacoes: ['', [Validators.maxLength(500)]],
    status: ['Ativo'],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.voltar();
      return;
    }
    this.carregarCliente(id);
  }

  voltar(): void {
    const id = this.cliente()?.id;
    if (id) {
      this.router.navigate(['/gestao/clientes', id]);
    } else {
      this.router.navigate(['/gestao/clientes']);
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

    const c = this.cliente();
    if (!c) return;

    this.salvando.set(true);
    try {
      const raw = this.form.value;
      const payload: ClienteEdicaoPayload = {
        primeiroNome: raw.primeiroNome,
        sobrenome: raw.sobrenome,
        celular: raw.celular,
        email: raw.email || undefined,
        cpf: raw.cpf || undefined,
        dataNascimento: raw.dataNascimento || undefined,
        observacoes: raw.observacoes || undefined,
        status: raw.status,
      };
      await this.clientesService.atualizar(c.id, payload);
      this.toastService.success('Cliente atualizado com sucesso!', 'Sucesso');
      this.router.navigate(['/gestao/clientes', c.id]);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregarCliente(id: string): Promise<void> {
    try {
      const c = await this.clientesService.carregarClientePorId(id);
      this.cliente.set(c);
      const { primeiroNome, sobrenome } = this.helper.separarNome(c);
      this.form.patchValue({
        primeiroNome,
        sobrenome,
        celular: c.celular,
        email: c.email || '',
        cpf: c.cpf || '',
        dataNascimento: c.dataNascimento || '',
        observacoes: c.observacoes || '',
        status: c.status,
      });
    } catch {
      this.router.navigate(['/gestao/clientes']);
    }
  }
}
