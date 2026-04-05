import { HttpClient, HttpParams } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

export abstract class GroomService<T> {
  protected http = inject(HttpClient);
  protected abstract endpoint: string;

  protected getParams(params: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let httpParams = new HttpParams();
    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value !== null && value !== undefined && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return httpParams;
  }

  get(): Observable<T[]> {
    return this.http.get<T[]>(this.endpoint);
  }

  getById(id: string | number): Observable<T> {
    return this.http.get<T>(`${this.endpoint}/${id}`);
  }

  post(item: T): Observable<T> {
    return this.http.post<T>(this.endpoint, item);
  }

  put(id: string | number, item: T): Observable<T> {
    return this.http.put<T>(`${this.endpoint}/${id}`, item);
  }

  delete(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
