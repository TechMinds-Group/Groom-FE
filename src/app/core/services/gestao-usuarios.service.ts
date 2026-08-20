import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NivelAcesso } from '../models/gestao-usuarios/nivel-acesso.model';
import { Usuario } from '../models/gestao-usuarios/usuario.model';
import { AtuacaoProfissional } from '../models/gestao-usuarios/atuacao-profissional.model';

@Injectable({
  providedIn: 'root',
})
export class GestaoUsuariosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/usuarios`;

  private readonly _usuarios = signal<Usuario[]>([]);
  readonly usuarios = this._usuarios.asReadonly();

  async carregarUsuarios(): Promise<void> {
    const data = await firstValueFrom(this.http.get<Usuario[]>(this.apiUrl, { withCredentials: true }));
    this._usuarios.set(data);
  }

  async carregarNiveis(): Promise<NivelAcesso[]> {
    return await firstValueFrom(this.http.get<NivelAcesso[]>(`${this.apiUrl}/niveis`, { withCredentials: true }));
  }

  async adicionar(usuario: any): Promise<string> {
    const res = await firstValueFrom(this.http.post<string | { id: string }>(this.apiUrl, usuario, { withCredentials: true }));
    const id = typeof res === 'string' ? res : (res as any)?.id || (res as any);
    await this.carregarUsuarios();
    return id;
  }

  async atualizar(id: string, dados: any): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/${id}`, { id, ...dados }, { withCredentials: true }));
    await this.carregarUsuarios();
  }

  async remover(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/${id}`, { withCredentials: true }));
    await this.carregarUsuarios();
  }

  async resetarSenha(id: string): Promise<string> {
    const res = await firstValueFrom(
      this.http.post<{ tempPassword: string }>(`${this.apiUrl}/${id}/reset-password`, {}, { withCredentials: true }),
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
        withCredentials: true,
      }),
    );
  }

  async atualizarPlanoAssinatura(id: string, planoAssinatura: string | null): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/${id}/plano-assinatura`, { planoAssinatura }, { withCredentials: true }),
    );
    await this.carregarUsuarios();
  }

  async carregarAtuacao(id: string): Promise<AtuacaoProfissional> {
    return await firstValueFrom(
      this.http.get<AtuacaoProfissional>(`${this.apiUrl}/${id}/atuacao`, { withCredentials: true }),
    );
  }

  async salvarAtuacao(dados: AtuacaoProfissional): Promise<void> {
    await firstValueFrom(
      this.http.put<void>(`${this.apiUrl}/${dados.profissionalId}/atuacao`, dados, { withCredentials: true }),
    );
  }

  async salvarFoto(id: string, foto: File): Promise<{ fotoUrl: string }> {
    const formData = new FormData();
    formData.append('foto', foto);
    const res = await firstValueFrom(
      this.http.post<{ fotoUrl: string }>(`${this.apiUrl}/${id}/foto`, formData, { withCredentials: true }),
    );
    await this.carregarUsuarios();
    return res;
  }
}
