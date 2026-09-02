import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TmModalComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sg-planos-x7k9p',
  standalone: true,
  imports: [CommonModule, FormsModule, TmModalComponent],
  templateUrl: './sg-planos-x7k9p.component.html',
  styleUrl: './sg-planos-x7k9p.component.scss'
})
export class SgPlanosX7k9pComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(TmToastService);

  protected planos = signal<any[]>([]);
  protected isLoading = signal<boolean>(true);
  protected searchTerm = signal<string>('');
  protected errorMessage = signal<string | null>(null);

  protected planoParaExcluir = signal<any | null>(null);
  protected showDeleteModal = signal<boolean>(false);
  protected excluindo = signal<boolean>(false);

  protected planosFiltrados = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.planos();
    if (!term) return list;

    return list.filter(p =>
      (p.nome && p.nome.toLowerCase().includes(term)) ||
      (p.descricao && p.descricao.toLowerCase().includes(term)) ||
      (p.ciclo && p.ciclo.toLowerCase().includes(term))
    );
  });

  ngOnInit(): void {
    this.carregarPlanos();
  }

  carregarPlanos(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.getSgPlanos().subscribe({
      next: (data) => {
        this.planos.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Falha ao carregar a lista de planos.');
        this.isLoading.set(false);
      }
    });
  }

  novoPlano(): void {
    this.router.navigate(['/sg-plano-novo-x7k9p']);
  }

  editarPlano(plano: any): void {
    this.router.navigate(['/sg-plano-editar-x7k9p', plano.id]);
  }

  confirmarExclusao(plano: any, event: Event): void {
    event.stopPropagation();
    this.planoParaExcluir.set(plano);
    this.showDeleteModal.set(true);
  }

  cancelarExclusao(): void {
    this.showDeleteModal.set(false);
    this.planoParaExcluir.set(null);
  }

  async executarExclusao(): Promise<void> {
    const p = this.planoParaExcluir();
    if (!p) return;

    this.excluindo.set(true);
    try {
      await this.authService.deleteSgPlano(p.id).toPromise();
      this.toastService.success('Plano excluído com sucesso!', 'Sucesso');
      this.cancelarExclusao();
      this.carregarPlanos();
    } catch {
      this.toastService.error('Erro ao excluir plano.', 'Erro');
    } finally {
      this.excluindo.set(false);
    }
  }
}
