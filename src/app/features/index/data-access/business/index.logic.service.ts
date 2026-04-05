import { Injectable } from '@angular/core';

import { IndexData } from '../models/index.model';

@Injectable({
  providedIn: 'root',
})
export class IndexLogicService {
  /**
   * Exemplo de transformação de dados: formatar uma data ou estruturar para a UI
   */
  public transformData(item: IndexData): Record<string, unknown> {
    return {
      ...item,
      // Supondo que você faria algo como item.date ? format(item.date) : 'N/A'
      summary: `Resumo do item: ${JSON.stringify(item)}`,
    };
  }

  /**
   * Exemplo de cálculo de totais baseado em uma lista de itens do state
   */
  public calculateTotal(items: IndexData[]): number {
    return items.length;
  }
}
