import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmDateComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ClientesService } from '../../../../core/services/clientes.service';
import { ClienteEdicaoPayload } from '../../models/cliente-edicao-payload.model';

@Component({
  selector: 'app-cliente-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmDateComponent],
  templateUrl: './cliente-novo.component.html',
  styleUrl: './cliente-novo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteNovoComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly clientesService = inject(ClientesService);
  private readonly toastService = inject(TmToastService);

  private readonly origem = this.route.snapshot.queryParamMap.get('origem');

  protected readonly salvando = signal<boolean>(false);

  protected readonly form: FormGroup = this.fb.group({
    primeiroNome: ['', [Validators.required, Validators.maxLength(50)]],
    sobrenome: ['', [Validators.required, Validators.maxLength(50)]],
    celular: ['', [Validators.required, Validators.maxLength(15), Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
    email: ['', [Validators.email]],
    cpf: ['', [Validators.maxLength(14)]],
    dataNascimento: [''],
    observacoes: ['', [Validators.maxLength(500)]],
  });

  voltar(): void {
    this.navegarAposCadastro();
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

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
      };
      await this.clientesService.adicionar(payload);
      this.toastService.success('Cliente cadastrado com sucesso!', 'Sucesso');
      this.navegarAposCadastro();
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private navegarAposCadastro(): void {
    if (this.origem === 'assinantes') {
      this.router.navigate(['/gestao/assinantes/novo']);
      return;
    }
    if (this.origem === 'agenda') {
      this.router.navigate(['/agenda/calendario']);
      return;
    }
    this.router.navigate(['/gestao/clientes']);
  }
}
