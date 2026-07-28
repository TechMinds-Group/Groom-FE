import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmModalComponent, TmTextComponent, TmSelectComponent, TmSelectOption, TmDateComponent } from '@techminds-group/tm-angular-lib';
import { AssinanteDetalhes } from '../../../models/assinante-config.model';
import { ContactPickerService } from '../../../../../core/services/contact-picker.service';

export interface AssinanteEdicaoPayload {
  clienteNome: string;
  celular: string;
  clienteEmail?: string;
  clubeId: string;
  dataInicio: string;
}

@Component({
  selector: 'app-assinante-modal-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmModalComponent, TmTextComponent, TmSelectComponent, TmDateComponent],
  templateUrl: './assinante-modal-editar.component.html',
  styleUrl: './assinante-modal-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssinanteModalEditarComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contactPicker = inject(ContactPickerService);

  readonly show = model<boolean>(false);
  readonly assinante = input<AssinanteDetalhes | null>(null);
  readonly clubeOptions = input<TmSelectOption[]>([]);

  readonly confirm = output<AssinanteEdicaoPayload>();
  readonly cancel = output<void>();

  protected readonly editForm: FormGroup = this.fb.group({
    clienteNome: ['', [Validators.required, Validators.maxLength(60)]],
    celular: ['', [Validators.required, Validators.maxLength(15), Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)]],
    clienteEmail: ['', [Validators.email]],
    clubeId: ['', [Validators.required]],
    dataInicio: ['', [Validators.required]],
  });

  protected readonly isContactPickerSupported = computed(() => this.contactPicker.isSupported() && !this.assinante());

  protected readonly showVCardFallback = computed(() => !this.contactPicker.isSupported() && !this.assinante());

  protected async importarVCard(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    const contact = this.contactPicker.parseVCard(text);
    if (!contact) return;

    this.editForm.patchValue({
      clienteNome: contact.nome,
      celular: contact.telefone,
      clienteEmail: contact.email,
    });
  }

  constructor() {
    effect(() => {
      if (this.show()) {
        const a = this.assinante();
        if (a) {
          this.editForm.patchValue({
            clienteNome: a.clienteNome,
            celular: a.telefone,
            clienteEmail: a.clienteEmail,
            clubeId: '',
            dataInicio: a.dataInicio,
          });
        } else {
          this.editForm.reset({
            clienteNome: '',
            celular: '',
            clienteEmail: '',
            clubeId: '',
            dataInicio: new Date().toISOString().substring(0, 10),
          });
        }
      }
    });
  }

  protected async carregarContato(): Promise<void> {
    const contact = await this.contactPicker.pickContact();
    if (!contact) return;

    this.editForm.patchValue({
      clienteNome: contact.nome,
      celular: contact.telefone,
      clienteEmail: contact.email,
    });
  }

  protected salvar(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.confirm.emit(this.editForm.value as AssinanteEdicaoPayload);
  }

  protected fechar(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}
