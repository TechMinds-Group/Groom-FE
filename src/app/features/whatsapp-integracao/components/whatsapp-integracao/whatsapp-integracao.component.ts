import { ChangeDetectionStrategy, Component, DestroyRef, inject, ChangeDetectorRef, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, firstValueFrom } from 'rxjs';
import { TmTextComponent } from '@techminds-group/tm-angular-lib';
import { environment } from '../../../../../environments/environment';
import { ProfissionalWhatsAppConfig, WhatsAppTenantConfig } from '../../../../core/models/whatsapp/whatsapp.model';
import { WhatsAppService } from '../../../../core/services/whatsapp.service';
import { WhatsAppProfissionalService } from '../../../../core/services/whatsapp-profissional.service';
import { ProfissionalNumeroModalComponent } from '../modais/profissional-numero-modal/profissional-numero-modal.component';

import { Router, RouterModule } from '@angular/router';

interface QrCodeData {
  base64?: string;
  code?: string;
  status?: string;
}

interface StatusData {
  state?: string;
  status?: string;
  number?: string;
}

interface DispositivoWhatsApp {
  id: string;
  name: string;
  connectionStatus: string;
  ownerJid: string;
  profileName?: string;
  profilePicUrl?: string;
  integration: string;
  number?: string;
  createdAt: string;
  updatedAt: string;
}

type InstancesResponse = DispositivoWhatsApp[];

@Component({
  selector: 'app-whatsapp-integracao',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TmTextComponent, ProfissionalNumeroModalComponent],
  templateUrl: './whatsapp-integracao.component.html',
  styleUrl: './whatsapp-integracao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappIntegracaoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly whatsAppService = inject(WhatsAppService);
  private readonly whatsAppProfissionalService = inject(WhatsAppProfissionalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly apiUrl = `${environment.apiUrl}/api/whatsapp`;

  protected readonly form: FormGroup = this.fb.group({
    schedulingLink: [''],
    welcomeMessage: [''],
    testMode: [false],
    testNumber1: [''],
    testNumber2: [''],
    testNumber3: [''],
  });

  protected readonly carregando = signal(true);
  protected readonly conectando = signal(false);
  protected readonly conectado = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly qrCodeBase64 = signal<string | null>(null);
  protected readonly statusTexto = signal('Verificando conexão...');
  protected readonly dispositivos = signal<DispositivoWhatsApp[]>([]);
  protected readonly configSalvando = signal(false);
  protected readonly configMensagem = signal<string | null>(null);

  /** Sinais para controle de expansão dos blocos colapsáveis */
  protected readonly blocoConexaoExpandido = signal(true);
  protected readonly blocoConfigExpandido = signal(true);
  protected readonly blocoProfissionaisExpandido = signal(true);
  protected readonly blocoAjudaExpandido = signal(false);

  protected toggleBlocoConexao(): void { this.blocoConexaoExpandido.update(v => !v); }
  protected toggleBlocoConfig(): void { this.blocoConfigExpandido.update(v => !v); }
  protected toggleBlocoProfissionais(): void { this.blocoProfissionaisExpandido.update(v => !v); }
  protected toggleBlocoAjuda(): void { this.blocoAjudaExpandido.update(v => !v); }

  protected voltar(): void {
    this.router.navigate(['/configuracoes']);
  }

  protected readonly profissionaisWhatsApp = signal<ProfissionalWhatsAppConfig[]>([]);
  protected readonly profissionaisSemNumero = signal<ProfissionalWhatsAppConfig[]>([]);
  protected readonly modalAberto = signal(false);
  protected readonly configParaEditar = signal<ProfissionalWhatsAppConfig | null>(null);
  protected readonly toastMensagem = signal<{ texto: string; erro: boolean } | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.verificarStatus(),
      this.carregarDispositivos(),
      this.carregarConfig(),
      this.carregarProfissionais(),
    ]);
  }

  async salvarConfig(): Promise<void> {
    this.configSalvando.set(true);
    this.configMensagem.set(null);

    try {
      const v = this.form.value;
      const numeros = [v.testNumber1, v.testNumber2, v.testNumber3]
        .filter((n: string) => n?.trim())
        .join(', ');

      const config: WhatsAppTenantConfig = {
        schedulingLink: v.schedulingLink || null,
        welcomeMessage: v.welcomeMessage || null,
        testMode: v.testMode ?? false,
        testNumbers: numeros || null,
      };

      await this.whatsAppService.saveConfig(config);
      this.configMensagem.set('Configurações salvas com sucesso!');
    } catch {
      this.configMensagem.set('Erro ao salvar configurações. Tente novamente.');
    } finally {
      this.configSalvando.set(false);
    }
  }

  protected async carregarConfig(): Promise<void> {
    try {
      const config = await this.whatsAppService.getConfig();
      const numeros = (config.testNumbers ?? '').split(',').map((n: string) => n.trim()).filter((n: string) => n);
      this.form.patchValue({
        schedulingLink: config.schedulingLink ?? '',
        welcomeMessage: config.welcomeMessage ?? '',
        testMode: config.testMode,
        testNumber1: numeros[0] ?? '',
        testNumber2: numeros[1] ?? '',
        testNumber3: numeros[2] ?? '',
      });
      this.cdr.markForCheck();
    } catch {
      this.form.patchValue({
        schedulingLink: '',
        welcomeMessage: '',
        testMode: false,
        testNumber1: '',
        testNumber2: '',
        testNumber3: '',
      });
      this.cdr.markForCheck();
    }
  }

  async conectar(): Promise<void> {
    this.conectando.set(true);
    this.erro.set(null);
    this.qrCodeBase64.set(null);

    try {
      const raw = await firstValueFrom(
        this.http.get<QrCodeData>(`${this.apiUrl}/connect`),
      );

      if (raw.base64) {
        this.qrCodeBase64.set(raw.base64);
        this.statusTexto.set('Escaneie o QR Code com o WhatsApp Business');
        this.iniciarPolling();
      } else if (raw.code) {
        this.qrCodeBase64.set(raw.code);
        this.statusTexto.set('Escaneie o QR Code com o WhatsApp Business');
        this.iniciarPolling();
      } else if (raw.status === 'connected' || raw.status === 'open') {
        this.conectado.set(true);
        this.statusTexto.set('WhatsApp conectado com sucesso!');
        await this.carregarDispositivos();
      } else {
        this.erro.set('Resposta inesperada da Evolution API. Tente novamente.');
      }
    } catch {
      this.erro.set('Erro ao conectar com o servidor. Verifique sua conexão.');
    } finally {
      this.conectando.set(false);
      this.carregando.set(false);
    }
  }

  private async carregarDispositivos(): Promise<void> {
    try {
      const raw = await firstValueFrom(
        this.http.get<InstancesResponse>(`${this.apiUrl}/devices`),
      );
      this.dispositivos.set(Array.isArray(raw) ? raw : []);
    } catch {
      this.dispositivos.set([]);
    }
  }

  private async verificarStatus(): Promise<void> {
    try {
      const raw = await firstValueFrom(
        this.http.get<StatusData>(`${this.apiUrl}/status`),
      );

      if (raw.state === 'open') {
        this.conectado.set(true);
        const numero = raw.number ? ` (${this.formatarNumero(raw.number)})` : '';
        this.statusTexto.set(`WhatsApp conectado!${numero}`);
      } else {
        this.statusTexto.set('WhatsApp desconectado. Clique em "Conectar" para gerar o QR Code.');
      }
      this.carregando.set(false);
    } catch {
      this.statusTexto.set('Clique em "Conectar" para iniciar a integração.');
      this.carregando.set(false);
    }
  }

  private async verificarStatusPoll(): Promise<boolean> {
    try {
      const raw = await firstValueFrom(
        this.http.get<StatusData>(`${this.apiUrl}/status`),
      );
      return raw.state === 'open';
    } catch {
      return false;
    }
  }

  private iniciarPolling(): void {
    interval(5000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async () => {
        const isOpen = await this.verificarStatusPoll();

        if (isOpen) {
          this.conectado.set(true);
          this.statusTexto.set('WhatsApp conectado com sucesso!');
          this.qrCodeBase64.set(null);
          await this.carregarDispositivos();
        }
      });
  }

  protected formatarNumero(num?: string): string {
    if (!num) return '';
    let cleaned = num.split('@')[0];
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      const ddd = cleaned.substring(2, 4);
      const part1 = cleaned.substring(4, cleaned.length - 4);
      const part2 = cleaned.substring(cleaned.length - 4);
      return `+55 (${ddd}) ${part1}-${part2}`;
    }
    return cleaned;
  }

  protected async carregarProfissionais(): Promise<void> {
    try {
      const list = await firstValueFrom(this.whatsAppProfissionalService.getNumerosProfissionais());
      this.profissionaisWhatsApp.set(list);
      this.profissionaisSemNumero.set(list.filter((p) => !p.numero));
      this.cdr.markForCheck();
    } catch {
      this.profissionaisWhatsApp.set([]);
      this.profissionaisSemNumero.set([]);
      this.cdr.markForCheck();
    }
  }

  protected abrirModalNovo(): void {
    this.configParaEditar.set(null);
    this.modalAberto.set(true);
  }

  protected abrirModalEditar(config: ProfissionalWhatsAppConfig): void {
    this.configParaEditar.set(config);
    this.modalAberto.set(true);
  }

  protected fecharModal(): void {
    this.modalAberto.set(false);
    this.configParaEditar.set(null);
  }

  protected async salvarNumeroProfissional(event: { profissionalId: string; numero: string }): Promise<void> {
    try {
      await firstValueFrom(this.whatsAppProfissionalService.salvarNumero(event.profissionalId, event.numero));
      this.fecharModal();
      this.toastMensagem.set({ texto: 'Número de WhatsApp salvo com sucesso!', erro: false });
      await this.carregarProfissionais();
    } catch {
      this.toastMensagem.set({ texto: 'Erro ao salvar o número de WhatsApp.', erro: true });
    }
  }

  protected async removerNumeroProfissional(config: ProfissionalWhatsAppConfig): Promise<void> {
    if (!confirm(`Deseja realmente remover o número de WhatsApp do profissional ${config.profissionalNome}?`)) {
      return;
    }

    try {
      await firstValueFrom(this.whatsAppProfissionalService.removerNumero(config.profissionalId));
      this.toastMensagem.set({ texto: 'Número de WhatsApp removido com sucesso!', erro: false });
      await this.carregarProfissionais();
    } catch {
      this.toastMensagem.set({ texto: 'Erro ao remover o número de WhatsApp.', erro: true });
    }
  }

  protected formatarTelefoneExibicao(numero: string | null): string {
    if (!numero) return 'Não cadastrado';
    const digits = numero.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 13 && digits.startsWith('55')) {
      const ddd = digits.slice(2, 4);
      const rest = digits.slice(4);
      if (rest.length === 9) {
        return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
      }
      return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
    return numero;
  }
}
