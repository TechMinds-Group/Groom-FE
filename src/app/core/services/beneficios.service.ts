import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BeneficiosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/beneficios`;

  getBeneficios(): Observable<string[]> {
    return this.http.get<string[]>(this.apiUrl, {
      withCredentials: true // Important for sending the auth cookie if needed
    });
  }

  addBeneficio(nome: string): Observable<string> {
    return this.http.post<string>(this.apiUrl, { nome }, {
      withCredentials: true
    });
  }
}
