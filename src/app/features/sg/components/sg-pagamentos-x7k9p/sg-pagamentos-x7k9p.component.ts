import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TmModalComponent, TmToastService, TmTextComponent } from '@techminds-group/tm-angular-lib';
import { AuthService } from '../../../../core/services/auth.service';

export interface AvisoConfig {
  ativo: boolean;
  diasAntecedencia?: number;
  diasTolerancia?: number;
  vezesPorDia: number;
  horariosTexto: string; // ex: "09:00, 14:00"
  titulo: string;
  mensagem: string;
  labelBotaoFechar: string;
  labelBotaoIrParaAssinatura: string;
}

@Component({
  selector: 'app-sg-pagamentos-x7k9p',
  standalone: true,
  imports: [CommonModule, FormsModule, TmModalComponent],
  templateUrl: './sg-pagamentos-x7k9p.component.html',
  styleUrl: './sg-pagamentos-x7k9p.component.scss',
})
export class SgPagamentosX7k9pComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(TmToastService);

  protected isLoading = signal<boolean>(true);
  protected isSaving = signal<boolean>(false);
  protected errorMessage = signal<string | null>(null);

  // Configuração Aviso Vencimento Próximo
  protected proximoAtivo = signal<boolean>(true);
  protected proximoDiasAntecedencia = signal<number>(5);
  protected proximoVezesPorDia = signal<number>(2);
  protected proximoHorariosTexto = signal<string>('09:00, 14:00');
  protected proximoTitulo = signal<string>('Atenção: Sua assinatura vence em {dias} dias');
  protected proximoMensagem = signal<string>(
    'Sua licença do sistema vencerá em {dias} dias. Para evitar qualquer interrupção dos seus serviços, por favor acesse a tela de assinatura e realize a renovação.'
  );

  // Configuração Aviso Assinatura Vencida
  protected vencidoAtivo = signal<boolean>(true);
  protected vencidoDiasTolerancia = signal<number>(10);
  protected vencidoVezesPorDia = signal<number>(3);
  protected vencidoHorariosTexto = signal<string>('09:00, 13:00, 17:00');
  protected vencidoTitulo = signal<string>('Atenção: Assinatura Vencida');
  protected vencidoMensagem = signal<string>(
    'Sua assinatura do sistema está vencida. O bloqueio total dos recursos do sistema ocorrerá em {dias} dias. Por favor, regularize seu pagamento.'
  );

  // Estado para Modal de Teste / Pré-visualização
  protected showPreviewModal = signal<boolean>(false);
  protected previewTipo = signal<'proximo' | 'vencido'>('proximo');
  protected previewTituloCalculado = signal<string>('');
  protected previewMensagemCalculada = signal<string>('');

  ngOnInit(): void {
    this.carregarConfiguracoes();
  }

  carregarConfiguracoes(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.getSgPagamentosConfig().subscribe({
      next: (data) => {
        if (data?.avisoVencimentoProximo) {
          const p = data.avisoVencimentoProximo;
          this.proximoAtivo.set(p.ativo ?? true);
          this.proximoDiasAntecedencia.set(p.diasAntecedencia ?? 5);
          this.proximoVezesPorDia.set(p.vezesPorDia ?? 2);
          const horariosArr = Array.isArray(p.horarios) ? p.horarios.join(', ') : '09:00, 14:00';
          this.proximoHorariosTexto.set(horariosArr);
          this.proximoTitulo.set(p.titulo || 'Atenção: Sua assinatura vence em {dias} dias');
          this.proximoMensagem.set(
            p.mensagem ||
              'Sua licença do sistema vencerá em {dias} dias. Para evitar a interrupção dos seus serviços, por favor realize a renovação.'
          );
        }

        if (data?.avisoAssinaturaVencida) {
          const v = data.avisoAssinaturaVencida;
          this.vencidoAtivo.set(v.ativo ?? true);
          this.vencidoDiasTolerancia.set(v.diasTolerancia ?? 10);
          this.vencidoVezesPorDia.set(v.vezesPorDia ?? 3);
          const horariosArr = Array.isArray(v.horarios) ? v.horarios.join(', ') : '09:00, 13:00, 17:00';
          this.vencidoHorariosTexto.set(horariosArr);
          this.vencidoTitulo.set(v.titulo || 'Atenção: Assinatura Vencida');
          this.vencidoMensagem.set(
            v.mensagem ||
              'Sua assinatura do sistema está vencida. O bloqueio total ocorrerá em {dias} dias. Por favor, regularize seu pagamento.'
          );
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Falha ao carregar configurações de pagamentos.');
        this.isLoading.set(false);
      },
    });
  }

  salvarConfiguracoes(): void {
    this.isSaving.set(true);

    const parseHorarios = (str: string) =>
      str
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

    const payload = {
      avisoVencimentoProximo: {
        ativo: this.proximoAtivo(),
        diasAntecedencia: Number(this.proximoDiasAntecedencia()),
        vezesPorDia: Number(this.proximoVezesPorDia()),
        horarios: parseHorarios(this.proximoHorariosTexto()),
        titulo: this.proximoTitulo(),
        mensagem: this.proximoMensagem(),
        labelBotaoFechar: 'Fechar',
        labelBotaoIrParaAssinatura: 'Ir para Assinatura',
      },
      avisoAssinaturaVencida: {
        ativo: this.vencidoAtivo(),
        diasTolerancia: Number(this.vencidoDiasTolerancia()),
        vezesPorDia: Number(this.vencidoVezesPorDia()),
        horarios: parseHorarios(this.vencidoHorariosTexto()),
        titulo: this.vencidoTitulo(),
        mensagem: this.vencidoMensagem(),
        labelBotaoFechar: 'Fechar',
        labelBotaoIrParaAssinatura: 'Ir para Assinatura',
      },
    };

    this.authService.updateSgPagamentosConfig(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.toastService.success('Configurações de avisos salvas com sucesso!', 'Sucesso SG');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toastService.error(
          err?.error?.message || 'Erro ao salvar configurações de pagamentos.',
          'Erro'
        );
      },
    });
  }

  testarModal(tipo: 'proximo' | 'vencido'): void {
    this.previewTipo.set(tipo);
    if (tipo === 'proximo') {
      const dias = this.proximoDiasAntecedencia();
      this.previewTituloCalculado.set(this.proximoTitulo().replace('{dias}', String(dias)));
      this.previewMensagemCalculada.set(this.proximoMensagem().replace('{dias}', String(dias)));
    } else {
      const dias = this.vencidoDiasTolerancia();
      this.previewTituloCalculado.set(this.vencidoTitulo().replace('{dias}', String(dias)));
      this.previewMensagemCalculada.set(this.vencidoMensagem().replace('{dias}', String(dias)));
    }
    this.showPreviewModal.set(true);
  }

  fecharPreview(): void {
    this.showPreviewModal.set(false);
  }

  protected isResetting = signal<boolean>(false);

  resetarHistoricoExibicoes(): void {
    this.isResetting.set(true);
    this.authService.resetSgExibicoesAvisos().subscribe({
      next: () => {
        this.isResetting.set(false);
        this.toastService.success(
          'Contador zerado! O histórico de exibições foi limpo e os modais poderão ser re-testados.',
          'Reset Concluído'
        );
      },
      error: (err) => {
        this.isResetting.set(false);
        this.toastService.error(
          err?.error?.message || 'Falha ao zerar histórico de exibições.',
          'Erro'
        );
      },
    });
  }
}
