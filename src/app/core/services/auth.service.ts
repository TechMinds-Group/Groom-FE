import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';


export interface LoginRequest {
  estabelecimento: string;
  email: string;
  password: string;
  twoFactorCode?: string;
  twoFactorRecoveryCode?: string;
}

export interface UserContext {
  id: string;
  nome: string;
  email: string;
  tenantId: string;
  role?: string;
  roleColor?: string;
  roleIconClass?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  
  private readonly _currentUser = signal<UserContext | null>(null);
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAdmin = computed(() => this._currentUser()?.role === 'Administrador');
  public readonly currentUserId = computed(() => this._currentUser()?.id);

  /** Emite quando o logout é realizado com sucesso. */
  private readonly _logout$ = new Subject<void>();
  public readonly logout$ = this._logout$.asObservable();
  private readonly apiUrl = `${environment.apiUrl}/login`;
  private readonly baseApiUrl = `${environment.apiUrl}/api/account`;

  login(request: LoginRequest, rememberMe = false): Observable<any> {
    // useCookies=true is MANDATORY to get HttpOnly cookies instead of Bearer tokens.
    // useSessionCookies determines if the cookie is persistent (Remember Me) or expires when browser closes.
    return this.http.post<any>(`${this.apiUrl}?useCookies=true&useSessionCookies=${!rememberMe}`, request, {
      withCredentials: true // Crucial for receiving and sending secure cookies
    }).pipe(
      switchMap(() => this.getMe()),
      tap(user => {
        if (user && user.tenantId) {
          localStorage.setItem('tenant_id', user.tenantId);
        }
      })
    );
  }

  getMe(): Observable<UserContext> {
    return this.http.get<UserContext>(`${this.baseApiUrl}/me`, {
      withCredentials: true,
      headers: { 'X-Skip-Error-Toast': 'true' }
    }).pipe(
      tap(user => {
        // The API currently doesn't return role in /me, we should ideally fetch it or derive it.
        // Wait, the API returns Id, Nome, Email, TenantId.
        this._currentUser.set(user);
      })
    );
  }

  checkAuth(): Observable<any> {
    return this.http.get<any>(`${this.baseApiUrl}/status`, {
      withCredentials: true,
      headers: { 'X-Skip-Error-Toast': 'true' }
    });
  }

  forceChangePassword(request: any): Observable<any> {
    return this.http.post<any>(`${this.baseApiUrl}/ForceChangePassword`, request, {
      withCredentials: true
    });
  }

  // To properly implement sliding expiration, any authorized request 
  // will automatically slide the cookie expiration if halfway through its life.
  
  // Logout will clear the cookie from the backend
  logout(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        localStorage.removeItem('tenant_id');
        this._currentUser.set(null);
        this._logout$.next();
      })
    );
  }
}
