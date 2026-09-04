import { ChangeDetectionStrategy, Component, DestroyRef, inject, ChangeDetectorRef, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, firstValueFrom } from 'rxjs';
import { TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { environment } from '../../../../../environments/environment';
import { WhatsAppTenantConfig } from '../../../../core/models/whatsapp/whatsapp.model';
import { WhatsAppService } from '../../../../core/services/whatsapp.service';
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
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TmTextComponent],
  templateUrl: './whatsapp-integracao.component.html',
  styleUrl: './whatsapp-integracao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappIntegracaoComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly whatsAppService = inject(WhatsAppService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toastService = inject(TmToastService);
  private readonly apiUrl = `${environment.apiUrl}/api/whatsapp`;

  protected readonly form: FormGroup = this.fb.group({
    welcomeMessage: [''],
    closingMessage: [''],
    lembrete1DiaMensagem: [''],
    lembrete4hMensagem: [''],
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


  /** Sinais para controle de expansão dos blocos colapsáveis (nascem colapsados) */
  protected readonly blocoConfigExpandido = signal(false);
  protected readonly blocoAjudaExpandido = signal(false);

  /** Variáveis disponíveis nas mensagens configuráveis (exibidas na tela) */
  protected readonly variaveisDisponiveis = [
    { codigo: '{primeiro_nome}', descricao: 'Primeiro nome do cliente (ex: João)' },
    { codigo: '{nome_completo}', descricao: 'Nome completo do cliente (ex: João Silva)' },
    { codigo: '{estabelecimento}', descricao: 'Nome de exibição do estabelecimento (ex: Groom Barbershop)' },
    { codigo: '{link}', descricao: 'Insere o link público de agendamento do estabelecimento' },
    { codigo: '{profissional}', descricao: 'Nome do profissional (ex: Carlos)' },
    { codigo: '{servico}', descricao: 'Nome do serviço (ex: Corte Degradê)' },
    { codigo: '{horario}', descricao: 'Horário do agendamento (ex: 14:30)' },
    { codigo: '{data_horario}', descricao: 'Data e horário do agendamento (ex: 20/08/2026 14:30)' },
  ];

  protected toggleBlocoConfig(): void { this.blocoConfigExpandido.update(v => !v); }
  protected toggleBlocoAjuda(): void { this.blocoAjudaExpandido.update(v => !v); }

  protected voltar(): void {
    this.location.back();
  }



  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.verificarStatus(),
      this.carregarDispositivos(),
      this.carregarConfig(),
    ]);
  }

  async salvarConfig(): Promise<void> {
    this.configSalvando.set(true);

    try {
      const v = this.form.value;
      const numeros = [v.testNumber1, v.testNumber2, v.testNumber3]
        .filter((n: string) => n?.trim())
        .join(', ');

      const config: WhatsAppTenantConfig = {
        welcomeMessage: v.welcomeMessage || null,
        closingMessage: v.closingMessage || null,
        lembrete1DiaMensagem: v.lembrete1DiaMensagem || null,
        lembrete4hMensagem: v.lembrete4hMensagem || null,
        testMode: v.testMode ?? false,
        testNumbers: numeros || null,
      };

      await this.whatsAppService.saveConfig(config);
      this.toastService.success('Configurações salvas com sucesso!', 'Sucesso');
    } catch {
      this.toastService.error('Erro ao salvar configurações. Tente novamente.', 'Erro');
    } finally {
      this.configSalvando.set(false);
    }
  }

  protected async carregarConfig(): Promise<void> {
    try {
      const config = await this.whatsAppService.getConfig();
      const numeros = (config.testNumbers ?? '').split(',').map((n: string) => n.trim()).filter((n: string) => n);
      this.form.patchValue({
        welcomeMessage: config.welcomeMessage ?? '',
        closingMessage: config.closingMessage ?? '',
        lembrete1DiaMensagem: config.lembrete1DiaMensagem ?? '',
        lembrete4hMensagem: config.lembrete4hMensagem ?? '',
        testMode: config.testMode,
        testNumber1: numeros[0] ?? '',
        testNumber2: numeros[1] ?? '',
        testNumber3: numeros[2] ?? '',
      });
      this.cdr.markForCheck();
    } catch {
      this.form.patchValue({
        welcomeMessage: '',
        closingMessage: '',
        lembrete1DiaMensagem: '',
        lembrete4hMensagem: '',
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
      const lista = Array.isArray(raw) ? raw : [];
      const conectados = lista.filter(d => 
        d.connectionStatus === 'open' || 
        (d as any).status === 'open' || 
        (d as any).state === 'open'
      );
      this.dispositivos.set(conectados);
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
}
