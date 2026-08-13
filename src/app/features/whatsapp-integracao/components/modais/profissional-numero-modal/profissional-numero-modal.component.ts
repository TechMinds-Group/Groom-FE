import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TmModalComponent } from '@techminds-group/tm-angular-lib';
import { ProfissionalWhatsAppConfig } from '../../../../../core/models/whatsapp/whatsapp.model';

@Component({
  selector: 'app-profissional-numero-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TmModalComponent],
  templateUrl: './profissional-numero-modal.component.html',
  styleUrl: './profissional-numero-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfissionalNumeroModalComponent {
  readonly show = input<boolean>(false);
  readonly profissionaisDisponiveis = input<ProfissionalWhatsAppConfig[]>([]);
  readonly configParaEditar = input<ProfissionalWhatsAppConfig | null>(null);

  readonly cancelar = output<void>();
  readonly salvar = output<{ profissionalId: string; numero: string }>();

  protected readonly profissionalId = signal<string>('');
  protected readonly numeroCelular = signal<string>('');
  protected readonly erro = signal<string | null>(null);

  constructor() {
    effect(
      () => {
        const config = this.configParaEditar();
        if (config) {
          this.profissionalId.set(config.profissionalId);
          this.numeroCelular.set(config.numero || '');
        } else {
          this.profissionalId.set('');
          this.numeroCelular.set('');
        }
        this.erro.set(null);
      },
      { allowSignalWrites: true },
    );
  }

  protected onProfissionalChange(val: string): void {
    this.profissionalId.set(val);
    this.erro.set(null);
  }

  protected onNumeroChange(val: string): void {
    this.numeroCelular.set(val);
    this.erro.set(null);
  }

  protected fechar(): void {
    this.cancelar.emit();
  }

  protected submeter(): void {
    const profId = this.profissionalId();
    const rawNumero = this.numeroCelular();

    if (!profId) {
      this.erro.set('Selecione um profissional.');
      return;
    }

    if (!rawNumero || !rawNumero.trim()) {
      this.erro.set('O número de WhatsApp é obrigatório.');
      return;
    }

    const digits = rawNumero.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      this.erro.set('O número de WhatsApp deve ter entre 10 e 13 dígitos numéricos.');
      return;
    }

    this.salvar.emit({
      profissionalId: profId,
      numero: digits,
    });
  }
}
