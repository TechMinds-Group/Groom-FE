import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-5 mb-5">
      <h2 class="h4 fw-bold mb-4 custom-dark-text">
        <i class="fas fa-cog me-2 text-primary"></i>Configurações
      </h2>

      <div class="card border-0 shadow-sm p-4 custom-dark-card">
        <div class="row g-4">
          <div class="col-12">
            <label class="form-label fw-semibold">Validade do Link Compartilhável (dias)</label>
            <p class="text-muted small mb-2">
              Define por quantos dias o link gerado para o assinante visualizar seus dados fica ativo.
            </p>
            <div class="d-flex align-items-center gap-3">
              <input
                type="number"
                class="form-control"
                style="max-width: 120px"
                min="1"
                max="365"
                [(ngModel)]="dias"
              />
              <span class="text-muted small">dias</span>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <button
            class="btn btn-primary px-4 fw-bold"
            (click)="salvar()"
            [disabled]="salvando()"
          >
            @if (salvando()) {
              <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            }
            <i class="fas fa-save me-2"></i>Salvar
          </button>

          @if (mensagem(); as msg) {
            <span class="ms-3" [class.text-success]="msg.tipo === 'sucesso'" [class.text-danger]="msg.tipo === 'erro'">
              {{ msg.texto }}
            </span>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracoesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/configuracoes/link`;

  protected readonly dias = signal(5);
  protected readonly salvando = signal(false);
  protected readonly mensagem = signal<{ tipo: string; texto: string } | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<{ dias: number }>(this.apiUrl));
      this.dias.set(response.dias);
    } catch {
      this.dias.set(5);
    }
  }

  async salvar(): Promise<void> {
    this.salvando.set(true);
    this.mensagem.set(null);
    try {
      await firstValueFrom(this.http.put(this.apiUrl, { dias: this.dias() }));
      this.mensagem.set({ tipo: 'sucesso', texto: 'Configuração salva com sucesso!' });
    } catch {
      this.mensagem.set({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' });
    } finally {
      this.salvando.set(false);
    }
  }
}
