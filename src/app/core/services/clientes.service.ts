import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cliente } from '../models/clientes/cliente.model';

export interface ClientePayload {
  primeiroNome: string;
  sobrenome: string;
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

  async excluir(id: string, confirmarAgendamentosFuturos = false): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.apiUrl}/${id}?confirmarAgendamentosFuturos=${confirmarAgendamentosFuturos}`, { withCredentials: true })
      );
      await this.carregarClientes();
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        const body = err.error as { message?: string; detail?: string; requiresConfirmation?: boolean } | null;
        if (err.status === 409 && body?.requiresConfirmation) {
          throw { requiresConfirmation: true, message: body.message };
        }
        throw new Error(body?.message ?? body?.detail ?? 'Não é possível excluir o cliente pois ele possui vínculos no sistema.');
      }
      throw err;
    }
  }

  async atualizarCelularMeuPerfil(celular: string): Promise<void> {
    await firstValueFrom(
      this.http.put<void>(`${this.apiUrl}/me/celular`, { celular }, { withCredentials: true })
    );
  }

  async importarClientesTuaAgenda(file: File): Promise<ImportacaoClienteResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const result = await firstValueFrom(
      this.http.post<ImportacaoClienteResult>(`${this.apiUrl}/importar/tua-agenda`, formData, { withCredentials: true })
    );
    await this.carregarClientes();
    return result;
  }
}

export interface ItemClienteDuplicado {
  linhaCsv: number;
  nomeCsv: string;
  celular: string;
  clienteExistenteId: string;
  clienteExistenteNome: string;
  clienteExistenteEmail?: string;
}

export interface ImportacaoClienteResult {
  totalLinhas: number;
  totalCriados: number;
  totalAtualizados: number;
  totalIgnoradosPorLimite: number;
  totalErros: number;
  erros: string[];
  clientesDuplicadosPorCelular: ItemClienteDuplicado[];
}