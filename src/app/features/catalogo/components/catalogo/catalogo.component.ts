import { ChangeDetectionStrategy, Component, OnInit, inject, signal, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TmTableComponent,
  TableColumn,
  TmModalComponent,
  TmTextComponent,
} from '@techminds-group/tm-angular-lib';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { ServicoCatalogo } from '../../../../core/models/catalogo/servico.model';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmTableComponent,
    TmModalComponent,
    TmTextComponent,
  ],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly catalogoService = inject(CatalogoService);

  @ViewChild('servicoTemplate', { static: true }) servicoTemplate!: TemplateRef<{ $implicit: ServicoCatalogo }>;
  @ViewChild('precoTemplate', { static: true }) precoTemplate!: TemplateRef<{ $implicit: ServicoCatalogo }>;
  @ViewChild('duracaoTemplate', { static: true }) duracaoTemplate!: TemplateRef<{ $implicit: ServicoCatalogo }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{ $implicit: ServicoCatalogo }>;

  protected readonly cols = signal<TableColumn<ServicoCatalogo>[]>([]);
  protected readonly tamanhoPagina = signal<number>(5);

  protected readonly showFormModal = signal<boolean>(false);
  protected readonly isSalvando = signal<boolean>(false);

  protected readonly servicoForm: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    preco: ['', [Validators.required]],
    duracao: ['', [Validators.required]],
  });

  ngAfterViewInit(): void {
    this.cols.set([
      { header: 'Serviço', template: this.servicoTemplate, width: '40%' },
      { header: 'Preço', template: this.precoTemplate, width: '25%' },
      { header: 'Duração', template: this.duracaoTemplate, width: '20%' },
      { header: 'Status', template: this.statusTemplate, width: '15%' },
    ]);
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.catalogoService.carregarServicos();
    } catch {
      console.warn('Catálogo: backend indisponível');
    }
  }

  abrirNovo(): void {
    this.servicoForm.reset({ nome: '', preco: '', duracao: '' });
    this.showFormModal.set(true);
  }

  async salvar(): Promise<void> {
    if (this.isSalvando() || this.servicoForm.invalid) {
      this.servicoForm.markAllAsTouched();
      return;
    }

    const formVal = this.servicoForm.getRawValue();
    const dadosEnvio = {
      nome: formVal.nome,
      preco: this.parseCurrency(formVal.preco),
      duracao: Number(formVal.duracao),
      status: 'Ativo',
    };

    this.isSalvando.set(true);
    try {
      await this.catalogoService.adicionar(dadosEnvio);
      this.showFormModal.set(false);
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
    } finally {
      this.isSalvando.set(false);
    }
  }

  verDetalhes(servico: ServicoCatalogo): void {
    this.router.navigate(['/servicos/catalogo', servico.id]);
  }

  private parseCurrency(value: string | number | null): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = value.replace(/\D/g, '');
    return Number(clean) / 100;
  }
}