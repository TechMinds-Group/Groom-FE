import { Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificacaoService } from '../../../core/services/notificacao.service';
import { NotificacaoItem } from '../../../core/models/notificacao/notificacao.model';

@Component({
  selector: 'app-header-notificacoes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header-notificacoes.component.html',
  styleUrls: ['./header-notificacoes.component.scss']
})
export class HeaderNotificacoesComponent implements OnInit {
  readonly notificacaoService = inject(NotificacaoService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly menuAberto = signal<boolean>(false);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.notificacaoService.carregarNotificacoes().subscribe();
  }

  toggleMenu(): void {
    this.menuAberto.update((v) => !v);
    if (this.menuAberto()) {
      this.carregar();
    }
  }

  marcarComoLida(notificacao: NotificacaoItem, event: MouseEvent): void {
    event.stopPropagation();
    if (!notificacao.lida) {
      this.notificacaoService.marcarComoLida(notificacao.id).subscribe();
    }
  }

  marcarTodasComoLidas(event: MouseEvent): void {
    event.stopPropagation();
    this.notificacaoService.marcarTodasComoLidas().subscribe();
  }

  clicarNotificacao(notificacao: NotificacaoItem): void {
    if (!notificacao.lida) {
      this.notificacaoService.marcarComoLida(notificacao.id).subscribe();
    }
    this.menuAberto.set(false);
    if (notificacao.linkRedirecionamento) {
      this.router.navigateByUrl(notificacao.linkRedirecionamento);
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.menuAberto.set(false);
    }
  }

  formatarTempo(dataIso: string): string {
    if (!dataIso) return '';
    const data = new Date(dataIso);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHoras < 24) return `há ${diffHoras}h`;
    if (diffDias === 1) return 'Ontem';
    return `há ${diffDias}d`;
  }
}
