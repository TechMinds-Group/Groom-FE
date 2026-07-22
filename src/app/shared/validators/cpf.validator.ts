import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Helper estático com o algoritmo oficial de validação de CPF (Módulo 11).
 */
export class CpfHelper {
  /**
   * Valida se uma string é um CPF válido considerando formatação e dígitos verificadores.
   */
  public static validarCpf(cpf: string | null | undefined): boolean {
    if (!cpf) {
      return false;
    }

    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
      return false;
    }

    // Rejeita sequências repetidas (ex: 111.111.111-11, 000.000.000-00)
    if (/^(\d)\1{10}$/.test(cleanCpf)) {
      return false;
    }

    let soma = 0;
    let resto = 0;

    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cleanCpf.substring(i - 1, i), 10) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) {
      resto = 0;
    }

    if (resto !== parseInt(cleanCpf.substring(9, 10), 10)) {
      return false;
    }

    // Segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cleanCpf.substring(i - 1, i), 10) * (12 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) {
      resto = 0;
    }

    if (resto !== parseInt(cleanCpf.substring(10, 11), 10)) {
      return false;
    }

    return true;
  }
}

/**
 * Validador síncrono para Reactive Forms do Angular.
 */
export function cpfValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const val = control.value;
    if (!val) {
      return null;
    }
    return CpfHelper.validarCpf(val) ? null : { cpfInvalido: true };
  };
}
