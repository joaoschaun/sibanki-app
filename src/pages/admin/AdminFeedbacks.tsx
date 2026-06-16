import { useState, useEffect, useMemo } from 'react';
import { 
  RefreshCw, X, Info 
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

interface FeedbackDoc {
  id: string;
  category: 'sugestao' | 'critica' | 'erro';
  title: string;
  description: string;
  userEmail?: string;
  userName?: string;
  page?: string;
  status: 'novo' | 'em-analise' | 'resolvido';
  createdAt: any;
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<FeedbackDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackDoc | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: FeedbackDoc[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as FeedbackDoc);
      });
      setFeedbacks(list);
    } catch (err) {
      console.error('[AdminFeedbacks] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const kpis = useMemo(() => {
    const total = feedbacks.length;
    const novos = feedbacks.filter((f) => f.status === 'novo').length;
    const analise = feedbacks.filter((f) => f.status === 'em-analise').length;
    const resolvidos = feedbacks.filter((f) => f.status === 'resolvido').length;
    return { total, novos, analise, resolvidos };
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      const catMatch = !selectedCategoryFilter || f.category === selectedCategoryFilter;
      const statusMatch = !selectedStatusFilter || f.status === selectedStatusFilter;
      return catMatch && statusMatch;
    });
  }, [feedbacks, selectedCategoryFilter, selectedStatusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: FeedbackDoc['status']) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'feedbacks', id), {
        status: newStatus,
      });

      // Update local state
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
      );

      // Update current selected feedback if open
      if (selectedFeedback && selectedFeedback.id === id) {
        setSelectedFeedback((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error('[AdminFeedbacks] Update status error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase">Carregando feedbacks...</span>
        </div>
      </div>
    );
  }

  const CAT_LABELS: Record<string, string> = { sugestao: 'Sugestão', critica: 'Crítica', erro: 'Erro' };
  const CAT_BADGES: Record<string, string> = { 
    sugestao: 'bg-blue-950/30 text-blue-500 border border-blue-500/10', 
    critica: 'bg-amber-950/30 text-amber-500 border border-amber-500/10', 
    erro: 'bg-red-950/30 text-red-500 border border-red-500/10' 
  };
  const STATUS_LABELS: Record<string, string> = { novo: 'Novo', 'em-analise': 'Em Análise', resolvido: 'Resolvido' };
  const STATUS_BADGES: Record<string, string> = {
    novo: 'bg-blue-950/20 text-blue-400 border border-blue-500/10',
    'em-analise': 'bg-amber-950/20 text-amber-400 border border-amber-500/10',
    resolvido: 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/10',
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">FEEDBACKS DOS USUÁRIOS</h1>
          <p className="text-xs text-si-4 font-medium mt-1">
            Auditoria e resposta para sugestões, críticas e bugs reportados
          </p>
        </div>
        <button
          onClick={loadFeedbacks}
          className="px-4 py-2.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.15em] uppercase text-si-1 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar Inbox
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-si-card border border-si-border-md rounded-xl p-4">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase block">Total Recebidos</span>
          <span className="text-2xl font-bold tracking-tight text-si-1 block mt-2">{kpis.total}</span>
        </div>
        <div className="bg-si-card border border-si-border-md rounded-xl p-4">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase block">Novos</span>
          <span className="text-2xl font-bold tracking-tight text-blue-500 block mt-2">{kpis.novos}</span>
        </div>
        <div className="bg-si-card border border-si-border-md rounded-xl p-4">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase block">Em Análise</span>
          <span className="text-2xl font-bold tracking-tight text-amber-500 block mt-2">{kpis.analise}</span>
        </div>
        <div className="bg-si-card border border-si-border-md rounded-xl p-4">
          <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase block">Resolvidos</span>
          <span className="text-2xl font-bold tracking-tight text-emerald-500 block mt-2">{kpis.resolvidos}</span>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-si-card border border-si-border-md rounded-xl p-4">
        <div className="flex-1">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-2 outline-none focus:border-si-border-lg cursor-pointer"
          >
            <option value="">Todas as categorias</option>
            <option value="sugestao">Sugestão</option>
            <option value="critica">Crítica</option>
            <option value="erro">Erro (Bug)</option>
          </select>
        </div>
        <div className="w-full sm:w-60">
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-2 outline-none focus:border-si-border-lg cursor-pointer"
          >
            <option value="">Todos os status</option>
            <option value="novo">Novo</option>
            <option value="em-analise">Em Análise</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>
      </div>

      {/* Feedbacks table */}
      <div className="bg-si-card border border-si-border-md rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-si-border text-si-4 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Categoria</th>
                <th className="py-3.5 px-4">Título</th>
                <th className="py-3.5 px-4">Usuário</th>
                <th className="py-3.5 px-4">Página</th>
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-si-border/50 text-si-3">
              {filteredFeedbacks.length > 0 ? (
                filteredFeedbacks.map((fb) => {
                  const date = fb.createdAt 
                    ? new Date(fb.createdAt.toDate ? fb.createdAt.toDate() : fb.createdAt).toLocaleDateString('pt-BR') 
                    : '—';
                  const userText = fb.userEmail || fb.userName || '—';

                  return (
                    <tr key={fb.id} className="hover:bg-si-over-1/50 transition-colors">
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${CAT_BADGES[fb.category]}`}>
                          {CAT_LABELS[fb.category]}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-si-1 max-w-[180px] truncate">{fb.title}</td>
                      <td className="py-3 px-4 text-si-3 max-w-[120px] truncate">{userText}</td>
                      <td className="py-3 px-4 text-si-4 font-mono max-w-[120px] truncate">{fb.page || '—'}</td>
                      <td className="py-3 px-4 font-mono text-si-3">{date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${STATUS_BADGES[fb.status]}`}>
                          {STATUS_LABELS[fb.status]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedFeedback(fb)}
                          className="py-1 px-3 rounded bg-si-over-2 hover:bg-si-over-3 border border-si-border text-[9px] font-black tracking-wider uppercase text-si-1 transition-colors"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-si-4 text-[10px] font-bold tracking-widest uppercase">
                    Nenhum feedback na caixa de entrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-si-card border border-si-border-md rounded-2xl p-6 relative flex flex-col space-y-5">
            <button
              onClick={() => setSelectedFeedback(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-si-over-2 text-si-4 hover:text-si-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${CAT_BADGES[selectedFeedback.category]}`}>
                {CAT_LABELS[selectedFeedback.category]}
              </span>
              <h3 className="text-sm font-bold text-si-1 tracking-tight leading-snug mt-2">
                {selectedFeedback.title}
              </h3>
              <p className="text-[9px] text-si-4 font-mono">
                Por: {selectedFeedback.userEmail || selectedFeedback.userName || 'Anônimo'} ·{' '}
                {selectedFeedback.createdAt 
                  ? new Date(selectedFeedback.createdAt.toDate ? selectedFeedback.createdAt.toDate() : selectedFeedback.createdAt).toLocaleString('pt-BR') 
                  : '—'}
              </p>
            </div>

            <div className="bg-si-bg border border-si-border rounded-xl p-4">
              <p className="text-xs text-si-2 leading-relaxed whitespace-pre-wrap">{selectedFeedback.description}</p>
            </div>

            {selectedFeedback.page && (
              <div className="flex items-center gap-1.5 text-[10px] text-si-4 font-medium">
                <Info className="w-3.5 h-3.5" /> Página de envio: <code className="font-mono text-si-3 bg-si-bg py-0.5 px-1.5 rounded">{selectedFeedback.page}</code>
              </div>
            )}

            {/* Quick Actions */}
            <div className="border-t border-si-border pt-4 flex flex-col space-y-2">
              <span className="text-[9px] font-bold tracking-wider text-si-4 uppercase">Alterar Status Operacional</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'novo')}
                  disabled={updatingId !== null}
                  className="flex-1 py-2 rounded-lg bg-si-bg hover:bg-si-over-1 border border-si-border text-[9px] font-bold tracking-wider uppercase text-si-3"
                >
                  🔵 Novo
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'em-analise')}
                  disabled={updatingId !== null}
                  className="flex-1 py-2 rounded-lg bg-si-bg hover:bg-si-over-1 border border-si-border text-[9px] font-bold tracking-wider uppercase text-amber-500"
                >
                  🟡 Em Análise
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'resolvido')}
                  disabled={updatingId !== null}
                  className="flex-1 py-2 rounded-lg bg-emerald-950/10 hover:bg-emerald-950/20 border border-emerald-500/20 text-[9px] font-bold tracking-wider uppercase text-emerald-400"
                >
                  ✅ Resolvido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
