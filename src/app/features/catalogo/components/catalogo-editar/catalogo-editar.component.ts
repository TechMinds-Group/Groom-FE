import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TmTextComponent, TmToastService } from '@techminds-group/tm-angular-lib';
import { CatalogoService } from '../../../../core/services/catalogo.service';
import { EstabelecimentoService, validarImagemArquivo } from '../../../../core/services/estabelecimento.service';
import { ServicoCatalogo } from '../../../../core/models/catalogo/servico.model';
import { ServicoPayload } from '../../models/servico-payload.model';

@Component({
  selector: 'app-catalogo-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TmTextComponent],
  templateUrl: './catalogo-editar.component.html',
  styleUrl: './catalogo-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogoEditarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly catalogoService = inject(CatalogoService);
  protected readonly estabelecimentoService = inject(EstabelecimentoService);
  private readonly toastService = inject(TmToastService);

  protected readonly servico = signal<ServicoCatalogo | null>(null);
  protected readonly salvando = signal<boolean>(false);
  protected readonly uploadingSlot = signal<number | null>(null);
  protected readonly imagemUrl = signal<string | null>(null);
  protected readonly imagemUrl2 = signal<string | null>(null);
  protected readonly imagemUrl3 = signal<string | null>(null);

  protected readonly mostrarSlot2 = signal<boolean>(false);
  protected readonly mostrarSlot3 = signal<boolean>(false);

  protected readonly imagemVisivel1 = computed(() =>
    this.estabelecimentoService.resolverUrl(this.imagemUrl() || undefined),
  );
  protected readonly imagemVisivel2 = computed(() =>
    this.estabelecimentoService.resolverUrl(this.imagemUrl2() || undefined),
  );
  protected readonly imagemVisivel3 = computed(() =>
    this.estabelecimentoService.resolverUrl(this.imagemUrl3() || undefined),
  );

  protected readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.maxLength(60)]],
    preco: ['', [Validators.required]],
    duracao: [''],
    descricao: [''],
    status: ['Ativo', [Validators.required]],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.voltar();
      return;
    }
    this.carregarServico(id);
  }

  voltar(): void {
    const id = this.servico()?.id;
    if (id) {
      this.router.navigate(['/servicos/catalogo', id]);
    } else {
      this.router.navigate(['/servicos/catalogo']);
    }
  }

  alternarStatus(event: Event): void {
    const alvo = event.target as HTMLInputElement;
    this.form.get('status')?.setValue(alvo.checked ? 'Ativo' : 'Inativo');
  }

  triggerUpload(input: HTMLInputElement): void {
    input.click();
  }

  adicionarMaisFoto(): void {
    if (!this.mostrarSlot2()) {
      this.mostrarSlot2.set(true);
    } else if (!this.mostrarSlot3()) {
      this.mostrarSlot3.set(true);
    }
  }

  async onImagemSelected(event: Event, slot: 1 | 2 | 3): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!validarImagemArquivo(file, this.toastService)) {
      input.value = '';
      return;
    }

    this.uploadingSlot.set(slot);
    try {
      const result = await this.estabelecimentoService.uploadImagemItem(file, 'servico');
      if (slot === 1) {
        this.imagemUrl.set(result.imagemUrl);
      } else if (slot === 2) {
        this.imagemUrl2.set(result.imagemUrl);
        this.mostrarSlot2.set(true);
      } else if (slot === 3) {
        this.imagemUrl3.set(result.imagemUrl);
        this.mostrarSlot3.set(true);
      }
      this.toastService.success(`Imagem ${slot} enviada com sucesso!`, 'Sucesso');
    } catch (err: any) {
      const message = err?.error?.message || 'Falha ao enviar imagem. Verifique se o arquivo é válido (máx 3MB).';
      this.toastService.error(message, 'Erro');
    } finally {
      this.uploadingSlot.set(null);
      input.value = '';
    }
  }

  removerImagem(slot: 1 | 2 | 3): void {
    if (slot === 1) {
      this.imagemUrl.set(null);
    } else if (slot === 2) {
      this.imagemUrl2.set(null);
      this.mostrarSlot2.set(false);
    } else if (slot === 3) {
      this.imagemUrl3.set(null);
      this.mostrarSlot3.set(false);
    }
  }

  removerUltimaFoto(): void {
    if (this.mostrarSlot3() || this.imagemUrl3()) {
      this.imagemUrl3.set(null);
      this.mostrarSlot3.set(false);
    } else if (this.mostrarSlot2() || this.imagemUrl2()) {
      this.imagemUrl2.set(null);
      this.mostrarSlot2.set(false);
    } else if (this.imagemUrl()) {
      this.imagemUrl.set(null);
    }
  }

  async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const s = this.servico();
    if (!s) return;

    this.salvando.set(true);
    try {
      const val = this.form.getRawValue();
      const payload: ServicoPayload = {
        nome: val.nome,
        descricao: val.descricao || null,
        preco: this.parseCurrency(val.preco),
        duracao: val.duracao ? Number(val.duracao) : null,
        status: val.status,
        imagemUrl: this.imagemUrl() || null,
        imagemUrl2: this.imagemUrl2() || null,
        imagemUrl3: this.imagemUrl3() || null,
      };
      await this.catalogoService.atualizar(s.id, payload);
      this.toastService.success('Serviço atualizado com sucesso!', 'Sucesso');
      this.router.navigate(['/servicos/catalogo', s.id]);
    } catch {
      // O interceptor global já exibe o toast de erro amigável
    } finally {
      this.salvando.set(false);
    }
  }

  private async carregarServico(id: string): Promise<void> {
    try {
      if (this.catalogoService.servicos().length === 0) {
        await this.catalogoService.carregarServicos();
      }
      const s = this.catalogoService.servicos().find((c) => c.id === id);
      if (!s) {
        this.voltar();
        return;
      }

      this.servico.set(s);
      this.imagemUrl.set(s.imagemUrl || null);
      this.imagemUrl2.set(s.imagemUrl2 || null);
      this.imagemUrl3.set(s.imagemUrl3 || null);
      this.mostrarSlot2.set(!!s.imagemUrl2);
      this.mostrarSlot3.set(!!s.imagemUrl3);

      this.form.patchValue({
        nome: s.nome,
        preco: s.preco,
        duracao: s.duracao ?? '',
        descricao: s.descricao ?? '',
        status: s.status,
      });
    } catch {
      this.voltar();
    }
  }

  private parseCurrency(value: string | number | null): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const clean = value.replace(/\D/g, '');
    return Number(clean) / 100;
  }
}