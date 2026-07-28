import { Injectable } from '@angular/core';

export interface ContactInfo {
  nome: string;
  telefone: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class ContactPickerService {
  isSupported(): boolean {
    return 'contacts' in navigator && 'ContactsManager' in window;
  }

  async pickContact(): Promise<ContactInfo | null> {
    if (!this.isSupported()) return null;

    try {
      const props: ['name', 'tel', 'email'] = ['name', 'tel', 'email'];
      const contacts = await (navigator as any).contacts.select(props, { multiple: false });
      if (!contacts || contacts.length === 0) return null;

      const contact = contacts[0];

      return {
        nome: Array.isArray(contact.name) ? contact.name[0] ?? '' : contact.name ?? '',
        telefone: this.formatPhone(
          Array.isArray(contact.tel) ? contact.tel[0] ?? '' : contact.tel ?? ''
        ),
        email: Array.isArray(contact.email) ? contact.email[0] ?? '' : contact.email ?? '',
      };
    } catch {
      return null;
    }
  }

  parseVCard(text: string): ContactInfo | null {
    try {
      const nameMatch = text.match(/\nFN[:;](.+?)(?:\r?\n|$)/i);
      if (!nameMatch) return null;

      const telMatch = text.match(/\nTEL(?:[^:]*)[:]?([^\r\n;]+)/i);
      const emailMatch = text.match(/\nEMAIL(?:[^:]*)[:]?([^\r\n;]+)/i);

      return {
        nome: nameMatch[1].trim(),
        telefone: this.formatPhone(telMatch ? telMatch[1].trim() : ''),
        email: emailMatch ? emailMatch[1].trim() : '',
      };
    } catch {
      return null;
    }
  }

  private formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length < 10) return value;
    if (digits.length === 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
}
