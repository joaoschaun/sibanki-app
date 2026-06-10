/**
 * Página pública de aceite de empréstimo (CrediAmigo).
 * Acessada via link enviado por WhatsApp/email: /aceitar/emprestimo/:token
 * Não requer autenticação — usuário sem conta é convidado a se cadastrar.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
  HandCoins, CheckCircle, AlertCircle, Loader2,
  Calendar, Percent, DollarSign, User, ArrowRight,
} from 'lucide-react';

interface LoanPreview {
  credorName: string;
  devedorName: string;
  amount: number;
  interestRate: number;
  installments: number;
  firstDueDate: string;
  notes: string;
  status: string;
  installmentsList: { number: number; dueDate: string; amount: number }[];
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export default function AceitarEmprestimo() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  const [loan, setLoan]       = useState<LoanPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    const fn = httpsCallable<{ token: string }, LoanPreview>(functions, 'crediAmigoGetByToken');
    fn({ token })
      .then((r) => setLoan(r.data))
      .catch(() => setError('Convite não encontrado ou já processado.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    try {
      const fn = httpsCallable(functions, 'crediAmigoAccept');
      await fn({ token });
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao aceitar. Tente novamente.');
    } finally {
      setAccepting(false);
    }
  }

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-si-4" />
    </div>
  );

  // ── Erro ──
  if (error && !loan) return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <p className="text-si-1 font-semibold">{error}</p>
        <button onClick={() => navigate('/')} className="text-sm text-si-4 hover:text-si-2 underline">
          Ir para o Sibanki
        </button>
      </div>
    </div>
  );

  // ── Aceite confirmado ──
  if (done) return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-si-1">Empréstimo aceito!</h1>
          <p className="text-si-5 text-sm mt-1">
            Você aceitou os termos do empréstimo de <strong className="text-si-2">{loan?.credorName}</strong>.
          </p>
        </div>
        <div className="bg-si-card border border-si-border rounded-2xl p-4 text-left space-y-2">
          <p className="text-xs font-bold text-si-5 uppercase tracking-widest">Resumo</p>
          <div className="flex justify-between text-sm"><span className="text-si-5">Valor</span><span className="font-bold text-si-1">{fmtBRL(loan?.amount ?? 0)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-si-5">Parcelas</span><span className="font-bold text-si-1">{loan?.installments}×</span></div>
          <div className="flex justify-between text-sm"><span className="text-si-5">1º vencimento</span><span className="font-bold text-si-1">{loan?.firstDueDate ? fmtDate(loan.firstDueDate) : ''}</span></div>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-si-4">Acompanhe pelo app e receba lembretes automáticos:</p>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-si-1 text-si-bg font-bold text-sm hover:opacity-90"
          >
            Abrir Sibanki <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!loan) return null;

  const alreadyAccepted = loan.status === 'active' || loan.status === 'completed';

  // ── Tela principal ──
  return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-5">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-si-card border border-si-border flex items-center justify-center mx-auto">
            <HandCoins className="w-7 h-7 text-si-3" />
          </div>
          <h1 className="text-xl font-bold text-si-1">Convite de empréstimo</h1>
          <p className="text-sm text-si-5">
            <strong className="text-si-2">{loan.credorName}</strong> quer formalizar um empréstimo com você
          </p>
        </div>

        {/* Contrato */}
        <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Condições do empréstimo</p>
          {[
            { icon: <User       className="w-3.5 h-3.5" />, label: 'De',            value: loan.credorName },
            { icon: <User       className="w-3.5 h-3.5" />, label: 'Para',          value: loan.devedorName },
            { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Valor',         value: fmtBRL(loan.amount) },
            { icon: <Percent    className="w-3.5 h-3.5" />, label: 'Juros',         value: loan.interestRate === 0 ? 'Sem juros' : `${loan.interestRate}% a.m.` },
            { icon: <Calendar   className="w-3.5 h-3.5" />, label: 'Parcelas',      value: `${loan.installments}×` },
            { icon: <Calendar   className="w-3.5 h-3.5" />, label: '1º vencimento', value: fmtDate(loan.firstDueDate) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className="text-si-5 w-4 shrink-0">{icon}</span>
              <span className="text-si-5 w-24 shrink-0">{label}</span>
              <span className="font-medium text-si-2">{value}</span>
            </div>
          ))}
          {loan.notes && (
            <div className="pt-3 border-t border-si-border">
              <p className="text-xs text-si-5 italic">"{loan.notes}"</p>
            </div>
          )}
        </div>

        {/* Parcelas */}
        <div className="bg-si-card border border-si-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-si-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Calendário de pagamentos</p>
          </div>
          <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
            {loan.installmentsList.map((i) => (
              <div key={i.number} className="flex justify-between px-5 py-3 text-sm">
                <span className="text-si-4">Parcela {i.number} · {fmtDate(i.dueDate)}</span>
                <span className="font-bold text-si-1">{fmtBRL(i.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ação */}
        {alreadyAccepted ? (
          <div className="flex items-center gap-2 justify-center text-emerald-400 text-sm font-semibold">
            <CheckCircle className="w-4 h-4" /> Você já aceitou este empréstimo
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-si-1 text-si-bg font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {accepting ? 'Processando...' : 'Aceitar empréstimo'}
            </button>
            <p className="text-xs text-si-5 text-center">
              Ao aceitar, você concorda com as condições acima. O Sibanki irá gerenciar os lembretes.
            </p>
            {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
          </div>
        )}

        {/* CTA cadastro */}
        <div className="border-t border-si-border pt-4 text-center">
          <p className="text-xs text-si-5">Não tem conta no Sibanki?</p>
          <button onClick={() => navigate('/register')} className="text-xs text-si-3 hover:text-si-1 underline mt-1">
            Crie sua conta gratuita e gerencie seus empréstimos
          </button>
        </div>
      </div>
    </div>
  );
}
