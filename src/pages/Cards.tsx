import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { EmptyState } from '../components/ui/EmptyState';
import { CreditCardVisual } from '../components/banks/CreditCardVisual';
import {
  addCard,
  addCardPurchase,
  deleteCardPurchase,
  updateCard,
  deleteCard,
  importCardPurchases,
  getBillingMonth,
  ValidationError,
} from '../services/persistUserData';
import { Modal } from '../components/ui/Modal';
import { CreditModuleTabs } from '../components/credit/CreditModuleTabs';
import { CreditKpiGrid, pressurePillClasses } from '../components/credit/CreditVisuals';
import { CreditCard, Plus, FileText, Trash2, Pencil, ShieldCheck } from 'lucide-react';import type { Card, CardBenefits, CardPurchase } from '../types/userData';
import {
  getCatalogEntry,
  listCatalogByFlag,
  type CardBenefitsCatalogEntry,
} from '../constants/cardBenefitsCatalog';
import { inferCardBenefitsFromMeta } from '../utils/inferCardBenefitsFromMeta';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outros'];
const BANCOS = [
  'Nubank',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'Caixa',
  'Inter',
  'C6',
  'BTG',
  'XP',
  'Mercado Pago',
  'PicPay',
  'PagBank',
  'Will',
  'Neon',
  'Outros',
];
const CORES_CARTAO = [
  { value: '#4F8CFF', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
];

function getDiasParaFecha(card: Card): number {
  const now = new Date();
  const closeDate = new Date(now.getFullYear(), now.getMonth(), card.closeDay ?? 31);
  if (now > closeDate) closeDate.setMonth(closeDate.getMonth() + 1);
  return Math.ceil((closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Cards() {
  const { user, cards, entries, categories, financialProfile, creditObligations, loading } = useAppContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closeDay, setCloseDay] = useState(10);
  const [dueDay, setDueDay] = useState(15);
  const [flag, setFlag] = useState('Visa');
  const [bank, setBank] = useState('Outros');
  const [color, setColor] = useState('#4F8CFF');
  const [annualFee, setAnnualFee] = useState('');
  const [annualFeeMonth, setAnnualFeeMonth] = useState<number>(1);
  const [editCardId, setEditCardId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editCloseDay, setEditCloseDay] = useState(10);
  const [editDueDay, setEditDueDay] = useState(15);
  const [editFlag, setEditFlag] = useState('Visa');
  const [editBank, setEditBank] = useState('Outros');
  const [editColor, setEditColor] = useState('#4F8CFF');
  const [editAnnualFee, setEditAnnualFee] = useState('');
  const [editAnnualFeeMonth, setEditAnnualFeeMonth] = useState<number>(1);
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importCardId, setImportCardId] = useState<number | null>(null);
  const [importMode, setImportMode] = useState<'csv' | 'ofx'>('csv');
  const [importText, setImportText] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importBusy, setImportBusy] = useState(false);

  const [faturaCardId, setFaturaCardId] = useState<number | null>(null);
  const [faturaMonth, setFaturaMonth] = useState(() => {
    const n = new Date();
    const c = { closeDay: 10 } as Card;
    return getBillingMonth(c, n.toISOString().split('T')[0]);
  });
  const [lancarCardId, setLancarCardId] = useState<number | null>(null);
  const [lancarDesc, setLancarDesc] = useState('');
  const [lancarCat, setLancarCat] = useState('');
  const [lancarVal, setLancarVal] = useState('');
  const [lancarDate, setLancarDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lancarParcelas, setLancarParcelas] = useState(1);
  const [lancarBusy, setLancarBusy] = useState(false);
  const [delConfirm, setDelConfirm] = useState<{ cardId: number; purchaseId: number } | null>(null);
  const [benefitsCardId, setBenefitsCardId] = useState<number | null>(null);
  const [benefitsVipLounge, setBenefitsVipLounge] = useState(false);
  const [benefitsVipNetwork, setBenefitsVipNetwork] = useState('');
  const [benefitsVipVisitsPerYear, setBenefitsVipVisitsPerYear] = useState('');
  const [benefitsTravelInsurance, setBenefitsTravelInsurance] = useState(false);
  const [benefitsPurchaseProtection, setBenefitsPurchaseProtection] = useState(false);
  const [benefitsExtendedWarranty, setBenefitsExtendedWarranty] = useState(false);
  const [benefitsConcierge, setBenefitsConcierge] = useState(false);
  const [benefitsPointsProgram, setBenefitsPointsProgram] = useState('');
  const [benefitsCashbackPct, setBenefitsCashbackPct] = useState('');
  const [benefitsNotes, setBenefitsNotes] = useState('');
  const [benefitsBusy, setBenefitsBusy] = useState(false);
  const [benefitsCatalogId, setBenefitsCatalogId] = useState('');
  const [benefitsFromCatalog, setBenefitsFromCatalog] = useState(false);

  const [addBenefitsManual, setAddBenefitsManual] = useState(false);
  const [addPendingBenefits, setAddPendingBenefits] = useState<CardBenefits | null>(null);
  const [addBenefitsBadge, setAddBenefitsBadge] = useState(false);
  const [editBenefitsManual, setEditBenefitsManual] = useState(false);
  const [editPendingBenefits, setEditPendingBenefits] = useState<CardBenefits | null>(null);
  const [editBenefitsBadge, setEditBenefitsBadge] = useState(false);

  const userCats = categories?.length ? categories : ['Alimentação', 'Transporte', 'Lazer', 'Outros'];
  const faturaCard = faturaCardId != null ? cards.find((c) => c.id === faturaCardId) : null;
  const faturaPurchases = useMemo(() => {
    if (!faturaCard) return [];
    const list = (faturaCard.purchases ?? []) as CardPurchase[];
    return list.filter((p) => p.billingMonth === faturaMonth).sort((a, b) => a.date.localeCompare(b.date));
  }, [faturaCard, faturaMonth]);
  const faturaTotal = useMemo(() => faturaPurchases.reduce((s, p) => s + p.value, 0), [faturaPurchases]);
  const availableMonths = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  }, []);

  const benefitsModalCard = useMemo(
    () => (benefitsCardId != null ? cards.find((c) => c.id === benefitsCardId) : undefined),
    [benefitsCardId, cards],
  );
  const catalogRowsForModal = useMemo(
    () => (benefitsModalCard ? listCatalogByFlag(benefitsModalCard.flag ?? 'Outros') : []),
    [benefitsModalCard],
  );
  const resolvedBenefitsCatalogId =
    catalogRowsForModal.length > 0 && catalogRowsForModal.some((r) => r.id === benefitsCatalogId)
      ? benefitsCatalogId
      : catalogRowsForModal[0]?.id ?? '';
  const selectedCatalogPreview = resolvedBenefitsCatalogId
    ? getCatalogEntry(resolvedBenefitsCatalogId)
    : undefined;

  const touchManualBenefits = () => setBenefitsFromCatalog(false);

  const tryInferAddBenefits = () => {
    if (addBenefitsManual) return;
    const inf = inferCardBenefitsFromMeta(name.trim(), flag);
    if (inf && (inf.confidence === 'high' || inf.confidence === 'medium')) {
      setAddPendingBenefits({
        ...inf.benefits,
        source: 'catalog',
        updatedAt: new Date().toISOString(),
      });
      setAddBenefitsBadge(true);
    } else {
      setAddPendingBenefits(null);
      setAddBenefitsBadge(false);
    }
  };

  const tryInferEditBenefits = () => {
    if (editBenefitsManual) return;
    const inf = inferCardBenefitsFromMeta(editName.trim(), editFlag);
    if (inf && (inf.confidence === 'high' || inf.confidence === 'medium')) {
      setEditPendingBenefits({
        ...inf.benefits,
        source: 'catalog',
        updatedAt: new Date().toISOString(),
      });
      setEditBenefitsBadge(true);
    } else {
      setEditPendingBenefits(null);
      setEditBenefitsBadge(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !name.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const limitNum = parseFloat(limit.replace(',', '.')) || 0;
      const annualFeeNum = parseFloat(annualFee.replace(',', '.')) || 0;
      await addCard(user.uid, cards, {
        name: name.trim(),
        limit: Math.round(limitNum * 100) / 100,
        closeDay,
        dueDay,
        flag,
        bank,
        color,
        annualFee: Math.round(annualFeeNum * 100) / 100,
        annualFeeMonth,
        ...(addPendingBenefits && !addBenefitsManual ? { cardBenefits: addPendingBenefits } : {}),
      });
      setModalOpen(false);
      setName('');
      setLimit('');
      setCloseDay(10);
      setDueDay(15);
      setFlag('Visa');
      setBank('Outros');
      setColor('#4F8CFF');
      setAnnualFee('');
      setAnnualFeeMonth(1);
      setAddBenefitsManual(false);
      setAddPendingBenefits(null);
      setAddBenefitsBadge(false);
    } catch (err) {
      if (err instanceof ValidationError) setError(err.errors.join('\n'));
      else setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar cartão.');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (card: Card) => {
    setEditCardId(card.id);
    setEditName(card.name);
    setEditLimit(String(card.limit ?? 0));
    setEditCloseDay(card.closeDay ?? 10);
    setEditDueDay(card.dueDay ?? 15);
    setEditFlag(card.flag ?? 'Visa');
    setEditBank((card as Card & { bank?: string }).bank ?? 'Outros');
    setEditColor(card.color ?? '#4F8CFF');
    setEditAnnualFee(String((card as Card & { annualFee?: number }).annualFee ?? ''));
    setEditAnnualFeeMonth((card as Card & { annualFeeMonth?: number }).annualFeeMonth ?? 1);
    setEditBenefitsManual(card.cardBenefits?.source === 'manual');
    setEditPendingBenefits(null);
    setEditBenefitsBadge(false);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || editCardId == null) return;
    const limitNum = parseFloat(editLimit.replace(',', '.')) || 0;
    const annualFeeNum = parseFloat(editAnnualFee.replace(',', '.')) || 0;
    setError(null);
    setBusy(true);
    try {
      await updateCard(user.uid, cards, editCardId, {
        name: editName.trim(),
        limit: Math.round(limitNum * 100) / 100,
        closeDay: editCloseDay,
        dueDay: editDueDay,
        flag: editFlag,
        bank: editBank,
        color: editColor,
        annualFee: Math.round(annualFeeNum * 100) / 100,
        annualFeeMonth: editAnnualFeeMonth,
        ...(editPendingBenefits && !editBenefitsManual ? { cardBenefits: editPendingBenefits } : {}),
      });
      setEditCardId(null);
    } catch (err) {
      if (err instanceof ValidationError) setError(err.errors.join('\n'));
      else setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar cartão.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCard = async () => {
    if (!user?.uid || deleteCardId == null) return;
    setBusy(true);
    try {
      await deleteCard(user.uid, cards, deleteCardId);
      setDeleteCardId(null);
      if (faturaCardId === deleteCardId) setFaturaCardId(null);
      if (lancarCardId === deleteCardId) setLancarCardId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setBusy(false);
    }
  };

  const handleLancarFatura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || lancarCardId == null || !lancarDesc.trim() || !lancarCat) return;
    const val = parseFloat(lancarVal.replace(',', '.')) || 0;
    if (val <= 0) return;
    setLancarBusy(true);
    setError(null);
    try {
      await addCardPurchase(user.uid, cards, entries, lancarCardId, {
        desc: lancarDesc.trim(),
        category: lancarCat,
        value: val,
        date: lancarDate,
        parcelas: lancarParcelas,
      });
      setLancarCardId(null);
      setLancarDesc('');
      setLancarCat('');
      setLancarVal('');
      setLancarParcelas(1);
      if (faturaCardId === lancarCardId) {
        setFaturaMonth(getBillingMonth(cards.find((c) => c.id === lancarCardId)!, lancarDate));
      }
    } catch (err) {
      if (err instanceof ValidationError) setError(err.errors.join('\n'));
      else setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar cartão.');
    } finally {
      setLancarBusy(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!user?.uid || !delConfirm) return;
    setError(null);
    try {
      await deleteCardPurchase(user.uid, cards, entries, delConfirm.cardId, delConfirm.purchaseId);
      setDelConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir compra. Tente novamente.');
    }
  };

  const applyCatalogEntry = (entry: CardBenefitsCatalogEntry) => {
    const b = entry.benefits;
    setBenefitsVipLounge(!!b.vipLounge);
    setBenefitsTravelInsurance(!!b.travelInsurance);
    setBenefitsPurchaseProtection(!!b.purchaseProtection);
    setBenefitsExtendedWarranty(!!b.extendedWarranty);
    setBenefitsConcierge(!!b.concierge);
    setBenefitsVipVisitsPerYear(b.vipVisitsPerYear != null ? String(b.vipVisitsPerYear) : '');
    setBenefitsVipNetwork(entry.vipNetworkHint ?? '');
    setBenefitsPointsProgram(entry.pointsProgramHint ?? '');
    setBenefitsCashbackPct('');
    setBenefitsNotes(entry.notesHint ?? '');
    setBenefitsCatalogId(entry.id);
    setBenefitsFromCatalog(true);
    setError(null);
  };

  const openBenefits = (card: Card) => {
    const b = card.cardBenefits ?? {};
    setBenefitsCardId(card.id);
    setBenefitsVipLounge(!!b.vipLounge);
    setBenefitsVipNetwork(b.vipNetwork ?? '');
    setBenefitsVipVisitsPerYear(b.vipVisitsPerYear != null ? String(b.vipVisitsPerYear) : '');
    setBenefitsTravelInsurance(!!b.travelInsurance);
    setBenefitsPurchaseProtection(!!b.purchaseProtection);
    setBenefitsExtendedWarranty(!!b.extendedWarranty);
    setBenefitsConcierge(!!b.concierge);
    setBenefitsPointsProgram(b.pointsProgram ?? '');
    setBenefitsCashbackPct(b.cashbackPct != null ? String(b.cashbackPct) : '');
    setBenefitsNotes(b.notes ?? '');
    setBenefitsFromCatalog(b.source === 'catalog');
    const rows = listCatalogByFlag(card.flag ?? 'Outros');
    const defaultRow =
      rows.find((r) => r.id.includes('intermediario')) ?? rows[1] ?? rows[0];
    setBenefitsCatalogId(defaultRow?.id ?? '');
    setError(null);
  };

  const applyPresetFromCurrentCard = () => {
    if (benefitsCardId == null) return;
    const card = cards.find((c) => c.id === benefitsCardId);
    if (!card) return;
    const rows = listCatalogByFlag(card.flag ?? 'Outros');
    const row =
      rows.find((r) => r.id.includes('intermediario')) ?? rows[Math.min(1, rows.length - 1)] ?? rows[0];
    if (row) applyCatalogEntry(row);
  };

  const saveBenefits = async () => {
    if (!user?.uid || benefitsCardId == null) return;
    setBenefitsBusy(true);
    setError(null);
    try {
      const vipVisitsNum = benefitsVipVisitsPerYear.trim() ? Number(benefitsVipVisitsPerYear) : undefined;
      const cashbackNum = benefitsCashbackPct.trim()
        ? Number(benefitsCashbackPct.replace(',', '.'))
        : undefined;
      const cardBenefits: CardBenefits = {
        vipLounge: benefitsVipLounge,
        vipNetwork: benefitsVipNetwork.trim() || undefined,
        vipVisitsPerYear: Number.isFinite(vipVisitsNum as number) ? vipVisitsNum : undefined,
        travelInsurance: benefitsTravelInsurance,
        purchaseProtection: benefitsPurchaseProtection,
        extendedWarranty: benefitsExtendedWarranty,
        concierge: benefitsConcierge,
        pointsProgram: benefitsPointsProgram.trim() || undefined,
        cashbackPct: Number.isFinite(cashbackNum as number) ? cashbackNum : undefined,
        notes: benefitsNotes.trim() || undefined,
        source: benefitsFromCatalog ? 'catalog' : 'manual',
        updatedAt: new Date().toISOString(),
      };
      await updateCard(user.uid, cards, benefitsCardId, { cardBenefits });
      setBenefitsCardId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar benefícios.');
    } finally {
      setBenefitsBusy(false);
    }
  };

  const parseImportItems = (raw: string, mode: 'csv' | 'ofx') => {
    const items: { desc: string; category: string; value: number; date: string; parcelas?: number }[] = [];
    if (mode === 'csv') {
      const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        throw new Error('Informe pelo menos uma linha de dados além do cabeçalho.');
      }
      const header = lines[0];
      const sep = header.includes(';') ? ';' : ',';
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(sep).map((c) => c.trim());
        const [dateRaw, descRaw, catRaw, valRaw, parcRaw] = cols;
        const date = dateRaw || new Date().toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const v = parseFloat((valRaw || '').replace(',', '.')) || 0;
        if (v <= 0) continue;
        const parcelas = parcRaw ? Number(parcRaw) || 1 : 1;
        items.push({
          date,
          desc: descRaw || 'Compra',
          category: catRaw || 'Outros',
          value: v,
          parcelas,
        });
      }
      return items;
    }
    const blocks = raw.split(/<STMTTRN>/i).slice(1);
    for (const b of blocks) {
      const dt = b.match(/<DTPOSTED>(\d{8})/i)?.[1];
      const amountRaw = b.match(/<TRNAMT>(-?\d+(?:[.,]\d+)?)/i)?.[1];
      const memo = b.match(/<MEMO>(.+)/i)?.[1]?.split(/\r?\n/)[0]?.trim();
      const name = b.match(/<NAME>(.+)/i)?.[1]?.split(/\r?\n/)[0]?.trim();
      if (!dt || !amountRaw) continue;
      const amount = Math.abs(parseFloat(amountRaw.replace(',', '.')) || 0);
      if (amount <= 0) continue;
      const date = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
      items.push({
        date,
        desc: memo || name || 'Compra importada',
        category: 'Outros',
        value: amount,
        parcelas: 1,
      });
    }
    return items;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <CreditModuleTabs />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold">Crédito · Cartões</h2>
          <p className="text-si-5 text-sm">Acompanhe faturas, limites e compras dos seus cartões</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setError(null); setImportOpen(true); setImportCardId(cards[0]?.id ?? null); }}
            disabled={cards.length === 0}
            className="bg-si-over-2 hover:bg-si-over-3 disabled:opacity-50 text-si-1 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border border-si-border-md"
          >
            <FileText className="w-4 h-4" /> Importar fatura
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setAddBenefitsManual(false);
              setAddPendingBenefits(null);
              setAddBenefitsBadge(false);
              setModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-si-1 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo cartão
          </button>
        </div>
      </div>

      <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-si-1">Resumo de crédito</h3>
            <p className="text-si-5 text-sm mt-1">
              Esta página fica focada na operação dos cartões. A visão consolidada de crédito está no Hub.
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${pressurePillClasses(financialProfile.credit.pressureLevel)}`}>
            pressão {financialProfile.credit.pressureLevel}
          </span>
        </div>

        <CreditKpiGrid
          items={[
            {
              label: 'Limite total',
              value: `R$ ${financialProfile.credit.totalCardLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              toneClassName: 'text-blue-400',
            },
            {
              label: 'Uso estimado',
              value: `${financialProfile.credit.cardUtilizationPct.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`,
            },
            {
              label: 'Faturas em 7 dias',
              value: `R$ ${financialProfile.credit.dueSoonAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
              toneClassName: 'text-amber-400',
            },
            {
              label: 'Obrigações abertas',
              value: String(creditObligations.filter((obligation) => obligation.status !== 'paga').length),
            },
          ]}
        />

        <div className="flex items-center gap-3 flex-wrap text-sm">
          <Link to="/credito/visao-geral" className="text-blue-400 hover:text-blue-300 underline">
            Abrir visão consolidada
          </Link>
          <Link to="/credito/emprestimos" className="text-si-4 hover:text-si-2 underline">
            Ver empréstimos e financiamentos
          </Link>
          <Link to="/consultor-ia" className="text-si-4 hover:text-si-2 underline">
            Pedir plano com IA
          </Link>
        </div>
      </section>

      {error && !modalOpen && editCardId == null && deleteCardId == null && benefitsCardId == null && lancarCardId == null && !importOpen && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-rose-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-3 text-rose-400/60 hover:text-rose-300 text-xs font-bold">Fechar</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<CreditCard className="w-7 h-7" />}
              title="Nenhum cartão cadastrado"
              description="Adicione seus cartões de crédito para acompanhar faturas, compras parceladas e controlar o uso do limite."
              actionLabel="+ Novo cartão"
              onAction={() => {
                setAddBenefitsManual(false);
                setAddPendingBenefits(null);
                setAddBenefitsBadge(false);
                setModalOpen(true);
              }}
            />
          </div>
        ) : (
          cards.map((card) => {
            const bm = getBillingMonth(card, new Date().toISOString().split('T')[0]);
            const used = (card.purchases ?? []).filter((p: CardPurchase) => p.billingMonth === bm).reduce((s: number, p: CardPurchase) => s + p.value, 0);
            const pctUsado = (card.limit ?? 0) > 0 ? Math.round((used / card.limit!) * 100) : 0;
            const diasFecha = getDiasParaFecha(card);
            return (
              <div key={card.id} className="flex flex-col gap-3">
                {/* ── Cartão visual realista ── */}
                <div className="w-full">
                  <CreditCardVisual
                    name={card.name || 'Cartão'}
                    limit={card.limit}
                    flag={card.flag ?? 'Visa'}
                    color={card.color}
                    currentBill={used}
                    size="full"
                    className="w-full"
                  />
                </div>

                {/* ── Info + ações ── */}
                <div className="bg-si-card rounded-2xl border border-si-border p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs text-si-5">
                        Fecha dia {card.closeDay} · Vence dia {card.dueDay}
                        {' · '}{(card as Card & { bank?: string }).bank || 'Banco não informado'}
                      </p>
                      <p className="text-sm font-bold text-si-1 mt-0.5">
                        Fatura: R$ {used.toFixed(2)} ({pctUsado}% de R$ {Number(card.limit ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })})
                        {diasFecha <= 7 && (
                          <span className="text-amber-400 ml-2 font-semibold">· Fecha em {diasFecha}d</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button type="button" onClick={() => openBenefits(card)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 text-xs font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Benefícios
                    </button>
                    <button type="button" onClick={() => { setLancarCardId(card.id); setLancarCat(lancarCat || userCats[0]); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 text-xs font-medium">
                      <Plus className="w-3.5 h-3.5" /> Lançar
                    </button>
                    <button type="button" onClick={() => { setFaturaCardId(card.id); setFaturaMonth(getBillingMonth(card, new Date().toISOString().split('T')[0])); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 text-xs font-medium">
                      <FileText className="w-3.5 h-3.5" /> Fatura
                    </button>
                    <button type="button" onClick={() => openEdit(card)}
                      className="p-1.5 rounded-lg hover:bg-si-over-3 text-si-4 hover:text-si-1" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => { setDeleteCardId(card.id); setError(null); }}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-si-4 hover:text-rose-400" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {!!card.cardBenefits && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {card.cardBenefits.vipLounge && <span className="px-2 py-0.5 rounded-md text-[11px] border border-si-border-md text-si-3 bg-si-over-2">Sala VIP</span>}
                      {card.cardBenefits.travelInsurance && <span className="px-2 py-0.5 rounded-md text-[11px] border border-si-border-md text-si-3 bg-si-over-2">Seguro viagem</span>}
                      {card.cardBenefits.purchaseProtection && <span className="px-2 py-0.5 rounded-md text-[11px] border border-si-border-md text-si-3 bg-si-over-2">Proteção</span>}
                      {card.cardBenefits.pointsProgram && <span className="px-2 py-0.5 rounded-md text-[11px] border border-si-border-md text-si-3 bg-si-over-2">Pontos: {card.cardBenefits.pointsProgram}</span>}
                      {card.cardBenefits.cashbackPct != null && <span className="px-2 py-0.5 rounded-md text-[11px] border border-si-border-md text-si-3 bg-si-over-2">Cashback {card.cardBenefits.cashbackPct}%</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {cards.length > 0 && (
        <section className="bg-si-card rounded-2xl border border-si-border p-6">
          <h3 className="font-semibold text-si-1 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Detalhe da fatura
          </h3>
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label htmlFor="fat-card-select" className="block text-xs text-si-5 mb-1">Cartão</label>
              <select
                id="fat-card-select"
                aria-label="Cartão para ver fatura"
                value={faturaCardId ?? ''}
                onChange={(e) => { setFaturaCardId(e.target.value ? Number(e.target.value) : null); }}
                className="px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm"
              >
                <option value="">Selecione</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fat-month-select" className="block text-xs text-si-5 mb-1">Mês</label>
              <select
                id="fat-month-select"
                aria-label="Mês da fatura"
                value={faturaMonth}
                onChange={(e) => setFaturaMonth(e.target.value)}
                className="px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm"
              >
                {availableMonths.map((ym) => {
                  const [y, m] = ym.split('-');
                  return (
                    <option key={ym} value={ym}>
                      {MESES[Number(m) - 1]} {y}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          {faturaCard && (
            <div className="rounded-xl bg-si-bg border border-si-border overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-si-border">
                <div className="text-center">
                  <div className="text-xs text-si-5">Total da fatura</div>
                  <div className="text-lg font-bold text-blue-400">R$ {faturaTotal.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-si-5">Itens</div>
                  <div className="text-lg font-bold text-si-2">{faturaPurchases.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-si-5">Limite disponível</div>
                  <div className="text-lg font-bold text-si-2">
                    R$ {(Number(faturaCard.limit ?? 0) - faturaTotal).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {faturaPurchases.length === 0 ? (
                  <p className="text-si-5 text-sm text-center py-8">Nenhuma compra neste mês.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-si-5 border-b border-si-border">
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3 text-right">Valor</th>
                        <th className="p-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {faturaPurchases.map((p) => (
                        <tr key={p.id} className="border-b border-si-border hover:bg-si-over-2">
                          <td className="p-3 text-si-3">
                            {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3 text-si-2">{p.desc}</td>
                          <td className="p-3 text-si-4">{p.category ?? '—'}</td>
                          <td className="p-3 text-right font-medium text-si-1">R$ {p.value.toFixed(2)}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => setDelConfirm({ cardId: faturaCard.id, purchaseId: p.purchaseId ?? p.id })}
                              className="p-1.5 rounded-lg text-si-5 hover:bg-rose-500/20 hover:text-rose-400"
                              aria-label="Excluir compra"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <Modal
        open={lancarCardId != null}
        onClose={() => { setLancarCardId(null); setLancarDesc(''); setLancarVal(''); setLancarParcelas(1); }}
        title="Lançar na fatura"
      >
        <form onSubmit={handleLancarFatura} className="space-y-4">
          {lancarCardId != null && (
            <>
              <div>
                <label className="block text-xs text-si-5 mb-1">Descrição</label>
                <input
                  type="text"
                  value={lancarDesc}
                  onChange={(e) => setLancarDesc(e.target.value)}
                  placeholder="Ex: Supermercado"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="lancar-cat" className="block text-xs text-si-5 mb-1">Categoria</label>
                <select
                  id="lancar-cat"
                  aria-label="Categoria da compra"
                  value={lancarCat}
                  onChange={(e) => setLancarCat(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                >
                  {userCats.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-si-5 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lancarVal}
                    onChange={(e) => setLancarVal(e.target.value.replace(/[^0-9,.-]/, ''))}
                    placeholder="0,00"
                    className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="lancar-parcelas" className="block text-xs text-si-5 mb-1">Parcelas</label>
                  <select
                    id="lancar-parcelas"
                    aria-label="Número de parcelas"
                    value={lancarParcelas}
                    onChange={(e) => setLancarParcelas(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="lancar-date" className="block text-xs text-si-5 mb-1">Data da compra</label>
                <input
                  id="lancar-date"
                  type="date"
                  aria-label="Data da compra"
                  title="Data da compra"
                  value={lancarDate}
                  onChange={(e) => setLancarDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={lancarBusy}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm"
                >
                  {lancarBusy ? 'Salvando…' : 'Lançar'}
                </button>
                <button
                  type="button"
                  onClick={() => setLancarCardId(null)}
                  className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => { if (!importBusy) { setImportOpen(false); setImportText(''); } }}
        title="Importar fatura"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!user?.uid || importCardId == null) return;
            const raw = importText.trim();
            if (!raw) return;
            setError(null);
            setImportBusy(true);
            try {
              const items = parseImportItems(raw, importMode);
              if (!items.length) {
                throw new Error(importMode === 'csv'
                  ? 'Nenhuma linha válida encontrada. Use o formato: Data,Descrição,Categoria,Valor,Parcelas.'
                  : 'Nenhuma transação OFX válida encontrada.');
              }
              await importCardPurchases(user.uid, cards, entries, importCardId, items);
              setImportOpen(false);
              setImportText('');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Erro ao importar fatura.');
            } finally {
              setImportBusy(false);
            }
          }}
          className="space-y-4"
        >
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="import-card" className="block text-xs font-medium text-si-5 mb-1">Cartão de destino</label>
              <select
                id="import-card"
                value={importCardId ?? ''}
                onChange={(e) => setImportCardId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="import-mode" className="block text-xs font-medium text-si-5 mb-1">Formato</label>
              <select
                id="import-mode"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'csv' | 'ofx')}
                className="w-full px-3 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="csv">CSV</option>
                <option value="ofx">OFX</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <input
                ref={importFileRef}
                type="file"
                accept={importMode === 'csv' ? '.csv,text/csv' : '.ofx,application/x-ofx,text/plain'}
                className="hidden"
                aria-label={`Selecionar arquivo ${importMode.toUpperCase()} para importar fatura`}
                title={`Selecionar arquivo ${importMode.toUpperCase()} para importar fatura`}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = (ev) => setImportText(String(ev.target?.result ?? ''));
                  r.readAsText(f, 'UTF-8');
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="px-3 py-2 rounded-lg bg-si-over-2 border border-si-border-md text-si-3 text-sm hover:bg-si-over-3"
              >
                Carregar arquivo {importMode.toUpperCase()}
              </button>
            </div>
            <div className="text-xs text-si-5">
              {importMode === 'csv' ? (
                <>
                  <p className="font-semibold mb-1">Formato esperado (CSV simples):</p>
                  <p>Data,Descrição,Categoria,Valor,Parcelas</p>
                  <p className="mt-1">Ex: 2026-03-10,Supermercado,Alimentação,350.90,1</p>
                </>
              ) : (
                <>
                  <p className="font-semibold mb-1">Formato esperado (OFX):</p>
                  <p>Arquivo OFX contendo blocos `&lt;STMTTRN&gt;` com `&lt;DTPOSTED&gt;` e `&lt;TRNAMT&gt;`.</p>
                  <p className="mt-1">Descrição usa `&lt;MEMO&gt;` ou `&lt;NAME&gt;` quando disponíveis.</p>
                </>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="import-text" className="block text-xs font-medium text-si-5 mb-1">
              {importMode === 'csv' ? 'Cole aqui as linhas da fatura' : 'Cole aqui o conteúdo OFX'}
            </label>
            <textarea
              id="import-text"
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500"
              placeholder={importMode === 'csv'
                ? 'Data,Descrição,Categoria,Valor,Parcelas\n2026-03-10,Supermercado,Alimentação,350.90,1'
                : '<STMTTRN>\n<DTPOSTED>20260310\n<TRNAMT>-350.90\n<MEMO>SUPERMERCADO'}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={importBusy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-si-1 font-bold text-sm disabled:opacity-50"
            >
              {importBusy ? 'Importando…' : 'Importar'}
            </button>
            <button
              type="button"
              onClick={() => { if (!importBusy) { setImportOpen(false); setImportText(''); } }}
              className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={delConfirm != null}
        onClose={() => setDelConfirm(null)}
        title="Excluir compra"
      >
        <p className="text-si-4 text-sm mb-4">
          Remover esta compra da fatura? Todas as parcelas vinculadas serão excluídas.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDeletePurchase}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-si-1 font-medium text-sm"
          >
            Excluir
          </button>
          <button
            type="button"
            onClick={() => setDelConfirm(null)}
            className="px-6 py-2.5 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3"
          >
            Cancelar
          </button>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo cartão">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="card-name" className="block text-xs font-medium text-si-5 mb-1">Nome do cartão</label>
            <input
              id="card-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={tryInferAddBenefits}
              placeholder="Ex: Nubank, Itaú"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="card-limit" className="block text-xs font-medium text-si-5 mb-1">Limite (R$)</label>
            <input
              id="card-limit"
              type="text"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="card-close" className="block text-xs font-medium text-si-5 mb-1">Dia fechamento</label>
              <select
                id="card-close"
                value={closeDay}
                onChange={(e) => setCloseDay(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="card-due" className="block text-xs font-medium text-si-5 mb-1">Dia vencimento</label>
              <select
                id="card-due"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="card-flag" className="block text-xs font-medium text-si-5 mb-1">Bandeira</label>
            <select
              id="card-flag"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              onBlur={tryInferAddBenefits}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
            >
              {BANDEIRAS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {addBenefitsBadge && !addBenefitsManual && (
              <div className="mt-2 space-y-1">
                <span className="text-amber-400 text-[10px] tracking-[0.18em] uppercase block">
                  Benefícios sugeridos pela bandeira — confirme no app do banco
                </span>
                <button
                  type="button"
                  className="text-si-4 text-xs underline"
                  onClick={() => {
                    setAddBenefitsManual(true);
                    setAddBenefitsBadge(false);
                    setAddPendingBenefits(null);
                  }}
                >
                  Prefiro preencher manualmente
                </button>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="card-bank" className="block text-xs font-medium text-si-5 mb-1">Banco</label>
            <select
              id="card-bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
            >
              {BANCOS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="card-annual-fee" className="block text-xs font-medium text-si-5 mb-1">Anuidade (R$)</label>
              <input
                id="card-annual-fee"
                type="text"
                inputMode="decimal"
                value={annualFee}
                onChange={(e) => setAnnualFee(e.target.value.replace(/[^0-9,.-]/g, ''))}
                placeholder="0,00"
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="card-annual-fee-month" className="block text-xs font-medium text-si-5 mb-1">Mês da cobrança</label>
              <select
                id="card-annual-fee-month"
                value={annualFeeMonth}
                onChange={(e) => setAnnualFeeMonth(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              >
                {MESES.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-si-5 mb-1">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES_CARTAO.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="w-8 h-8 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: c.value, borderColor: color === c.value ? '#fff' : 'transparent' }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm"
            >
              {busy ? 'Salvando…' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={editCardId != null} onClose={() => setEditCardId(null)} title="Editar cartão">
        {editCardId != null && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="edit-card-name" className="block text-xs font-medium text-si-5 mb-1">Nome</label>
              <input
                id="edit-card-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={tryInferEditBenefits}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-card-limit" className="block text-xs font-medium text-si-5 mb-1">Limite (R$)</label>
              <input
                id="edit-card-limit"
                type="text"
                inputMode="decimal"
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-card-close" className="block text-xs font-medium text-si-5 mb-1">Dia fechamento</label>
                <select
                  id="edit-card-close"
                  value={editCloseDay}
                  onChange={(e) => setEditCloseDay(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-card-due" className="block text-xs font-medium text-si-5 mb-1">Dia vencimento</label>
                <select
                  id="edit-card-due"
                  value={editDueDay}
                  onChange={(e) => setEditDueDay(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="edit-card-flag" className="block text-xs font-medium text-si-5 mb-1">Bandeira</label>
              <select
                id="edit-card-flag"
                value={editFlag}
                onChange={(e) => setEditFlag(e.target.value)}
                onBlur={tryInferEditBenefits}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              >
                {BANDEIRAS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              {editBenefitsBadge && !editBenefitsManual && (
                <div className="mt-2 space-y-1">
                  <span className="text-amber-400 text-[10px] tracking-[0.18em] uppercase block">
                    Benefícios sugeridos pela bandeira — confirme no app do banco
                  </span>
                  <button
                    type="button"
                    className="text-si-4 text-xs underline"
                    onClick={() => {
                      setEditBenefitsManual(true);
                      setEditBenefitsBadge(false);
                      setEditPendingBenefits(null);
                    }}
                  >
                    Prefiro preencher manualmente
                  </button>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="edit-card-bank" className="block text-xs font-medium text-si-5 mb-1">Banco</label>
              <select
                id="edit-card-bank"
                value={editBank}
                onChange={(e) => setEditBank(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
              >
                {BANCOS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-card-annual-fee" className="block text-xs font-medium text-si-5 mb-1">Anuidade (R$)</label>
                <input
                  id="edit-card-annual-fee"
                  type="text"
                  inputMode="decimal"
                  value={editAnnualFee}
                  onChange={(e) => setEditAnnualFee(e.target.value.replace(/[^0-9,.-]/g, ''))}
                  placeholder="0,00"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="edit-card-annual-fee-month" className="block text-xs font-medium text-si-5 mb-1">Mês da cobrança</label>
                <select
                  id="edit-card-annual-fee-month"
                  value={editAnnualFeeMonth}
                  onChange={(e) => setEditAnnualFeeMonth(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
                >
                  {MESES.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-si-5 mb-1">Cor</label>
              <div className="flex flex-wrap gap-2">
                {CORES_CARTAO.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditColor(c.value)}
                    className="w-8 h-8 rounded-full border-2 border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: c.value, borderColor: editColor === c.value ? '#fff' : 'transparent' }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditCardId(null)} className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={deleteCardId != null} onClose={() => setDeleteCardId(null)} title="Excluir cartão">
        {deleteCardId != null && (
          <div className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-rose-400 text-sm">
                {error}
              </div>
            )}
            <p className="text-si-3">
              Excluir este cartão? As compras e lançamentos já registrados na fatura permanecem; apenas o cartão deixará de aparecer na lista.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeleteCard}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-si-1 font-bold text-sm"
              >
                {busy ? 'Excluindo…' : 'Excluir'}
              </button>
              <button type="button" onClick={() => setDeleteCardId(null)} className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={benefitsCardId != null}
        onClose={() => { if (!benefitsBusy) setBenefitsCardId(null); }}
        title="Benefícios do cartão"
      >
        {benefitsCardId != null && (
          <div className="space-y-4">
            <p className="text-xs text-si-5">
              Preencha o que você tem confirmado no cartão. Esse bloco será usado pelo Hub de Crédito e pelo consultor.
            </p>
            {catalogRowsForModal.length > 0 && (
              <div className="rounded-xl border border-si-border-md bg-si-over-1 p-3 space-y-3">
                <p className="text-[10px] font-bold text-si-5 uppercase tracking-[0.18em]">Catálogo de referência</p>
                <p className="text-xs text-si-5 leading-relaxed">
                  Perfis típicos para bandeira <span className="text-si-3">{benefitsModalCard?.flag ?? '—'}</span>.
                  São referências de mercado — confira sempre no app do banco antes de confiar em 100%.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1 min-w-0">
                    <label htmlFor="benefits-catalog-tier" className="block text-xs text-si-5 mb-1">
                      Perfil do catálogo
                    </label>
                    <select
                      id="benefits-catalog-tier"
                      value={resolvedBenefitsCatalogId}
                      onChange={(e) => setBenefitsCatalogId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-si-2 text-sm"
                    >
                      {catalogRowsForModal.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.tierLabel} — {row.shortLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const entry = resolvedBenefitsCatalogId
                        ? getCatalogEntry(resolvedBenefitsCatalogId)
                        : undefined;
                      if (entry) applyCatalogEntry(entry);
                    }}
                    className="px-4 py-2 rounded-lg bg-si-over-3 border border-si-border-md text-si-2 text-sm font-medium hover:bg-si-over-4 shrink-0"
                  >
                    Aplicar perfil
                  </button>
                </div>
                {selectedCatalogPreview && (
                  <p className="text-xs text-si-4 leading-relaxed border-t border-si-border pt-2">
                    {selectedCatalogPreview.shortLabel}. {selectedCatalogPreview.notesHint ?? ''}
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={applyPresetFromCurrentCard}
              className="px-3 py-2 rounded-lg bg-si-over-2 border border-si-border-md text-si-3 text-xs hover:bg-si-over-3"
            >
              Sugestão rápida (perfil intermediário)
            </button>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Sala VIP', benefitsVipLounge, setBenefitsVipLounge],
                ['Seguro viagem', benefitsTravelInsurance, setBenefitsTravelInsurance],
                ['Proteção de compra', benefitsPurchaseProtection, setBenefitsPurchaseProtection],
                ['Garantia estendida', benefitsExtendedWarranty, setBenefitsExtendedWarranty],
                ['Concierge', benefitsConcierge, setBenefitsConcierge],
              ].map(([label, value, setValue]) => (
                <label key={String(label)} className="flex items-center gap-2 text-sm text-si-3">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => {
                      touchManualBenefits();
                      (setValue as (v: boolean) => void)(e.target.checked);
                    }}
                    className="w-4 h-4 accent-blue-500"
                  />
                  {String(label)}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-si-5 mb-1">Rede Sala VIP</label>
                <input
                  type="text"
                  value={benefitsVipNetwork}
                  onChange={(e) => {
                    touchManualBenefits();
                    setBenefitsVipNetwork(e.target.value);
                  }}
                  placeholder="Ex: LoungeKey, DragonPass"
                  className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-si-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-si-5 mb-1">Visitas/ano</label>
                <input
                  type="number"
                  min="0"
                  value={benefitsVipVisitsPerYear}
                  onChange={(e) => {
                    touchManualBenefits();
                    setBenefitsVipVisitsPerYear(e.target.value);
                  }}
                  placeholder="Ex: 4"
                  className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-si-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-si-5 mb-1">Programa de pontos</label>
                <input
                  type="text"
                  value={benefitsPointsProgram}
                  onChange={(e) => {
                    touchManualBenefits();
                    setBenefitsPointsProgram(e.target.value);
                  }}
                  placeholder="Ex: Livelo, Esfera, TudoAzul"
                  className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-si-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-si-5 mb-1">Cashback (%)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={benefitsCashbackPct}
                  onChange={(e) => {
                    touchManualBenefits();
                    setBenefitsCashbackPct(e.target.value.replace(/[^0-9,.-]/g, ''));
                  }}
                  placeholder="Ex: 1,5"
                  className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-si-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-si-5 mb-1">Observações</label>
              <textarea
                value={benefitsNotes}
                onChange={(e) => {
                  touchManualBenefits();
                  setBenefitsNotes(e.target.value);
                }}
                rows={3}
                placeholder="Regras de uso, gasto mínimo, validade dos benefícios..."
                className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-si-2 text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={saveBenefits}
                disabled={benefitsBusy}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm"
              >
                {benefitsBusy ? 'Salvando...' : 'Salvar benefícios'}
              </button>
              <button
                type="button"
                onClick={() => setBenefitsCardId(null)}
                className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
