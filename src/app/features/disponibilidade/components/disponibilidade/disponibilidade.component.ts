import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TmSelectComponent, TmSelectOption, TmTimeComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { Agendamento } from '../../../../core/models/agenda.model';
import {
  DiaDisponibilidade,
  DisponibilidadeProfissional,
  IntervaloDisponibilidade,
} from '../../../../core/models/disponibilidade/disponibilidade.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { DisponibilidadeService } from '../../../../core/services/disponibilidade.service';
import { GestaoUsuariosService } from '../../../../core/services/gestao-usuarios.service';
import { LanguageService } from '../../../../core/services/language.service';
import { DIAS_SEMANA_FORM, INTERVALO_PADRAO } from '../../models/disponibilidade-form.config.model';
import { DisponibilidadeConflitosComponent } from '../modais/disponibilidade-conflitos/disponibilidade-conflitos.component';

/** Valida que o horário final seja maior que o inicial no grupo do intervalo. */
function validarIntervaloHoras(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('horaInicio')?.value as string | null;
  const fim = grupo.get('horaFim')?.value as string | null;
  if (!inicio || !fim) {
    return null;
  }
  return fim <= inicio ? { intervaloInvalido: true } : null;
}

@Component({
  selector: 'app-disponibilidade',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TmSelectComponent,
    TmTimeComponent,
    DisponibilidadeConflitosComponent,
  ],
  templateUrl: './disponibilidade.component.html',
  styleUrl: './disponibilidade.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DisponibilidadeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly toastService = inject(TmToastService);
  private readonly disponibilidadeService = inject(DisponibilidadeService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly gestaoUsuariosService = inject(GestaoUsuariosService);

  protected readonly diasSemanaConfig = DIAS_SEMANA_FORM;

  protected readonly carregando = signal(false);
  protected readonly salvando = signal(false);
  /** Profissional alvo da edição (admin escolhe; profissional-only usa o próprio id). */
  protected readonly profissionalAlvo = signal<string>('');
  protected readonly servicosSelecionados = signal<string[]>([]);
  /** Agendamentos que ficaram fora da nova disponibilidade (D-06 — o save não é bloqueado). */
  protected readonly conflitos = signal<Agendamento[]>([]);
  protected readonly showConflitosModal = signal(false);

  protected readonly isAdmin = this.authService.hasAdminRole;

  /** Profissionais do tenant com perfil Profissional (padrão ProfissionaisComponent). */
  protected readonly profissionalOptions = computed<TmSelectOption<string>[]>(() =>
    this.gestaoUsuariosService
      .usuarios()
      .filter((u) => u.perfil === 'Profissional' || (u.perfil && u.perfil.includes('Profissional')))
      .map((u) => ({ value: u.id, label: u.nome })),
  );

  /** Serviços ativos do catálogo para o checklist. */
  protected readonly servicoOptions = computed<TmSelectOption<string>[]>(() =>
    this.catalogoService
      .servicos()
      .filter((s) => s.status === 'Ativo')
      .map((s) => ({ value: s.id, label: s.nome })),
  );

  protected readonly form: FormGroup = this.fb.group({
    dias: this.fb.array(DIAS_SEMANA_FORM.map((dia) => this.criarDiaForm(dia.diaSemana))),
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.catalogoService.carregarServicos(),
      this.gestaoUsuariosService.carregarUsuarios(),
    ]);

    const usuario = this.authService.currentUser();
    if (this.authService.hasAdminRole()) {
      // Admin: preseleciona o primeiro profissional para a tela já vir carregada.
      const primeiro = this.profissionalOptions()[0];
      if (primeiro) {
        this.profissionalAlvo.set(primeiro.value);
        await this.carregarDisponibilidade(primeiro.value);
      }
      return;
    }
    if (usuario?.id) {
      this.profissionalAlvo.set(usuario.id);
      await this.carregarDisponibilidade(usuario.id);
    }
  }

  protected dias(): FormArray {
    return this.form.get('dias') as FormArray;
  }

  protected diaGrupo(index: number): FormGroup {
    return this.dias().at(index) as FormGroup;
  }

  protected intervalos(index: number): FormGroup[] {
    return (this.diaGrupo(index).get('intervalos') as FormArray).controls as FormGroup[];
  }

  protected adicionarIntervalo(index: number): void {
    (this.diaGrupo(index).get('intervalos') as FormArray).push(this.criarIntervaloForm());
  }

  protected removerIntervalo(indexDia: number, indexIntervalo: number): void {
    (this.diaGrupo(indexDia).get('intervalos') as FormArray).removeAt(indexIntervalo);
  }

  protected onProfissionalChange(valor: unknown): void {
    if (typeof valor === 'string' && valor) {
      this.profissionalAlvo.set(valor);
      void this.carregarDisponibilidade(valor);
    }
  }

  protected onServicosChange(valor: unknown): void {
    this.servicosSelecionados.set(Array.isArray(valor) ? (valor as string[]) : []);
  }

  /** Traduz chaves dinâmicas (ex: rótulo do dia) via serviço de tradução. */
  protected traduzir(chave: string): string {
    return this.languageService.translate(chave);
  }

  /** Carrega a disponibilidade do profissional alvo e popula o formulário (D-12, sem refresh). */
  protected async carregarDisponibilidade(profissionalId: string): Promise<void> {
    this.carregando.set(true);
    try {
      const dados = await this.disponibilidadeService.getDisponibilidade(profissionalId);
      this.popularForm(dados);
    } catch {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.TOAST_ERRO_CARREGAR'));
    } finally {
      this.carregando.set(false);
    }
  }

  protected async salvar(): Promise<void> {
    const profissionalId = this.profissionalAlvo();
    if (!profissionalId) {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.SEM_PROFISSIONAIS'));
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.INTERVALO_INVALIDO'));
      return;
    }

    this.salvando.set(true);
    try {
      const resultado = await this.disponibilidadeService.salvarDisponibilidade(
        profissionalId,
        this.montarPayload(profissionalId),
      );
      if (resultado.conflitos.length > 0) {
        // D-06: avisa, não bloqueia — o save já foi persistido; abre o modal informativo.
        this.conflitos.set(resultado.conflitos);
        this.showConflitosModal.set(true);
      } else {
        this.toastService.success(this.languageService.translate('DISPONIBILIDADE.TOAST_SUCESSO'));
      }
    } catch {
      this.toastService.error(this.languageService.translate('DISPONIBILIDADE.TOAST_ERRO'));
    } finally {
      this.salvando.set(false);
    }
  }

  private criarDiaForm(diaSemana: number): FormGroup {
    return this.fb.group({
      diaSemana: [diaSemana],
      trabalhaHoje: [false],
      intervalos: this.fb.array([]),
    });
  }

  private criarIntervaloForm(): FormGroup {
    return this.fb.group(
      {
        horaInicio: [INTERVALO_PADRAO.horaInicio, [Validators.required]],
        horaFim: [INTERVALO_PADRAO.horaFim, [Validators.required]],
      },
      { validators: validarIntervaloHoras },
    );
  }

  private popularForm(dados: DisponibilidadeProfissional): void {
    const dias = this.dias();
    for (let i = 0; i < dias.length; i++) {
      const grupo = this.diaGrupo(i);
      const registro = dados.dias.find((d) => d.diaSemana === i);
      grupo.patchValue({ trabalhaHoje: registro?.trabalhaHoje ?? false });
      const intervalos = grupo.get('intervalos') as FormArray;
      intervalos.clear();
      for (const intervalo of registro?.intervalos ?? []) {
        intervalos.push(
          this.fb.group(
            {
              horaInicio: [this.normalizarHora(intervalo.horaInicio), [Validators.required]],
              horaFim: [this.normalizarHora(intervalo.horaFim), [Validators.required]],
            },
            { validators: validarIntervaloHoras },
          ),
        );
      }
    }
    this.servicosSelecionados.set(dados.servicoIds);
  }

  private montarPayload(profissionalId: string): DisponibilidadeProfissional {
    const dias: DiaDisponibilidade[] = this.dias().controls.map((controle) => {
      const grupo = controle as FormGroup;
      const valor = grupo.value;
      const intervalos: IntervaloDisponibilidade[] = (
        grupo.get('intervalos') as FormArray
      ).controls.map((controleIntervalo) => {
        const v = (controleIntervalo as FormGroup).value;
        return {
          horaInicio: this.normalizarHora(v.horaInicio),
          horaFim: this.normalizarHora(v.horaFim),
        };
      });
      return {
        diaSemana: Number(valor.diaSemana),
        trabalhaHoje: Boolean(valor.trabalhaHoje),
        intervalos,
      };
    });
    return {
      profissionalId,
      dias,
      servicoIds: [...this.servicosSelecionados()],
    };
  }

  /** Normaliza o valor do tm-time para "HH:mm" (o componente devolve hora como string da lib). */
  private normalizarHora(valor: string | Date | null): string {
    if (typeof valor === 'string' && /^\d{1,2}:\d{2}$/.test(valor)) {
      const [hora, minuto] = valor.split(':');
      return `${hora.padStart(2, '0')}:${minuto}`;
    }
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
      const hora = String(valor.getHours()).padStart(2, '0');
      const minuto = String(valor.getMinutes()).padStart(2, '0');
      return `${hora}:${minuto}`;
    }
    return '';
  }
}
