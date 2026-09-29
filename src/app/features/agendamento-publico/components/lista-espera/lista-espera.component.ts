import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AgendamentoPublicoService } from '../../../../core/services/agendamento-publico.service';
import { AppFooterComponent } from '../../../../shared/components/footer/app-footer.component';
import { TemaPublicoService } from '../../services/tema-publico.service';
import { ListaEsperaPortalComponent } from './lista-espera-portal/lista-espera-portal.component';

/**
 * Página da lista de espera do portal do cliente (UI_SPEC §5.14) — rota
 * `/agendamento/:estabelecimento/lista-espera` (tenantResolver + clienteAuthGuard).
 * Exibe o card de status quando há entrada ativa ou o botão/modal para entrar.
 */
@Component({
  selector: 'app-lista-espera',
  standalone: true,
  imports: [AppFooterComponent, ListaEsperaPortalComponent],
  templateUrl: './lista-espera.component.html',
  styleUrl: './lista-espera.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaEsperaComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly agendamentoPublicoService = inject(AgendamentoPublicoService);
  private readonly temaPublico = inject(TemaPublicoService);

  ngOnInit(): void {
    const slug =
      this.route.snapshot.paramMap.get('estabelecimento') ||
      this.route.snapshot.parent?.paramMap.get('estabelecimento');
    if (slug) {
      this.agendamentoPublicoService.setEstabelecimento(slug);
    }
  }

  ngOnDestroy(): void {
    this.temaPublico.restaurarTemaAnterior();
  }
}
