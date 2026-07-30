import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss',
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
