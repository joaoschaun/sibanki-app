import { useMemo } from 'react';
import { RefreshCw, AlertTriangle, ChevronRight, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { MerchantLogo } from '../components/transactions/MerchantLogo';

const TERMS_RX = /netflix|spotify|amazon|prime|disney|hbo|apple|google|icloud|dropbox|youtube|gym|academia|crunchyroll|adobe|canva|microsoft|office|mensalidade|plano|internet|telef|celular/i;

export default function Assinaturas() {
  const { recurrents, entries } = useAppContext();
  const now = new Date();

  const subscriptions = useMemo(() => {
    return recurrents
      .filter(r => r.active && r.type === 'despesa' && (
        r.category === 'Assinaturas' ||
        TERMS_RX.test(r.desc || '')
      ))
      .map(r => ({
        id: r.id,
        desc: r.desc,
        category: r.category || 'Assinaturas',
        value: r.value,
        day: r.day,
        freq: r.freq || 'mensal',
        account: r.account,
      }));
  }, [recurrents]);

  const totalMonthly = useMemo(
    () => subscriptions.reduce((s, r) => s + (Number(r.value) || 0), 0),
    [subscriptions]
  );

  const leaks = useMemo(() => {
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoff = sixtyDaysAgo.toISOString().slice(0, 10);
    const recent = entries.filter(e => e.date >= cutoff && e.type === 'despesa');

    return subscriptions
      .filter(sub => !recent.some(e => {
        const a = (e.desc || '').toLowerCase();
        const b = sub.desc.toLowerCase();
        return a.includes(b) || b.includes(a);
      }))
      .map(sub => sub.desc);
  }, [subscriptions, entries, now]);

  const cardClass = 'bg-si-card border border-si-border rounded-2xl p-5 space-y-1';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-si-1">Assinaturas</h1>
          <p className="text-sm text-si-5 mt-0.5">Serviços recorrentes detectados automaticamente</p>
        </div>
        <Link
          to="/recorrentes"
          className="flex items-center gap-1.5 text-xs text-si-4 hover:text-si-2 transition-colors"
        >
          Gerenciar <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Gasto mensal</p>
          <p className="text-2xl font-bold text-violet-400">
            R$ {totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-si-5">Soma de todas as assinaturas ativas</p>
        </div>
        <div className={cardClass}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Identificadas</p>
          <p className="text-2xl font-bold text-si-1">{subscriptions.length}</p>
          <p className="text-xs text-si-5">Por categoria ou palavras-chave</p>
        </div>
      </div>

      {/* Vazamentos invisíveis */}
      {leaks.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Potencial Vazamento Invisível</span>
          </div>
          <p className="text-xs text-si-3 leading-relaxed">
            As assinaturas abaixo estão cadastradas, mas <strong>não registramos despesas nos últimos 60 dias</strong>.
            Verifique se foram canceladas ou se o pagamento está sendo ignorado:
          </p>
          <ul className="list-disc list-inside text-xs font-semibold text-rose-300 space-y-1 pl-1">
            {leaks.map((name, i) => <li key={i}>{name}</li>)}
          </ul>
        </div>
      )}

      {/* Lista */}
      <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-si-1 uppercase tracking-wider">Detalhamento</h3>
        </div>

        {subscriptions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <TrendingDown className="w-8 h-8 text-si-5 mx-auto" />
            <p className="text-sm text-si-5">Nenhuma assinatura encontrada.</p>
            <p className="text-xs text-si-5 max-w-xs mx-auto">
              Cadastre lançamentos recorrentes com categoria "Assinaturas" ou nomes como Netflix, Spotify, etc.
            </p>
            <Link
              to="/recorrentes"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-lg bg-si-over-2 border border-si-border text-xs font-semibold text-si-2 hover:bg-si-over-3 transition-colors"
            >
              Ir para Recorrentes <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-si-border">
            {subscriptions.map(sub => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-4 py-3 hover:bg-si-over-1/30 transition-colors px-2 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MerchantLogo
                    description={sub.desc}
                    category={sub.category}
                    type="despesa"
                    size={28}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-si-1 truncate">{sub.desc}</p>
                    <p className="text-xs text-si-5 mt-0.5">
                      Todo dia {sub.day} · {sub.freq}{sub.account ? ` · ${sub.account}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-si-1 shrink-0">
                  R$ {Number(sub.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
