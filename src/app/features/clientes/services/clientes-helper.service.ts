import { Injectable } from '@angular/core';
import { Cliente } from '../../../core/models/clientes/cliente.model';

@Injectable({
  providedIn: 'root',
})
export class ClientesHelperService {
  separarNome(c: Cliente): { primeiroNome: string; sobrenome: string } {
    const partes = (c.nome || '').trim().split(/\s+/).filter(Boolean);
    const primeiroNome = c.primeiroNome || partes[0] || '';
    const sobrenome = c.sobrenome || (partes.length > 1 ? partes.slice(1).join(' ') : '');
    return { primeiroNome, sobrenome };
  }

  getNomeCompleto(c: Cliente): string {
    const { primeiroNome, sobrenome } = this.separarNome(c);
    if (sobrenome) {
      return `${primeiroNome} ${sobrenome}`;
    }
    return c.nome || primeiroNome;
  }

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

  formatarCpf(cpf: string | undefined): string {
    if (!cpf) return '';
    const nums = cpf.replace(/\D/g, '');
    if (nums.length !== 11) return cpf;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  }
}