import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LogItem } from '../../features/logs-sistema/components/logs-sistema/logs-sistema.component';

@Injectable({
  providedIn: 'root',
})
export class LogsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/logs`;

  private readonly _logs = signal<LogItem[]>([]);
  readonly logs = this._logs.asReadonly();

  async carregarLogs(modulo?: string, busca?: string): Promise<void> {
    const params: Record<string, string> = {};
    if (modulo && modulo !== 'todos') {
      params['modulo'] = modulo;
    }
    if (busca) {
      params['busca'] = busca;
    }

    try {
      const data = await firstValueFrom(
        this.http.get<LogItem[]>(this.apiUrl, { params, withCredentials: true })
      );
      this._logs.set(data ?? []);
    } catch {
      this._logs.set([]);
    }
  }
}
