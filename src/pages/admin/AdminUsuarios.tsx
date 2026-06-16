import { useState, useEffect, useMemo } from 'react';
import { 
  Search, X, Wallet, CreditCard, TrendingUp, Target, Mail
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

interface UserDoc {
  id: string;
  name?: string;
  email?: string;
  plan?: string;
  updated?: string;
  entries?: any[];
  accounts?: any[];
  cards?: any[];
  goals?: any[];
  investments?: any[];
  budgets?: Record<string, any>;
  openFinanceStatus?: string;
  openFinanceSyncedAt?: string;
  sibcoinBalance?: number;
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDoc | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchUsers() {
      try {
        setLoading(true);
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList: UserDoc[] = [];
        usersSnap.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() } as UserDoc);
        });
        if (active) {
          setUsers(usersList);
        }
      } catch (err) {
        console.error('[AdminUsuarios] Fetch error:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchUsers();
    return () => {
      active = false;
    };
  }, []);

  // Filter and search
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const nameMatch = (u.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const planMatch = !selectedPlanFilter || u.plan === selectedPlanFilter;
      return (nameMatch || emailMatch) && planMatch;
    });
  }, [users, searchQuery, selectedPlanFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase">Carregando usuários...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">BASE DE USUÁRIOS</h1>
        <p className="text-xs text-si-4 font-medium mt-1">Gerenciamento e auditoria de perfis cadastrados</p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-si-card border border-si-border-md rounded-xl p-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-si-4 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-4"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedPlanFilter}
            onChange={(e) => setSelectedPlanFilter(e.target.value)}
            className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-2 outline-none focus:border-si-border-lg cursor-pointer"
          >
            <option value="">Todos os planos</option>
            <option value="free">Gratuito</option>
            <option value="pro">Pro</option>
            <option value="familia">Família</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-si-card border border-si-border-md rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-si-border text-si-4 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Nome</th>
                <th className="py-3.5 px-4">E-mail</th>
                <th className="py-3.5 px-4">Plano</th>
                <th className="py-3.5 px-4">Lançamentos</th>
                <th className="py-3.5 px-4">Última Sync</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-si-border/50 text-si-3">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const plan = u.plan || 'free';
                  const regDate = u.updated
                    ? new Date(u.updated).toLocaleDateString('pt-BR')
                    : '—';
                  const entriesCount = u.entries?.length ?? 0;

                  return (
                    <tr key={u.id} className="hover:bg-si-over-1/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-si-1">{u.name || '—'}</td>
                      <td className="py-3 px-4 text-si-2">{u.email || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          plan === 'pro' 
                            ? 'bg-blue-950/30 text-blue-500 border border-blue-500/10' 
                            : plan === 'familia'
                              ? 'bg-purple-950/30 text-purple-500 border border-purple-500/10'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700/20'
                        }`}>
                          {plan}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-si-2">{entriesCount} items</td>
                      <td className="py-3 px-4 text-si-4 font-medium">{regDate}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="py-1 px-3 rounded bg-si-over-2 hover:bg-si-over-3 border border-si-border text-[9px] font-black tracking-wider uppercase text-si-1 transition-colors"
                        >
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-si-4 text-[10px] font-bold tracking-widest uppercase">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User details modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-si-card border border-si-border-md rounded-2xl p-6 relative flex flex-col space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-si-border pb-4">
              <div>
                <h3 className="text-base font-bold text-si-1 tracking-tight">{selectedUser.name || 'Sem nome'}</h3>
                <span className="text-[10px] text-si-4 font-mono flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" /> {selectedUser.email}
                </span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg hover:bg-si-over-2 text-si-4 hover:text-si-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Info Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-si-bg border border-si-border rounded-xl p-3 text-center">
                <span className="text-[8px] font-bold tracking-wider text-si-4 uppercase block">Plano Atual</span>
                <span className={`text-[10px] font-bold uppercase inline-block mt-2 px-2 py-0.5 rounded ${
                  selectedUser.plan === 'pro' 
                    ? 'bg-blue-950/40 text-blue-400 border border-blue-500/10' 
                    : selectedUser.plan === 'familia'
                      ? 'bg-purple-950/40 text-purple-400 border border-purple-500/10'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700/20'
                }`}>
                  {selectedUser.plan || 'free'}
                </span>
              </div>
              <div className="bg-si-bg border border-si-border rounded-xl p-3 text-center">
                <span className="text-[8px] font-bold tracking-wider text-si-4 uppercase block">Open Finance</span>
                <span className={`text-[9px] font-bold uppercase inline-block mt-2 px-2 py-0.5 rounded ${
                  selectedUser.openFinanceStatus === 'ativo' 
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/10' 
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700/20'
                }`}>
                  {selectedUser.openFinanceStatus || 'inativo'}
                </span>
              </div>
              <div className="bg-si-bg border border-si-border rounded-xl p-3 text-center">
                <span className="text-[8px] font-bold tracking-wider text-si-4 uppercase block">Saldo SibCoin</span>
                <span className="text-xs font-mono font-bold text-yellow-500 block mt-2">
                  {selectedUser.sibcoinBalance ?? 0} SC
                </span>
              </div>
            </div>

            {/* Asset lists summary */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase border-b border-si-border pb-1">
                Estatísticas de Conta
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between text-xs border-b border-si-border/50 pb-2">
                  <span className="flex items-center gap-2 text-si-3">
                    <Wallet className="w-3.5 h-3.5 text-si-4" /> Contas Bancárias
                  </span>
                  <span className="font-mono font-bold text-si-1">{(selectedUser.accounts || []).length}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-si-border/50 pb-2">
                  <span className="flex items-center gap-2 text-si-3">
                    <CreditCard className="w-3.5 h-3.5 text-si-4" /> Cartões de Crédito
                  </span>
                  <span className="font-mono font-bold text-si-1">{(selectedUser.cards || []).length}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-si-border/50 pb-2">
                  <span className="flex items-center gap-2 text-si-3">
                    <TrendingUp className="w-3.5 h-3.5 text-si-4" /> Investimentos
                  </span>
                  <span className="font-mono font-bold text-si-1">{(selectedUser.investments || []).length}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-si-border/50 pb-2">
                  <span className="flex items-center gap-2 text-si-3">
                    <Target className="w-3.5 h-3.5 text-si-4" /> Metas de Poupança
                  </span>
                  <span className="font-mono font-bold text-si-1">{(selectedUser.goals || []).length}</span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-t border-si-border pt-4 text-[9px] text-si-4 font-medium flex justify-between">
              <span>ID do Usuário: <code className="font-mono bg-si-bg px-1.5 py-0.5 rounded">{selectedUser.id}</code></span>
              <span>Última atualização: {selectedUser.updated ? new Date(selectedUser.updated).toLocaleString('pt-BR') : '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
