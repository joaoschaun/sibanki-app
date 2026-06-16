import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { TOGGLEABLE_MODULES } from '../../constants/appModules';
import { getAdminEnv, type AdminEnv } from '../../utils/adminEnv';
import { AdminEnvSwitch } from '../../components/admin/AdminEnvSwitch';

const GROUP_LABEL: Record<string, string> = { core: 'Principal', mais: 'Mais' };
const GROUPS = ['core', 'mais'] as const;

export default function AdminModulos() {
  const [env, setEnv] = useState<AdminEnv>(getAdminEnv());
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'config', 'modules'));
        const full = snap.exists() ? (snap.data() as Record<string, any>) : {};
        if (active) setFlags((full[env] || {}) as Record<string, boolean>);
      } catch (e) {
        console.error('[AdminModulos] Load error:', e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [env]);

  const isOn = (key: string, def: boolean) => (key in flags ? flags[key] : def);
  const toggle = (key: string, val: boolean) => setFlags((p) => ({ ...p, [key]: val }));

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, boolean> = {};
      TOGGLEABLE_MODULES.forEach((m) => {
        payload[m.key] = isOn(m.key, m.default);
      });
      await setDoc(doc(db, 'config', 'modules'), { [env]: payload }, { merge: true });
      showToast(`Módulos salvos em ${env === 'prod' ? 'PRODUÇÃO' : 'Staging'}!`);
    } catch (e) {
      console.error('[AdminModulos] Save error:', e);
      showToast('Erro ao salvar módulos.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase">Carregando módulos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">MÓDULOS DO APP</h1>
          <p className="text-xs text-si-4 font-medium mt-1">
            Ligue ou desligue módulos de navegação — efeito imediato no app, sem deploy
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.18em] uppercase text-si-1 flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : '💾 Salvar Tudo'}
        </button>
      </div>

      <AdminEnvSwitch env={env} onChange={setEnv} scopeLabel="Módulos" />

      <p className="text-[10px] text-si-4 font-medium">
        Essenciais (Assistente, Painel, Perfil, Configurações) ficam sempre ligados para não travar o app.
      </p>

      {GROUPS.map((g) => {
        const items = TOGGLEABLE_MODULES.filter((m) => m.group === g);
        if (!items.length) return null;
        return (
          <div key={g} className="space-y-3">
            <h3 className="text-[10px] font-bold tracking-[0.18em] text-si-4 uppercase">{GROUP_LABEL[g]}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((m) => {
                const active = isOn(m.key, m.default);
                return (
                  <div key={m.key} className="bg-si-card border border-si-border-md rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-si-1 leading-snug">{m.label}</h4>
                        <code className="block text-[8px] font-mono text-si-5 bg-si-bg py-0.5 px-1.5 rounded w-fit">{m.key}</code>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={(e) => toggle(m.key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-si-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-si-4 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-950 peer-checked:after:bg-blue-500/100 peer-checked:after:border-blue-500" />
                      </label>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-emerald-500' : 'text-si-4'}`}>
                      ● {active ? 'Visível' : 'Oculto'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-emerald-950 border border-emerald-500/20 text-emerald-400 py-3 px-5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}
    </div>
  );
}
