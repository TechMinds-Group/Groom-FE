import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClubesService } from './clubes.service';

export interface ClienteAssinante {
  id: string;
  clienteNome: string;
  clienteEmail?: string;
  celular: string;
  clubeId: string;
  clubeNome: string;
  valor: number;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string; // YYYY-MM-DD
  diasRestantes: number;
  status: 'Ativo' | 'Pendente' | 'Expirado';
  integrado: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AssinantesService {
  private readonly http = inject(HttpClient);
  private readonly clubesService = inject(ClubesService);
  private readonly apiUrl = `${environment.apiUrl}/assinantes-estabelecimento`;

  private readonly _assinantes = signal<ClienteAssinante[]>([]);
  readonly assinantes = this._assinantes.asReadonly();

  private normalizeDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  }

  async carregarAssinantes(): Promise<void> {
    const data = await firstValueFrom(this.http.get<ClienteAssinante[]>(this.apiUrl, { withCredentials: true }));
    const normalizedData = data.map((a) => ({
      ...a,
      dataInicio: this.normalizeDate(a.dataInicio),
      dataFim: this.normalizeDate(a.dataFim),
    }));
    this._assinantes.set(normalizedData);
  }

  async carregarAssinantePorId(id: string): Promise<ClienteAssinante> {
    const data = await firstValueFrom(this.http.get<ClienteAssinante>(`${this.apiUrl}/${id}`, { withCredentials: true }));
    return {
      ...data,
      dataInicio: this.normalizeDate(data.dataInicio),
      dataFim: this.normalizeDate(data.dataFim),
    };
  }

  async adicionar(dados: Omit<ClienteAssinante, 'id' | 'clubeNome' | 'valor' | 'dataFim' | 'diasRestantes' | 'status' | 'integrado'>): Promise<void> {
    await firstValueFrom(this.http.post<string>(this.apiUrl, {
      clienteNome: dados.clienteNome,
      clienteEmail: dados.clienteEmail,
      celular: dados.celular,
      clubeId: dados.clubeId,
      dataInicio: dados.dataInicio,
    }, { withCredentials: true }));
    await this.carregarAssinantes();
    this.clubesService.atualizarContadorAssinantes(dados.clubeId, 1);
  }

  async atualizar(id: string, dados: Partial<Omit<ClienteAssinante, 'id'>>): Promise<void> {
    const antigo = this._assinantes().find((a) => a.id === id);
    await firstValueFrom(this.http.put<string>(`${this.apiUrl}/${id}`, {
      id: id,
      clienteNome: dados.clienteNome || antigo?.clienteNome,
      clienteEmail: dados.clienteEmail || antigo?.clienteEmail,
      celular: dados.celular || antigo?.celular,
      clubeId: dados.clubeId || antigo?.clubeId,
      dataInicio: dados.dataInicio || antigo?.dataInicio,
    }, { withCredentials: true }));
    await this.carregarAssinantes();
    if (antigo && dados.clubeId && dados.clubeId !== antigo.clubeId) {
      this.clubesService.atualizarContadorAssinantes(antigo.clubeId, -1);
      this.clubesService.atualizarContadorAssinantes(dados.clubeId, 1);
    }
  }

  async excluir(id: string): Promise<void> {
    const antigo = this._assinantes().find((a) => a.id === id);
    await firstValueFrom(this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true }));
    await this.carregarAssinantes();
    if (antigo) {
      this.clubesService.atualizarContadorAssinantes(antigo.clubeId, -1);
    }
  }
}
