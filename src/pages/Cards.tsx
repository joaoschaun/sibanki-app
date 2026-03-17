import { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import {
  addCard,
  addCardPurchase,
  deleteCardPurchase,
  updateCard,
  deleteCard,
  importCardPurchases,
  getBillingMonth,
} from '../services/persistUserData';
import { Modal } from '../components/ui/Modal';
import { CreditCard, Plus, FileText, Trash2, Pencil } from 'lucide-react';
import type { Card, CardPurchase } from '../types/userData';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outros'];
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
  const { user } = useAuth();
  const { cards, entries, categories, loading } = useFinancialData(user?.uid);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [closeDay, setCloseDay] = useState(10);
  const [dueDay, setDueDay] = useState(15);
  const [flag, setFlag] = useState('Visa');
  const [color, setColor] = useState('#4F8CFF');
  const [editCardId, setEditCardId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [editCloseDay, setEditCloseDay] = useState(10);
  const [editDueDay, setEditDueDay] = useState(15);
  const [editFlag, setEditFlag] = useState('Visa');
  const [editColor, setEditColor] = useState('#4F8CFF');
  const [deleteCardId, setDeleteCardId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importCardId, setImportCardId] = useState<number | null>(null);
  const [importText, setImportText] = useState('');
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !name.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const limitNum = parseFloat(limit.replace(',', '.')) || 0;
      await addCard(user.uid, cards, {
        name: name.trim(),
        limit: Math.round(limitNum * 100) / 100,
        closeDay,
        dueDay,
        flag,
        color,
      });
      setModalOpen(false);
      setName('');
      setLimit('');
      setCloseDay(10);
      setDueDay(15);
      setFlag('Visa');
      setColor('#4F8CFF');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar cartão.');
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
    setEditColor(card.color ?? '#4F8CFF');
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || editCardId == null) return;
    const limitNum = parseFloat(editLimit.replace(',', '.')) || 0;
    setError(null);
    setBusy(true);
    try {
      await updateCard(user.uid, cards, editCardId, {
        name: editName.trim(),
        limit: Math.round(limitNum * 100) / 100,
        closeDay: editCloseDay,
        dueDay: editDueDay,
        flag: editFlag,
        color: editColor,
      });
      setEditCardId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
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
    } finally {
      setLancarBusy(false);
    }
  };

  const handleDeletePurchase = async () => {
    if (!user?.uid || !delConfirm) return;
    await deleteCardPurchase(user.uid, cards, entries, delConfirm.cardId, delConfirm.purchaseId);
    setDelConfirm(null);
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold">Cartões</h2>
          <p className="text-zinc-500 text-sm">Faturas e limites – mesmo dados do app atual</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => { setError(null); setImportOpen(true); setImportCardId(cards[0]?.id ?? null); }}
            disabled={cards.length === 0}
            className="bg-white/5 hover:bg-white/10 disabled:opacity-50 text-zinc-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 border border-white/10"
          >
            <FileText className="w-4 h-4" /> Importar fatura
          </button>
          <button
            type="button"
            onClick={() => { setError(null); setModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Novo cartão
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.length === 0 ? (
          <div className="col-span-full bg-[#0a0f18] rounded-2xl border border-white/5 p-12 text-center text-zinc-500">
            Nenhum cartão cadastrado. Clique em &quot;Novo cartão&quot; para adicionar.
          </div>
        ) : (
          cards.map((card) => {
            const bm = getBillingMonth(card, new Date().toISOString().split('T')[0]);
            const used = (card.purchases ?? []).filter((p: CardPurchase) => p.billingMonth === bm).reduce((s: number, p: CardPurchase) => s + p.value, 0);
            const pctUsado = (card.limit ?? 0) > 0 ? Math.round((used / card.limit!) * 100) : 0;
            const diasFecha = getDiasParaFecha(card);
            return (
              <div
                key={card.id}
                className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="p-3 rounded-xl shrink-0"
                    style={{
                      backgroundColor: card.color ? `${card.color}20` : 'rgba(59, 130, 246, 0.2)',
                      color: card.color || '#60a5fa',
                    }}
                  >
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-zinc-100 truncate">{card.name || 'Cartão'}</h3>
                    <p className="text-xs text-zinc-500">
                      Fecha dia {card.closeDay} · Vence dia {card.dueDay}
                    </p>
                    <p className="text-sm font-bold text-zinc-300 mt-1">
                      Limite: R$ {Number(card.limit ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-zinc-500">
                    Fatura atual: R$ {used.toFixed(2)} ({pctUsado}% usado)
                    {diasFecha <= 7 && (
                      <span className="text-amber-400 ml-1"> · Fecha em {diasFecha} dia(s)</span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => { setLancarCardId(card.id); setLancarCat(lancarCat || userCats[0]); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-zinc-200 text-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Lançar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFaturaCardId(card.id); setFaturaMonth(getBillingMonth(card, new Date().toISOString().split('T')[0])); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-zinc-200 text-sm"
                    >
                      <FileText className="w-3.5 h-3.5" /> Fatura
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(card)}
                      className="p-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white"
                      title="Editar cartão"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDeleteCardId(card.id); setError(null); }}
                      className="p-2 rounded-lg hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400"
                      title="Excluir cartão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {cards.length > 0 && (
        <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
          <h3 className="font-semibold text-zinc-100 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Detalhe da fatura
          </h3>
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label htmlFor="fat-card-select" className="block text-xs text-zinc-500 mb-1">Cartão</label>
              <select
                id="fat-card-select"
                aria-label="Cartão para ver fatura"
                value={faturaCardId ?? ''}
                onChange={(e) => { setFaturaCardId(e.target.value ? Number(e.target.value) : null); }}
                className="px-3 py-2 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 text-sm"
              >
                <option value="">Selecione</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fat-month-select" className="block text-xs text-zinc-500 mb-1">Mês</label>
              <select
                id="fat-month-select"
                aria-label="Mês da fatura"
                value={faturaMonth}
                onChange={(e) => setFaturaMonth(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 text-sm"
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
            <div className="rounded-xl bg-[#05080d] border border-white/5 overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-white/5">
                <div className="text-center">
                  <div className="text-xs text-zinc-500">Total da fatura</div>
                  <div className="text-lg font-bold text-blue-400">R$ {faturaTotal.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-zinc-500">Itens</div>
                  <div className="text-lg font-bold text-zinc-200">{faturaPurchases.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-zinc-500">Limite disponível</div>
                  <div className="text-lg font-bold text-zinc-200">
                    R$ {(Number(faturaCard.limit ?? 0) - faturaTotal).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {faturaPurchases.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-8">Nenhuma compra neste mês.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500 border-b border-white/5">
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3 text-right">Valor</th>
                        <th className="p-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {faturaPurchases.map((p) => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="p-3 text-zinc-300">
                            {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="p-3 text-zinc-200">{p.desc}</td>
                          <td className="p-3 text-zinc-400">{p.category ?? '—'}</td>
                          <td className="p-3 text-right font-medium text-zinc-100">R$ {p.value.toFixed(2)}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => setDelConfirm({ cardId: faturaCard.id, purchaseId: p.purchaseId ?? p.id })}
                              className="p-1.5 rounded-lg text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400"
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
                <label className="block text-xs text-zinc-500 mb-1">Descrição</label>
                <input
                  type="text"
                  value={lancarDesc}
                  onChange={(e) => setLancarDesc(e.target.value)}
                  placeholder="Ex: Supermercado"
                  className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="lancar-cat" className="block text-xs text-zinc-500 mb-1">Categoria</label>
                <select
                  id="lancar-cat"
                  aria-label="Categoria da compra"
                  value={lancarCat}
                  onChange={(e) => setLancarCat(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {userCats.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lancarVal}
                    onChange={(e) => setLancarVal(e.target.value.replace(/[^0-9,.-]/, ''))}
                    placeholder="0,00"
                    className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="lancar-parcelas" className="block text-xs text-zinc-500 mb-1">Parcelas</label>
                  <select
                    id="lancar-parcelas"
                    aria-label="Número de parcelas"
                    value={lancarParcelas}
                    onChange={(e) => setLancarParcelas(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                      <option key={n} value={n}>{n}x</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="lancar-date" className="block text-xs text-zinc-500 mb-1">Data da compra</label>
                <input
                  id="lancar-date"
                  type="date"
                  aria-label="Data da compra"
                  title="Data da compra"
                  value={lancarDate}
                  onChange={(e) => setLancarDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={lancarBusy}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm"
                >
                  {lancarBusy ? 'Salvando…' : 'Lançar'}
                </button>
                <button
                  type="button"
                  onClick={() => setLancarCardId(null)}
                  className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10"
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
              const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
              if (lines.length < 2) {
                throw new Error('Informe pelo menos uma linha de dados além do cabeçalho.');
              }
              const header = lines[0];
              const sep = header.includes(';') ? ';' : ',';
              const items: { desc: string; category: string; value: number; date: string; parcelas?: number }[] = [];
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
              if (!items.length) {
                throw new Error('Nenhuma linha válida encontrada. Use o formato: Data,Descrição,Categoria,Valor,Parcelas.');
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
              <label htmlFor="import-card" className="block text-xs font-medium text-zinc-500 mb-1">Cartão de destino</label>
              <select
                id="import-card"
                value={importCardId ?? ''}
                onChange={(e) => setImportCardId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-zinc-500">
              <p className="font-semibold mb-1">Formato esperado (CSV simples):</p>
              <p>Data,Descrição,Categoria,Valor,Parcelas</p>
              <p className="mt-1">Ex: 2026-03-10,Supermercado,Alimentação,350.90,1</p>
            </div>
          </div>
          <div>
            <label htmlFor="import-text" className="block text-xs font-medium text-zinc-500 mb-1">Cole aqui as linhas da fatura</label>
            <textarea
              id="import-text"
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 text-sm focus:outline-none focus:border-blue-500"
              placeholder={'Data,Descrição,Categoria,Valor,Parcelas\n2026-03-10,Supermercado,Alimentação,350.90,1'}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={importBusy}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50"
            >
              {importBusy ? 'Importando…' : 'Importar'}
            </button>
            <button
              type="button"
              onClick={() => { if (!importBusy) { setImportOpen(false); setImportText(''); } }}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10"
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
        <p className="text-zinc-400 text-sm mb-4">
          Remover esta compra da fatura? Todas as parcelas vinculadas serão excluídas.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleDeletePurchase}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm"
          >
            Excluir
          </button>
          <button
            type="button"
            onClick={() => setDelConfirm(null)}
            className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10"
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
            <label htmlFor="card-name" className="block text-xs font-medium text-zinc-500 mb-1">Nome do cartão</label>
            <input
              id="card-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Itaú"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="card-limit" className="block text-xs font-medium text-zinc-500 mb-1">Limite (R$)</label>
            <input
              id="card-limit"
              type="text"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value.replace(/[^0-9,.-]/, ''))}
              placeholder="0,00"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="card-close" className="block text-xs font-medium text-zinc-500 mb-1">Dia fechamento</label>
              <select
                id="card-close"
                value={closeDay}
                onChange={(e) => setCloseDay(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="card-due" className="block text-xs font-medium text-zinc-500 mb-1">Dia vencimento</label>
              <select
                id="card-due"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="card-flag" className="block text-xs font-medium text-zinc-500 mb-1">Bandeira</label>
            <select
              id="card-flag"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              {BANDEIRAS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Cor</label>
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
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm"
            >
              {busy ? 'Salvando…' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10"
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
              <label htmlFor="edit-card-name" className="block text-xs font-medium text-zinc-500 mb-1">Nome</label>
              <input
                id="edit-card-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="edit-card-limit" className="block text-xs font-medium text-zinc-500 mb-1">Limite (R$)</label>
              <input
                id="edit-card-limit"
                type="text"
                inputMode="decimal"
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value.replace(/[^0-9,.-]/, ''))}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-card-close" className="block text-xs font-medium text-zinc-500 mb-1">Dia fechamento</label>
                <select
                  id="edit-card-close"
                  value={editCloseDay}
                  onChange={(e) => setEditCloseDay(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="edit-card-due" className="block text-xs font-medium text-zinc-500 mb-1">Dia vencimento</label>
                <select
                  id="edit-card-due"
                  value={editDueDay}
                  onChange={(e) => setEditDueDay(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="edit-card-flag" className="block text-xs font-medium text-zinc-500 mb-1">Bandeira</label>
              <select
                id="edit-card-flag"
                value={editFlag}
                onChange={(e) => setEditFlag(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 focus:outline-none focus:border-blue-500"
              >
                {BANDEIRAS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Cor</label>
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
              <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm">
                {busy ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditCardId(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
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
            <p className="text-zinc-300">
              Excluir este cartão? As compras e lançamentos já registrados na fatura permanecem; apenas o cartão deixará de aparecer na lista.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeleteCard}
                disabled={busy}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm"
              >
                {busy ? 'Excluindo…' : 'Excluir'}
              </button>
              <button type="button" onClick={() => setDeleteCardId(null)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
