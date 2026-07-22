import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClubesService, ClubeConfig } from '../../../../core/services/clubes.service';
import {
  TmTableComponent,
  TableColumn,
} from '@techminds-group/tm-angular-lib';
import { BeneficiosService } from '../../../../core/services/beneficios.service';
import { LanguageService } from '../../../../core/services/language.service';
import { PlanoModalEditarComponent, PlanoEdicaoPayload } from '../modais/plano-modal-editar/plano-modal-editar.component';
import { StatusPlanoPipe } from '../../pipes/status-plano.pipe';
import { FrequenciaPlanoPipe } from '../../pipes/frequencia-plano.pipe';
import { PlanosEstabelecimentoHelperService } from '../../services/planos-estabelecimento-helper.service';

@Component({
  selector: 'app-planos-estabelecimento',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
    PlanoModalEditarComponent,
    StatusPlanoPipe,
    FrequenciaPlanoPipe,
  ],
  templateUrl: './planos-estabelecimento.component.html',
  styleUrl: './planos-estabelecimento.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PlanosEstabelecimentoHelperService],
})
export class PlanosEstabelecimentoComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  protected readonly clubesService = inject(ClubesService);
  protected readonly beneficiosService = inject(BeneficiosService);
  protected readonly helper = inject(PlanosEstabelecimentoHelperService);
  protected readonly languageService = inject(LanguageService);

  @ViewChild('nomeTemplate', { static: true })
  nomeTemplate!: TemplateRef<{ $implicit: ClubeConfig }>;

  @ViewChild('precoTemplate', { static: true })
  precoTemplate!: TemplateRef<{ $implicit: ClubeConfig }>;

  @ViewChild('frequenciaTemplate', { static: true })
  frequenciaTemplate!: TemplateRef<{ $implicit: ClubeConfig }>;

  @ViewChild('statusTemplate', { static: true })
  statusTemplate!: TemplateRef<{ $implicit: ClubeConfig }>;

  private readonly templatesReady = signal(false);

  protected readonly tamanhoPagina = signal<number>(5);

  protected readonly cols = computed<TableColumn<ClubeConfig>[]>(() => {
    this.languageService.currentLang();
    if (!this.templatesReady()) {
      return [];
    }
    return [
      { header: 'Nome', template: this.nomeTemplate, width: '30%' },
      { header: 'Preço', template: this.precoTemplate, width: '20%' },
      { header: 'Frequência', template: this.frequenciaTemplate, width: '20%' },
      { header: 'Assinantes', key: 'totalAssinantes', width: '15%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ];
  });

  protected readonly clubes = this.clubesService.clubes;

  protected readonly showFormModal = signal<boolean>(false);
  protected readonly opcoesBeneficios = signal<{ value: string; label: string }[]>([]);

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  verDetalhes(clube: ClubeConfig): void {
    this.router.navigate(['/servicos/planos-estabelecimento', clube.id]);
  }

  async ngOnInit(): Promise<void> {
    await firstValueFrom(this.clubesService.carregarClubes());
    await this.carregarBeneficiosGlobais();
  }

  private async carregarBeneficiosGlobais(): Promise<void> {
    try {
      const beneficios = await firstValueFrom(this.beneficiosService.getBeneficios());
      this.opcoesBeneficios.set(beneficios.map((b: string) => ({ value: b, label: b })));
    } catch {
      this.opcoesBeneficios.set([]);
    }
  }

  abrirNovo(): void {
    this.showFormModal.set(true);
  }

  async salvar(payload: PlanoEdicaoPayload): Promise<void> {
    try {
      await firstValueFrom(this.clubesService.adicionar(payload));
      this.showFormModal.set(false);
    } catch (err) {
      console.error('Erro ao salvar plano:', err);
    }
  }

  adicionarNovoBeneficio(val: string): void {
    const exists = this.opcoesBeneficios().some((o) => o.label.toLowerCase() === val.toLowerCase());
    if (!exists) {
      this.opcoesBeneficios.update((opts) => [...opts, { value: val, label: val }]);
      this.beneficiosService.addBeneficio(val).subscribe();
    }
  }
}