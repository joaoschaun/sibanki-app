import { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  addFilho, updateFilho, deleteFilho,
  addTarefaFilho, completarTarefaFilho, pagarMesada,
} from '../services/persistUserData';
import { Modal } from '../components/ui/Modal';
import {
  Baby, Plus, Coins, CheckCircle2, Trash2, Gift, Star,
  ListChecks, Wallet, Pencil,
} from 'lucide-react';
import type { Filho } from '../types/userData';

const EMOJIS = ['👦', '👧', '👶', '🧒', '🧑', '👱', '🧒🏽', '🧒🏿'];
const FREQ_LABELS: Record<string, string> = { semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal' };
const TAREFA_FREQ: Record<string, string> = { diaria: 'Diária', semanal: 'Semanal', mensal: 'Mensal', unica: 'Única' };

export default function FilhosPage() {
  const { user, data, loading } = useAppContext();
  const [addOpen, setAddOpen] = useState(false);
  const [tarefaOpen, setTarefaOpen] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [mesada, setMesada] = useState('');
  const [mesadaFreq, setMesadaFreq] = useState<'semanal' | 'quinzenal' | 'mensal'>('mensal');
  const [emoji, setEmoji] = useState('👦');
  const [tarefaTitulo, setTarefaTitulo] = useState('');
  const [tarefaRecompensa, setTarefaRecompensa] = useState('');
  const [tarefaFreq, setTarefaFreq] = useState<'diaria' | 'semanal' | 'mensal' | 'unica'>('unica');
  const [busy, setBusy] = useState(false);

  const filhos = useMemo(() => {
    return ((data as any)?.filhos ?? []) as Filho[];
  }, [data]);

  const resetForm = () => {
    setNome(''); setIdade(''); setMesada(''); setMesadaFreq('mensal'); setEmoji('👦'); setEditingId(null);
  };

  const handleAdd = async () => {
    if (!user?.uid || !nome.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updateFilho(user.uid, editingId, {
          nome: nome.trim(),
          idade: parseInt(idade) || 0,
          mesadaValor: parseFloat(mesada) || 0,
          mesadaFrequencia: mesadaFreq,
          avatarEmoji: emoji,
        });
      } else {
        await addFilho(user.uid, {
          nome: nome.trim(),
          idade: parseInt(idade) || 0,
          mesadaValor: parseFloat(mesada) || 0,
          mesadaFrequencia: mesadaFreq,
          avatarEmoji: emoji,
        });
      }
      resetForm(); setAddOpen(false);
    } finally { setBusy(false); }
  };

  const openEdit = (f: Filho) => {
    setNome(f.nome); setIdade(String(f.idade)); setMesada(String(f.mesadaValor));
    setMesadaFreq(f.mesadaFrequencia); setEmoji(f.avatarEmoji || '👦'); setEditingId(f.id);
    setAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user?.uid || !window.confirm('Remover este perfil?')) return;
    await deleteFilho(user.uid, id);
  };

  const handleAddTarefa = async (filhoId: string) => {
    if (!user?.uid || !tarefaTitulo.trim()) return;
    setBusy(true);
    try {
      await addTarefaFilho(user.uid, filhoId, {
        titulo: tarefaTitulo.trim(),
        recompensa: parseFloat(tarefaRecompensa) || 0,
        frequencia: tarefaFreq,
      });
      setTarefaTitulo(''); setTarefaRecompensa(''); setTarefaFreq('unica'); setTarefaOpen(null);
    } finally { setBusy(false); }
  };

  const handleComplete = async (filhoId: string, tarefaId: string) => {
    if (!user?.uid) return;
    setBusy(true);
    try { await completarTarefaFilho(user.uid, filhoId, tarefaId); }
    finally { setBusy(false); }
  };

  const handleMesada = async (filhoId: string) => {
    if (!user?.uid) return;
    setBusy(true);
    try { await pagarMesada(user.uid, filhoId); }
    finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Baby className="w-8 h-8 text-pink-400" />
            Finanças dos Filhos
          </h2>
          <p className="text-si-5 text-sm mt-1">
            Ensine educação financeira com mesadas, tarefas e recompensas em SibCoin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setAddOpen(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm"
        >
          <Plus className="w-4 h-4" /> Adicionar filho(a)
        </button>
      </div>

      {filhos.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Baby className="w-16 h-16 text-si-5 mx-auto opacity-40" />
          <p className="text-si-4 text-lg font-medium">Nenhum perfil de filho cadastrado</p>
          <p className="text-si-5 text-sm max-w-md mx-auto">
            Crie um perfil para cada filho e defina mesadas, tarefas com recompensas
            e acompanhe o progresso financeiro deles.
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {filhos.map((f) => {
          const tarefasPendentes = f.tarefas.filter((t) => t.status === 'pendente');
          const tarefasCompletas = f.tarefas.filter((t) => t.status === 'completa');
          return (
            <div key={f.id} className="bg-si-card rounded-2xl border border-pink-500/20 p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{f.avatarEmoji || '👦'}</span>
                  <div>
                    <h3 className="font-bold text-si-1 text-lg">{f.nome}</h3>
                    <p className="text-si-5 text-xs">{f.idade} anos · Mesada: R$ {f.mesadaValor.toFixed(2)} ({FREQ_LABELS[f.mesadaFrequencia]})</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEdit(f)} className="p-1.5 text-si-5 hover:text-blue-400" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(f.id)} className="p-1.5 text-si-5 hover:text-rose-400" title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-si-bg rounded-xl p-3 text-center border border-si-border">
                  <Wallet className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-emerald-400">R$ {f.saldo.toFixed(2)}</p>
                  <p className="text-xs text-si-5">Saldo</p>
                </div>
                <div className="bg-si-bg rounded-xl p-3 text-center border border-si-border">
                  <Coins className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-400">{f.sibcoinBalance} SC</p>
                  <p className="text-xs text-si-5">SibCoins</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleMesada(f.id)}
                  disabled={busy}
                  className="flex-1 px-3 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 text-sm font-bold hover:bg-emerald-600/30 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Gift className="w-4 h-4" /> Pagar mesada
                </button>
                <button
                  type="button"
                  onClick={() => setTarefaOpen(f.id)}
                  className="flex-1 px-3 py-2 rounded-xl bg-blue-600/20 text-blue-400 text-sm font-bold hover:bg-blue-600/30 flex items-center justify-center gap-1.5"
                >
                  <ListChecks className="w-4 h-4" /> Nova tarefa
                </button>
              </div>

              {tarefasPendentes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-si-4 uppercase tracking-wider">Tarefas pendentes</p>
                  {tarefasPendentes.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-2 bg-si-bg rounded-xl p-3 border border-si-border">
                      <div className="min-w-0">
                        <p className="text-sm text-si-2 font-medium truncate">{t.titulo}</p>
                        <p className="text-xs text-si-5">{TAREFA_FREQ[t.frequencia]} · R$ {t.recompensa.toFixed(2)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleComplete(f.id, t.id)}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30 disabled:opacity-50 flex items-center gap-1 shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Feita!
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {tarefasCompletas.length > 0 && (
                <details className="group">
                  <summary className="text-xs font-medium text-si-5 cursor-pointer hover:text-si-4">
                    {tarefasCompletas.length} tarefa(s) completa(s)
                  </summary>
                  <div className="mt-2 space-y-1">
                    {tarefasCompletas.slice(-5).map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-xs text-si-5">
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{t.titulo}</span>
                        <span className="text-emerald-400 ml-auto">+R$ {t.recompensa.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {f.historico.length > 0 && (
                <details className="group">
                  <summary className="text-xs font-medium text-si-5 cursor-pointer hover:text-si-4">
                    Histórico ({f.historico.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {f.historico.slice(-10).reverse().map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-xs">
                        <span className="text-si-4">{h.descricao}</span>
                        <span className={h.tipo === 'gasto' ? 'text-rose-400' : 'text-emerald-400'}>
                          {h.tipo === 'gasto' ? '-' : '+'}R$ {h.valor.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={addOpen} onClose={() => { setAddOpen(false); resetForm(); }} title={editingId ? 'Editar perfil' : 'Novo perfil de filho(a)'}>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`text-2xl p-1.5 rounded-xl border ${emoji === e ? 'border-pink-500 bg-pink-500/10' : 'border-si-border hover:border-si-border-md'}`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-si-3 block mb-1">Nome</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do filho(a)"
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm" />
            </div>
            <div>
              <label className="text-sm text-si-3 block mb-1">Idade</label>
              <input type="number" value={idade} onChange={(e) => setIdade(e.target.value)} min="0" max="18"
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-si-3 block mb-1">Valor da mesada (R$)</label>
              <input type="number" value={mesada} onChange={(e) => setMesada(e.target.value)} min="0" step="0.01"
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm" />
            </div>
            <div>
              <label className="text-sm text-si-3 block mb-1">Frequência</label>
              <select value={mesadaFreq} onChange={(e) => setMesadaFreq(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm">
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
          </div>
          <button type="button" onClick={handleAdd} disabled={busy || !nome.trim()}
            className="w-full px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm disabled:opacity-50">
            {busy ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar perfil'}
          </button>
        </div>
      </Modal>

      <Modal open={tarefaOpen !== null} onClose={() => setTarefaOpen(null)} title="Nova tarefa">
        <div className="space-y-4">
          <p className="text-si-5 text-sm">
            Crie uma tarefa para o filho. Ao completar, ele ganha o valor como saldo + SibCoins.
          </p>
          <div>
            <label className="text-sm text-si-3 block mb-1">Tarefa</label>
            <input type="text" value={tarefaTitulo} onChange={(e) => setTarefaTitulo(e.target.value)}
              placeholder="Ex: Arrumar o quarto"
              className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-si-3 block mb-1">Recompensa (R$)</label>
              <input type="number" value={tarefaRecompensa} onChange={(e) => setTarefaRecompensa(e.target.value)}
                min="0" step="0.50"
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm" />
            </div>
            <div>
              <label className="text-sm text-si-3 block mb-1">Frequência</label>
              <select value={tarefaFreq} onChange={(e) => setTarefaFreq(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm">
                {Object.entries(TAREFA_FREQ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <button type="button" onClick={() => tarefaOpen && handleAddTarefa(tarefaOpen)}
            disabled={busy || !tarefaTitulo.trim()}
            className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm disabled:opacity-50">
            {busy ? 'Salvando...' : 'Criar tarefa'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
