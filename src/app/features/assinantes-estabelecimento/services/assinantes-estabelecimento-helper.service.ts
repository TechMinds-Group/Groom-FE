import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AssinantesEstabelecimentoHelperService {
  formatarData(dataStr: string | undefined): string {
    if (!dataStr) return '';
    const cleanStr = dataStr.split('T')[0].trim();
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
    const parts = cleanStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      if (year.length === 4) {
        return `${day}/${month}/${year}`;
      }
    }
    return dataStr;
  }

  formatarDataParaInputDate(dataStr: string | undefined): string {
    if (!dataStr) return '';
    const cleanStr = dataStr.split('T')[0].trim();
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return cleanStr;
  }

  obterTempoRestanteFormatado(dataFimStr: string): string {
    if (!dataFimStr) return '';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const parts = dataFimStr.split('-');
    if (parts.length !== 3) return '';
    const dataFim = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    dataFim.setHours(0, 0, 0, 0);

    if (dataFim.getTime() <= hoje.getTime()) {
      return 'Expirado';
    }

    let anos = dataFim.getFullYear() - hoje.getFullYear();
    let meses = dataFim.getMonth() - hoje.getMonth();
    let dias = dataFim.getDate() - hoje.getDate();

    if (dias < 0) {
      const tempDate = new Date(dataFim.getFullYear(), dataFim.getMonth(), 0);
      dias += tempDate.getDate();
      meses--;
    }

    if (meses < 0) {
      meses += 12;
      anos--;
    }

    if (anos >= 1) {
      return anos === 1 ? '1 ano' : `${anos} anos`;
    } else if (meses >= 1) {
      return meses === 1 ? '1 mês' : `${meses} meses`;
    } else {
      const diffTime = dataFim.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays === 1 ? '1 dia' : `${diffDays} dias`;
    }
  }
}
