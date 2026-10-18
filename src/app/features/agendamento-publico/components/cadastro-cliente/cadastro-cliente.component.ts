import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmButtonComponent, TmSelectComponent, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { AuthClienteHelperService } from '../../services/auth-cliente-helper.service';
import { TemaPublicoService } from '../../services/tema-publico.service';
import { paraOpcoesPais } from '../../models/paises-ddi.model';

@Component({
  selector: 'app-cadastro-cliente',
  standalone: true,
  imports: [ReactiveFormsModule, TmTextComponent, TmSelectComponent, TmButtonComponent],
  templateUrl: './cadastro-cliente.component.html',
  styleUrl: './cadastro-cliente.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastroClienteComponent {
  private readonly fb = inject(FormBuilder);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly authClienteHelper = inject(AuthClienteHelperService);
  private readonly temaPublico = inject(TemaPublicoService);

  readonly cadastrado = output<void>();
  readonly voltarLogin = output<void>();

  readonly form = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    // RN-074 — código do país (DDI) selecionado; default Brasil
    codigoPais: ['55', [Validators.required]],
    celular: ['', [Validators.required, Validators.minLength(10)]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
    confirmarSenha: ['', [Validators.required]],
    rememberMe: [false],
  });

  /** RN-074 — opções de DDI para o select de código do país (tema escuro). */
  readonly paisesOptions = paraOpcoesPais();
  protected readonly isDark = computed(() => this.temaPublico.tema() === 'dark');

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, email, codigoPais, celular, senha, confirmarSenha, rememberMe } = this.form.value;

    const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean);
    const primeiroNome = partes[0] || '';
    const ultimoNome = partes.length > 1 ? partes[partes.length - 1] : '';

    if (primeiroNome.length > 15) {
      this.errorMessage.set('O primeiro nome deve ter no máximo 15 caracteres.');
      return;
    }

    if (ultimoNome.length > 15) {
      this.errorMessage.set('O último nome deve ter no máximo 15 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      this.errorMessage.set('As senhas não coincidem.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.agendamentoPublicoService.cadastro({
        nome: nome!,
        email: email!,
        senha: senha!,
        codigoPais: codigoPais!,
        celular: celular!,
      }, rememberMe ?? false);
      this.cadastrado.emit();
    } catch (err) {
      this.errorMessage.set(this.extrairMensagemErro(err));
    } finally {
      this.isLoading.set(false);
    }
  }

  private extrairMensagemErro(err: unknown): string {
    const error = err as { error?: { Message?: string; message?: string } };
    return error?.error?.Message ?? error?.error?.message ?? 'Ocorreu um erro ao cadastrar. Tente novamente.';
  }
}