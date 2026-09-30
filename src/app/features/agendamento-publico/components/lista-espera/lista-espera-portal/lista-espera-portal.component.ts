import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { ListaEsperaService } from '../../../../../core/services/lista-espera.service';
import { EntrarListaEsperaPayload, ListaEsperaItem } from '../../../../../core/models/lista-espera/lista-espera.model';
import { ListaEsperaModalPreferenciasComponent } from '../../modais/lista-espera-modal-preferencias/lista-espera-modal-preferencias.component';

/**
 * Widget da lista de espera no portal (UI_SPEC §5.14): com entrada ativa exibe o
 * card de status ("posição N do dia") com ação "Sair da lista"; sem entrada exibe
 * o botão "Entrar na lista de espera" que abre o modal de preferências.
 * Erros de negócio são exibidos como toast pelo errorInterceptor (§5.14).
 */
@Component({
  selector: 'app-lista-espera-portal',
  standalone: true,
  imports: [ListaEsperaModalPreferenciasComponent],
  templateUrl: './lista-espera-portal.component.html',
  styleUrl: './lista-espera-portal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaEsperaPortalComponent implements OnInit {
  private readonly listaEsperaService = inject(ListaEsperaService);
  private readonly toastService = inject(TmToastService);

  readonly carregando = signal(true);
  readonly entrada = signal<ListaEsperaItem | null>(null);
  readonly modalAberto = signal(false);
  readonly entrando = signal(false);
  readonly saindo = signal(false);

  async ngOnInit(): Promise<void> {
    await this.recarregarStatus();
  }

  /** Consulta a entrada ativa do dia; sem entrada o widget exibe o botão de entrar. */
  private async recarregarStatus(): Promise<void> {
    try {
      this.entrada.set(await this.listaEsperaService.meuStatus());
    } catch {
      // Erro já exibido como toast pelo errorInterceptor; widget cai no estado "sem entrada"
      this.entrada.set(null);
    } finally {
      this.carregando.set(false);
    }
  }

  abrirModal(): void {
    this.modalAberto.set(true);
  }

  /** Cria a entrada com as preferências do modal; 409 `ListaEspera.Duplicada` vira toast do backend. */
  async entrar(preferencias: EntrarListaEsperaPayload): Promise<void> {
    this.entrando.set(true);
    try {
      const criada = await this.listaEsperaService.entrar(preferencias);
      this.entrada.set(criada);
      this.modalAberto.set(false);
      this.toastService.success('Você entrou na lista de espera!', 'Lista de Espera');
    } catch {
      // Re-sincroniza: se a entrada já existia (409), o card de status passa a ser exibido
      await this.recarregarStatus();
      if (this.entrada()) {
        this.modalAberto.set(false);
      }
    } finally {
      this.entrando.set(false);
    }
  }

  /** Remove a própria entrada e volta ao estado inicial (botão de entrar). */
  async sair(): Promise<void> {
    const atual = this.entrada();
    if (!atual || this.saindo()) {
      return;
    }
    this.saindo.set(true);
    try {
      await this.listaEsperaService.sair(atual.id);
      this.entrada.set(null);
      this.toastService.success('Você saiu da lista de espera.', 'Lista de Espera');
    } catch {
      // 404 ou falha transiente: re-sincroniza com o servidor
      await this.recarregarStatus();
    } finally {
      this.saindo.set(false);
    }
  }
}
