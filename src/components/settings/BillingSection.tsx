import { httpsCallable } from 'firebase/functions';
import { fnsUS } from '../../firebase';

interface BillingSectionProps {
  data: any;
  billingProvider: 'stripe' | 'asaas';
  checkoutBusy: boolean;
  setCheckoutBusy: (v: boolean) => void;
  setError: (v: string | null) => void;
  setPixModalData: (v: { paymentId: string; invoiceUrl: string; planLabel: string } | null) => void;
}

export function BillingSection({
  data,
  billingProvider,
  checkoutBusy,
  setCheckoutBusy,
  setError,
  setPixModalData,
}: BillingSectionProps) {
  const plan = data?.plan;

  const handleManageAsaasOrStripe = async () => {
    setCheckoutBusy(true);
    setError(null);
    try {
      if ((data?.planProvider ?? billingProvider) === 'asaas') {
        if (!window.confirm('Cancelar sua assinatura? Você volta para o plano gratuito imediatamente.')) {
          setCheckoutBusy(false);
          return;
        }
        const cancelFn = httpsCallable<Record<string, never>, { ok?: boolean }>(fnsUS, 'cancelAsaasSubscription');
        await cancelFn({});
      } else {
        const portalFn = httpsCallable<Record<string, never>, { url?: string }>(fnsUS, 'createPortal');
        const res = await portalFn({});
        if (res.data?.url) window.location.assign(res.data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerenciar assinatura.');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleSubscribe = async (opt: {
    label: string;
    priceId: string | undefined;
    plan: string;
    billing: string;
  }) => {
    setCheckoutBusy(true);
    setError(null);
    try {
      if (billingProvider === 'asaas') {
        const checkoutFn = httpsCallable<
          { plan: string; billing: string },
          { url?: string; paymentId?: string }
        >(fnsUS, 'createAsaasCheckout');
        const res = await checkoutFn({ plan: opt.plan, billing: opt.billing });
        if (res.data?.paymentId) {
          setPixModalData({
            paymentId: res.data.paymentId,
            invoiceUrl: res.data.url ?? '',
            planLabel: opt.label,
          });
        } else if (res.data?.url) {
          window.location.assign(res.data.url);
        }
      } else {
        if (!opt.priceId) return;
        const checkoutFn = httpsCallable<
          { priceId: string; plan: string; billing: string },
          { url?: string }
        >(fnsUS, 'createCheckout');
        const res = await checkoutFn({ priceId: opt.priceId, plan: opt.plan, billing: opt.billing });
        const url = res.data?.url ?? undefined;
        if (url) window.location.assign(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar assinatura.');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const plans = [
    { label: 'Pro mensal', price: 'R$ 19,90/mês', priceId: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY, plan: 'pro', billing: 'monthly' },
    { label: 'Pro anual', price: 'R$ 178,80/ano · 2 meses grátis', priceId: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY, plan: 'pro', billing: 'yearly' },
    { label: 'Família mensal', price: 'R$ 29,90/mês', priceId: import.meta.env.VITE_STRIPE_PRICE_FAMILIA_MONTHLY, plan: 'familia', billing: 'monthly' },
    { label: 'Família anual', price: 'R$ 274,80/ano · 2 meses grátis', priceId: import.meta.env.VITE_STRIPE_PRICE_FAMILIA_YEARLY, plan: 'familia', billing: 'yearly' },
  ] as const;

  return (
    <section className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-si-1">Meu plano</h3>
        <p className="text-si-5 text-sm mt-1">
          Plano atual:{' '}
          <span className="font-semibold text-si-2 uppercase">
            {(plan === 'pro' || plan === 'familia') ? plan : 'gratuito'}
          </span>
        </p>
      </div>

      {(plan === 'pro' || plan === 'familia') ? (
        <button
          type="button"
          disabled={checkoutBusy}
          onClick={handleManageAsaasOrStripe}
          className="px-4 py-2 rounded-xl border text-sm bg-si-over-2 border-si-border-md text-si-2 hover:bg-si-over-3 disabled:opacity-50"
        >
          {checkoutBusy
            ? 'Processando…'
            : (data?.planProvider ?? billingProvider) === 'asaas'
              ? 'Cancelar assinatura'
              : 'Gerenciar assinatura'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plans.map((opt) => (
              <button
                key={opt.label}
                type="button"
                disabled={checkoutBusy || (billingProvider === 'stripe' && !opt.priceId)}
                onClick={() => handleSubscribe(opt)}
                className="px-4 py-3 rounded-xl border text-left bg-si-over-2 border-si-border-md hover:bg-si-over-3 disabled:opacity-50 transition-colors"
              >
                <span className="block text-sm font-semibold text-si-1">{opt.label}</span>
                <span className="block text-[11px] text-si-4 mt-0.5">
                  {opt.price}{billingProvider === 'asaas' ? ' · Pix, cartão ou boleto' : ' · 30 dias grátis'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-si-5">
            Pro inclui: consultor IA ilimitado, Open Finance, relatórios PDF, lançamento por voz/foto e bot WhatsApp.
            Família adiciona visão compartilhada do casal/família.
          </p>
        </div>
      )}
    </section>
  );
}
