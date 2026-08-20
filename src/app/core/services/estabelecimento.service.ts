import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { DiaFuncionamento } from '../models/configuracoes/horario-estabelecimento.model';

export interface EstabelecimentoInfo {
  nome: string;
  nomeExibicao?: string;
  cnpj: string;
  telefone: string;
  logoUrl?: string;
  capaUrl?: string;
  descricao?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EstabelecimentoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/configuracoes/estabelecimento`;
  private readonly publicApiUrl = `${environment.apiUrl}/api/publico`;

  private readonly _horarios = signal<DiaFuncionamento[]>([]);
  readonly horarios = this._horarios.asReadonly();

  async carregarHorarios(): Promise<DiaFuncionamento[]> {
    try {
      const data = await firstValueFrom(this.http.get<DiaFuncionamento[]>(this.apiUrl));
      this._horarios.set(data);
      return data;
    } catch {
      // Fallback padrão se não houver dados
      const padrao: DiaFuncionamento[] = [];
      for (let i = 0; i <= 6; i++) {
        padrao.push({
          diaSemana: i,
          ativo: i !== 0,
          horaAbertura: '08:00',
          horaFechamento: '18:00',
          temIntervalo: true,
          intervaloInicio: '12:00',
          intervaloFim: '13:00',
        });
      }
      this._horarios.set(padrao);
      return padrao;
    }
  }

  async salvarHorarios(dias: DiaFuncionamento[]): Promise<void> {
    await firstValueFrom(this.http.put(this.apiUrl, { dias }));
    this._horarios.set(dias);
  }

  async carregarInfo(): Promise<EstabelecimentoInfo> {
    return firstValueFrom(this.http.get<EstabelecimentoInfo>(`${this.apiUrl}/info`));
  }

  /** Obtém o link público de agendamento; no primeiro acesso o backend gera e persiste. */
  async obterLinkAgendamento(): Promise<string> {
    const data = await firstValueFrom(this.http.get<{ link: string }>(`${this.apiUrl}/link-agendamento`));
    return data.link;
  }

  async salvarInfo(info: Partial<EstabelecimentoInfo>): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/info`, info));
  }

  /** Envia logo/capa via multipart; retorna as URLs relativas salvas em disco. */
  async salvarImagens(formData: FormData): Promise<{ logoUrl?: string; capaUrl?: string }> {
    return firstValueFrom(this.http.post<{ logoUrl?: string; capaUrl?: string }>(`${this.apiUrl}/imagens`, formData));
  }

  /** Converte URL relativa da API em URL absoluta para exibição; mantém base64/data para preview. */
  resolverUrl(url?: string): string {
    if (!url) {
      return '';
    }
    if (url.startsWith('data:') || url.startsWith('http')) {
      return url;
    }
    return `${environment.apiUrl}${url}`;
  }

  async carregarInfoPublico(estabelecimentoSlug: string): Promise<EstabelecimentoInfo> {
    return firstValueFrom(this.http.get<EstabelecimentoInfo>(`${this.publicApiUrl}/${estabelecimentoSlug}/agendamento/info`));
  }

  /** Retorna o horário de abertura e fechamento para um determinado dia da semana. */
  getHorarioDia(diaSemana: number): { dayStartHour: number; dayEndHour: number; ativo: boolean } {
    const lista = this.horarios();
    const diaConfig = lista.find((d) => d.diaSemana === diaSemana);

    if (!diaConfig || !diaConfig.ativo) {
      return { dayStartHour: 8, dayEndHour: 18, ativo: false };
    }

    const start = parseInt(diaConfig.horaAbertura?.split(':')[0] || '8', 10);
    const end = parseInt(diaConfig.horaFechamento?.split(':')[0] || '18', 10);

    return {
      dayStartHour: isNaN(start) ? 8 : start,
      dayEndHour: isNaN(end) ? 18 : end,
      ativo: true,
    };
  }
}
