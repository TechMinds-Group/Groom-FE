import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sg-estabelecimentos-x7k9p',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sg-estabelecimentos-x7k9p.component.html',
  styleUrl: './sg-estabelecimentos-x7k9p.component.scss'
})
export class SgEstabelecimentosX7k9pComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  protected empresas = signal<any[]>([]);
  protected isLoading = signal<boolean>(true);
  protected searchTerm = signal<string>('');
  protected errorMessage = signal<string | null>(null);

  protected empresasFiltradas = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.empresas();
    if (!term) return list;

    return list.filter(e =>
      (e.nome && e.nome.toLowerCase().includes(term)) ||
      (e.nomeExibicao && e.nomeExibicao.toLowerCase().includes(term)) ||
      (e.linkAgendamento && e.linkAgendamento.toLowerCase().includes(term)) ||
      (e.cnpj && e.cnpj.includes(term)) ||
      (e.telefone && e.telefone.includes(term))
    );
  });

  ngOnInit(): void {
    this.carregarEmpresas();
  }

  carregarEmpresas(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.getSgEmpresas().subscribe({
      next: (data) => {
        this.empresas.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Falha ao carregar a lista de estabelecimentos do SG.');
        this.isLoading.set(false);
      }
    });
  }

  abrirDetalhes(empresa: any): void {
    this.router.navigate(['/sg-estabelecimento-detalhes-x7k9p', empresa.id]);
  }

  novoCadastro(): void {
    this.router.navigate(['/sg-estabelecimento-novo-x7k9p']);
  }
}
