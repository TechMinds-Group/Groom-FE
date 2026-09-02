import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmSelectComponent, TmDateComponent, TmModalComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { ThemeService } from '../../../../core/services/theme.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sg-estabelecimento-detalhes-x7k9p',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent, TmSelectComponent, TmDateComponent, TmModalComponent],
  templateUrl: './sg-estabelecimento-detalhes-x7k9p.component.html',
  styleUrl: './sg-estabelecimento-detalhes-x7k9p.component.scss'
})
export class SgEstabelecimentoDetalhesX7k9pComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(TmToastService);
  protected themeService = inject(ThemeService);

  protected empresa = signal<any | null>(null);
  protected usuarios = signal<any[]>([]);
  protected isLoading = signal<boolean>(true);
  protected errorMessage = signal<string | null>(null);
  protected modoEdicao = signal<boolean>(false);
  protected salvando = signal<boolean>(false);

  protected planosDisponiveis = signal<any[]>([]);
  protected planosOptions = computed(() =>
    this.planosDisponiveis()
      .filter(p => p.status === 'Ativo')
      .map(p => ({ value: p.id, label: `${p.nome} - R$ ${parseFloat(p.valor).toFixed(2)}/${p.ciclo}` }))
  );
  protected planosOptionsComNenhum = computed(() => {
    const options = this.planosOptions();
    return [{ value: '', label: 'Nenhum' }, ...options];
  });

  protected showDeleteConfirmModal = signal(false);

  protected form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(100)]],
    nomeExibicao: ['', [Validators.maxLength(100)]],
    cnpj: ['', [Validators.maxLength(18)]],
    telefone: ['', [Validators.maxLength(20)]],
    descricao: ['', [Validators.maxLength(1000)]],
    cep: ['', [Validators.maxLength(10)]],
    logradouro: ['', [Validators.maxLength(200)]],
    numero: ['', [Validators.maxLength(20)]],
    complemento: ['', [Validators.maxLength(100)]],
    bairro: ['', [Validators.maxLength(100)]],
    cidade: ['', [Validators.maxLength(100)]],
    estado: ['', [Validators.maxLength(50)]],
    planoSistemaId: [''],
    assinaturaValidaInicio: [''],
    assinaturaValidaAte: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.carregarDetalhes(id);
      this.carregarPlanos();
    } else {
      this.errorMessage.set('Identificador da empresa inválido.');
      this.isLoading.set(false);
    }
  }

  carregarDetalhes(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.getSgEmpresaById(id).subscribe({
      next: (data) => {
        this.empresa.set(data);
        if (data.usuarios) {
          this.usuarios.set(data.usuarios);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Falha ao carregar detalhes do estabelecimento.');
        this.isLoading.set(false);
      }
    });
  }

  carregarPlanos(): void {
    this.authService.getSgPlanos().subscribe({
      next: (data) => this.planosDisponiveis.set(data || [])
    });
  }

  voltar(): void {
    this.router.navigate(['/sg-estabelecimentos-x7k9p']);
  }

  novoUsuario(): void {
    const id = this.empresa()?.id;
    if (id) {
      this.router.navigate(['/sg-usuario-novo-x7k9p', id]);
    }
  }

  habilitarEdicao(): void {
    const emp = this.empresa();
    if (emp) {
      this.form.patchValue({
        nome: emp.nome || '',
        nomeExibicao: emp.nomeExibicao || '',
        cnpj: emp.cnpj || '',
        telefone: emp.telefone || '',
        descricao: emp.descricao || '',
        cep: emp.cep || '',
        logradouro: emp.logradouro || '',
        numero: emp.numero || '',
        complemento: emp.complemento || '',
        bairro: emp.bairro || '',
        cidade: emp.cidade || '',
        estado: emp.estado || '',
        planoSistemaId: emp.planoSistemaId || '',
        assinaturaValidaInicio: emp.assinaturaValidaInicio ? this.formatDate(emp.assinaturaValidaInicio) : '',
        assinaturaValidaAte: emp.assinaturaValidaAte ? this.formatDate(emp.assinaturaValidaAte) : '',
      });
      this.modoEdicao.set(true);
    }
  }

  cancelarEdicao(): void {
    this.modoEdicao.set(false);
  }

  async salvarGeral(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastService.error('Preencha os campos obrigatórios.', 'Atenção');
      return;
    }

    const emp = this.empresa();
    if (!emp) return;

    this.salvando.set(true);
    try {
      const raw = this.form.value;

      await this.authService.updateSgEmpresa(emp.id, {
        nome: raw.nome,
        nomeExibicao: raw.nomeExibicao || null,
        cnpj: (raw.cnpj || '').replace(/\D/g, ''),
        telefone: (raw.telefone || '').replace(/\D/g, ''),
        descricao: raw.descricao || null,
        cep: raw.cep || null,
        logradouro: raw.logradouro || null,
        numero: raw.numero || null,
        complemento: raw.complemento || null,
        bairro: raw.bairro || null,
        cidade: raw.cidade || null,
        estado: raw.estado || null,
      }).toPromise();

      const selectedId = raw.planoSistemaId;
      const plano = this.planosDisponiveis().find(p => p.id === selectedId);

      await this.authService.updateSgEmpresaPlano(emp.id, {
        planoSistemaId: selectedId || null,
        planoAssinatura: plano ? plano.nome : null,
        statusAssinatura: 'Ativo',
        assinaturaValidaInicio: raw.assinaturaValidaInicio || null,
        assinaturaValidaAte: raw.assinaturaValidaAte || null,
      }).toPromise();

      this.toastService.success('Estabelecimento atualizado com sucesso!', 'Sucesso');
      this.carregarDetalhes(emp.id);
      this.modoEdicao.set(false);
    } catch {
      this.toastService.error('Erro ao salvar estabelecimento.', 'Erro');
    } finally {
      this.salvando.set(false);
    }
  }

  excluir(): void {
    this.showDeleteConfirmModal.set(true);
  }

  cancelarExcluir(): void {
    this.showDeleteConfirmModal.set(false);
  }

  async confirmarExcluir(): Promise<void> {
    const emp = this.empresa();
    if (!emp) return;

    this.salvando.set(true);
    try {
      await this.authService.deleteSgEmpresa(emp.id).toPromise();
      this.showDeleteConfirmModal.set(false);
      this.toastService.success('Estabelecimento excluído com sucesso!', 'Sucesso');
      this.voltar();
    } catch {
      this.toastService.error('Erro ao excluir estabelecimento.', 'Erro');
    } finally {
      this.salvando.set(false);
    }
  }

  private formatDate(d: any): string {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
