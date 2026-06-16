import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { getAdminEnv, type AdminEnv } from '../../utils/adminEnv';
import { AdminEnvSwitch } from '../../components/admin/AdminEnvSwitch';

interface FeatureDef {
  label: string;
  desc: string;
  plans: string[];
  default: boolean;
}

const DEFAULT_FLAGS: Record<string, FeatureDef> = {
  briefing_ia: {
    label: 'Briefing Inteligente IA',
    desc: 'Resumo financeiro ao abrir o app para planos pagos',
    plans: ['pro', 'familia'],
    default: true,
  },
  ia_consultor: {
    label: 'Consultor IA (chat)',
    desc: 'Conversa com IA (Siba) sobre finanças pessoais',
    plans: ['free', 'pro', 'familia'],
    default: true,
  },
  ia_insights_produto: {
    label: 'Insights de Produtos',
    desc: 'Sugestões táticas de investimento B3 e renda fixa',
    plans: ['free', 'pro', 'familia'],
    default: true,
  },
  flash_banners: {
    label: 'Alertas Contextuais',
    desc: 'Banners e cartões de alerta de orçamento/limites',
    plans: ['free', 'pro', 'familia'],
    default: true,
  },
  dashboard_customizavel: {
    label: 'Dashboard Customizável',
    desc: 'Arrastar/ocultar widgets da tela inicial',
    plans: ['free', 'pro', 'familia'],
    default: true,
  },
  familia_compartilhado: {
    label: 'Modo Família',
    desc: 'Finanças compartilhadas e sincronizadas em casal',
    plans: ['familia'],
    default: true,
  },
  whatsapp_bot: {
    label: 'Bot WhatsApp',
    desc: 'Lançar gastos e consultar status via Meta API',
    plans: ['pro', 'familia'],
    default: true,
  },
  relatorio_pdf: {
    label: 'Relatório Mensal PDF',
    desc: 'Exportar relatórios em formato PDF',
    plans: ['pro', 'familia'],
    default: false,
  },
  open_finance: {
    label: 'Open Finance (Pluggy)',
    desc: 'Sincronização bancária automática em background',
    plans: ['pro', 'familia'],
    default: false,
  },
  ocr_foto: {
    label: 'Lançamento por Foto',
    desc: 'Extração automática de comprovantes por foto',
    plans: ['pro', 'familia'],
    default: true,
  },
  stt_voz: {
    label: 'Lançamento por Voz',
    desc: 'Criação de lançamentos a partir de comandos de voz',
    plans: ['pro', 'familia'],
    default: true,
  },
};

export default function AdminFlags() {
  const [env, setEnv] = useState<AdminEnv>(getAdminEnv());
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [customFlags, setCustomFlags] = useState<Record<string, FeatureDef>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for new custom flag
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    let active = true;
    async function loadFlags() {
      try {
        setLoading(true);
        const docSnap = await getDoc(doc(db, 'config', 'featureFlags'));
        const full = docSnap.exists() ? (docSnap.data() as Record<string, any>) : {};
        const data = (full[env] || {}) as Record<string, boolean>; // fatia do ambiente
        if (active) {
          setFlags(data);

          // Find custom flags that are in Firestore but not in DEFAULT_FLAGS
          const foundCustom: Record<string, FeatureDef> = {};
          Object.keys(data).forEach((key) => {
            if (!DEFAULT_FLAGS[key]) {
              foundCustom[key] = {
                label: key,
                desc: 'Flag customizada',
                plans: ['pro', 'familia'],
                default: false,
              };
            }
          });
          setCustomFlags(foundCustom);
        }
      } catch (err) {
        console.error('[AdminFlags] Load error:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadFlags();
    return () => {
      active = false;
    };
  }, [env]);

  const handleToggle = (key: string, val: boolean) => {
    setFlags((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'featureFlags'), { [env]: flags }, { merge: true });
      showToast(`Flags salvas em ${env === 'prod' ? 'PRODUÇÃO' : 'Staging'}!`);
    } catch (err) {
      console.error('[AdminFlags] Save error:', err);
      showToast('Erro ao salvar as flags.');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddCustomFlag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newKey.trim().replace(/\s+/g, '_').toLowerCase();
    if (!cleanKey) return;

    const newDef: FeatureDef = {
      label: newLabel.trim() || cleanKey,
      desc: newDesc.trim() || 'Flag criada manualmente no painel admin',
      plans: ['pro', 'familia'],
      default: false,
    };

    setCustomFlags((prev) => ({ ...prev, [cleanKey]: newDef }));
    setFlags((prev) => ({ ...prev, [cleanKey]: false }));

    setNewKey('');
    setNewLabel('');
    setNewDesc('');
    showToast('Flag customizada adicionada. Salve para confirmar.');
  };

  const allFlagsMap = { ...DEFAULT_FLAGS, ...customFlags };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-si-border border-t-si-3 rounded-full animate-spin" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-si-4 uppercase">Carregando flags...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black tracking-[-0.02em] text-si-1">FEATURE FLAGS</h1>
          <p className="text-xs text-si-4 font-medium mt-1">
            Controle remoto de recursos em tempo real (sem necessidade de deploy)
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.18em] uppercase text-si-1 flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : '💾 Salvar Tudo'}
        </button>
      </div>

      <AdminEnvSwitch env={env} onChange={setEnv} scopeLabel="Feature Flags" />

      {/* Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(allFlagsMap).map(([key, def]) => {
          const isActive = flags[key] ?? def.default;
          const planLabel: Record<string, string> = { free: 'Gratuito', pro: 'Pro', familia: 'Família' };
          const planColors: Record<string, string> = { 
            free: 'bg-zinc-800 text-zinc-400 border border-zinc-700/20', 
            pro: 'bg-blue-950/30 text-blue-500 border border-blue-500/10', 
            familia: 'bg-purple-950/30 text-purple-500 border border-purple-500/10' 
          };

          return (
            <div key={key} className="bg-si-card border border-si-border-md rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-xs font-bold text-si-1 leading-snug">{def.label}</h4>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => handleToggle(key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-si-bg peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-si-4 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-950 peer-checked:after:bg-blue-500/100 peer-checked:after:border-blue-500" />
                  </label>
                </div>
                <p className="text-[10px] text-si-4 leading-normal font-medium">{def.desc}</p>
                <code className="block text-[8px] font-mono text-si-5 bg-si-bg py-0.5 px-1.5 rounded w-fit">
                  {key}
                </code>
              </div>
              <div className="flex items-center justify-between border-t border-si-border/30 pt-3">
                <div className="flex gap-1">
                  {def.plans.map((p) => (
                    <span key={p} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${planColors[p]}`}>
                      {planLabel[p]}
                    </span>
                  ))}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-500' : 'text-si-4'}`}>
                  ● {isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Flag Form */}
      <div className="bg-si-card border border-si-border-md rounded-xl p-5">
        <h3 className="text-xs font-bold tracking-[0.18em] text-si-3 uppercase flex items-center gap-1.5 mb-4">
          <Plus className="w-4 h-4 text-blue-500" /> Adicionar Custom Feature Flag
        </h3>
        <form onSubmit={handleAddCustomFlag} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">Chave da Flag (key)</label>
            <input
              type="text"
              required
              placeholder="ex: nova_funcionalidade"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">Rótulo (Label)</label>
            <input
              type="text"
              required
              placeholder="ex: Nova Funcionalidade"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-bold tracking-[0.15em] text-si-4 uppercase">Descrição</label>
            <input
              type="text"
              placeholder="ex: Libera o novo modulo para teste..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.15em] uppercase text-si-1 transition-all duration-200"
          >
            + Criar Localmente
          </button>
        </form>
      </div>

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-950 border border-emerald-500/20 text-emerald-400 py-3 px-5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <CheckCircle className="w-4 h-4" /> {toastMessage}
        </div>
      )}
    </div>
  );
}
