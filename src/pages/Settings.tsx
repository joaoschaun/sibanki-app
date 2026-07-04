import { useEffect, useState, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { GenericPageSkeleton } from '../components/ui/PageSkeleton';
import { useAppContext } from '../context/AppContext';
import { resetUserData, updateUserDoc, updateGuardianConfig } from '../services/persistUserData';
import type { Entry, Investment, Goal, Recurrent, GuardianRule, GuardianConfig } from '../types/userData';
// generateReportPdf carregado via dynamic import (evita vendor-pdf no load inicial)
import { Modal } from '../components/ui/Modal';
import { Database, Trash2, Upload, FileDown, FileText, MapPin, ArrowRight, Sparkles, Building2, RefreshCw } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { httpsCallable } from 'firebase/functions';
import { fnsBR } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { useDashboardMode } from '../hooks/useDashboardMode';
/** Acao 18: Modo Sugestivo (insights proativos da IA) */
import { useSuggestiveMode } from '../hooks/useSuggestiveMode';
import { OpenFinanceConnect } from '../components/openFinance/OpenFinanceConnect';
import { AsaasPixModal } from '../components/billing/AsaasPixModal';
import { NotificationsSection } from '../components/settings/NotificationsSection';
import { GuardianSection } from '../components/settings/GuardianSection';
import { BillingSection } from '../components/settings/BillingSection';

/**
 * Provedor de billing ativo. 'asaas' (default — conta Stripe BR travada no
 * onboarding) ou 'stripe'. Trocar via VITE_BILLING_PROVIDER sem mexer em código.
 */
const BILLING_PROVIDER = (import.meta.env.VITE_BILLING_PROVIDER as string | undefined) === 'stripe' ? 'stripe' : 'asaas';

export default function Settings() {
  const { user, data, entries, entriesInline, accounts, accountBalances, cards, goals, investments, budgets, categories, recurrents, loading } = useAppContext();
  const userName = user?.displayName ?? (data?.name as string) ?? '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupDone, setBackupDone] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  /** Acao 17: ativo enquanto o Gemini categoriza lancamentos do CSV */
  const [aiCategorizing, setAiCategorizing] = useState(false);
  const [ofSyncBusy, setOfSyncBusy] = useState(false);
  const [ofSyncMsg, setOfSyncMsg] = useState<string | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  /**
   * Ação #1 (Análise 360): o plano efetivo vem de `data.plan` — campo gravado
   * SOMENTE pelo webhook Stripe (Admin SDK). O antigo toggle local
   * `settings.planType` virou vulnerabilidade (usuário se promovia a Pro) e
   * foi removido; o campo legado segue lido apenas para exibição.
   */
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [pixModalData, setPixModalData] = useState<{
    paymentId: string;
    invoiceUrl: string;
    planLabel: string;
  } | null>(null);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [whatsEnabled, setWhatsEnabled] = useState(false);
  const [emailWeekly, setEmailWeekly] = useState(false);
  const [budgetAlerts, setBudgetAlerts] = useState(false);
  const [briefingDiario, setBriefingDiario] = useState(false);
  // ── Guardião Financeiro ────────────────────────────────────────────────────
  const [guardianEnabled, setGuardianEnabled] = useState(false);
  const [guardianRules, setGuardianRules] = useState<GuardianRule[]>([]);
  const [guardianSaving, setGuardianSaving] = useState(false);
  const [addingRule, setAddingRule] = useState(false);
  const [newRuleCategory, setNewRuleCategory] = useState('');
  const [newRuleThreshold, setNewRuleThreshold] = useState(80);
  const [newRuleCooldown, setNewRuleCooldown] = useState(12);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { mode: dashboardMode, setMode: setDashboardMode } = useDashboardMode();
  const push = usePushNotifications(user?.uid);
  /** Acao 18 */
  const { suggestiveMode, toggleSuggestiveMode } = useSuggestiveMode();

  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(() => {
    try {
      return localStorage.getItem('sibanki_biometrics_enabled') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const checkBiometrics = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
        const result = await NativeBiometric.isAvailable();
        setBiometricsSupported(result.isAvailable);
      } catch (err) {
        console.error('[Biometrics] Erro ao checar suporte:', err);
      }
    };
    checkBiometrics();
  }, []);

  const quickActions = [
    { label: 'Novo lançamento', hint: 'Ir para Lançamentos', to: '/lancamentos' },
    { label: 'Cadastrar conta', hint: 'Ir para Contas', to: '/contas' },
    { label: 'Cadastrar cartão', hint: 'Ir para Cartões', to: '/cartoes' },
    { label: 'Criar meta', hint: 'Ir para Planejamento', to: '/planejamento' },
    { label: 'Abrir Consultor IA', hint: 'Ir para Consultor', to: '/consultor-ia' },
  ] as const;

  useEffect(() => {
    const s = (data as any)?.settings;
    if (!s) return;
    setTelegramEnabled(Boolean(s.telegramEnabled));
    setWhatsEnabled(Boolean(s.whatsEnabled));
    setEmailWeekly(Boolean(s.emailWeekly));
    setBudgetAlerts(Boolean(s.budgetAlerts));
    setBriefingDiario(Boolean((data as any)?.briefingDiarioEmail));
    // Guardião
    const gc = (data as any)?.guardianConfig;
    if (gc) {
      setGuardianEnabled(Boolean(gc.enabled));
      setGuardianRules(Array.isArray(gc.rules) ? gc.rules : []);
    }
  }, [data]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#open-finance') return;
    const el = document.getElementById('open-finance');
    if (el) {
      window.requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [loading]);

  // ── Guardião handlers ────────────────────────────────────────────────────
  const handleSaveGuardian = async (newEnabled: boolean, newRules: GuardianRule[]) => {
    if (!user?.uid) return;
    setGuardianSaving(true);
    try {
      const config: GuardianConfig = {
        enabled: newEnabled,
        rules: newRules,
        configuredAt: new Date().toISOString(),
      };
      await updateGuardianConfig(user.uid, config);
    } catch (e) {
      console.error('Erro ao salvar Guardião:', e);
    } finally {
      setGuardianSaving(false);
    }
  };

  const handleToggleGuardian = async (val: boolean) => {
    setGuardianEnabled(val);
    await handleSaveGuardian(val, guardianRules);
  };

  const handleToggleRule = async (ruleId: string, val: boolean) => {
    const updated = guardianRules.map((r) => r.id === ruleId ? { ...r, enabled: val } : r);
    setGuardianRules(updated);
    await handleSaveGuardian(guardianEnabled, updated);
  };

  const handleDeleteRule = async (ruleId: string) => {
    const updated = guardianRules.filter((r) => r.id !== ruleId);
    setGuardianRules(updated);
    await handleSaveGuardian(guardianEnabled, updated);
  };

  const handleAddRule = async () => {
    if (!newRuleCategory) return;
    const newRule: GuardianRule = {
      id: `guardian_${Date.now()}`,
      category: newRuleCategory,
      label: newRuleCategory,
      thresholdPct: newRuleThreshold,
      cooldownHours: newRuleCooldown,
      enabled: true,
    };
    const updated = [...guardianRules, newRule];
    setGuardianRules(updated);
    setAddingRule(false);
    setNewRuleCategory('');
    setNewRuleThreshold(80);
    setNewRuleCooldown(12);
    await handleSaveGuardian(guardianEnabled, updated);
  };

  const handleBackupJson = () => {
    const payload = {
      entries: entries ?? [],
      investments: investments ?? [],
      goals: goals ?? [],
      budgets: budgets ?? {},
      categories: categories ?? [],
      accounts: accounts ?? [],
      accountBalances: accountBalances ?? {},
      recurrents: (data as any)?.recurrents ?? [],
      cards: cards ?? [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sibanki_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupDone(true);
    setTimeout(() => setBackupDone(false), 3000);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    e.target.value = '';
    setImportMessage(null);
    setError(null);
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text) as {
          entries?: Entry[];
          investments?: unknown[];
          goals?: unknown[];
          budgets?: Record<string, unknown>;
          categories?: string[];
          accounts?: string[];
          accountBalances?: Record<string, number>;
          recurrents?: unknown[];
        };
        const base = Date.now();
        const importedEntries = (parsed.entries ?? []).map((e, i) => ({
          ...e,
          id: typeof (e as Entry).id === 'number' ? (e as Entry).id : base + i,
        })) as Entry[];
        const newEntries = [...entriesInline, ...importedEntries];
        const newInvestments = [...investments, ...(parsed.investments ?? [])] as Investment[];
        const newGoals = [...goals, ...(parsed.goals ?? [])] as Goal[];
        const newBudgets = { ...budgets, ...(parsed.budgets ?? {}) };
        const newCategories = [...new Set([...categories, ...(parsed.categories ?? [])])];
        const newAccounts = [...new Set([...accounts, ...(parsed.accounts ?? [])])];
        const newAccountBalances = { ...accountBalances, ...(parsed.accountBalances ?? {}) };
        const newRecurrents = (Array.isArray(parsed.recurrents) ? parsed.recurrents : recurrents) as Recurrent[];
        await updateUserDoc(user.uid, {
          entries: newEntries,
          investments: newInvestments,
          goals: newGoals,
          budgets: newBudgets,
          categories: newCategories,
          accounts: newAccounts,
          accountBalances: newAccountBalances,
          recurrents: newRecurrents,
        });
        const parts = [];
        if (importedEntries.length) parts.push(`${importedEntries.length} lançamentos`);
        if (parsed.investments?.length) parts.push(`${parsed.investments.length} investimentos`);
        if (parsed.goals?.length) parts.push(`${parsed.goals.length} metas`);
        if (Array.isArray(parsed.recurrents) && parsed.recurrents.length) parts.push(`${parsed.recurrents.length} recorrentes`);
        setImportMessage({ type: 'ok', text: `Importado: ${parts.join(', ') || 'dados'}.` });
      } catch (err) {
        setImportMessage({ type: 'err', text: (err instanceof Error ? err.message : 'JSON inválido ou formato não reconhecido.') });
      } finally {
        setBusy(false);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCsvLine = (line: string): string[] => {
    const out: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let s = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { s += '"'; i += 2; continue; }
          if (line[i] === '"') { i++; break; }
          s += line[i++];
        }
        out.push(s);
      } else {
        let s = '';
        while (i < line.length && line[i] !== ',') s += line[i++];
        out.push(s.trim());
        if (line[i] === ',') i++;
      }
    }
    return out;
  };

  /**
   * Acao 17 -- handleImportCsv com categorizacao IA
   *
   * Fluxo:
   *   1. Parseia CSV (formato: Data,Tipo,Descricao,Categoria,Valor,Conta)
   *   2. Identifica lancamentos sem categoria definida (vazia ou "Outros")
   *   3. Chama Cloud Function aiCategorizeCsv (Gemini Flash, batch de 50)
   *   4. Aplica categorias sugeridas e salva no Firestore
   *
   * Fallback gracioso: se a IA falhar, usa "Outros" e continua normalmente.
   */
  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    e.target.value = '';
    setImportMessage(null);
    setError(null);
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = (ev.target?.result as string) || '';
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          setImportMessage({ type: 'err', text: 'Arquivo vazio ou sem linhas de dados.' });
          setBusy(false);
          return;
        }
        const base = Date.now();
        const newEntries: Entry[] = [];

        // Passagem 1: parseia todas as linhas
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (cols.length < 5) continue;
          const date = cols[0]?.trim() ?? '';
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          const tipoStr = (cols[1] ?? '').toLowerCase();
          const type = tipoStr.includes('rec') ? 'receita' : 'despesa';
          const desc = (cols[2] ?? '').trim();
          const category = (cols[3] ?? '').trim() || '';
          const value = parseFloat((cols[4] ?? '0').replace(',', '.')) || 0;
          const account = (cols[5] ?? '').trim();
          const item: Entry = {
            id: base + i,
            type,
            date,
            category: category || 'Outros',
            value,
          };
          if (desc) item.desc = desc;
          if (account) item.account = account;
          newEntries.push(item);
        }

        if (newEntries.length === 0) {
          setImportMessage({ type: 'err', text: 'Nenhum lançamento válido no CSV. Use cabeçalho: Data,Tipo,Descrição,Categoria,Valor,Conta' });
          setBusy(false);
          return;
        }

        // Passagem 2: identifica itens sem categoria para enriquecer com IA
        const toAiCategorize = newEntries
          .map((entry, idx) => ({ index: idx, entry }))
          .filter(({ entry }) => !entry.category || entry.category === 'Outros')
          .map(({ index, entry }) => ({
            index,
            desc: entry.desc ?? '',
            type: entry.type,
          }));

        if (toAiCategorize.length > 0) {
          try {
            setAiCategorizing(true);
            const BATCH_SIZE = 50;
            for (let b = 0; b < toAiCategorize.length; b += BATCH_SIZE) {
              const batch = toAiCategorize.slice(b, b + BATCH_SIZE);
              const categorize = httpsCallable<
                { items: { index: number; desc: string; type: string }[] },
                { results: { index: number; category: string }[] }
              >(fnsBR, 'aiCategorizeCsv');
              const result = await categorize({ items: batch });
              for (const { index, category } of result.data.results) {
                newEntries[index].category = category;
              }
            }
          } catch {
            // Fallback silencioso: mantém "Outros" se IA falhar
          } finally {
            setAiCategorizing(false);
          }
        }

        const merged = [...entriesInline, ...newEntries];
        await updateUserDoc(user.uid, { entries: merged });

        const aiNote = toAiCategorize.length > 0
          ? ` (${toAiCategorize.length} categorizados por IA)`
          : '';
        setImportMessage({ type: 'ok', text: `${newEntries.length} lançamentos importados${aiNote}.` });
      } catch (err) {
        setImportMessage({ type: 'err', text: (err instanceof Error ? err.message : 'Erro ao importar CSV.') });
      } finally {
        setBusy(false);
        setAiCategorizing(false);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleReset = async () => {
    if (!user?.uid) return;
    const msg1 = 'Tem certeza? Todos os lançamentos, metas, contas, investimentos e categorias serão apagados. Sua conta de login continua. Esta ação não pode ser desfeita.';
    const msg2 = 'Última confirmação: realmente apagar TUDO e recomeçar do zero?';
    if (!window.confirm(msg1)) return;
    if (!window.confirm(msg2)) return;
    setError(null);
    setBusy(true);
    try {
      await resetUserData(user.uid, {
        name: user.displayName ?? (data?.name as string) ?? undefined,
        email: user.email ?? undefined,
      });
      navigate('/', { replace: true });
      window.location.reload(); // recarrega para limpar estado do hook
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao apagar dados.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveIntegrations = async () => {
    if (!user?.uid) return;
    setBusy(true);
    setError(null);
    try {
      // Salva campos raiz lidos pelas Cloud Functions + campos de settings
      await updateUserDoc(user.uid, {
        resumoSemanalEmail: emailWeekly,   // lido por weeklySummaryEmailService
        briefingDiarioEmail: briefingDiario, // lido por dailyBriefingEmailService
        settings: {
          ...((data as any)?.settings ?? {}),
          telegramEnabled,
          whatsEnabled,
          emailWeekly,
          budgetAlerts,
        },
      } as any);
      setImportMessage({ type: 'ok', text: 'Configurações de plano e integrações salvas.' });
      setTimeout(() => setImportMessage(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar integrações.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <GenericPageSkeleton rows={4} />;

  const ofRaw = data?.openFinanceStatus;
  const ofLegacyAtivo = Boolean(data?.openBankingAtivo);
  const ofConnected = ofRaw === 'ativo' || ofLegacyAtivo;
  const ofBadgeClass = ofConnected
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : ofRaw === 'conectando'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : ofRaw === 'erro'
        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
        : ofRaw === 'expirado'
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          : 'bg-si-over-2 text-si-4 border-si-border-md';
  const handlePluggySyncAccounts = async () => {
    if (!user?.uid) return;
    setOfSyncMsg(null);
    setOfSyncBusy(true);
    try {
      const sync = httpsCallable<unknown, { ok?: boolean; synced?: number; message?: string }>(
        fnsBR,
        'pluggySyncAccounts',
      );
      const res = await sync({});
      const m = res.data?.message ?? (res.data?.synced ? `${res.data.synced} conta(s) atualizada(s).` : 'Sincronizado.');
      setOfSyncMsg(m);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Falha ao sincronizar.';
      setOfSyncMsg(msg);
    } finally {
      setOfSyncBusy(false);
    }
  };

  const ofBadgeText = ofConnected
    ? 'Conectado'
    : ofRaw === 'conectando'
      ? 'Conectando…'
      : ofRaw === 'erro'
        ? 'Erro — tente reconectar'
        : ofRaw === 'expirado'
          ? 'Expirado — reconecte'
          : 'Não conectado';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Configurações</h2>
        <p className="text-si-5 text-sm">Tema, backup e opções avançadas</p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <section
        id="open-finance"
        className="bg-si-card rounded-2xl border border-blue-500/25 p-6 space-y-4 ring-1 ring-blue-500/15"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-si-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400 shrink-0" aria-hidden />
              Open Finance — conexão com bancos
            </h3>
            <p className="text-si-5 text-sm mt-1 max-w-2xl">
              Autorize a leitura das suas contas no ambiente oficial do seu banco (Open Finance, regulado pelo Banco
              Central). O Sibanki não pede senha de acesso ao banco e não movimenta seu dinheiro — apenas organiza dados
              para você enxergar saldo, cartões e lançamentos com menos trabalho manual.
            </p>
            <ul className="mt-3 text-sm text-si-4 space-y-1 list-disc list-inside">
              <li>
                <strong className="text-si-3">Sincronizar</strong> importa contas, saldos,{' '}
                <strong className="text-si-3">lançamentos</strong> (últimos {90} dias), cartões de crédito, investimentos e{' '}
                <strong className="text-si-3">empréstimos</strong> (contratos Pluggy); atualiza também o resumo de crédito e o
                finScore
              </li>
              <li>Lançamentos vindos da Pluggy ficam marcados como Open Finance e podem coexistir com lançamentos manuais</li>
              <li>Você pode revogar o acesso quando quiser no fluxo do banco ou do conector</li>
            </ul>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0 min-w-[min(100%,280px)]">
            <span
              className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border self-end ${ofBadgeClass}`}
            >
              {ofBadgeText}
            </span>
            {user?.uid ? (
              <OpenFinanceConnect uid={user.uid} data={data} theme={theme} disabled={busy} />
            ) : null}
            {user?.uid && ofConnected ? (
              <button
                type="button"
                onClick={handlePluggySyncAccounts}
                disabled={ofSyncBusy}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-si-over-2 border border-si-border-md text-si-2 text-sm font-medium hover:bg-si-over-3 disabled:opacity-50"
              >
                {ofSyncBusy ? (
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <RefreshCw className="w-4 h-4 shrink-0" />
                )}
                Sincronizar contas (Pluggy)
              </button>
            ) : null}
            {ofSyncMsg ? (
              <p className="text-[11px] text-si-4 text-left sm:text-right max-w-[280px]">{ofSyncMsg}</p>
            ) : null}
            <a
              href="/app"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-2 text-sm font-medium hover:bg-si-over-3"
            >
              Abrir app web (legado)
              <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-[11px] text-si-5 text-left sm:text-right max-w-[280px]">
              A conexão Open Finance pode ser feita aqui com o mesmo login. Se preferir o fluxo antigo ou o widget não
              abrir, use <span className="text-si-4">/app</span> (mesma conta).
            </p>
          </div>
        </div>
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-si-1">Tema do aplicativo</h3>
            <p className="text-si-5 text-sm">
              Escolha entre modo escuro e claro. Sua preferência fica salva neste navegador.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-sm text-si-2 hover:bg-si-over-3"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-si-bg border border-si-border-md text-xs">
              {theme === 'light' ? '☀' : '🌙'}
            </span>
            {theme === 'light' ? 'Tema claro' : 'Tema escuro'}
          </button>
        </div>
        <div className="pt-4 border-t border-si-border">
          <h3 className="font-semibold text-si-1">Preferência do Dashboard</h3>
          <p className="text-si-5 text-sm mb-3">
            Escolha o estilo visual dos cards do Dashboard.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setDashboardMode('padrao')}
              className={`px-4 py-2 rounded-xl border text-sm ${dashboardMode === 'padrao' ? 'bg-white border-white text-zinc-900 font-semibold' : 'bg-si-over-2 border-si-border-md text-si-3 hover:bg-si-over-3'}`}
            >
              Padrão
            </button>
            <button
              type="button"
              onClick={() => setDashboardMode('caixa')}
              className={`px-4 py-2 rounded-xl border text-sm ${dashboardMode === 'caixa' ? 'bg-white border-white text-zinc-900 font-semibold' : 'bg-si-over-2 border-si-border-md text-si-3 hover:bg-si-over-3'}`}
            >
              Modo caixa
            </button>
          </div>

          {/* Acao 18 — Modo Sugestivo */}
          <h3 className="font-semibold text-si-1 mt-4">Modo Sugestivo</h3>
          <p className="text-si-5 text-sm mb-3">
            Quando ativo, a IA gera insights financeiros proativos automaticamente ao
            abrir o Dashboard. Desative para um modo mais silencioso.
          </p>
          <button
            type="button"
            onClick={toggleSuggestiveMode}
            aria-pressed={suggestiveMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors ${
              suggestiveMode
                ? 'bg-white border-white text-zinc-900 font-semibold'
                : 'bg-si-over-2 border-si-border-md text-si-3 hover:bg-si-over-3'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {suggestiveMode ? 'Modo Sugestivo ativo' : 'Modo Sugestivo inativo'}
          </button>

          <h3 className="font-semibold text-si-1">Idioma</h3>
          <p className="text-si-5 text-sm mb-3">
            Define o idioma preferido da interface.
          </p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'pt-BR' | 'en-US')}
            className="px-4 py-2 rounded-xl bg-si-bg border border-si-border-md text-sm text-si-2"
            aria-label="Selecionar idioma"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>
      </section>

      <BillingSection
        data={data}
        billingProvider={BILLING_PROVIDER}
        checkoutBusy={checkoutBusy}
        setCheckoutBusy={setCheckoutBusy}
        setError={setError}
        setPixModalData={setPixModalData}
      />

      <NotificationsSection
        emailWeekly={emailWeekly}
        setEmailWeekly={setEmailWeekly}
        budgetAlerts={budgetAlerts}
        setBudgetAlerts={setBudgetAlerts}
        briefingDiario={briefingDiario}
        setBriefingDiario={setBriefingDiario}
        telegramEnabled={telegramEnabled}
        setTelegramEnabled={setTelegramEnabled}
        whatsEnabled={whatsEnabled}
        setWhatsEnabled={setWhatsEnabled}
        push={push}
        biometricsSupported={biometricsSupported}
        biometricsEnabled={biometricsEnabled}
        setBiometricsEnabled={setBiometricsEnabled}
        busy={busy}
        onSave={handleSaveIntegrations}
        phoneMissing={!data?.phone && !data?.whatsappPhone}
      />

      <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-si-1 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            Tour guiado
          </h3>
          <p className="text-si-5 text-sm mt-1">
            Apresentação interativa de todos os módulos do app. Aparece automaticamente no primeiro acesso.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem('sibanki_tour_done');
            window.location.reload();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 font-medium text-sm"
        >
          <MapPin className="w-4 h-4" />
          Rever o tour guiado
        </button>
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-si-1">Ações rápidas</h3>
          <p className="text-si-5 text-sm mt-1">
            Atalhos para tarefas frequentes, sem precisar navegar por vários módulos.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {quickActions.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(item.to)}
              className="w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-si-over-2 hover:bg-si-over-3 border border-si-border-md text-left"
            >
              <span>
                <span className="block text-sm font-medium text-si-2">{item.label}</span>
                <span className="block text-xs text-si-5">{item.hint}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-si-5" />
            </button>
          ))}
        </div>
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-si-1 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            Dados e Backup
          </h3>
          <p className="text-si-5 text-sm mt-1">Exporte seus dados financeiros em JSON (mesmo formato do app atual).</p>
        </div>
        <button
          type="button"
          onClick={handleBackupJson}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-medium text-sm"
        >
          <Database className="w-4 h-4" />
          Backup JSON
        </button>
        {backupDone && (
          <p className="text-emerald-400 text-sm">Backup baixado com sucesso.</p>
        )}
        <p className="text-si-5 text-xs">
          Faça backup regularmente. O JSON inclui lançamentos, metas, investimentos, contas, cartões e configurações.
        </p>

        <div className="pt-4 border-t border-si-border">
          <p className="font-medium text-si-3 text-sm mb-2">Relatório PDF</p>
          <p className="text-si-5 text-xs mb-2">Gera um PDF com resumo do mês, lançamentos e despesas por categoria.</p>
          <button
            type="button"
            onClick={async () => {
              try {
                const { generateReportPdf } = await import('../utils/generateReportPdf');
                generateReportPdf({
                  userName,
                  entries,
                  investments,
                  goals,
                });
                setImportMessage({ type: 'ok', text: 'Relatório PDF gerado!' });
                setTimeout(() => setImportMessage(null), 3000);
              } catch (err) {
                setImportMessage({ type: 'err', text: (err instanceof Error ? err.message : 'Erro ao gerar PDF.') });
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 font-medium text-sm"
          >
            <FileDown className="w-4 h-4" />
            Gerar relatório PDF
          </button>
        </div>

        <div className="pt-6 border-t border-si-border">
          <p className="font-medium text-si-3 text-sm mb-3">Importar dados</p>
          <p className="text-si-5 text-xs mb-3">
            JSON: mescla com seus dados atuais. CSV: adiciona lançamentos (cabeçalho: Data,Tipo,Descrição,Categoria,Valor,Conta).
          </p>
          {importMessage && (
            <div
              className={`rounded-xl px-3 py-2 text-sm mb-3 ${importMessage.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
            >
              {importMessage.text}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJson}
              className="hidden"
              aria-label="Selecionar arquivo JSON para importar"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => jsonInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 font-medium text-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Importar JSON
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportCsv}
              className="hidden"
              aria-label="Selecionar arquivo CSV de lançamentos"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => csvInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 font-medium text-sm disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {aiCategorizing ? (<><Sparkles className="w-3 h-3 mr-1 animate-pulse inline" />Categorizando com IA...</>) : 'Importar CSV (lançamentos)'}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-si-1 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Privacidade e termos
          </h3>
          <p className="text-si-5 text-sm mt-1">Termos de uso e política de privacidade do app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLegalModal('terms')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 font-medium text-sm"
          >
            <FileText className="w-4 h-4" /> Termos de Uso
          </button>
          <button
            type="button"
            onClick={() => setLegalModal('privacy')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-si-over-3 hover:bg-si-over-4 border border-si-border-md text-si-2 font-medium text-sm"
          >
            <FileText className="w-4 h-4" /> Política de Privacidade
          </button>
        </div>
      </section>

      <GuardianSection
        guardianEnabled={guardianEnabled}
        guardianRules={guardianRules}
        guardianSaving={guardianSaving}
        addingRule={addingRule}
        setAddingRule={setAddingRule}
        newRuleCategory={newRuleCategory}
        setNewRuleCategory={setNewRuleCategory}
        newRuleThreshold={newRuleThreshold}
        setNewRuleThreshold={setNewRuleThreshold}
        newRuleCooldown={newRuleCooldown}
        setNewRuleCooldown={setNewRuleCooldown}
        budgetKeys={budgets ? Object.keys(budgets) : []}
        onToggleGuardian={handleToggleGuardian}
        onToggleRule={handleToggleRule}
        onDeleteRule={handleDeleteRule}
        onAddRule={handleAddRule}
      />

      <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-si-1 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            Recomeçar do zero
          </h3>
          <p className="text-si-5 text-sm mt-1">Apaga todos os lançamentos, metas, contas, cartões e investimentos. Sua conta de login permanece.</p>
        </div>
        <p className="text-si-4 text-sm">
          Esta ação não pode ser desfeita. Faça um backup antes se quiser guardar seus dados.
        </p>
        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-si-1 font-medium text-sm disabled:opacity-50 border border-rose-500/30"
        >
          <Trash2 className="w-4 h-4" />
          {busy ? 'Apagando…' : 'Apagar tudo e recomeçar'}
        </button>
      </section>

      <Modal
        open={legalModal !== null}
        onClose={() => setLegalModal(null)}
        title={legalModal === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}
      >
        <div className="max-h-[70vh] overflow-y-auto p-1 text-si-4 text-sm space-y-4">
          {legalModal === 'terms' && (
            <>
              <p><strong className="text-si-2">1. Aceitação.</strong> Ao utilizar o Sibanki, você concorda com estes Termos. Se não concordar, não utilize o aplicativo.</p>
              <p><strong className="text-si-2">2. Uso.</strong> O app é para controle financeiro pessoal. Use de forma lícita e responsável.</p>
              <p><strong className="text-si-2">3. Conta.</strong> Você é responsável por manter a confidencialidade do login.</p>
              <p><strong className="text-si-2">4. Dados.</strong> Seus dados são armazenados de forma segura. Faça backup periodicamente.</p>
              <p><strong className="text-si-2">5. Modificações.</strong> Podemos alterar estes Termos. O uso continuado após alterações constitui aceitação.</p>
              <p><strong className="text-si-2">6. Legislação.</strong> Regidos pela legislação brasileira (CDC e LGPD – Lei nº 13.709/2018).</p>
            </>
          )}
          {legalModal === 'privacy' && (
            <>
              <p><strong className="text-si-2">1. Dados coletados.</strong> E-mail, nome, dados financeiros que você insere (lançamentos, contas, metas) para oferecer o serviço.</p>
              <p><strong className="text-si-2">2. Uso.</strong> Para operar o app, personalizar sua experiência e melhorar o serviço.</p>
              <p><strong className="text-si-2">3. Armazenamento.</strong> Dados no Firebase (Google), com medidas de segurança.</p>
              <p><strong className="text-si-2">4. Compartilhamento.</strong> Não vendemos seus dados. Podemos compartilhar apenas quando exigido por lei.</p>
              <p><strong className="text-si-2">5. Seus direitos (LGPD).</strong> Acessar, corrigir, solicitar exclusão, revogar consentimento e exportar dados (JSON/CSV nas Configurações).</p>
              <p><strong className="text-si-2">6. Contato.</strong> Para dúvidas ou exercício dos direitos, use o e-mail de suporte disponível no app.</p>
            </>
          )}
        </div>
      </Modal>

      <AsaasPixModal
        open={pixModalData !== null}
        onClose={() => setPixModalData(null)}
        paymentId={pixModalData?.paymentId ?? ''}
        invoiceUrl={pixModalData?.invoiceUrl ?? ''}
        planLabel={pixModalData?.planLabel ?? ''}
      />
    </div>
  );
}
