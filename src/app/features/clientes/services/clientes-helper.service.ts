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

  formatarData(dataStr: string | undefined): string {
    if (!dataStr) return '';
    if (dataStr.includes('/')) return dataStr;
    const parts = dataStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dataStr;
  }

  formatarCpf(cpf: string | undefined): string {
    if (!cpf) return '';
    const nums = cpf.replace(/\D/g, '');
    if (nums.length !== 11) return cpf;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  }
}