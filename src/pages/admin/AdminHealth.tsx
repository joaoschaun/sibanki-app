import { useState, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

// Lê o endpoint /api/health da função `api` (Express, us-central1, CORS origin:true).
const HEALTH_URL = 'https://us-central1-virtus-financeiro-cd7bd.cloudfunctions.net/api/health';

const LABELS: Record<string, string> = {
  firestore: 'Firestore',
  auth: 'Authentication',
  deepseek: 'DeepSeek (LLM)',
  gemini: 'Gemini (LLM)',
  stripe: 'Stripe (billing)',
  resend: 'Resend (e-mail)',
  whatsapp: 'WhatsApp',
  pluggy: 'Pluggy (Open Finance)',
  lomadee: 'Lomadee (afiliados)',
  monetizze: 'Monetizze (afiliados)',
  monetizzeToken: 'Monetizze Token',
  cashbackEngine: 'Motor de Cashback',
};

type Cls = 'ok' | 'warn' | 'error';
function classify(v: string): Cls {
  const s = String(v || '').toLowerCase();
  if (s.startsWith('error') || s === 'invalid') return 'error';
  if (s === 'missing') return 'warn';
  return 'ok'; // ok, ok (empty), configured
}

interface HealthData {
  status: string;
  timestamp: string;
  services: Record<string, string>;
}

export default function AdminHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const t0 = performance.now();
    try {
      const r = await fetch(HEALTH_URL, { cache: 'no-store' });
      const json = (await r.json()) as HealthData;
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'falha de rede');
      setData(null);
    } finally {
      setLatency(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const services = data?.services || {};
  const keys = Object.keys(services);
  const nOk = keys.filter((k) => classify(services[k]) === 'ok').length;
  const nWarn = keys.filter((k) => classify(services[k]) === 'warn').length;
  const nErr = keys.filter((k) => classify(services[k]) === 'error').length;
  const healthy = String(data?.status || '').toLowerCase() === 'ok';

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">HEALTH CHECK</h1>
          <p className="text-xs text-si-4 font-medium mt-1">
            Status em tempo real das Cloud Functions e integrações — endpoint /api/health
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="shrink-0 py-2 px-4 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-[11px] font-bold tracking-[0.15em] uppercase text-si-1 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
        </div>
      )}

      {err && !data && (
        <div className="bg-si-card border border-rose-500/30 rounded-xl p-5">
          <span className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <XCircle className="w-4 h-4" /> API OFFLINE
          </span>
          <p className="text-xs text-si-4 mt-2">Não foi possível acessar /api/health: {err}</p>
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Status Geral"
              value={healthy ? 'OPERACIONAL' : 'DEGRADADO'}
              sub={`latência ${latency}ms`}
              color={healthy ? 'text-emerald-500' : 'text-rose-500'}
              icon={Activity}
            />
            <KpiCard label="Saudáveis" value={String(nOk)} sub={`de ${keys.length} serviços`} color="text-emerald-500" icon={CheckCircle2} />
            <KpiCard label="Não configurados" value={String(nWarn)} sub="missing" color="text-amber-500" icon={AlertTriangle} />
            <KpiCard label="Com erro" value={String(nErr)} sub="falhas ativas" color="text-rose-500" icon={XCircle} />
          </div>

          <div className="bg-si-card border border-si-border-md rounded-xl p-5">
            <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase mb-4">Serviços &amp; Integrações</h3>
            <div className="divide-y divide-si-border">
              {keys.map((k) => {
                const cls = classify(services[k]);
                const dot = cls === 'ok' ? 'bg-emerald-500' : cls === 'warn' ? 'bg-amber-500' : 'bg-rose-500';
                const txt = cls === 'ok' ? 'text-emerald-400' : cls === 'warn' ? 'text-amber-400' : 'text-rose-400';
                return (
                  <div key={k} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-si-2">{LABELS[k] || k}</span>
                    <span className={`flex items-center gap-2 text-xs font-semibold ${txt}`}>
                      <span className={`w-2 h-2 rounded-full ${dot}`} /> {services[k]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[10px] text-si-4 uppercase tracking-[0.15em]">
            Atualizado {new Date(data.timestamp || Date.now()).toLocaleString('pt-BR')}
          </p>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: LucideIcon;
}) {
  return (
    <div className="bg-si-card border border-si-border-md rounded-xl p-4 flex flex-col justify-between min-h-[100px]">
      <span className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} /> {label}
      </span>
      <div className="mt-3">
        <span className={`text-2xl font-bold tracking-tight ${color}`}>{value}</span>
        <span className="block text-[10px] text-si-4 mt-1">{sub}</span>
      </div>
    </div>
  );
}
