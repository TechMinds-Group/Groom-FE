import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TmTimeComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import {
  EstabelecimentoInfo,
  EstabelecimentoService,
  obterIconeAleatorioCapa,
  obterIconeAleatorioLogo,
} from '../../../../core/services/estabelecimento.service';
import {
  DiaFuncionamento,
  DIAS_SEMANA_ESTABELECIMENTO,
} from '../../../../core/models/configuracoes/horario-estabelecimento.model';
import {
  ClientesService,
  ImportacaoClienteResult,
} from '../../../../core/services/clientes.service';

/**
 * Componente de Gestão do Estabelecimento (RF-32).
 * Contém blocos colapsáveis de configuração (ex.: Horário de Funcionamento, Importação de Dados).
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
  private readonly clientesService = inject(ClientesService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly diasFuncionamento = signal<DiaFuncionamento[]>([]);
  protected readonly salvando = signal(false);

  /** Sinais para o bloco de Importação de Dados */
  protected readonly importacaoExpandido = signal(false);
  protected readonly plataformaSelecionada = signal<'tua-agenda' | null>('tua-agenda');
  protected readonly categoriaSelecionada = signal<'clientes' | null>('clientes');
  protected readonly arquivoSelecionado = signal<File | null>(null);
  protected readonly importando = signal(false);
  protected readonly resultadoImportacao = signal<ImportacaoClienteResult | null>(null);
  protected readonly exibirModalDuplicados = signal(false);

  protected abrirModalDuplicados(): void {
    this.exibirModalDuplicados.set(true);
  }

  protected fecharModalDuplicados(): void {
    this.exibirModalDuplicados.set(false);
  }

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
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    endereco: '',
  });

  protected readonly estabelecimentoInfoOriginal = signal<EstabelecimentoInfo>({
    nome: '',
    nomeExibicao: '',
    cnpj: '',
    telefone: '',
    logoUrl: '',
    capaUrl: '',
    descricao: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    endereco: '',
  });

  protected readonly temAlteracoesInfo = computed(() => {
    if (this.logoFile() !== null || this.capaFile() !== null || this.logoRemovida() || this.capaRemovida()) {
      return true;
    }
    const cur = this.estabelecimentoInfo();
    const orig = this.estabelecimentoInfoOriginal();
    return (
      (cur.nomeExibicao ?? '') !== (orig.nomeExibicao ?? '') ||
      (cur.telefone ?? '') !== (orig.telefone ?? '') ||
      (cur.descricao ?? '') !== (orig.descricao ?? '') ||
      (cur.cep ?? '') !== (orig.cep ?? '') ||
      (cur.logradouro ?? '') !== (orig.logradouro ?? '') ||
      (cur.numero ?? '') !== (orig.numero ?? '') ||
      (cur.complemento ?? '') !== (orig.complemento ?? '') ||
      (cur.bairro ?? '') !== (orig.bairro ?? '') ||
      (cur.cidade ?? '') !== (orig.cidade ?? '') ||
      (cur.estado ?? '') !== (orig.estado ?? '') ||
      (cur.endereco ?? '') !== (orig.endereco ?? '')
    );
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

  protected readonly logoIconePadrao = computed(() =>
    obterIconeAleatorioLogo(this.estabelecimentoInfo().nomeExibicao || this.estabelecimentoInfo().nome)
  );

  protected readonly capaIconePadrao = computed(() =>
    obterIconeAleatorioCapa(this.estabelecimentoInfo().nomeExibicao || this.estabelecimentoInfo().nome)
  );

  protected readonly buscandoCep = signal(false);
  private ultimoCepBuscado = '';

  protected atualizarCampo(campo: keyof EstabelecimentoInfo, valor: string): void {
    this.estabelecimentoInfo.update((prev) => {
      const next = { ...prev, [campo]: valor };
      return next;
    });

    if (
      ['logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep'].includes(
        campo as string,
      )
    ) {
      this.montarEnderecoCompleto();
    }
  }

  protected async onCepChange(val: string): Promise<void> {
    this.atualizarCampo('cep', val);

    const cepLimpo = val.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      this.ultimoCepBuscado = '';
      return;
    }

    if (cepLimpo === this.ultimoCepBuscado) {
      return;
    }

    this.ultimoCepBuscado = cepLimpo;
    this.buscandoCep.set(true);
    this.cdr.markForCheck();

    try {
      const dados = await this.estabelecimentoService.buscarCep(cepLimpo);
      if (dados) {
        this.estabelecimentoInfo.update((prev) => ({
          ...prev,
          logradouro: dados.logradouro || prev.logradouro || '',
          bairro: dados.bairro || prev.bairro || '',
          cidade: dados.localidade || prev.cidade || '',
          estado: dados.uf || prev.estado || '',
        }));
        this.montarEnderecoCompleto();
        this.toastService.success('Endereço atualizado!');
      } else {
        this.toastService.error('CEP não encontrado. Preencha o endereço manualmente.');
      }
    } catch {
      this.toastService.error('Erro ao consultar o CEP.');
    } finally {
      this.buscandoCep.set(false);
      this.cdr.markForCheck();
    }
  }

  protected montarEnderecoCompleto(): void {
    const info = this.estabelecimentoInfo();
    const partes: string[] = [];
    if (info.logradouro) partes.push(info.logradouro);
    if (info.numero) partes.push(info.numero);
    if (info.complemento) partes.push(info.complemento);
    if (info.bairro) partes.push(info.bairro);
    if (info.cidade && info.estado) {
      partes.push(`${info.cidade} - ${info.estado}`);
    } else if (info.cidade) {
      partes.push(info.cidade);
    }
    if (info.cep) partes.push(`CEP ${info.cep}`);

    const enderecoFormatado = partes.join(', ');
    this.estabelecimentoInfo.update((prev) => ({ ...prev, endereco: enderecoFormatado }));
  }

  /** Sinal para controle de expansão do bloco colapsável */
  protected readonly horarioExpandido = signal(false);

  /** Lista de horários em formato 24 horas (00:00 a 23:45 em intervalos de 15 min) */
  protected readonly OPCOES_HORARIOS: string[] = Array.from({ length: 96 }, (_, i) => {
    const h = Math.floor(i / 4)
      .toString()
      .padStart(2, '0');
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
        this.estabelecimentoInfo.set(structuredClone(data));
        this.montarEnderecoCompleto();
        this.estabelecimentoInfoOriginal.set(structuredClone(this.estabelecimentoInfo()));
      }
      this.resetImagens();
      this.cdr.markForCheck();
    } catch {
      // Ignora erro se ainda não houver informações salvas
    }
  }

  protected cancelarAlteracoesInfo(): void {
    const orig = this.estabelecimentoInfoOriginal();
    this.estabelecimentoInfo.set(structuredClone(orig));
    this.resetImagens();
    this.cdr.markForCheck();
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
        cep: info.cep,
        logradouro: info.logradouro,
        numero: info.numero,
        complemento: info.complemento,
        bairro: info.bairro,
        cidade: info.cidade,
        estado: info.estado,
        endereco: info.endereco,
        logoUrl: this.logoRemovida() ? '' : logoArquivo ? novasUrls.logoUrl : info.logoUrl,
        capaUrl: this.capaRemovida() ? '' : capaArquivo ? novasUrls.capaUrl : info.capaUrl,
      });

      const atualizado = await this.estabelecimentoService.carregarInfo();
      if (atualizado) {
        this.estabelecimentoInfo.set(structuredClone(atualizado));
        this.montarEnderecoCompleto();
        this.estabelecimentoInfoOriginal.set(structuredClone(this.estabelecimentoInfo()));
      }
      this.resetImagens();
      this.toastService.success('Perfil do estabelecimento salvo com sucesso!');
    } catch {
      this.toastService.error('Erro ao salvar dados do estabelecimento.');
    } finally {
      this.salvandoInfo.set(false);
      this.cdr.markForCheck();
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

  protected toggleImportacao(): void {
    this.importacaoExpandido.update((v) => !v);
  }

  protected selecionarPlataforma(plat: 'tua-agenda' | null): void {
    this.plataformaSelecionada.set(plat);
    this.arquivoSelecionado.set(null);
    this.resultadoImportacao.set(null);
  }

  protected selecionarCategoria(cat: 'clientes' | null): void {
    this.categoriaSelecionada.set(cat);
    this.arquivoSelecionado.set(null);
    this.resultadoImportacao.set(null);
  }

  protected onArquivoCsvSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        this.toastService.error('Selecione um arquivo de formato CSV (.csv).');
        input.value = '';
        return;
      }
      this.arquivoSelecionado.set(file);
      this.resultadoImportacao.set(null);
    }
  }

  protected limparArquivo(): void {
    this.arquivoSelecionado.set(null);
    this.resultadoImportacao.set(null);
  }

  protected async importarCsv(): Promise<void> {
    const file = this.arquivoSelecionado();
    if (!file) {
      this.toastService.error('Selecione um arquivo CSV para importar.');
      return;
    }

    this.importando.set(true);
    try {
      const res = await this.clientesService.importarClientesTuaAgenda(file);
      this.resultadoImportacao.set(res);
      this.toastService.success(
        `Importação do Tua Agenda concluída! ${res.totalCriados} novos clientes cadastrados.`,
      );
      if (res.clientesDuplicadosPorCelular && res.clientesDuplicadosPorCelular.length > 0) {
        this.exibirModalDuplicados.set(true);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Falha ao processar arquivo CSV do Tua Agenda.';
      this.toastService.error(msg);
    } finally {
      this.importando.set(false);
    }
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
