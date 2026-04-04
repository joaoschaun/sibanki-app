/**
 * Identidade, faturas de cartão (API bills) e consentimentos — dados extras Pluggy / Open Finance.
 * Documentos sensíveis são armazenados apenas mascarados.
 */
const MAX_BILLS_TOTAL = 48;
const MAX_BILL_PAGES_PER_ACCOUNT = 2;

function maskTail(str) {
  if (str == null || str === '') return null;
  const s = String(str).replace(/\D/g, '');
  if (s.length <= 4) return '****';
  return `***${s.slice(-4)}`;
}

function formatYmdFromMaybe(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function pickIdentityRecord(res) {
  if (!res) return null;
  if (Array.isArray(res)) return res[0] || null;
  if (Array.isArray(res.results) && res.results.length) return res.results[0];
  if (res.id) return res;
  return null;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * @param {import('pluggy-sdk').PluggyClient} client
 * @param {{ itemIds: string[]; creditPluggyAccounts: any[] }} opts
 */
async function syncOpenFinanceExtras(client, opts) {
  const { itemIds, creditPluggyAccounts } = opts;
  const openFinanceIdentityByItem = {};
  let identityN = 0;

  for (const itemId of itemIds) {
    try {
      const res = await client.fetchIdentityByItemId(itemId);
      const id = pickIdentityRecord(res);
      if (!id || !id.id) continue;
      openFinanceIdentityByItem[itemId] = {
        pluggyIdentityId: id.id,
        itemId,
        fullName: id.fullName,
        documentType: id.documentType,
        documentMasked: maskTail(id.document),
        taxNumberMasked: maskTail(id.taxNumber),
        birthDate: formatYmdFromMaybe(id.birthDate),
        investorProfile: id.investorProfile,
        emailsCount: Array.isArray(id.emails) ? id.emails.length : 0,
        phonesCount: Array.isArray(id.phoneNumbers) ? id.phoneNumbers.length : 0,
        updatedAt: id.updatedAt ? new Date(id.updatedAt).toISOString() : new Date().toISOString(),
        source: 'open-finance',
      };
      identityN += 1;
    } catch (e) {
      console.error(`[pluggySync] identity item ${itemId}:`, e?.message || e);
    }
  }

  const openFinanceCreditBills = [];
  for (const acc of creditPluggyAccounts) {
    if (openFinanceCreditBills.length >= MAX_BILLS_TOTAL) break;
    try {
      let page = 1;
      let totalPages = 1;
      let pagesRead = 0;
      do {
        const res = await client.fetchCreditCardBills(acc.id, { page, pageSize: 20 });
        const rows = res.results || [];
        for (const bill of rows) {
          if (openFinanceCreditBills.length >= MAX_BILLS_TOTAL) break;
          openFinanceCreditBills.push({
            pluggyAccountId: acc.id,
            pluggyBillId: bill.id,
            dueDate: formatYmdFromMaybe(bill.dueDate),
            totalAmount: round2(Number(bill.totalAmount || 0)),
            minimumPaymentAmount:
              bill.minimumPaymentAmount != null ? round2(Number(bill.minimumPaymentAmount)) : null,
            currencyCode: bill.totalAmountCurrencyCode || 'BRL',
            updatedAt: bill.updatedAt ? new Date(bill.updatedAt).toISOString() : null,
            source: 'open-finance',
          });
        }
        totalPages = res.totalPages || 1;
        page += 1;
        pagesRead += 1;
      } while (page <= totalPages && pagesRead < MAX_BILL_PAGES_PER_ACCOUNT && openFinanceCreditBills.length < MAX_BILLS_TOTAL);
    } catch (e) {
      console.error(`[pluggySync] credit card bills ${acc.id}:`, e?.message || e);
    }
  }

  const openFinanceConsentsByItem = {};
  let consentsN = 0;
  for (const itemId of itemIds) {
    try {
      const res = await client.fetchConsents(itemId, { page: 1, pageSize: 100 });
      const n = (res.results || []).length;
      openFinanceConsentsByItem[itemId] = {
        count: n,
        syncedAt: new Date().toISOString(),
      };
      consentsN += n;
    } catch (e) {
      console.error(`[pluggySync] consents item ${itemId}:`, e?.message || e);
    }
  }

  return {
    openFinanceIdentityByItem,
    openFinanceCreditBills,
    openFinanceConsentsByItem,
    counts: {
      identity: identityN,
      bills: openFinanceCreditBills.length,
      consents: consentsN,
    },
  };
}

module.exports = {
  syncOpenFinanceExtras,
  MAX_BILLS_TOTAL,
};
