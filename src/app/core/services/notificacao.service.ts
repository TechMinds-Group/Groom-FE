import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificacaoItem, NotificacoesResposta } from '../models/notificacao/notificacao.model';

@Injectable({
  providedIn: 'root'
})
export class NotificacaoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notificacoes`;

  readonly notificacoes = signal<NotificacaoItem[]>([]);
  readonly quantidadeNaoLidas = signal<number>(0);
  readonly carregando = signal<boolean>(false);

  private getOptions(params?: HttpParams) {
    return {
      withCredentials: true,
      headers: new HttpHeaders({ 'X-Skip-Error-Toast': 'true' }),
      params
    };
  }

  carregarNotificacoes(): Observable<NotificacoesResposta> {
    this.carregando.set(true);
    return this.http.get<NotificacoesResposta>(this.apiUrl, this.getOptions()).pipe(
      tap({
        next: (res) => {
          this.notificacoes.set(res.items || []);
          this.quantidadeNaoLidas.set(res.quantidadeNaoLidas || 0);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false)
      }),
      catchError(() => {
        this.carregando.set(false);
        return of({ items: [], quantidadeNaoLidas: 0 });
      })
    );
  }

  carregarNotificacoesComFiltro(busca?: string, tipo?: string, apenasNaoLidas?: boolean, dias = 90): Observable<NotificacoesResposta> {
    this.carregando.set(true);
    let params = new HttpParams().set('dias', dias.toString());
    if (busca) params = params.set('busca', busca);
    if (tipo && tipo !== 'Todos') params = params.set('tipo', tipo);
    if (apenasNaoLidas !== undefined) params = params.set('apenasNaoLidas', apenasNaoLidas.toString());

    return this.http.get<NotificacoesResposta>(this.apiUrl, this.getOptions(params)).pipe(
      tap({
        next: (res) => {
          this.notificacoes.set(res.items || []);
          this.quantidadeNaoLidas.set(res.quantidadeNaoLidas || 0);
          this.carregando.set(false);
        },
        error: () => this.carregando.set(false)
      }),
      catchError(() => {
        this.carregando.set(false);
        return of({ items: [], quantidadeNaoLidas: 0 });
      })
    );
  }

  marcarComoLida(id: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/lida`, {}, this.getOptions()).pipe(
      tap(() => {
        this.notificacoes.update((lista) =>
          lista.map((n) => (n.id === id ? { ...n, lida: true } : n))
        );
        this.quantidadeNaoLidas.update((qtd) => Math.max(0, qtd - 1));
      }),
      catchError(() => of(undefined))
    );
  }

  marcarTodasComoLidas(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/marcar-todas-lidas`, {}, this.getOptions()).pipe(
      tap(() => {
        this.notificacoes.update((lista) =>
          lista.map((n) => ({ ...n, lida: true }))
        );
        this.quantidadeNaoLidas.set(0);
      }),
      catchError(() => of(undefined))
    );
  }

  marcarLidasEmLote(ids: string[]): Observable<void> {
    if (!ids || ids.length === 0) return of(undefined);
    return this.http.put<void>(`${this.apiUrl}/marcar-lidas-em-lote`, ids, this.getOptions()).pipe(
      tap(() => {
        this.notificacoes.update((lista) =>
          lista.map((n) => (ids.includes(n.id) ? { ...n, lida: true } : n))
        );
        const lidasRecentes = ids.length;
        this.quantidadeNaoLidas.update((qtd) => Math.max(0, qtd - lidasRecentes));
      }),
      catchError(() => of(undefined))
    );
  }

  removerNotificacao(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, this.getOptions()).pipe(
      tap(() => {
        this.notificacoes.update((lista) => lista.filter((n) => n.id !== id));
      }),
      catchError(() => of(undefined))
    );
  }
}
