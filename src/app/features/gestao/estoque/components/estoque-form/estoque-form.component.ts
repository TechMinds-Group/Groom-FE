import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TmToastService } from '@techminds-group/tm-angular-lib';
import { EstoqueService } from '../../../../../core/services/estoque.service';
import {
  CriarProdutoEstoque,
  CATEGORIAS_ESTOQUE,
  UNIDADES_MEDIDA,
} from '../../../../../core/models/estoque/estoque.model';
import { BarcodeScannerModalComponent } from '../../../../../shared/modais/barcode-scanner-modal/barcode-scanner-modal.component';

@Component({
  selector: 'app-estoque-form',
  standalone: true,
  imports: [CommonModule, FormsModule, BarcodeScannerModalComponent],
  templateUrl: './estoque-form.component.html',
  styleUrls: ['./estoque-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstoqueFormComponent {
  private readonly estoqueService = inject(EstoqueService);
  private readonly toastService = inject(TmToastService);
  private readonly router = inject(Router);

  protected readonly categorias = CATEGORIAS_ESTOQUE;
  protected readonly unidades = UNIDADES_MEDIDA;
  protected readonly salvando = signal(false);
  protected readonly showBarcodeScanner = signal(false);

  onBarcodeScanned(code: string): void {
    this.updateForm({ codigoBarras: code });
    this.toastService.success(`Código de barras escaneado: ${code}`);
  }

  protected readonly imagemPreview = signal<string | null>(null);
  protected readonly imagemSelecionadaFile = signal<File | null>(null);

  protected readonly form = signal<CriarProdutoEstoque>({
    nome: '',
    categoria: 'Outros',
    unidadeMedida: 'UN',
    quantidadeAtual: 0,
    quantidadeMinima: 5,
    precoCusto: 0,
    precoVenda: 0,
  });

  updateForm(partial: Partial<CriarProdutoEstoque>): void {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 3 * 1024 * 1024) {
        this.toastService.error('A imagem excede o tamanho máximo permitido de 3MB.');
        input.value = '';
        return;
      }
      const extensao = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extensao)) {
        this.toastService.error('Formato de arquivo inválido (apenas .jpg, .png, .webp, .gif).');
        input.value = '';
        return;
      }

      this.imagemSelecionadaFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.imagemPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  removerImagemSelecionada(): void {
    this.imagemPreview.set(null);
    this.imagemSelecionadaFile.set(null);
    this.updateForm({ imagemUrl: undefined });
  }

  async salvar(): Promise<void> {
    const data = this.form();
    if (!data.nome || !data.nome.trim()) {
      this.toastService.error('Nome do produto é obrigatório.');
      return;
    }

    this.salvando.set(true);
    try {
      const produto = await this.estoqueService.criar(data);
      if (this.imagemSelecionadaFile()) {
        try {
          await this.estoqueService.uploadImagem(produto.id, this.imagemSelecionadaFile()!);
        } catch {
          this.toastService.error('Produto cadastrado, mas falhou ao enviar a imagem.');
        }
      }
      this.toastService.success('Produto cadastrado com sucesso!');
      this.router.navigate(['/gestao/estoque']);
    } catch {
      this.toastService.error('Erro ao cadastrar o produto.');
    } finally {
      this.salvando.set(false);
    }
  }

  cancelar(): void {
    this.router.navigate(['/gestao/estoque']);
  }
}
