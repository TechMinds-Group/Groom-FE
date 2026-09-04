import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import {
  EstabelecimentoInfo,
  EstabelecimentoService,
  obterIconeAleatorioCapa,
  obterIconeAleatorioLogo,
} from '../../../../core/services/estabelecimento.service';

/**
 * Componente de Gestão do Perfil e Identidade do Estabelecimento.
 */
@Component({
  selector: 'app-estabelecimento-config',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './estabelecimento-config.component.html',
  styleUrl: './estabelecimento-config.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstabelecimentoConfigComponent implements OnInit {
  private readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Sinais para a identidade do estabelecimento */
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

  protected readonly diasValidadeLink = signal<number>(5);
  protected readonly diasValidadeLinkOriginal = signal<number>(5);

  protected readonly temAlteracoesInfo = computed(() => {
    if (this.logoFile() !== null || this.capaFile() !== null || this.logoRemovida() || this.capaRemovida()) {
      return true;
    }
    if (this.diasValidadeLink() !== this.diasValidadeLinkOriginal()) {
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

  /** Arquivos pendentes de upload e previews locais */
  protected readonly logoFile = signal<File | null>(null);
  protected readonly capaFile = signal<File | null>(null);
  protected readonly logoPreview = signal('');
  protected readonly capaPreview = signal('');
  protected readonly logoRemovida = signal(false);
  protected readonly capaRemovida = signal(false);

  /** Imagem exibida: preview do arquivo selecionado, ou URL do servidor */
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

  async ngOnInit(): Promise<void> {
    await this.carregarInfo();
  }

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

  protected atualizarDiasValidadeLink(valor: number | string): void {
    const parsed = typeof valor === 'number' ? valor : parseInt(valor, 10);
    this.diasValidadeLink.set(isNaN(parsed) ? 1 : Math.max(1, parsed));
    this.cdr.markForCheck();
  }

  protected async carregarInfo(): Promise<void> {
    try {
      const [data, dias] = await Promise.all([
        this.estabelecimentoService.carregarInfo(),
        this.estabelecimentoService.carregarValidadeLink(),
      ]);
      if (data) {
        this.estabelecimentoInfo.set(structuredClone(data));
        this.montarEnderecoCompleto();
        this.estabelecimentoInfoOriginal.set(structuredClone(this.estabelecimentoInfo()));
      }
      this.diasValidadeLink.set(dias);
      this.diasValidadeLinkOriginal.set(dias);
      this.resetImagens();
      this.cdr.markForCheck();
    } catch {
      // Ignora erro se ainda não houver informações salvas
    }
  }

  protected cancelarAlteracoesInfo(): void {
    const orig = this.estabelecimentoInfoOriginal();
    this.estabelecimentoInfo.set(structuredClone(orig));
    this.diasValidadeLink.set(this.diasValidadeLinkOriginal());
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

      if (this.diasValidadeLink() !== this.diasValidadeLinkOriginal()) {
        await this.estabelecimentoService.salvarValidadeLink(this.diasValidadeLink());
        this.diasValidadeLinkOriginal.set(this.diasValidadeLink());
      }

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
    this.location.back();
  }
}
