import { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { fnsUS } from '../../firebase';
import { useAppContext } from '../../context/AppContext';
import { Modal } from '../ui/Modal';
import { Copy, CheckCircle2, RefreshCw, AlertCircle, ExternalLink, QrCode } from 'lucide-react';
import { clsx } from 'clsx';

interface AsaasPixModalProps {
  open: boolean;
  onClose: () => void;
  paymentId: string;
  invoiceUrl: string;
  planLabel: string;
}

interface PixQrResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
  value: number;
  dueDate: string;
}

export function AsaasPixModal({ open, onClose, paymentId, invoiceUrl, planLabel }: AsaasPixModalProps) {
  const { data } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixData, setPixData] = useState<PixQrResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Determinar o plano esperado com base na label
  const expectedPlan = planLabel.toLowerCase().includes('família') ? 'familia' : 'pro';
  const currentPlan = (data as any)?.plan;
  const isPaid = currentPlan === expectedPlan;

  // Carrega as informações do Pix QR Code
  useEffect(() => {
    if (!open || !paymentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchPix = async () => {
      try {
        const getPixFn = httpsCallable<{ paymentId: string }, PixQrResponse>(fnsUS, 'getAsaasPixQr');
        const res = await getPixFn({ paymentId });
        
        if (isMounted) {
          setPixData(res.data);
          
          // Calcula tempo restante até expiração
          if (res.data.expirationDate) {
            const expTime = new Date(res.data.expirationDate.replace(' ', 'T')).getTime();
            const now = Date.now();
            const diffSeconds = Math.max(0, Math.floor((expTime - now) / 1000));
            setTimeLeft(diffSeconds);
          } else {
            setTimeLeft(3600); // 1 hora de fallback
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erro ao carregar dados do Pix.');
          setLoading(false);
        }
      }
    };

    fetchPix();

    return () => {
      isMounted = false;
    };
  }, [open, paymentId]);

  // Regressiva do Timer de expiração
  useEffect(() => {
    if (loading || !pixData || timeLeft <= 0 || isPaid) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, pixData, timeLeft, isPaid]);

  // Se o pagamento for detectado pelo onSnapshot do AppContext, fecha após 3s
  useEffect(() => {
    if (isPaid && open) {
      const timeout = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isPaid, open, onClose]);

  const handleCopy = async () => {
    if (!pixData?.payload) return;
    try {
      await navigator.clipboard.writeText(pixData.payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fmtBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Modal open={open} onClose={onClose} title={isPaid ? 'Assinatura Ativada' : 'Pagamento via Pix'} size="md">
      <div className="flex flex-col items-center text-center space-y-6 animate-in duration-300">
        
        {/* Caso Feliz: Pagamento Confirmado */}
        {isPaid ? (
          <div className="py-6 space-y-4 animate-in duration-300">
            <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-si-positive-bg text-si-positive-text">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-si-1">Bem-vindo ao {planLabel}!</h3>
              <p className="text-sm text-si-4 mt-2">
                Identificamos o seu Pix! Seus recursos Pro já estão liberados.
              </p>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-si-5 mt-6 animate-pulse">
                Fechando em instantes...
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-si-4 animate-spin" />
            <p className="text-sm text-si-4">Gerando QR Code Pix...</p>
          </div>
        ) : error ? (
          <div className="py-6 space-y-4 max-w-sm">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-si-risk-bg text-si-risk-text">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm text-si-3">{error}</p>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-si-over-2 border border-si-border-md text-si-2 text-sm font-medium hover:bg-si-over-3 transition-colors"
              >
                Pagar na fatura oficial Asaas
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-si-5 hover:text-si-3 transition-colors underline"
              >
                Voltar
              </button>
            </div>
          </div>
        ) : pixData ? (
          <>
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-si-5">Valor a Pagar</span>
              <p className="text-3xl font-extrabold text-si-1">{fmtBRL(pixData.value)}</p>
              <p className="text-xs text-si-4 mt-1">{planLabel}</p>
            </div>

            {/* QR Code */}
            <div className="relative group p-4 bg-white rounded-2xl border border-si-border shadow-inner">
              {timeLeft === 0 ? (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 rounded-2xl">
                  <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                  <p className="text-sm font-bold text-zinc-900">QR Code Expirado</p>
                  <p className="text-xs text-zinc-500 text-center mt-1">Por favor, feche este modal e tente novamente.</p>
                </div>
              ) : null}
              <img
                src={`data:image/png;base64,${pixData.encodedImage}`}
                alt="QR Code Pix"
                className="w-48 h-48 block object-contain"
              />
            </div>

            {/* Timer de Expiração */}
            {timeLeft > 0 ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-si-over-2 border border-si-border-md">
                <QrCode className="w-3.5 h-3.5 text-si-3" />
                <span className="text-xs text-si-3">
                  Expira em: <span className="font-mono font-bold text-si-1">{formatTime(timeLeft)}</span>
                </span>
              </div>
            ) : null}

            {/* Instruções de Pagamento */}
            <div className="w-full text-left space-y-3 bg-si-over-1 border border-si-border rounded-xl p-4">
              <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-si-5 block">
                Pix Copia e Cola
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixData.payload}
                  className="flex-1 min-w-0 bg-si-bg border border-si-border rounded-lg px-3 py-1.5 text-xs text-si-3 select-all focus:outline-none"
                  aria-label="Código Pix Copia e Cola"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={clsx(
                    'p-2 rounded-lg border transition-all shrink-0',
                    copied
                      ? 'bg-si-positive-bg border-si-positive-text/30 text-si-positive-text'
                      : 'bg-si-over-2 border-si-border-md text-si-3 hover:bg-si-over-3'
                  )}
                  title="Copiar código"
                >
                  {copied ? <span className="text-xs font-bold px-1">Copiado ✓</span> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Alternativa de Pagamento */}
            <div className="flex flex-col items-center gap-2 pt-2">
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-si-4 hover:text-si-2 transition-colors hover:underline"
              >
                Prefere pagar com cartão ou boleto? Abrir fatura completa
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-[10px] text-si-5">
                Aguardando pagamento... Não é necessário atualizar a página.
              </span>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
