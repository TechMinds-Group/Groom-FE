import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { EstabelecimentoService, validarImagemArquivo } from '../../../../core/services/estabelecimento.service';
import { ServicoPayload } from '../../models/servico-payload.model';

@Component({
  selector: 'app-catalogo-novo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent],
  templateUrl: './catalogo-novo.component.html',
  styleUrl: './catalogo-novo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoNovoComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly catalogoService = inject(CatalogoService);
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);

  protected readonly salvando = signal<boolean>(false);
  protected readonly uploadingImagem = signal<boolean>(false);
  protected readonly imagemUrl = signal<string | null>(null);

  protected readonly imagemVisivel = computed(() =>
    this.estabelecimentoService.resolverUrl(this.imagemUrl() || undefined),
  );

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    preco: ['', [Validators.required]],
    duracao: [''],
    descricao: [''],
  });

  ngOnInit(): void {
    if (this.catalogoService.servicos().length === 0) {
      this.catalogoService.carregarServicos().catch(() => undefined);
    }
  }

  voltar(): void {
    this.router.navigate(['/servicos/catalogo']);
  }

  triggerUpload(input: HTMLInputElement): void {
    input.click();
  }

  async onImagemSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!validarImagemArquivo(file, this.toastService)) {
      input.value = '';
      return;
    }

    this.uploadingImagem.set(true);
    try {
      const result = await this.estabelecimentoService.uploadImagemItem(file, 'servico');
      this.imagemUrl.set(result.imagemUrl);
      this.toastService.success('Imagem enviada com sucesso!', 'Sucesso');
    } catch (err: any) {
      const message = err?.error?.message || 'Falha ao enviar imagem. Verifique se o arquivo é válido (máx 3MB).';
      this.toastService.error(message, 'Erro');
    } finally {
      this.uploadingImagem.set(false);
      input.value = '';
    }
  }

  removerImagem(): void {
    this.imagemUrl.set(null);
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    try {
      const val = this.form.getRawValue();
      const payload: ServicoPayload = {
        nome: val.nome,
        descricao: val.descricao || null,
        preco: this.parseCurrency(val.preco),
        duracao: val.duracao ? Number(val.duracao) : null,
        status: 'Ativo',
        imagemUrl: this.imagemUrl(),
      };
      await this.catalogoService.adicionar(payload);
      this.toastService.success('Serviço cadastrado com sucesso!', 'Sucesso');
      this.router.navigate(['/servicos/catalogo']);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private parseCurrency(value: string | number | null): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = value.replace(/\D/g, '');
    return Number(clean) / 100;
  }
}