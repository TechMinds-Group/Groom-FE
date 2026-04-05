import { computed, inject, Injectable, signal } from '@angular/core';

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
    this.api.get().subscribe({
      next: (res) => this.state.update((s) => ({ ...s, data: res, loading: false })),
      error: (err) => this.state.update((s) => ({ ...s, error: err.message, loading: false })),
    });
  }
}
