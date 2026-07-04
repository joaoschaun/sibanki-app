import { Capacitor } from '@capacitor/core';
import { Bell } from 'lucide-react';
import { RoundUpToggle } from '../ui/RoundUpWidget';
import type { UsePushNotificationsReturn } from '../../hooks/usePushNotifications';

interface NotificationsSectionProps {
  emailWeekly: boolean;
  setEmailWeekly: (v: boolean) => void;
  budgetAlerts: boolean;
  setBudgetAlerts: (v: boolean) => void;
  briefingDiario: boolean;
  setBriefingDiario: (v: boolean) => void;
  telegramEnabled: boolean;
  setTelegramEnabled: (v: boolean) => void;
  whatsEnabled: boolean;
  setWhatsEnabled: (v: boolean) => void;
  push: UsePushNotificationsReturn;
  biometricsSupported: boolean;
  biometricsEnabled: boolean;
  setBiometricsEnabled: (v: boolean) => void;
  busy: boolean;
  onSave: () => void;
  /** True when the user has no phone saved yet — shows helper badge on WhatsApp */
  phoneMissing?: boolean;
}

export function NotificationsSection({
  emailWeekly, setEmailWeekly,
  budgetAlerts, setBudgetAlerts,
  briefingDiario, setBriefingDiario,
  telegramEnabled, setTelegramEnabled,
  whatsEnabled, setWhatsEnabled,
  push,
  biometricsSupported, biometricsEnabled, setBiometricsEnabled,
  busy,
  onSave,
  phoneMissing,
}: NotificationsSectionProps) {
  return (
    <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-si-1">Notificações e integrações</h3>
        <p className="text-si-5 text-sm mt-1">Ative canais de notificações, lembretes e alertas.</p>
      </div>

      {/* ── Alertas por E-mail ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5">E-mail</p>
        <label id="notificacoes" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md cursor-pointer">
          <div>
            <p className="text-sm text-si-3">Resumo semanal por e-mail</p>
            <p className="text-[11px] text-si-5 mt-0.5">Toda segunda-feira: receitas, despesas e top categorias da semana.</p>
          </div>
          <input
            type="checkbox"
            checked={emailWeekly}
            onChange={(e) => setEmailWeekly(e.target.checked)}
            className="rounded border-si-border-xl bg-si-bg shrink-0"
          />
        </label>
        <label className="flex items-start justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-si-3">Briefing diário</span>
            <span className="text-[11px] text-si-5">Enviado por e-mail seg–sex às 7h30, somente quando há alertas ou metas relevantes.</span>
          </div>
          <input
            type="checkbox"
            checked={briefingDiario}
            onChange={(e) => setBriefingDiario(e.target.checked)}
            className="rounded border-si-border-xl bg-si-bg mt-0.5 shrink-0"
          />
        </label>
      </div>

      {/* ── Alertas de orçamento ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5">Alertas</p>
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md">
          <div>
            <span className="text-sm text-si-3">Alertas de orçamento (quando ultrapassar limite)</span>
          </div>
          <input
            type="checkbox"
            checked={budgetAlerts}
            onChange={(e) => setBudgetAlerts(e.target.checked)}
            className="rounded border-si-border-xl bg-si-bg"
          />
        </label>
      </div>

      {/* ── Canais de mensageria ── */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-si-5">Canais</p>
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md">
          <div>
            <span className="text-sm text-si-3">Telegram</span>
            <span className="text-[11px] text-si-5 block">Receba alertas e registre gastos pelo bot Telegram.</span>
          </div>
          <input
            type="checkbox"
            checked={telegramEnabled}
            onChange={(e) => setTelegramEnabled(e.target.checked)}
            className="rounded border-si-border-xl bg-si-bg"
          />
        </label>
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md">
          <div className="flex-1">
            <span className="text-sm text-si-3">WhatsApp</span>
            <span className="text-[11px] text-si-5 block">Relatórios semanais e alertas do Sentinela direto no celular.</span>
            {phoneMissing && whatsEnabled && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                ⚠ Cadastre o telefone no Perfil para receber mensagens
              </span>
            )}
          </div>
          <input
            type="checkbox"
            checked={whatsEnabled}
            onChange={(e) => setWhatsEnabled(e.target.checked)}
            className="rounded border-si-border-xl bg-si-bg"
          />
        </label>
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-si-4" />
            <div>
              <span className="text-sm text-si-3">Notificações push</span>
              <span className="text-[11px] text-si-5 block">Alertas instantâneos no navegador ou app mobile.</span>
            </div>
          </div>
          {push.isEnabled ? (
            <span className="text-xs font-bold text-emerald-400 px-2 py-1 rounded-lg bg-emerald-500/10">Ativo</span>
          ) : push.supported ? (
            <button type="button" onClick={push.requestPermission} disabled={push.loading}
              className="px-3 py-1.5 rounded-lg bg-si-over-2 text-si-2 text-xs font-bold hover:bg-si-over-3 disabled:opacity-50">
              {push.loading ? 'Ativando…' : 'Ativar'}
            </button>
          ) : (
            <span className="text-xs text-si-5">Não suportado</span>
          )}
        </div>
        {push.error && <p className="text-xs text-rose-400">{push.error}</p>}
      </div>

      {/* Biometria (Face ID / Digital) */}
      {Capacitor.isNativePlatform() && biometricsSupported ? (
        <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md">
          <span className="text-sm text-si-3">Desbloqueio por biometria (Face ID / Digital)</span>
          <input
            type="checkbox"
            checked={biometricsEnabled}
            onChange={(e) => {
              const val = e.target.checked;
              setBiometricsEnabled(val);
              try {
                localStorage.setItem('sibanki_biometrics_enabled', String(val));
              } catch (err) {
                console.error('Erro ao salvar biometria:', err);
              }
            }}
            className="rounded border-si-border-xl bg-si-bg"
          />
        </label>
      ) : (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-si-bg border border-si-border-md opacity-60">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-si-4">Desbloqueio por biometria</span>
            <span className="text-[11px] text-si-5">Disponível apenas no aplicativo mobile.</span>
          </div>
          <input
            type="checkbox"
            disabled
            checked={false}
            className="rounded border-si-border-xl bg-si-bg opacity-40 cursor-not-allowed"
          />
        </div>
      )}

      <RoundUpToggle />
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 text-sm font-bold"
      >
        {busy ? 'Salvando…' : 'Salvar plano e integrações'}
      </button>
    </section>
  );
}
