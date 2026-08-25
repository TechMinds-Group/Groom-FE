import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TmSelectComponent, TmSelectOption, TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { GestaoUsuariosService } from '../../../../../core/services/gestao-usuarios.service';
import { AgendamentosService } from '../../../../../core/services/agendamentos.service';
import { CatalogoService } from '../../../../../core/services/catalogo.service';
import { ClubesService } from '../../../../../core/services/clubes.service';
import { Usuario } from '../../../../../core/models/gestao-usuarios/usuario.model';
import { Agendamento } from '../../../../../core/models/agenda.model';
import { PerfilBadgePipe } from '../../../../gestao-usuarios/pipes/perfil-badge.pipe';
import { StatusBadgePipe } from '../../../../gestao-usuarios/pipes/status-badge.pipe';
import { GestaoUsuariosHelperService } from '../../../../gestao-usuarios/services/gestao-usuarios-helper.service';
import { EstabelecimentoService } from '../../../../../core/services/estabelecimento.service';
import { ThemeService } from '../../../../../core/services/theme.service';
import { DisponibilidadeComponent } from '../../../../disponibilidade/components/disponibilidade/disponibilidade.component';

@Component({
  selector: 'app-profissional-detalhes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TmTextComponent,
    TmSelectComponent,
    PerfilBadgePipe,
    StatusBadgePipe,
    DisponibilidadeComponent,
  ],
  templateUrl: './profissional-detalhes.component.html',
  styleUrl: './profissional-detalhes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GestaoUsuariosHelperService],
})
export class ProfissionalDetalhesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);
  private readonly agendamentosService = inject(AgendamentosService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly clubesService = inject(ClubesService);
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  protected readonly themeService = inject(ThemeService);
  private readonly toastService = inject(TmToastService);

  @ViewChild(DisponibilidadeComponent) availabilityComp?: DisponibilidadeComponent;

  protected readonly profissional = signal<Usuario | null>(null);
  protected readonly agendamentosProfissional = signal<Agendamento[]>([]);
  protected readonly servicosAtuacao = signal<string[]>([]);
  protected readonly planosAtuacao = signal<string[]>([]);

  /** Controla se toda a tela está em modo de edição ou somente leitura. */
  protected readonly modoEdicao = signal<boolean>(false);
  protected readonly salvando = signal<boolean>(false);

  protected readonly servicosOptions = signal<TmSelectOption[]>([]);
  protected readonly planosOptions = signal<TmSelectOption[]>([]);
  protected readonly fotoFile = signal<File | null>(null);
  protected readonly fotoPreview = signal<string>('');

  protected readonly fotoVisivel = computed(() => {
    if (this.fotoFile()) {
      return this.fotoPreview();
    }
    const p = this.profissional();
    return p?.fotoUrl ? this.estabelecimentoService.resolverUrl(p.fotoUrl) : '';
  });

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    sobrenome: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    numeroWhatsApp: ['', [Validators.required, Validators.maxLength(15)]],
    status: ['Ativo'],
    servicoIds: [[], [Validators.required]],
    planoIds: [[]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.carregarDados(id);
    }
  }

  voltar(): void {
    this.router.navigate(['/gestao/profissionais']);
  }

  protected habilitarEdicao(): void {
    const p = this.profissional();
    if (p) {
      this.preencherFormulario(p);
      this.modoEdicao.set(true);
    }
  }

  protected async cancelarEdicao(): Promise<void> {
    const p = this.profissional();
    if (p) {
      await this.carregarDados(p.id);
      if (this.availabilityComp) {
        await this.availabilityComp.cancelar();
      }
    }
    this.fotoFile.set(null);
    this.fotoPreview.set('');
    this.modoEdicao.set(false);
  }

  protected alternarStatus(event: Event): void {
    const alvo = event.target as HTMLInputElement;
    this.form.get('status')?.setValue(alvo.checked ? 'Ativo' : 'Inativo');
  }

  protected selecionarTodosServicos(): void {
    const todos = this.servicosOptions().map((opt) => opt.value);
    this.form.get('servicoIds')?.setValue(todos);
    this.form.get('servicoIds')?.markAsDirty();
  }

  protected desmarcarTodosServicos(): void {
    this.form.get('servicoIds')?.setValue([]);
    this.form.get('servicoIds')?.markAsDirty();
  }

  protected selecionarTodosPlanos(): void {
    const todos = this.planosOptions().map((opt) => opt.value);
    this.form.get('planoIds')?.setValue(todos);
    this.form.get('planoIds')?.markAsDirty();
  }

  protected desmarcarTodosPlanos(): void {
    this.form.get('planoIds')?.setValue([]);
    this.form.get('planoIds')?.markAsDirty();
  }

  protected onFotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('A imagem de perfil deve ter no máximo 5MB.', 'Erro');
        return;
      }
      this.fotoFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        this.fotoPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  protected async salvarGeral(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Preencha os campos obrigatórios do formulário.', 'Atenção');
      return;
    }

    const p = this.profissional();
    if (!p) return;

    const digitsWhatsApp = (this.form.value.numeroWhatsApp ?? '').replace(/\D/g, '');
    if (!digitsWhatsApp || digitsWhatsApp.length < 10 || digitsWhatsApp.length > 13) {
      this.toastService.error('O número de WhatsApp é obrigatório e deve ter entre 10 e 13 dígitos.', 'Erro');
      return;
    }

    this.salvando.set(true);
    try {
      const raw = this.form.value;

      // 1. Atualizar dados cadastrais
      await this.gestaoUsuariosService.atualizar(p.id, {
        nome: raw.nome,
        sobrenome: raw.sobrenome,
        email: raw.email,
        telefone: digitsWhatsApp,
        status: raw.status,
        nivelAcessoId: p.nivelAcessoId,
        secundarioNivelAcessoId: p.secundarioNivelAcessoId ?? null,
      });

      // 2. Foto (se alterada)
      if (this.fotoFile()) {
        await this.gestaoUsuariosService.salvarFoto(p.id, this.fotoFile()!);
      }

      // 3. Atuação (serviços e planos)
      await this.gestaoUsuariosService.salvarAtuacao({
        profissionalId: p.id,
        servicoIds: raw.servicoIds ?? [],
        planoIds: raw.planoIds ?? [],
      });

      // 4. Salvar Disponibilidade / Horários de Atendimento
      if (this.availabilityComp) {
        await this.availabilityComp.salvar();
      }

      this.toastService.success('Profissional e horários atualizados com sucesso!', 'Sucesso');

      // Recarregar dados atualizados
      await this.carregarDados(p.id);
      this.modoEdicao.set(false);
      this.fotoFile.set(null);
      this.fotoPreview.set('');
    } catch (err) {
      console.error('Erro ao salvar alterações do profissional', err);
    } finally {
      this.salvando.set(false);
    }
  }

  protected getNomeCompleto(user: Usuario): string {
    if (user.sobrenome && user.sobrenome.trim()) {
      return `${user.nome} ${user.sobrenome}`;
    }
    return user.nome;
  }

  protected getPrimeiroNome(user: Usuario): string {
    if (user.sobrenome && user.sobrenome.trim()) {
      return user.nome;
    }
    const partes = (user.nome || '').trim().split(/\s+/);
    return partes[0] || user.nome;
  }

  protected getSobrenome(user: Usuario): string {
    if (user.sobrenome && user.sobrenome.trim()) {
      return user.sobrenome;
    }
    const partes = (user.nome || '').trim().split(/\s+/);
    return partes.length > 1 ? partes.slice(1).join(' ') : '';
  }

  protected getWhatsAppLink(telefone?: string): string {
    if (!telefone) return '#';
    const digits = telefone.replace(/\D/g, '');
    return `https://wa.me/55${digits}`;
  }

  private async carregarDados(id: string): Promise<void> {
    try {
      await this.gestaoUsuariosService.carregarUsuarios();
      const user = this.gestaoUsuariosService.usuarios().find((u) => u.id === id);
      if (!user) {
        this.toastService.error('Profissional não encontrado.', 'Erro');
        this.voltar();
        return;
      }
      this.profissional.set(user);

      await Promise.all([
        this.carregarAgendamentos(id),
        this.carregarAtuacao(id),
        this.carregarServicosOptions(),
        this.carregarPlanosOptions(),
      ]);
    } catch (err) {
      console.error('Erro ao carregar detalhes do profissional', err);
      if (!this.profissional()) {
        this.voltar();
      }
    }
  }

  private async carregarAgendamentos(id: string): Promise<void> {
    try {
      await this.agendamentosService.carregarAgendamentos(id);
      this.agendamentosProfissional.set(this.agendamentosService.agendamentos());
    } catch (err) {
      console.error('Erro ao carregar agendamentos do profissional', err);
      this.agendamentosProfissional.set([]);
    }
  }

  private async carregarAtuacao(id: string): Promise<void> {
    try {
      const atuacao = await this.gestaoUsuariosService.carregarAtuacao(id);

      const [servicos, planos] = await Promise.all([
        this.catalogoService.servicos().length > 0
          ? Promise.resolve(this.catalogoService.servicos())
          : this.catalogoService.carregarServicos().then(() => this.catalogoService.servicos()),
        firstValueFrom(this.clubesService.carregarClubes()),
      ]);

      this.servicosAtuacao.set(
        atuacao.servicoIds
          .map((servicoId) => servicos.find((s) => s.id === servicoId)?.nome)
          .filter((nome): nome is string => !!nome),
      );
      this.planosAtuacao.set(
        atuacao.planoIds
          .map((planoId) => planos.find((p) => p.id === planoId)?.nome)
          .filter((nome): nome is string => !!nome),
      );
    } catch (err) {
      console.error('Erro ao carregar atuação do profissional', err);
      this.servicosAtuacao.set([]);
      this.planosAtuacao.set([]);
    }
  }

  private async carregarServicosOptions(): Promise<void> {
    try {
      if (this.catalogoService.servicos().length === 0) {
        await this.catalogoService.carregarServicos();
      }
      const ativos = this.catalogoService.servicos().filter((s) => s.status === 'Ativo');
      this.servicosOptions.set(ativos.map((s) => ({ value: s.id, label: s.nome })));
    } catch {
      this.servicosOptions.set([]);
    }
  }

  private async carregarPlanosOptions(): Promise<void> {
    try {
      const planos = await firstValueFrom(this.clubesService.carregarClubes());
      const ativos = planos.filter((p) => p.status === 'Ativo');
      this.planosOptions.set(ativos.map((p) => ({ value: p.id, label: p.nome })));
    } catch {
      this.planosOptions.set([]);
    }
  }

  private formatarWhatsApp(numero: string): string {
    const digits = numero.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 13 && digits.startsWith('55')) {
      const rest = digits.slice(2);
      return `+55 (${rest.slice(0, 2)}) ${rest.slice(2, 7)}-${rest.slice(7)}`;
    }
    return numero;
  }

  private preencherFormulario(user: Usuario): void {
    const servs = this.catalogoService.servicos();
    const servicoIds = this.servicosAtuacao()
      .map((nome) => servs.find((s) => s.nome === nome)?.id)
      .filter((id): id is string => !!id);

    const planos = this.planosOptions();
    const planoIds = this.planosAtuacao()
      .map((nome) => planos.find((p) => p.label === nome)?.value)
      .filter((id): id is string => !!id);

    this.form.patchValue({
      nome: user.nome,
      sobrenome: user.sobrenome ?? '',
      email: user.email,
      numeroWhatsApp: this.formatarWhatsApp(user.telefone ?? ''),
      status: user.status,
      servicoIds: servicoIds,
      planoIds: planoIds,
    });
  }
}
