import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  model,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-barcode-scanner-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './barcode-scanner-modal.component.html',
  styleUrls: ['./barcode-scanner-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarcodeScannerModalComponent implements OnInit, OnDestroy {
  show = model<boolean>(false);
  scanned = output<string>();
  cancel = output<void>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('manualInput') manualInput!: ElementRef<HTMLInputElement>;

  protected readonly carregando = signal(true);
  protected readonly erroCamera = signal<string | null>(null);
  protected readonly barcodeSuporte = signal(false);
  protected readonly lanternaDisponivel = signal(false);
  protected readonly lanternaAtiva = signal(false);
  protected readonly cameras = signal<MediaDeviceInfo[]>([]);
  protected readonly cameraAtualIndex = signal(0);
  protected readonly codigoManual = signal('');
  protected readonly statusMensagem = signal('Aponte a câmera para o código de barras');

  private mediaStream: MediaStream | null = null;
  private scanIntervalId: any = null;
  private barcodeDetector: any = null;

  constructor() {
    effect(() => {
      if (this.show()) {
        setTimeout(() => void this.iniciarCamera(), 100);
      } else {
        this.pararCamera();
      }
    });
  }

  ngOnInit(): void {
    if ('BarcodeDetector' in window) {
      this.barcodeSuporte.set(true);
      try {
        const BarcodeDetectorClass = (window as any).BarcodeDetector;
        this.barcodeDetector = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf'],
        });
      } catch {
        this.barcodeSuporte.set(false);
      }
    }
  }

  ngOnDestroy(): void {
    this.pararCamera();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.show()) return;
    if (event.key === 'Escape') {
      this.fechar();
    }
  }

  async iniciarCamera(): Promise<void> {
    this.carregando.set(true);
    this.erroCamera.set(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.carregando.set(false);
      this.erroCamera.set('Dispositivo ou navegador sem suporte à câmera. Use um leitor físico ou digite o código.');
      return;
    }

    try {
      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      if (this.cameras().length > 0) {
        const selectedDevice = this.cameras()[this.cameraAtualIndex() % this.cameras().length];
        if (selectedDevice?.deviceId) {
          constraints = { video: { deviceId: { exact: selectedDevice.deviceId } } };
        }
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Enumerar câmeras disponíveis após a permissão ser concedida
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        this.cameras.set(videoDevices);
      } catch {
        // Ignora falha de enumeração
      }

      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        await this.videoElement.nativeElement.play();
      } else {
        setTimeout(async () => {
          if (this.videoElement && this.videoElement.nativeElement && this.mediaStream) {
            this.videoElement.nativeElement.srcObject = this.mediaStream;
            await this.videoElement.nativeElement.play();
          }
        }, 150);
      }

      // Verificar suporte a lanterna (torch)
      const track = this.mediaStream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track as any).getCapabilities ? (track as any).getCapabilities() : {};
        this.lanternaDisponivel.set(!!capabilities.torch);
      }

      this.carregando.set(false);
      this.iniciarLeituraLoop();

      setTimeout(() => {
        if (this.manualInput && this.manualInput.nativeElement) {
          this.manualInput.nativeElement.focus();
        }
      }, 300);
    } catch (err: any) {
      this.carregando.set(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.erroCamera.set('Permissão de acesso à câmera negada. Digite o código ou use um leitor de código de barras.');
      } else {
        this.erroCamera.set('Não foi possível conectar à câmera. Digite o código ou use um leitor físico.');
      }
    }
  }

  private iniciarLeituraLoop(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
    }

    this.scanIntervalId = setInterval(async () => {
      if (!this.show() || !this.videoElement || !this.videoElement.nativeElement) return;
      const video = this.videoElement.nativeElement;
      if (video.readyState < 2) return;

      if (this.barcodeDetector) {
        try {
          const barcodes = await this.barcodeDetector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw && raw.trim().length > 0) {
              this.processarCodigoLido(raw.trim());
            }
          }
        } catch {
          // Ignora erros de frame individual
        }
      }
    }, 150);
  }

  async alternarCamera(): Promise<void> {
    if (this.cameras().length <= 1) return;
    this.pararCamera();
    this.cameraAtualIndex.update((idx: number) => (idx + 1) % this.cameras().length);
    await this.iniciarCamera();
  }

  async alternarLanterna(): Promise<void> {
    if (!this.mediaStream) return;
    const track = this.mediaStream.getVideoTracks()[0];
    if (!track) return;

    try {
      const novoEstado = !this.lanternaAtiva();
      await (track as any).applyConstraints({
        advanced: [{ torch: novoEstado }],
      });
      this.lanternaAtiva.set(novoEstado);
    } catch {
      // Ignora se a lanterna não responder
    }
  }

  confirmarManual(): void {
    const code = this.codigoManual().trim();
    if (code) {
      this.processarCodigoLido(code);
    }
  }

  onManualKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmarManual();
    }
  }

  private processarCodigoLido(codigo: string): void {
    this.tocarBeep();
    if (navigator.vibrate) {
      navigator.vibrate([100]);
    }
    this.statusMensagem.set(`Código detectado: ${codigo}`);
    this.scanned.emit(codigo);
    this.fechar();
  }

  private tocarBeep(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio context não suportado ou bloqueado
    }
  }

  pararCamera(): void {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.lanternaAtiva.set(false);
  }

  fechar(): void {
    this.pararCamera();
    this.codigoManual.set('');
    this.show.set(false);
    this.cancel.emit();
  }
}
