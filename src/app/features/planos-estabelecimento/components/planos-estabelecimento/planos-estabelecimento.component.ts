import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ClubesService, ClubeConfig } from '../../../../core/services/clubes.service';
import {
  TmTableComponent,
  TableColumn,
} from '@techminds-group/tm-angular-lib';
import { LanguageService } from '../../../../core/services/language.service';
import { StatusPlanoPipe } from '../../pipes/status-plano.pipe';
import { FrequenciaPlanoPipe } from '../../pipes/frequencia-plano.pipe';
import { PlanosEstabelecimentoHelperService } from '../../services/planos-estabelecimento-helper.service';

@Component({
  selector: 'app-planos-estabelecimento',
  standalone: true,
  imports: [
    CommonModule,
    TmTableComponent,
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
  protected readonly helper = inject(PlanosEstabelecimentoHelperService);
  protected readonly languageService = inject(LanguageService);

  @ViewChild('nomeTemplate', { static: true })
  nomeTemplate!: TemplateRef<{ $implicit: ClubeConfig }>;

  @ViewChild('precoTemplate', { static: true })
  precoTemplate!: TemplateRef<{ $implicit: ClubeConfig }>;

  @ViewChild('frequenciaTemplate', { static: true })
  frequenciaTemplate!: TemplateRef<{ $implicit: ClubeConfig }>;

  @ViewChild('assinantesTemplate', { static: true })
  assinantesTemplate!: TemplateRef<{ $implicit: ClubeConfig }>;

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
      { header: 'Nome', template: this.nomeTemplate, width: '25%' },
      { header: 'Preço', template: this.precoTemplate, width: '20%' },
      { header: 'Frequência', template: this.frequenciaTemplate, width: '20%' },
      { header: 'Assinantes', template: this.assinantesTemplate, width: '20%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ];
  });

  protected readonly clubes = this.clubesService.clubes;

  ngAfterViewInit(): void {
    this.templatesReady.set(true);
  }

  verDetalhes(clube: ClubeConfig): void {
    this.router.navigate(['/servicos/planos-estabelecimento', clube.id]);
  }

  async ngOnInit(): Promise<void> {
    await firstValueFrom(this.clubesService.carregarClubes());
  }

  abrirNovo(): void {
    this.router.navigate(['/servicos/planos-estabelecimento/novo']);
  }
}