import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppContext } from '../../context/AppContext';

function planLabelFromData(plan?: string | null) {
  if (plan === 'pro') return 'Pro';
  if (plan === 'familia') return 'Família';
  return 'Gratuito';
}

/** Resumo compacto: plano + estado Open Finance + atalho para Configurações (Pierre-style hub). */
export function AccountSummaryStrip({ className }: { className?: string }) {
  const { data, hasOpenFinance, dataFreshness } = useAppContext();
  const rawPlan = (data as { plan?: string } | null)?.plan;
  const planLabel = planLabelFromData(rawPlan);

  const ofRaw = data?.openFinanceStatus;
  const ofLegacyAtivo = Boolean((data as { openBankingAtivo?: boolean } | null)?.openBankingAtivo);
  const ofConnected = ofRaw === 'ativo' || ofLegacyAtivo;

  const ofLine = ofConnected
    ? 'Conectado aos bancos'
    : ofRaw === 'conectando'
      ? 'Conectando…'
      : ofRaw === 'erro'
        ? 'Erro na conexão'
        : ofRaw === 'expirado'
          ? 'Conexão expirada'
          : 'Não conectado';

  const staleHint =
    hasOpenFinance && dataFreshness === 'stale' ? ' · Sincronize para atualizar' : '';

  return (
    <div
      className={clsx(
        'rounded-xl border border-si-border bg-si-card/80 p-4 flex flex-wrap items-center justify-between gap-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-si-3 min-w-0">
        <span>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-si-5 block mb-0.5">
            Plano
          </span>
          {planLabel}
        </span>
        <span className="hidden sm:inline w-px h-8 bg-si-border shrink-0" aria-hidden />
        <span className="flex items-start gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-si-4 shrink-0 mt-0.5" aria-hidden />
          <span className="min-w-0">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-si-5 block mb-0.5">
              Open Finance
            </span>
            <span className="text-si-2">
              {ofLine}
              {staleHint}
            </span>
          </span>
        </span>
      </div>
      <Link
        to="/configuracoes#open-finance"
        className="text-[10px] font-bold tracking-[0.18em] uppercase text-si-2 hover:text-si-1 border border-si-border rounded-lg px-3 py-1.5 bg-si-over-2 hover:bg-si-over-3 shrink-0"
      >
        Gerenciar conexão
      </Link>
    </div>
  );
}
