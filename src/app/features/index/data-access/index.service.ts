import { computed, inject, Injectable, signal } from '@angular/core';
import { delay, of } from 'rxjs';

import { IndexApiService } from './api/index.api.service';
import { IndexData } from './models/index.model';

export interface IndexState {
  data: IndexData[];
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class IndexService {
  private api = inject(IndexApiService);

  private state = signal<IndexState>({
    data: [],
    loading: false,
    error: null,
  });

  public data = computed(() => this.state().data);
  public loading = computed(() => this.state().loading);
  public error = computed(() => this.state().error);

  getInitialData(): void {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    
    // Simulação de dados Mock para desenvolvimento sem backend
    const mockData: IndexData[] = [
      {
        id: '1',
        title: 'Bem-vindo ao Groom',
        description: 'Seu sistema de gestão de pet shop favorito.',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Novos Agendamentos',
        description: 'Você tem 5 novos agendamentos para hoje.',
        createdAt: new Date().toISOString(),
      },
    ];
    
    of(mockData)
      .pipe(delay(500))
      .subscribe({
        next: (res) => this.state.update((s) => ({ ...s, data: res, loading: false })),
        error: (err) => this.state.update((s) => ({ ...s, error: err.message, loading: false })),
      });
  }
}
