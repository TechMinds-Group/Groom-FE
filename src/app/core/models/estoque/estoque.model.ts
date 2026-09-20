export interface ProdutoEstoque {
  id: string;
  nome: string;
  categoria: string;
  codigoBarras?: string;
  marca?: string;
  unidadeMedida: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  precoCusto: number;
  precoVenda: number;
  margemLucroPorcentagem: number;
  lucroUnitario: number;
  dataValidade?: string;
  validadeProximaOuVencida: boolean;
  estoqueBaixo: boolean;
  status: string;
  imagemUrl?: string;
  createdAtUtc: string;
}

export interface CriarProdutoEstoque {
  nome: string;
  categoria: string;
  codigoBarras?: string;
  marca?: string;
  unidadeMedida: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  precoCusto: number;
  precoVenda: number;
  dataValidade?: string;
  imagemUrl?: string;
}

export interface AtualizarProdutoEstoque {
  nome: string;
  categoria: string;
  codigoBarras?: string;
  marca?: string;
  unidadeMedida: string;
  quantidadeMinima: number;
  precoCusto: number;
  precoVenda: number;
  dataValidade?: string;
  status: string;
  imagemUrl?: string;
}

export interface ResumoInventario {
  totalItensFisicos: number;
  totalProdutosDistintos: number;
  custoTotalInventariado: number;
  lucroPotencialTotal: number;
  quantidadeProdutosEstoqueBaixo: number;
  quantidadeProdutosVencidosOuProximos: number;
}

export const CATEGORIAS_ESTOQUE = [
  { value: 'Bar', label: 'Bar' },
  { value: 'CosmeticoUsoInterno', label: 'Cosmético (Uso Interno)' },
  { value: 'CosmeticoVenda', label: 'Cosmético (Venda)' },
  { value: 'Outros', label: 'Outros' },
] as const;

export const UNIDADES_MEDIDA = [
  { value: 'UN', label: 'Unidade (UN)' },
  { value: 'CX', label: 'Caixa (CX)' },
  { value: 'LAT', label: 'Lata (LAT)' },
  { value: 'FD', label: 'Fardo (FD)' },
  { value: 'ML', label: 'Mililitros (ML)' },
  { value: 'L', label: 'Litros (L)' },
  { value: 'KG', label: 'Quilogramas (KG)' },
] as const;

export interface RegistrarMovimentacao {
  produtoId: string;
  tipo: 'Entrada' | 'SaidaVenda' | 'UsoInterno' | 'PerdaAvaria' | 'Ajuste';
  quantidade: number;
  responsavelNome?: string;
  motivoObservacao?: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  produtoNome: string;
  tipo: 'Entrada' | 'SaidaVenda' | 'UsoInterno' | 'PerdaAvaria' | 'Ajuste';
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
  precoCustoUnitario: number;
  precoVendaUnitario?: number;
  responsavelNome: string;
  motivoObservacao?: string;
  dataMovimentacaoUtc: string;
}

export const TIPOS_MOVIMENTACAO = [
  { value: 'Entrada', label: 'Entrada (+ Compra/Reposição)' },
  { value: 'SaidaVenda', label: 'Saída (- Venda)' },
  { value: 'UsoInterno', label: 'Saída (- Uso Interno / Bancada)' },
  { value: 'PerdaAvaria', label: 'Saída (- Perda / Avaria / Validade)' },
  { value: 'Ajuste', label: 'Ajuste de Estoque (Balanço)' },
] as const;

