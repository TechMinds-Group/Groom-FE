import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ClubeConfig {
  id: string;
  nome: string;
  preco: number;
  frequencia: string;
  descricao: string;
  recursos: string[];
  totalAssinantes: number;
  status: 'Ativo' | 'Inativo' | string;
}

@Injectable({
  providedIn: 'root',
})
export class ClubesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/planos-estabelecimento`;

  private readonly _clubes = signal<ClubeConfig[]>([]);
  readonly clubes = this._clubes.asReadonly();

  carregarClubes(): Observable<ClubeConfig[]> {
    return this.http.get<ClubeConfig[]>(this.apiUrl).pipe(
      tap((planos) => this._clubes.set(planos))
    );
  }

  adicionar(clube: Omit<ClubeConfig, 'id' | 'totalAssinantes'>): Observable<void> {
    return this.http.post<void>(this.apiUrl, clube).pipe(
      tap(() => this.carregarClubes().subscribe())
    );
  }

  atualizar(id: string, dadosAtualizados: Partial<Omit<ClubeConfig, 'id' | 'totalAssinantes'>>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, { id, ...dadosAtualizados }).pipe(
      tap(() => this.carregarClubes().subscribe())
    );
  }

  excluir(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.carregarClubes().subscribe())
    );
  }

  // Fallback temporary for other screens using the old synchronous signal method
  atualizarContadorAssinantes(id: string, delta: number): void {
    // Ideally this would also be an API call (e.g. POST /v1/planos/{id}/assinantes/sync)
    // but we will update the local signal if needed or just reload from server.
    // Let's reload from server to keep it clean.
    this.carregarClubes().subscribe();
  }
}
