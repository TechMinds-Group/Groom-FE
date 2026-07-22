import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ServicoCatalogo } from '../models/catalogo/servico.model';

@Injectable({
  providedIn: 'root',
})
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogo`;

  private readonly _servicos = signal<ServicoCatalogo[]>([]);
  readonly servicos = this._servicos.asReadonly();

  async carregarServicos(): Promise<void> {
    const data = await firstValueFrom(this.http.get<ServicoCatalogo[]>(this.apiUrl));
    this._servicos.set(data);
  }

  async adicionar(servico: any): Promise<void> {
    await firstValueFrom(this.http.post(this.apiUrl, servico));
    await this.carregarServicos();
  }

  async atualizar(id: string, dados: any): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/${id}`, { id, ...dados }));
    await this.carregarServicos();
  }

  async remover(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
    await this.carregarServicos();
  }
}