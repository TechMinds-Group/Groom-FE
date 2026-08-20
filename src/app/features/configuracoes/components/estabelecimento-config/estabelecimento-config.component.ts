import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TmTimeComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { EstabelecimentoInfo, EstabelecimentoService } from '../../../../core/services/estabelecimento.service';
import { DiaFuncionamento, DIAS_SEMANA_ESTABELECIMENTO } from '../../../../core/models/configuracoes/horario-estabelecimento.model';

/**
 * Componente de Gestão do Estabelecimento (RF-32).
 * Contém blocos colapsáveis de configuração (ex.: Horário de Funcionamento).
 */
@Component({
  selector: 'app-estabelecimento-config',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TmTimeComponent],
  templateUrl: './estabelecimento-config.component.html',
  styleUrl: './estabelecimento-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstabelecimentoConfigComponent implements OnInit {
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);

  protected readonly diasFuncionamento = signal<DiaFuncionamento[]>([]);
  protected readonly salvando = signal(false);

  /** Sinais para a identidade do estabelecimento */
  protected readonly infoExpandido = signal(false);
  protected readonly salvandoInfo = signal(false);
  protected readonly estabelecimentoInfo = signal<EstabelecimentoInfo>({
    nome: '',
    nomeExibicao: '',
    cnpj: '',
    telefone: '',
    logoUrl: '',
    capaUrl: '',
    descricao: '',
  });

  /** Arquivos pendentes de upload (nunca enviados como base64) e previews locais */
  protected readonly logoFile = signal<File | null>(null);
  protected readonly capaFile = signal<File | null>(null);
  protected readonly logoPreview = signal('');
  protected readonly capaPreview = signal('');
  protected readonly logoRemovida = signal(false);
  protected readonly capaRemovida = signal(false);

  /** Imagem exibida: preview do arquivo selecionado, ou URL do servidor (ou vazio se removida). */
  protected readonly logoVisivel = computed(() => {
    if (this.logoFile()) {
      return this.logoPreview();
    }
    if (this.logoRemovida()) {
      return '';
    }
    return this.estabelecimentoService.resolverUrl(this.estabelecimentoInfo().logoUrl);
  });

  protected readonly capaVisivel = computed(() => {
    if (this.capaFile()) {
      return this.capaPreview();
    }
    if (this.capaRemovida()) {
      return '';
    }
    return this.estabelecimentoService.resolverUrl(this.estabelecimentoInfo().capaUrl);
  });

  protected atualizarCampo(campo: keyof EstabelecimentoInfo, valor: string): void {
    this.estabelecimentoInfo.update((prev) => ({ ...prev, [campo]: valor }));
  }

  /** Sinal para controle de expansão do bloco colapsável */
  protected readonly horarioExpandido = signal(false);

  /** Lista de horários em formato 24 horas (00:00 a 23:45 em intervalos de 15 min) */
  protected readonly OPCOES_HORARIOS: string[] = Array.from({ length: 96 }, (_, i) => {
    const h = Math.floor(i / 4).toString().padStart(2, '0');
    const m = ((i % 4) * 15).toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  protected readonly DIAS_SEMANA_LABELS = DIAS_SEMANA_ESTABELECIMENTO;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.carregarHorarios(), this.carregarInfo()]);
  }

  protected toggleHorario(): void {
    this.horarioExpandido.update((v) => !v);
  }

  protected toggleInfo(): void {
    this.infoExpandido.update((v) => !v);
  }

  protected async carregarHorarios(): Promise<void> {
    const data = await this.estabelecimentoService.carregarHorarios();
    this.diasFuncionamento.set(structuredClone(data));
  }

  protected async carregarInfo(): Promise<void> {
    try {
      const data = await this.estabelecimentoService.carregarInfo();
      if (data) {
        this.estabelecimentoInfo.set(data);
      }
      this.resetImagens();
    } catch {
      // Ignora erro se ainda não houver informações salvas
    }
  }

  protected triggerCapaUpload(input: HTMLInputElement): void {
    input.click();
  }

  protected triggerLogoUpload(input: HTMLInputElement): void {
    input.click();
  }

  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.logoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(arquivo);
    this.logoFile.set(arquivo);
    this.logoRemovida.set(false);
    input.value = '';
  }

  protected onCapaSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.capaPreview.set(reader.result as string);
    };
    reader.readAsDataURL(arquivo);
    this.capaFile.set(arquivo);
    this.capaRemovida.set(false);
    input.value = '';
  }

  protected async salvarInfo(): Promise<void> {
    this.salvandoInfo.set(true);
    try {
      const info = this.estabelecimentoInfo();
      const logoArquivo = this.logoFile();
      const capaArquivo = this.capaFile();

      let novasUrls: { logoUrl?: string; capaUrl?: string } = {};
      if (logoArquivo || capaArquivo) {
        const formData = new FormData();
        if (logoArquivo) {
          formData.append('logo', logoArquivo);
        }
        if (capaArquivo) {
          formData.append('capa', capaArquivo);
        }
        novasUrls = await this.estabelecimentoService.salvarImagens(formData);
      }

      await this.estabelecimentoService.salvarInfo({
        nome: info.nome,
        nomeExibicao: info.nomeExibicao,
        cnpj: info.cnpj,
        telefone: info.telefone,
        descricao: info.descricao,
        logoUrl: this.logoRemovida() ? '' : logoArquivo ? novasUrls.logoUrl : info.logoUrl,
        capaUrl: this.capaRemovida() ? '' : capaArquivo ? novasUrls.capaUrl : info.capaUrl,
      });

      const atualizado = await this.estabelecimentoService.carregarInfo();
      if (atualizado) {
        this.estabelecimentoInfo.set(atualizado);
      }
      this.resetImagens();
      this.toastService.success('Perfil do estabelecimento salvo com sucesso!');
    } catch {
      this.toastService.error('Erro ao salvar dados do estabelecimento.');
    } finally {
      this.salvandoInfo.set(false);
    }
  }

  protected removerLogo(): void {
    this.logoFile.set(null);
    this.logoPreview.set('');
    this.logoRemovida.set(true);
  }

  protected removerCapa(): void {
    this.capaFile.set(null);
    this.capaPreview.set('');
    this.capaRemovida.set(true);
  }

  private resetImagens(): void {
    this.logoFile.set(null);
    this.capaFile.set(null);
    this.logoPreview.set('');
    this.capaPreview.set('');
    this.logoRemovida.set(false);
    this.capaRemovida.set(false);
  }

  protected voltar(): void {
    this.router.navigate(['/configuracoes']);
  }

  protected copiarParaTodos(diaOrigem: DiaFuncionamento): void {
    const lista = this.diasFuncionamento();
    const atualizado = lista.map((d) => ({
      ...d,
      ativo: diaOrigem.ativo,
      horaAbertura: diaOrigem.horaAbertura,
      horaFechamento: diaOrigem.horaFechamento,
      temIntervalo: diaOrigem.temIntervalo,
      intervaloInicio: diaOrigem.intervaloInicio,
      intervaloFim: diaOrigem.intervaloFim,
    }));
    this.diasFuncionamento.set(atualizado);
    const nomeDia = DIAS_SEMANA_ESTABELECIMENTO[diaOrigem.diaSemana]?.label;
    this.toastService.success(`Horários de ${nomeDia} copiados para todos os dias!`);
  }

  protected async salvar(): Promise<void> {
    this.salvando.set(true);
    try {
      await this.estabelecimentoService.salvarHorarios(this.diasFuncionamento());
      this.toastService.success('Horários salvos com sucesso!');
    } catch {
      this.toastService.error('Erro ao salvar horários. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }
}
