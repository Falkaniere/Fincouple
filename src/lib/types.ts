export type Kind = 'expense' | 'income';

export interface Couple {
  id: string;
  name: string;
  invite_code: string;
  monthly_limit_cents: number;
  created_at: string;
}

export interface CoupleMember {
  couple_id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
}

export interface Category {
  id: string;
  couple_id: string;
  name: string;
  kind: Kind;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  couple_id: string;
  category_id: string | null;
  kind: Kind;
  amount_cents: number;
  /** Data do lançamento, formato YYYY-MM-DD. */
  occurred_on: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  /** As três vêm juntas (parcelado) ou nenhuma vem (lançamento avulso). */
  installment_group: string | null;
  installment_no: number | null;
  installment_total: number | null;
  /**
   * Quando preenchido (sempre dia 1 de um mês), o lançamento conta nesse mês
   * em vez do mês da própria data -- para alinhar com o fechamento da
   * fatura do cartão, que varia de cartão para cartão.
   */
  billing_month: string | null;
}

export interface Bill {
  id: string;
  couple_id: string;
  category_id: string | null;
  title: string;
  amount_cents: number;
  due_date: string;
  /** null = em aberto; preenchido = paga. */
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
}

/** Uma linha do ranking de categorias da tela inicial. */
export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  color: string;
  cents: number;
  /** Fração do gasto total do mês, de 0 a 1. */
  share: number;
}
