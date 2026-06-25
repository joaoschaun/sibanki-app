import { useState, useEffect } from 'react';
import { Coins, CheckCircle, Search } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { fnsUS, fnsBR } from '../../firebase';

interface AdminUser {
  id: string;
  email: string;
  sibcoinBalance?: number;
}
interface AdminData {
  users: AdminUser[];
}

export default function AdminSibcoin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const getData = httpsCallable<unknown, AdminData>(fnsUS, 'adminGetData');
        const res = await getData({});
        if (active) setUsers(res.data?.users || []);
      } catch (e) {
        console.error('[AdminSibcoin] fetch users', e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const amt = parseInt(amount, 10);
    if (!cleanEmail) {
      showToast('Digite o e-mail', false);
      return;
    }
    if (!amt || amt <= 0) {
      showToast('Quantidade deve ser um número positivo', false);
      return;
    }
    const target = users.find((u) => (u.email || '').toLowerCase() === cleanEmail);
    if (!target) {
      showToast('Usuário não encontrado na base carregada', false);
      return;
    }
    setSubmitting(true);
    try {
      const credit = httpsCallable<{ targetUid: string; amount: number; description: string }, { success: boolean }>(
        fnsBR,
        'adminCreditSibcoin',
      );
      const res = await credit({
        targetUid: target.id,
        amount: amt,
        description: description.trim() || 'Crédito administrativo',
      });
      if (res.data?.success) {
        showToast(`+${amt} SibCoins creditados para ${cleanEmail}`, true);
        setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, sibcoinBalance: (u.sibcoinBalance || 0) + amt } : u)));
        setAmount('');
        setDescription('');
      } else {
        showToast('Resposta inesperada da função', false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao creditar', false);
    } finally {
      setSubmitting(false);
    }
  };

  const match = users.find((u) => (u.email || '').toLowerCase() === email.trim().toLowerCase());

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">SIBCOIN — CRÉDITO MANUAL</h1>
        <p className="text-xs text-si-4 font-medium mt-1">
          Credite SibCoins na conta de um usuário. Chama adminCreditSibcoin (transação atômica + histórico + auditoria), nunca grava saldo direto.
        </p>
      </div>

      <div className="bg-si-card border border-si-border-md rounded-xl p-5">
        <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5 mb-4">
          <Coins className="w-4 h-4 text-amber-500" /> Creditar SibCoins
        </h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">E-mail do usuário</label>
            <input
              type="email"
              required
              placeholder="usuario@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">Quantidade (SC)</label>
            <input
              type="number"
              min={1}
              step={1}
              required
              placeholder="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.15em] uppercase text-si-1 transition-all disabled:opacity-50"
          >
            {submitting ? 'Creditando...' : 'Creditar'}
          </button>
          <div className="space-y-2 md:col-span-3">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">Motivo (aparece no histórico do usuário)</label>
            <input
              type="text"
              placeholder="Bônus de apoiador, correção, campanha…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
            />
          </div>
        </form>

        {email.trim() && (
          <div className="mt-4 text-[11px] flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-si-4 shrink-0" />
            {match ? (
              <span className="text-si-3">
                Usuário encontrado — saldo atual: <b className="text-amber-400">{match.sibcoinBalance ?? 0} SC</b>
              </span>
            ) : (
              <span className="text-si-5">Nenhum usuário com esse e-mail na base carregada</span>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 py-3 px-5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 duration-300 border ${
            toast.ok ? 'bg-emerald-950 border-emerald-500/20 text-emerald-400' : 'bg-rose-950 border-rose-500/20 text-rose-400'
          }`}
        >
          <CheckCircle className="w-4 h-4" /> {toast.msg}
        </div>
      )}
    </div>
  );
}
