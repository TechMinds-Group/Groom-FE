import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ProdutoEstoque,
  CriarProdutoEstoque,
  AtualizarProdutoEstoque,
  ResumoInventario,
  RegistrarMovimentacao,
  MovimentacaoEstoque,
} from '../models/estoque/estoque.model';

@Injectable({ providedIn: 'root' })
export class EstoqueService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/estoque`;

  private readonly _produtos = signal<ProdutoEstoque[]>([]);
  readonly produtos = this._produtos.asReadonly();

  readonly resumoEstoque = signal<ResumoInventario | null>(null);

  carregarResumo(): Observable<ResumoInventario> {
    return this.http.get<ResumoInventario>(`${this.apiUrl}/resumo`, { withCredentials: true }).pipe(
      tap((res) => this.resumoEstoque.set(res))
    );
  }

  async carregarProdutos(busca?: string, categoria?: string, apenasAlertas = false): Promise<void> {
    const params: Record<string, string | boolean> = { apenasAlertas };
    if (busca) params['busca'] = busca;
    if (categoria) params['categoria'] = categoria;
    const data = await firstValueFrom(
      this.http.get<ProdutoEstoque[]>(this.apiUrl, { withCredentials: true, params })
    );
    this._produtos.set(data);
  }

  async obterPorId(id: string): Promise<ProdutoEstoque> {
    return await firstValueFrom(
      this.http.get<ProdutoEstoque>(`${this.apiUrl}/${id}`, { withCredentials: true })
    );
  }

  async obterResumoInventario(): Promise<ResumoInventario> {
    return await firstValueFrom(
      this.http.get<ResumoInventario>(`${this.apiUrl}/resumo`, { withCredentials: true })
    );
  }

  async criar(dto: CriarProdutoEstoque): Promise<ProdutoEstoque> {
    const produto = await firstValueFrom(
      this.http.post<ProdutoEstoque>(this.apiUrl, dto, { withCredentials: true })
    );
    await this.carregarProdutos();
    return produto;
  }

  async atualizar(id: string, dto: AtualizarProdutoEstoque): Promise<ProdutoEstoque> {
    const produto = await firstValueFrom(
      this.http.put<ProdutoEstoque>(`${this.apiUrl}/${id}`, dto, { withCredentials: true })
    );
    await this.carregarProdutos();
    return produto;
  }

  async remover(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true })
    );
    await this.carregarProdutos();
  }

  async registrarMovimentacao(dto: RegistrarMovimentacao): Promise<MovimentacaoEstoque> {
    const mov = await firstValueFrom(
      this.http.post<MovimentacaoEstoque>(`${this.apiUrl}/movimentar`, dto, { withCredentials: true })
    );
    await this.carregarProdutos();
    return mov;
  }

  async obterMovimentacoesPorProduto(produtoId: string): Promise<MovimentacaoEstoque[]> {
    return await firstValueFrom(
      this.http.get<MovimentacaoEstoque[]>(`${this.apiUrl}/${produtoId}/movimentacoes`, { withCredentials: true })
    );
  }

  async obterTodasMovimentacoes(limite = 100): Promise<MovimentacaoEstoque[]> {
    return await firstValueFrom(
      this.http.get<MovimentacaoEstoque[]>(`${this.apiUrl}/movimentacoes`, { withCredentials: true, params: { limite } })
    );
  }

  async uploadImagem(id: string, file: File): Promise<{ imagemUrl: string }> {
    const formData = new FormData();
    formData.append('imagem', file);
    return await firstValueFrom(
      this.http.post<{ imagemUrl: string }>(`${this.apiUrl}/${id}/imagem`, formData, { withCredentials: true })
    );
  }

  async removerImagem(id: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`${this.apiUrl}/${id}/imagem`, { withCredentials: true })
    );
  }
}
