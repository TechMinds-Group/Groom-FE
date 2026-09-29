import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TmModalComponent, TmSelectComponent, TmTextComponent, TmSelectOption } from '@techminds-group/tm-angular-lib';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { AdicionarServicoRequest } from '../../../../../core/models/comanda/comanda.model';

@Component({
  selector: 'app-comanda-modal-servico',
  standalone: true,
  imports: [CommonModule, FormsModule, TmModalComponent, TmSelectComponent, TmTextComponent],
  templateUrl: './comanda-modal-servico.component.html',
  styleUrl: './comanda-modal-servico.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComandaModalServicoComponent {
  private readonly catalogoService = inject(CatalogoService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);

  readonly show = model<boolean>(false);

  readonly confirm = output<AdicionarServicoRequest>();
  readonly cancel = output<void>();

  protected readonly servicoId = signal('');
  protected readonly profissionalId = signal('');
  protected readonly observacoes = signal('');

  /** Serviços ativos do catálogo (padrão agenda-modal-dia). */
  protected readonly servicoOptions = computed<TmSelectOption<string>[]>(() =>
    this.catalogoService
      .servicos()
      .filter((s) => !s.status || s.status === 'Ativo' || s.status.toLowerCase() === 'ativo')
      .map((s) => ({ value: s.id, label: s.nome })),
  );

  /** Profissionais com perfil Profissional, exibindo nome + sobrenome (padrão agenda-modal-dia). */
  protected readonly profissionalOptions = computed<TmSelectOption<string>[]>(() =>
    this.gestaoUsuariosService
      .usuarios()
      .filter((u) => u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional')))
      .map((u) => ({ value: u.id, label: u.sobrenome ? `${u.nome} ${u.sobrenome}` : u.nome })),
  );

  protected readonly podeConfirmar = computed(() => !!this.servicoId() && !!this.profissionalId());

  constructor() {
    effect(() => {
      if (this.show()) {
        this.servicoId.set('');
        this.profissionalId.set('');
        this.observacoes.set('');
        void this.catalogoService.carregarServicos();
        void this.gestaoUsuariosService.carregarUsuarios();
      }
    });
  }

  confirmar(): void {
    if (!this.podeConfirmar()) {
      return;
    }
    this.confirm.emit({
      servicoId: this.servicoId(),
      profissionalId: this.profissionalId(),
      observacoes: this.observacoes().trim() || undefined,
    });
    this.show.set(false);
  }

  protected fechar(): void {
    this.show.set(false);
    this.cancel.emit();
  }
}
