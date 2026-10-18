import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmButtonComponent, TmSelectComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { TemaPublicoService } from '../../../services/tema-publico.service';
import { paraOpcoesPais } from '../../../models/paises-ddi.model';

/** Dados do cadastro a serem confirmados na tela de finalização. */
export interface DadosFinalizacaoCadastro {
  primeiroNome: string;
  ultimoNome: string;
  email: string;
  codigoPais: string;
  celular: string;
}

/**
 * Tela de finalização de cadastro exibida dentro do wizard de agendamento quando
 * o cliente tenta confirmar com dados incompletos (nome completo, e-mail ou celular).
 */
@Component({
  selector: 'app-finalizar-cadastro',
  standalone: true,
  imports: [ReactiveFormsModule, TmTextComponent, TmSelectComponent, TmButtonComponent],
  templateUrl: './finalizar-cadastro.component.html',
  styleUrl: './finalizar-cadastro.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalizarCadastroComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly temaPublico = inject(TemaPublicoService);

  readonly primeiroNome = input('');
  readonly ultimoNome = input('');
  readonly email = input('');
  readonly celular = input('');
  readonly isSaving = input(false);

  readonly salvar = output<DadosFinalizacaoCadastro>();
  readonly cancelar = output<void>();

  readonly form = this.fb.group({
    primeiroNome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(15)]],
    ultimoNome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(15)]],
    email: ['', [Validators.required, Validators.email]],
    // RN-074 — código do país (DDI) selecionado; default Brasil
    codigoPais: ['55', [Validators.required]],
    celular: ['', [Validators.required, Validators.minLength(10)]],
  });

  /** RN-074 — opções de DDI para o select de código do país (tema escuro). */
  readonly paisesOptions = paraOpcoesPais();
  protected readonly isDark = computed(() => this.temaPublico.tema() === 'dark');

  readonly errorMessage = signal<string | null>(null);

  // Os inputs só estão disponíveis no ngOnInit; por isso o preenchimento do form ocorre aqui
  ngOnInit(): void {
    this.form.patchValue({
      primeiroNome: this.primeiroNome(),
      ultimoNome: this.ultimoNome(),
      email: this.email(),
      celular: this.celular(),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { primeiroNome, ultimoNome, email, codigoPais, celular } = this.form.value;
    this.salvar.emit({
      primeiroNome: primeiroNome!,
      ultimoNome: ultimoNome!,
      email: email!,
      codigoPais: codigoPais!,
      celular: celular!,
    });
  }
}