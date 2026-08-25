import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { DiaFuncionamento } from '../models/configuracoes/horario-estabelecimento.model';

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface EstabelecimentoInfo {
  nome: string;
  nomeExibicao?: string;
  cnpj: string;
  telefone: string;
  logoUrl?: string;
  capaUrl?: string;
  descricao?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  endereco?: string;
}

export const ICONES_LOGO_ALEATORIOS = [
  'fa-solid fa-scissors',
  'fa-solid fa-shop',
  'fa-solid fa-store',
  'fa-solid fa-crown',
  'fa-solid fa-spray-can-sparkles',
  'fa-solid fa-user-tie',
  'fa-solid fa-wand-magic-sparkles',
  'fa-solid fa-gem',
];

export const ICONES_CAPA_ALEATORIOS = [
  'fa-solid fa-image',
  'fa-solid fa-images',
  'fa-solid fa-mountain-sun',
  'fa-solid fa-store',
  'fa-solid fa-shop',
  'fa-solid fa-panorama',
  'fa-solid fa-icons',
  'fa-solid fa-layer-group',
];

export function obterIconeAleatorioLogo(semente?: string): string {
  if (!semente) {
    return ICONES_LOGO_ALEATORIOS[Math.floor(Math.random() * ICONES_LOGO_ALEATORIOS.length)];
  }
  let hash = 0;
  for (let i = 0; i < semente.length; i++) {
    hash = (hash << 5) - hash + semente.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ICONES_LOGO_ALEATORIOS.length;
  return ICONES_LOGO_ALEATORIOS[index];
}

export function obterIconeAleatorioCapa(semente?: string): string {
  if (!semente) {
    return ICONES_CAPA_ALEATORIOS[Math.floor(Math.random() * ICONES_CAPA_ALEATORIOS.length)];
  }
  let hash = 0;
  for (let i = 0; i < semente.length; i++) {
    hash = (hash << 5) - hash + semente.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ICONES_CAPA_ALEATORIOS.length;
  return ICONES_CAPA_ALEATORIOS[index];
}

@Injectable({
  providedIn: 'root',
})
export class EstabelecimentoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/configuracoes/estabelecimento`;
  private readonly publicApiUrl = `${environment.apiUrl}/api/publico`;

  private readonly _horarios = signal<DiaFuncionamento[]>([]);
  readonly horarios = this._horarios.asReadonly();

  async carregarHorarios(): Promise<DiaFuncionamento[]> {
    try {
      const data = await firstValueFrom(this.http.get<DiaFuncionamento[]>(this.apiUrl));
      this._horarios.set(data);
      return data;
    } catch {
      // Fallback padrão se não houver dados
      const padrao: DiaFuncionamento[] = [];
      for (let i = 0; i <= 6; i++) {
        padrao.push({
          diaSemana: i,
          ativo: i !== 0,
          horaAbertura: '08:00',
          horaFechamento: '18:00',
          temIntervalo: true,
          intervaloInicio: '12:00',
          intervaloFim: '13:00',
        });
      }
      this._horarios.set(padrao);
      return padrao;
    }
  }

  async salvarHorarios(dias: DiaFuncionamento[]): Promise<void> {
    await firstValueFrom(this.http.put(this.apiUrl, { dias }));
    this._horarios.set(dias);
  }

  async carregarInfo(): Promise<EstabelecimentoInfo> {
    return firstValueFrom(this.http.get<EstabelecimentoInfo>(`${this.apiUrl}/info`));
  }

  /** Obtém o link público de agendamento; no primeiro acesso o backend gera e persiste. */
  async obterLinkAgendamento(): Promise<string> {
    const data = await firstValueFrom(this.http.get<{ link: string }>(`${this.apiUrl}/link-agendamento`));
    return data.link;
  }

  async salvarInfo(info: Partial<EstabelecimentoInfo>): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/info`, info));
  }

  /** Envia logo/capa via multipart; retorna as URLs relativas salvas em disco. */
  async salvarImagens(formData: FormData): Promise<{ logoUrl?: string; capaUrl?: string }> {
    return firstValueFrom(this.http.post<{ logoUrl?: string; capaUrl?: string }>(`${this.apiUrl}/imagens`, formData));
  }

  /** Converte URL relativa da API em URL absoluta para exibição; mantém base64/data para preview. */
  resolverUrl(url?: string): string {
    if (!url) {
      return '';
    }
    if (url.startsWith('data:') || url.startsWith('http')) {
      return url;
    }
    return `${environment.apiUrl}${url}`;
  }

  async carregarInfoPublico(estabelecimentoSlug: string): Promise<EstabelecimentoInfo> {
    return firstValueFrom(this.http.get<EstabelecimentoInfo>(`${this.publicApiUrl}/${estabelecimentoSlug}/agendamento/info`));
  }

  /** Retorna o horário de abertura e fechamento para um determinado dia da semana. */
  getHorarioDia(diaSemana: number): { dayStartHour: number; dayEndHour: number; ativo: boolean } {
    const lista = this.horarios();
    const diaConfig = lista.find((d) => d.diaSemana === diaSemana);

    if (!diaConfig || !diaConfig.ativo) {
      return { dayStartHour: 8, dayEndHour: 18, ativo: false };
    }

    const start = parseInt(diaConfig.horaAbertura?.split(':')[0] || '8', 10);
    const end = parseInt(diaConfig.horaFechamento?.split(':')[0] || '18', 10);

    return {
      dayStartHour: isNaN(start) ? 8 : start,
      dayEndHour: isNaN(end) ? 18 : end,
      ativo: true,
    };
  }

  /** Consulta o ViaCEP para autopreenchimento de endereço por CEP */
  async buscarCep(cep: string): Promise<ViaCepResult | null> {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return null;
    }
    try {
      const res = await firstValueFrom(
        this.http.get<ViaCepResult>(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      );
      if (!res || res.erro === true || (res.erro as unknown) === 'true') {
        return null;
      }
      return res;
    } catch {
      return null;
    }
  }

  /** Gera a URL do Google Maps com a rota até o destino */
  obterUrlGoogleMaps(endereco: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`;
  }
}
