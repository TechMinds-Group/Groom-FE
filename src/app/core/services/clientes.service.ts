import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente } from '../models/clientes/cliente.model';

export interface ClientePayload {
  nome: string;
  email?: string;
  celular: string;
  cpf?: string;
  dataNascimento?: string;
  observacoes?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/clientes`;

  private readonly _clientes = signal<Cliente[]>([]);
  readonly clientes = this._clientes.asReadonly();

  async carregarClientes(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<Cliente[]>(this.apiUrl, { withCredentials: true })
    );
    this._clientes.set(data);
  }

  async carregarClientePorId(id: string): Promise<Cliente> {
    return await firstValueFrom(
      this.http.get<Cliente>(`${this.apiUrl}/${id}`, { withCredentials: true })
    );
  }

  async adicionar(dados: ClientePayload): Promise<void> {
    await firstValueFrom(
      this.http.post<string>(this.apiUrl, dados, { withCredentials: true })
    );
    await this.carregarClientes();
  }

  async atualizar(id: string, dados: Partial<ClientePayload>): Promise<void> {
    await firstValueFrom(
      this.http.put<string>(`${this.apiUrl}/${id}`, dados, { withCredentials: true })
    );
    await this.carregarClientes();
  }

  async excluir(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true })
    );
    await this.carregarClientes();
  }
}