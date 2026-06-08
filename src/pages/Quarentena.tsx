import { useState, useMemo } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useAppContext } from '../context/AppContext';
import { addQuarentena, resolveQuarentena, deleteQuarentena } from '../services/persistUserData';
import { Modal } from '../components/ui/Modal';
import { ShieldCheck, Plus, Clock, CheckCircle2, XCircle, Trash2, Sparkles, TrendingUp } from 'lucide-react';
import type { QuarentenaItem } from '../types/userData';

const CATEGORIAS = ['Eletrônicos', 'Roupas', 'Lazer', 'Alimentação', 'Decoração', 'Outros'];

function timeLeft(expiraEm: string): string {
  const diff = new Date(expiraEm).getTime() - Date.now();
  if (diff <= 0) return 'Expirado';
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  return `${h}h ${m}min restantes`;
}

function isExpired(item: QuarentenaItem): boolean {
  return item.status === 'pendente' && new Date(item.expiraEm).getTime() <= Date.now();
}

export default function Quarentena() {
  const { user, data, entries, loading } = useAppContext();
  const [addOpen, setAddOpen] = useState(false);
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('Outros');
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => {
    return ((data as any)?.quarentena ?? []) as QuarentenaItem[];
  }, [data]);

  const pendentes = items.filter((i) => i.status === 'pendente');
  const resolvidos = items.filter((i) => i.status !== 'pendente');
  const totalEconomizado = resolvidos
    .filter((i) => i.status === 'desistido')
    .reduce((s, i) => s + i.valor, 0);

  const handleAdd = async () => {
    if (!user?.uid || !desc.trim() || !valor) return;
    setBusy(true);
    try {
      await addQuarentena(user.uid, {
        descricao: desc.trim(),
        valor: parseFloat(valor),
        categoria,
      });
      setDesc(''); setValor(''); setCategoria('Outros'); setAddOpen(false);
    } finally { setBusy(false); }
  };

  const handleResolve = async (itemId: string, action: 'comprado' | 'desistido') => {
    if (!user?.uid) return;
    setBusy(true);
    try {
      await resolveQuarentena(user.uid, itemId, action, entries);
    } finally { setBusy(false); }
  };

  const handleDelete = async (itemId: string) => {
    if (!user?.uid) return;
    await deleteQuarentena(user.uid, itemId);
  };

  if (loading) return <GenericPageSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
            Quarentena de Compras
          </h2>
          <p className="text-si-5 text-sm mt-1">
            Resista ao impulso: coloque a compra em quarentena por 48h antes de decidir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm"
        >
          <Plus className="w-4 h-4" /> Quero comprar algo
        </button>
      </div>

      {totalEconomizado > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5 flex items-center gap-4">
          <TrendingUp className="w-10 h-10 text-emerald-400 shrink-0" />
          <div>
            <p className="text-emerald-400 font-bold text-lg">
              R$ {totalEconomizado.toFixed(2)} economizados
            </p>
            <p className="text-si-5 text-sm">Total que você decidiu NÃO gastar depois da quarentena.</p>
          </div>
        </div>
      )}

      {pendentes.length === 0 && resolvidos.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <ShieldCheck className="w-16 h-16 text-si-5 mx-auto opacity-40" />
          <p className="text-si-4 text-lg font-medium">Nenhum item em quarentena</p>
          <p className="text-si-5 text-sm max-w-md mx-auto">
            Quando sentir vontade de comprar algo por impulso, clique em "Quero comprar algo"
            e espere 48h. Você vai se surpreender com quantas compras não fazem mais sentido depois.
          </p>
        </div>
      )}

      {pendentes.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-si-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Em quarentena ({pendentes.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendentes.map((item) => {
              const expired = isExpired(item);
              return (
                <div key={item.id} className="bg-si-card rounded-2xl border border-amber-500/20 p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-si-1">{item.descricao}</p>
                      <p className="text-si-5 text-xs">{item.categoria}</p>
                    </div>
                    <p className="text-amber-400 font-bold text-lg whitespace-nowrap">
                      R$ {item.valor.toFixed(2)}
                    </p>
                  </div>
                  <p className={`text-xs font-medium ${expired ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {expired ? '48h passaram — hora de decidir!' : timeLeft(item.expiraEm)}
                  </p>
                  {expired ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleResolve(item.id, 'comprado')}
                        disabled={busy}
                        className="flex-1 px-3 py-2 rounded-xl bg-rose-600/20 text-rose-400 text-sm font-bold hover:bg-rose-600/30 disabled:opacity-50"
                      >
                        Comprar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(item.id, 'desistido')}
                        disabled={busy}
                        className="flex-1 px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 text-sm font-bold hover:bg-emerald-600/30 disabled:opacity-50"
                      >
                        Desisti!
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-si-5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Aguardando o período de reflexão...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {resolvidos.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-si-2">Histórico</h3>
          <div className="space-y-2">
            {resolvidos.slice().reverse().map((item) => (
              <div key={item.id} className="bg-si-card rounded-xl border border-si-border p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {item.status === 'desistido' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-si-2 text-sm font-medium truncate">{item.descricao}</p>
                    <p className="text-si-5 text-xs">
                      {item.status === 'desistido' ? 'Economizado' : 'Comprado'} — {new Date(item.criadoEm).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-bold text-sm ${item.status === 'desistido' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {item.valor.toFixed(2)}
                  </span>
                  <button type="button" onClick={() => handleDelete(item.id)} className="text-si-5 hover:text-rose-400" title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Quarentena de Compra">
        <div className="space-y-4">
          <p className="text-si-5 text-sm">
            Quer comprar algo? Coloque aqui e espere 48h. Se depois de 2 dias você ainda quiser, compre com consciência.
            Se desistir, o valor vai para o seu cofre de investimento.
          </p>
          <div>
            <label className="text-sm text-si-3 block mb-1">O que quer comprar?</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ex: Fone bluetooth"
              className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-si-3 block mb-1">Valor (R$)</label>
              <input
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                min="0.01"
                step="0.01"
                placeholder="0,00"
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-si-3 block mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm"
              >
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy || !desc.trim() || !valor}
            className="w-full px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm disabled:opacity-50"
          >
            {busy ? 'Salvando...' : 'Colocar em quarentena (48h)'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
