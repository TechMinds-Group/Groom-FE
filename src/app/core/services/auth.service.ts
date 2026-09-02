import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';


export interface LoginRequest {
  estabelecimento: string;
  email: string;
  password: string;
  rememberMe?: boolean;
  twoFactorCode?: string;
  twoFactorRecoveryCode?: string;
}

export interface UserContext {
  id: string;
  nome: string;
  email: string;
  tenantId: string;
  role?: string;
  roles?: string[];
  roleColor?: string;
  roleIconClass?: string;
  estabelecimento?: string;
  acessosMenu?: any;
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

  /** Verifica se o usuário possui o perfil de Administrador em qualquer nível (primário ou secundário). */
  public readonly hasAdminRole = computed(() => this._currentUser()?.roles?.includes('Administrador') ?? false);

  /** Verifica se o usuário possui o perfil de Profissional em qualquer nível (primário ou secundário). */
  public readonly isProfissional = computed(() => this._currentUser()?.roles?.includes('Profissional') ?? false);

  /** Verifica se o usuário é APENAS Profissional (contratado) — sem perfil Administrador em nenhum nível. */
  public readonly isOnlyProfissional = computed(() => {
    const roles = this._currentUser()?.roles ?? [];
    return roles.includes('Profissional') && !roles.includes('Administrador');
  });

  /** Admin (mesmo que também seja Profissional) vê todos os agendamentos; Profissional-only vê apenas os seus. */
  public readonly seeAllAgendamentos = computed(() => this.hasAdminRole());

  /** Emite quando o logout é realizado com sucesso. */
  private readonly _logout$ = new Subject<void>();
  public readonly logout$ = this._logout$.asObservable();
  private readonly apiUrl = `${environment.apiUrl}/login`;
  private readonly baseApiUrl = `${environment.apiUrl}/api/account`;

  login(request: LoginRequest, rememberMe = false): Observable<any> {
    // useCookies=true is MANDATORY to get HttpOnly cookies instead of Bearer tokens.
    // useSessionCookies determines if the cookie is persistent (Remember Me) or expires when browser closes.
    const body = { ...request, rememberMe };
    return this.http.post<any>(`${this.apiUrl}?useCookies=true&useSessionCookies=${!rememberMe}`, body, {
      withCredentials: true // Crucial for receiving and sending secure cookies
    }).pipe(
      tap(() => {
        // Limpa tenant_id antigo do localStorage para evitar conflito no getMe()
        localStorage.removeItem('tenant_id');
      }),
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

  sgLogin(emailOrUsername: string, password: string, rememberMe = true): Observable<any> {
    const body = { emailOrUsername, password, rememberMe };
    return this.http.post<any>(`${environment.apiUrl}/sg-login?useCookies=true&useSessionCookies=${!rememberMe}`, body, {
      withCredentials: true,
    }).pipe(
      tap(() => {
        this._currentUser.set({
          id: 'sg-master',
          nome: 'SuperAdmin SG',
          email: `${emailOrUsername}@fasto.com`,
          tenantId: 'sg-master',
          role: 'SuperAdmin',
          roles: ['SuperAdmin'],
        });
      })
    );
  }

  sgUpdateProfile(currentUsername: string, newUsername: string, newEmail: string): Observable<any> {
    const body = { currentUsername, newUsername, newEmail };
    return this.http.post<any>(`${environment.apiUrl}/sg-update-profile`, body, {
      withCredentials: true,
    });
  }

  sgChangePassword(username: string, currentPassword: string, newPassword: string): Observable<any> {
    const body = { username, currentPassword, newPassword };
    return this.http.post<any>(`${environment.apiUrl}/sg-change-password`, body, {
      withCredentials: true,
    });
  }

  getSgEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/sg-empresas`, {
      withCredentials: true,
    });
  }

  getSgEmpresaById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/sg-empresas/${id}`, {
      withCredentials: true,
    });
  }

  createSgEmpresa(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/sg-empresas`, data, {
      withCredentials: true,
    });
  }

  getSgNiveisAcesso(empresaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/sg-empresas/${empresaId}/niveis-acesso`, {
      withCredentials: true,
    });
  }

  createSgUsuario(empresaId: string, data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/sg-empresas/${empresaId}/usuarios`, data, {
      withCredentials: true,
    });
  }

  getSgUsuarios(empresaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/sg-empresas/${empresaId}/usuarios`, {
      withCredentials: true,
    });
  }

  getSgUsuarioById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/sg-usuarios/${id}`, {
      withCredentials: true,
    });
  }

  updateSgUsuario(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/sg-usuarios/${id}`, data, {
      withCredentials: true,
    });
  }

  deleteSgUsuario(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/sg-usuarios/${id}`, {
      withCredentials: true,
    });
  }

  toggleSgUsuarioStatus(id: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/sg-usuarios/${id}/toggle-status`, {}, {
      withCredentials: true,
    });
  }

  getSgPlanos(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/sg-planos`, {
      withCredentials: true,
    });
  }

  getSgPlanoById(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/sg-planos/${id}`, {
      withCredentials: true,
    });
  }

  createSgPlano(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/sg-planos`, data, {
      withCredentials: true,
    });
  }

  updateSgPlano(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/sg-planos/${id}`, data, {
      withCredentials: true,
    });
  }

  deleteSgPlano(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/sg-planos/${id}`, {
      withCredentials: true,
    });
  }

  updateSgEmpresaPlano(empresaId: string, data: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/sg-empresas/${empresaId}/plano`, data, {
      withCredentials: true,
    });
  }

  updateSgEmpresa(id: string, data: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/sg-empresas/${id}`, data, {
      withCredentials: true,
    });
  }

  deleteSgEmpresa(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/sg-empresas/${id}`, {
      withCredentials: true,
    });
  }
}
