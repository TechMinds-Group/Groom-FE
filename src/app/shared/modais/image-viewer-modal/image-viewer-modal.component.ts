import { Component, ElementRef, HostListener, ViewChild, computed, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-viewer-modal.component.html',
  styleUrl: './image-viewer-modal.component.scss'
})
export class ImageViewerModalComponent {
  protected readonly Math = Math;
  show = model<boolean>(false);
  imageUrl = input<string | null>(null);
  images = input<string[] | null>(null);
  title = input<string>('');

  activeIndex = signal<number>(0);

  @ViewChild('imageElement') imageElement?: ElementRef<HTMLImageElement>;

  // Touch and Zoom state
  scale = signal<number>(1);
  translateX = signal<number>(0);
  translateY = signal<number>(0);

  private initialPinchDistance: number | null = null;
  private initialScale = 1;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private lastTapTime = 0;

  /** Lista unificada de todas as imagens válidas */
  readonly allImages = computed<string[]>(() => {
    const list = this.images();
    if (list && list.length > 0) {
      return list.filter((img): img is string => !!img);
    }
    const single = this.imageUrl();
    return single ? [single] : [];
  });

  /** URL da imagem ativa atual */
  readonly activeImageUrl = computed<string | null>(() => {
    const list = this.allImages();
    if (list.length === 0) return null;
    const idx = Math.min(Math.max(this.activeIndex(), 0), list.length - 1);
    return list[idx];
  });

  fechar(): void {
    this.resetZoom();
    this.activeIndex.set(0);
    this.show.set(false);
  }

  resetZoom(): void {
    this.scale.set(1);
    this.translateX.set(0);
    this.translateY.set(0);
  }

  prevImage(event?: Event): void {
    if (event) event.stopPropagation();
    const count = this.allImages().length;
    if (count <= 1) return;
    this.resetZoom();
    this.activeIndex.update(i => (i > 0 ? i - 1 : count - 1));
  }

  nextImage(event?: Event): void {
    if (event) event.stopPropagation();
    const count = this.allImages().length;
    if (count <= 1) return;
    this.resetZoom();
    this.activeIndex.update(i => (i < count - 1 ? i + 1 : 0));
  }

  goToImage(index: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.resetZoom();
    this.activeIndex.set(index);
  }

  zoomIn(event?: Event): void {
    if (event) event.stopPropagation();
    this.scale.update(s => Math.min(s + 0.5, 4));
  }

  zoomOut(event?: Event): void {
    if (event) event.stopPropagation();
    this.scale.update(s => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) {
        this.translateX.set(0);
        this.translateY.set(0);
      }
      return next;
    });
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.show()) return;
    if (event.key === 'Escape') {
      this.fechar();
    } else if (event.key === 'ArrowLeft') {
      this.prevImage();
    } else if (event.key === 'ArrowRight') {
      this.nextImage();
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.2 : -0.2;
    const newScale = Math.min(Math.max(this.scale() + delta, 1), 4);
    this.scale.set(newScale);
    if (newScale === 1) {
      this.translateX.set(0);
      this.translateY.set(0);
    }
  }

  // Double tap to toggle zoom
  onImageClick(event: MouseEvent | TouchEvent): void {
    const now = Date.now();
    if (now - this.lastTapTime < 300) {
      // Double tap detected
      if (this.scale() > 1) {
        this.resetZoom();
      } else {
        this.scale.set(2.5);
      }
    }
    this.lastTapTime = now;
  }

  // Pointer / Drag handling
  onMouseDown(event: MouseEvent): void {
    if (this.scale() <= 1) return;
    this.isDragging = true;
    this.startX = event.clientX - this.translateX();
    this.startY = event.clientY - this.translateY();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.scale() <= 1) return;
    this.translateX.set(event.clientX - this.startX);
    this.translateY.set(event.clientY - this.startY);
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  // Touch Handling for Mobile Pinch-to-Zoom
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      // Pinch gesture start
      this.initialPinchDistance = this.getDistance(event.touches[0], event.touches[1]);
      this.initialScale = this.scale();
    } else if (event.touches.length === 1 && this.scale() > 1) {
      // Drag start
      this.isDragging = true;
      this.startX = event.touches[0].clientX - this.translateX();
      this.startY = event.touches[0].clientY - this.translateY();
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length === 2 && this.initialPinchDistance) {
      event.preventDefault();
      const currentDistance = this.getDistance(event.touches[0], event.touches[1]);
      const factor = currentDistance / this.initialPinchDistance;
      const newScale = Math.min(Math.max(this.initialScale * factor, 1), 4);
      this.scale.set(newScale);
      if (newScale === 1) {
        this.translateX.set(0);
        this.translateY.set(0);
      }
    } else if (event.touches.length === 1 && this.isDragging && this.scale() > 1) {
      event.preventDefault();
      this.translateX.set(event.touches[0].clientX - this.startX);
      this.translateY.set(event.touches[0].clientY - this.startY);
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (event.touches.length < 2) {
      this.initialPinchDistance = null;
    }
    if (event.touches.length === 0) {
      this.isDragging = false;
    }
  }

  private getDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }
}
