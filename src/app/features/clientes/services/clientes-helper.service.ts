import { Injectable } from '@angular/core';

@Injectable()
export class ClientesHelperService {
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