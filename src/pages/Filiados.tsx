import { useState, useEffect, useMemo, useCallback } from 'react';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useAppContext } from '../context/AppContext';
import { updateUserDoc } from '../services/persistUserData';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Copy, Share2, Trophy, TrendingUp, Gift, Check } from 'lucide-react';

const FILIADO_CONFIG = {
  recompensas: {
    ativacao: 100,
    openBanking: 200,
    assinouPro: 500,
  },
  multiplicadores: {
    iniciante: 1.0,
    parceiro: 1.25,
    embaixador: 1.5,
    elite: 2.0,
  },
  ativacaoMinDias: 30,
  ativacaoMinLancamentos: 5,
};

const NIVEIS = [
  { id: 'iniciante', label: 'Iniciante', min: 0, max: 4, mult: 1.0, color: 'text-zinc-400' },
  { id: 'parceiro', label: 'Parceiro', min: 5, max: 14, mult: 1.25, color: 'text-blue-400' },
  { id: 'embaixador', label: 'Embaixador', min: 15, max: 49, mult: 1.5, color: 'text-purple-400' },
  { id: 'elite', label: 'Elite', min: 50, max: Infinity, mult: 2.0, color: 'text-amber-400' },
];

function getNivel(totalAtivos: number) {
  return NIVEIS.find((n) => totalAtivos >= n.min && totalAtivos <= n.max) ?? NIVEIS[0];
}

function gerarCodigo(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

interface FiliadoData {
  codigo: string;
  ativo: boolean;
  criadoEm: unknown;
  totalIndicados: number;
  totalAtivos: number;
  totalSibCoins: number;
}

interface Indicado {
  uid: string;
  nome: string;
  email: string;
  status: 'pendente' | 'ativo' | 'inativo';
  criadoEm: string;
  sibCoinsGerados: number;
}

export default function Filiados() {
  const { user, data } = useAppContext();
  const [filiadoData, setFiliadoData] = useState<FiliadoData | null>(null);
  const [indicados, setIndicados] = useState<Indicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'' | 'pendente' | 'ativo'>('');
  const [copied, setCopied] = useState(false);

  const userPlan = useMemo(() => {
    const s = (data as any)?.settings;
    return s?.planType || 'free';
  }, [data]);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ref = doc(db, 'users', user.uid, 'filiado', 'dados');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setFiliadoData(snap.data() as FiliadoData);
          const indSnap = await getDocs(collection(db, 'users', user.uid, 'indicados'));
          if (!cancelled) setIndicados(indSnap.docs.map((d) => ({ uid: d.id, ...d.data() } as Indicado)));
        } else if (!cancelled) {
          const codigo = gerarCodigo();
          const newData: FiliadoData = {
            codigo,
            ativo: true,
            criadoEm: serverTimestamp(),
            totalIndicados: 0,
            totalAtivos: 0,
            totalSibCoins: 0,
          };
          await setDoc(ref, newData);
          await updateUserDoc(user.uid, { filiadoCodigo: codigo } as any);
          setFiliadoData({ ...newData, criadoEm: new Date().toISOString() });
        }
      } catch { /* silent */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const nivel = useMemo(() => getNivel(filiadoData?.totalAtivos ?? 0), [filiadoData]);

  const link = useMemo(() => {
    if (!filiadoData?.codigo) return '';
    return `https://sibanki.com.br/?ref=${filiadoData.codigo}`;
  }, [filiadoData]);

  const copiarLink = useCallback(() => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [link]);

  const compartilharWhatsApp = useCallback(() => {
    if (!link) return;
    const text = encodeURIComponent(`Estou usando o Sibanki para organizar minhas finanças e está me ajudando muito! Use meu link para entrar: ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [link]);

  const filtrados = useMemo(() => {
    if (!filterStatus) return indicados;
    return indicados.filter((i) => i.status === filterStatus);
  }, [indicados, filterStatus]);

  if (userPlan === 'free') {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold flex items-center gap-2"><Users className="text-blue-400 w-8 h-8" /> Programa de Filiados</h2>
        <div className="bg-si-card rounded-2xl border border-si-border p-12 text-center">
          <Gift className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-si-1 mb-2">Disponível para planos Pro e Família</h3>
          <p className="text-si-5 text-sm max-w-md mx-auto mb-6">Indique amigos, acumule SibCoins e suba de nível. Quanto mais indicações ativas, maior seu multiplicador de recompensas.</p>
          <a href="/configuracoes" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm">Ver planos</a>
        </div>
      </div>
    );
  }

  if (loading) return <GenericPageSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2"><Users className="text-blue-400 w-8 h-8" /> Programa de Filiados</h2>
        <p className="text-si-5 text-sm mt-1">Indique amigos, acumule SibCoins e suba de nível.</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Indicados" value={filiadoData?.totalIndicados ?? 0} icon={<Users className="w-5 h-5 text-blue-400" />} />
        <MetricCard label="Ativos" value={filiadoData?.totalAtivos ?? 0} icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} />
        <MetricCard label="SibCoins ganhos" value={filiadoData?.totalSibCoins ?? 0} icon={<Gift className="w-5 h-5 text-amber-400" />} />
        <div className="bg-si-card rounded-2xl border border-si-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-si-5 uppercase tracking-wide">Nível</span>
          </div>
          <p className={`text-xl font-bold ${nivel.color}`}>{nivel.label}</p>
          <p className="text-xs text-si-5">Multiplicador: {nivel.mult}x</p>
        </div>
      </div>

      {/* Link de indicação */}
      <div className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-3">Seu link de indicação</h3>
        <div className="flex gap-2 items-center">
          <div className="flex-1 px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-sm text-si-3 truncate font-mono">{link || '...'}</div>
          <button type="button" onClick={copiarLink} className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button type="button" onClick={compartilharWhatsApp} className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shrink-0" title="Compartilhar via WhatsApp">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-si-5 mt-2">Código: <span className="font-mono font-bold text-si-3">{filiadoData?.codigo}</span></p>
      </div>

      {/* Tabela de recompensas */}
      <div className="bg-si-card rounded-2xl border border-si-border p-6">
        <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-3">Recompensas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <RewardCard label="Ativação" desc={`Indicado com ${FILIADO_CONFIG.ativacaoMinDias}d + ${FILIADO_CONFIG.ativacaoMinLancamentos} lançamentos`} coins={FILIADO_CONFIG.recompensas.ativacao} mult={nivel.mult} />
          <RewardCard label="Open Finance" desc="Indicado conectou Open Finance" coins={FILIADO_CONFIG.recompensas.openBanking} mult={nivel.mult} />
          <RewardCard label="Assinou Pro" desc="Indicado assinou plano Pro" coins={FILIADO_CONFIG.recompensas.assinouPro} mult={nivel.mult} />
        </div>
      </div>

      {/* Lista de indicados */}
      <div className="bg-si-card rounded-2xl border border-si-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider">Indicados ({indicados.length})</h3>
          <div className="flex gap-2">
            {(['', 'pendente', 'ativo'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-si-over-2 text-si-5 hover:bg-si-over-3'}`}>
                {s === '' ? 'Todos' : s === 'pendente' ? 'Pendentes' : 'Ativos'}
              </button>
            ))}
          </div>
        </div>
        {filtrados.length === 0 ? (
          <p className="text-si-5 text-sm text-center py-8">
            {indicados.length === 0 ? 'Compartilhe seu link para começar a indicar!' : 'Nenhum indicado neste filtro.'}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtrados.map((ind) => (
              <div key={ind.uid} className="flex items-center gap-4 py-3">
                <div className="p-2 rounded-xl bg-si-over-2">
                  <Users className="w-4 h-4 text-si-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-si-1 truncate">{ind.nome || ind.email || ind.uid.slice(0, 8)}</p>
                  <p className="text-xs text-si-5">{ind.status === 'ativo' ? 'Ativo' : 'Pendente'}</p>
                </div>
                <span className="text-sm font-bold text-amber-400">+{ind.sibCoinsGerados ?? 0} SC</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximo nível */}
      {nivel.id !== 'elite' && (
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl border border-blue-500/20 p-6">
          <h3 className="text-sm font-bold text-si-4 uppercase tracking-wider mb-2">Próximo nível</h3>
          <p className="text-si-3 text-sm">
            Faltam <span className="font-bold text-blue-400">{(NIVEIS[NIVEIS.indexOf(nivel) + 1]?.min ?? 0) - (filiadoData?.totalAtivos ?? 0)}</span> indicados ativos
            para <span className="font-bold">{NIVEIS[NIVEIS.indexOf(nivel) + 1]?.label}</span> (multiplicador {NIVEIS[NIVEIS.indexOf(nivel) + 1]?.mult}x).
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-si-card rounded-2xl border border-si-border p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-si-5 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-si-1">{value.toLocaleString('pt-BR')}</p>
    </div>
  );
}

function RewardCard({ label, desc, coins, mult }: { label: string; desc: string; coins: number; mult: number }) {
  const effective = Math.round(coins * mult);
  return (
    <div className="p-4 rounded-xl bg-si-over-1 border border-si-border">
      <p className="text-sm font-bold text-si-1 mb-1">{label}</p>
      <p className="text-xs text-si-5 mb-2">{desc}</p>
      <p className="text-lg font-bold text-amber-400">{effective} <span className="text-xs text-si-5 font-normal">SibCoins</span></p>
      {mult > 1 && <p className="text-xs text-emerald-400">{mult}x aplicado</p>}
    </div>
  );
}
