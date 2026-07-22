import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NivelAcesso } from '../models/gestao-usuarios/nivel-acesso.model';
import { Usuario } from '../models/gestao-usuarios/usuario.model';

@Injectable({
  providedIn: 'root',
})
export class GestaoUsuariosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

  private readonly _usuarios = signal<Usuario[]>([]);
  readonly usuarios = this._usuarios.asReadonly();

  async carregarUsuarios(): Promise<void> {
    const data = await firstValueFrom(this.http.get<Usuario[]>(this.apiUrl));
    this._usuarios.set(data);
  }

  async carregarNiveis(): Promise<NivelAcesso[]> {
    return await firstValueFrom(this.http.get<NivelAcesso[]>(`${this.apiUrl}/niveis`));
  }

  async adicionar(usuario: any): Promise<void> {
    await firstValueFrom(this.http.post(this.apiUrl, usuario));
    await this.carregarUsuarios();
  }

  async atualizar(id: string, dados: any): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/${id}`, { id, ...dados }));
    await this.carregarUsuarios();
  }

  async remover(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`));
    await this.carregarUsuarios();
  }

  async resetarSenha(id: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ tempPassword: string }>(`${this.apiUrl}/${id}/reset-password`, {}),
    );
    return res.tempPassword;
  }

  async alterarSenha(
    id: string,
    dados: { oldPassword?: string; newPassword: string; forgotPassword: boolean },
  ): Promise<void> {
    await firstValueFrom(
      this.http.put<void>(`${this.apiUrl}/${id}/change-password`, dados, {
        headers: { 'X-Skip-Error-Toast': 'true' },
      }),
    );
  }

  async atualizarPlanoAssinatura(id: string, planoAssinatura: string | null): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/${id}/plano-assinatura`, { planoAssinatura }),
    );
    await this.carregarUsuarios();
  }
}
