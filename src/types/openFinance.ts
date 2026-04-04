/**
 * Dados ingeridos do Open Finance (Pluggy) — distinto das páginas "Soluções" (parceiros comerciais).
 * @see functions/services/pluggy/openFinanceResourceCatalog.js
 */

/** Snapshot de identidade por item Pluggy (documentos mascarados no Firestore). */
export interface OpenFinanceIdentitySnapshot {
  pluggyIdentityId: string;
  itemId: string;
  fullName: string | null;
  documentType: string | null;
  documentMasked: string | null;
  taxNumberMasked: string | null;
  birthDate: string | null;
  investorProfile: 'Conservative' | 'Moderate' | 'Aggressive' | null;
  emailsCount: number;
  phonesCount: number;
  updatedAt: string;
  source: 'open-finance';
}

/** Fatura de cartão (API bills Pluggy — não é boleto DDA de concessionária). */
export interface OpenFinanceCreditBill {
  pluggyAccountId: string;
  pluggyBillId: string;
  dueDate: string | null;
  totalAmount: number;
  minimumPaymentAmount: number | null;
  currencyCode: string;
  updatedAt: string | null;
  source: 'open-finance';
}

export interface OpenFinanceConsentItemSummary {
  count: number;
  syncedAt: string;
}
