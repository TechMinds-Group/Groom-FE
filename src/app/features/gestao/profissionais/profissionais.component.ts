import { ChangeDetectionStrategy, Component, signal, ViewChild, TemplateRef, AfterViewInit, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TmTableComponent, TableColumn, TmModalComponent, TmSelectComponent } from '@techminds-group/tm-angular-lib';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { GestaoUsuariosService } from '../../../core/services/gestao-usuarios.service';
import { Usuario } from '../../../core/models/gestao-usuarios/usuario.model';
import { ClubesService } from '../../../core/services/clubes.service';

@Component({
  selector: 'app-profissionais',
  standalone: true,
  imports: [CommonModule, TmTableComponent, TmModalComponent, TmSelectComponent, ReactiveFormsModule],
  templateUrl: './profissionais.component.html',
  styleUrl: './profissionais.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfissionaisComponent implements OnInit, AfterViewInit {
  protected readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly clubesService = inject(ClubesService);
  private readonly fb = inject(FormBuilder);

  async ngOnInit(): Promise<void> {
    await this.gestaoUsuariosService.carregarUsuarios();
    this.clubesService.carregarClubes().subscribe();
  }

  protected readonly showPlanoModal = signal<boolean>(false);
  protected readonly profissionalSelecionado = signal<Usuario | null>(null);

  protected readonly planoForm: FormGroup = this.fb.group({
    plano: ['']
  });

  protected readonly planoOptions = computed(() => {
    return [
      { value: '', label: 'Nenhum' },
      ...this.clubesService.clubes().map(c => ({ value: c.nome, label: c.nome }))
    ];
  });

  abrirModalPlano(profissional: Usuario): void {
    this.profissionalSelecionado.set(profissional);
    this.planoForm.setValue({
      plano: profissional.planoAssinatura || ''
    });
    this.showPlanoModal.set(true);
  }

  async salvarPlano(): Promise<void> {
    const prof = this.profissionalSelecionado();
    if (prof) {
      const novoPlano = this.planoForm.value.plano;
      await this.gestaoUsuariosService.atualizarPlanoAssinatura(prof.id, novoPlano || null);
      this.showPlanoModal.set(false);
    }
  }

  @ViewChild('profissionalTemplate', { static: true }) profissionalTemplate!: TemplateRef<{ $implicit: Usuario }>;
  @ViewChild('faturamentoTemplate', { static: true }) faturamentoTemplate!: TemplateRef<{ $implicit: Usuario }>;
  @ViewChild('statusTemplate', { static: true }) statusTemplate!: TemplateRef<{ $implicit: Usuario }>;

  // Filtra usuários que possuem perfil "Profissional" (barbeiros/profissionais)
  protected readonly profissionais = computed(() => {
    return this.gestaoUsuariosService.usuarios().filter(u =>
      u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional'))
    );
  });

  protected readonly cols = signal<TableColumn<Usuario>[]>([]);
  protected readonly tamanhoPagina = signal<number>(5);

  ngAfterViewInit(): void {
    this.cols.set([
      { header: 'Profissional', template: this.profissionalTemplate, width: '30%' },
      { header: 'Plano Atual', key: 'planoAssinatura', width: '25%' },
      { header: 'Faturamento Mensal', template: this.faturamentoTemplate, width: '25%' },
      { header: 'Status', template: this.statusTemplate, width: '20%' },
    ]);
  }
}
