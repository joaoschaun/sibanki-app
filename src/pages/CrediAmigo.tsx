import { useState, useMemo, useEffect } from 'react';
import {
  HandCoins, Plus, ChevronRight, ChevronLeft, CheckCircle,
  Clock, AlertCircle, User, Phone, Mail, DollarSign,
  Percent, Calendar, FileText, Send, X, Check,
  TrendingDown, MessageCircle, Copy, Loader2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  getLoans, createLoan as apiCreateLoan, markInstallmentPaid,
  getLoanAcceptUrl,
  type Loan, type LoanInstallment, type ContactType,
} from '../services/socialAmigo';

type LoanStatus = Loan['status'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function counterpart(loan: Loan): string {
  return loan.role === 'credor' ? loan.devedorName : loan.credorName;
}

function calcInstallments(amount: number, rate: number, n: number): number {
  if (rate === 0) return Math.round((amount / n) * 100) / 100;
  const r = rate / 100;
  return Math.round((amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 100) / 100;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function statusLabel(s: LoanStatus) {
  const m: Record<LoanStatus, { label: string; color: string }> = {
    pending_acceptance: { label: 'Aguardando aceite', color: 'text-amber-400 bg-amber-500/10' },
    active:            { label: 'Ativo',              color: 'text-emerald-400 bg-emerald-500/10' },
    completed:         { label: 'Quitado',            color: 'text-si-4 bg-si-over-2' },
    cancelled:         { label: 'Cancelado',          color: 'text-rose-400 bg-rose-500/10' },
  };
  return m[s];
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CrediAmigo() {
  const { data } = useAppContext();
  const userName = data?.name ?? 'Você';

  const [loans, setLoans]       = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Loan | null>(null);

  useEffect(() => {
    getLoans()
      .then(setLoans)
      .catch(console.error)
      .finally(() => setLoadingLoans(false));
  }, []);

  const paidCount    = useMemo(() => loans.filter((l) => l.status === 'completed').length, [loans]);
  const activeCount  = useMemo(() => loans.filter((l) => l.status === 'active').length, [loans]);
  const totalLent    = useMemo(() =>
    loans.filter((l) => l.role === 'credor').reduce((s, l) => s + l.amount, 0), [loans]);

  async function handleMarkPaid(loanId: string, installmentNum: number) {
    await markInstallmentPaid(loanId, installmentNum);
    const today = new Date().toISOString().slice(0, 10);
    const update = (l: Loan): Loan => l.id !== loanId ? l : {
      ...l,
      installmentsList: l.installmentsList.map((i) =>
        i.number === installmentNum ? { ...i, status: 'paid' as const, paidAt: today } : i
      ),
    };
    setLoans((prev) => prev.map(update));
    setSelected((prev) => prev ? update(prev) : null);
  }

  if (creating) return (
    <CreateLoanFlow
      credorName={userName}
      onSave={(loan) => { setLoans((p) => [loan, ...p]); setCreating(false); }}
      onCancel={() => setCreating(false)}
    />
  );

  if (selected) return (
    <LoanDetail
      loan={selected}
      onBack={() => setSelected(null)}
      onMarkPaid={handleMarkPaid}
    />
  );

  if (loadingLoans) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-si-4" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HandCoins className="w-6 h-6" /> Credi Amigo
          </h2>
          <p className="text-xs text-si-5 uppercase tracking-widest font-bold mt-0.5">
            Empréstimos entre pessoas de confiança
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-si-1 text-si-bg text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Novo empréstimo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Emprestado', value: fmtBRL(totalLent), sub: 'total' },
          { label: 'Ativos',     value: activeCount,        sub: 'empréstimos' },
          { label: 'Quitados',   value: paidCount,          sub: 'concluídos' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-si-card border border-si-border rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">{label}</p>
            <p className="text-xl font-bold text-si-1 mt-1">{value}</p>
            <p className="text-xs text-si-5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {loans.length === 0 ? (
        <EmptyState onNew={() => setCreating(true)} />
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Seus empréstimos</p>
          {loans.map((loan) => {
            const paid = loan.installmentsList.filter((i) => i.status === 'paid').length;
            const st = statusLabel(loan.status);
            const overdue = loan.installmentsList.some((i) => i.status === 'overdue');
            return (
              <button
                key={loan.id}
                onClick={() => setSelected(loan)}
                className="w-full bg-si-card border border-si-border rounded-2xl p-5 flex items-center gap-4 hover:border-si-border-md transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-si-over-2 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-si-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-si-1">{counterpart(loan)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-rose-400 bg-rose-500/10">Atrasado</span>}
                  </div>
                  <p className="text-xs text-si-5 mt-0.5">
                    {loan.role === 'credor' ? 'Você emprestou' : 'Você deve'} · {loan.installments}× {fmtBRL(calcInstallments(loan.amount, loan.interestRate, loan.installments))}
                  </p>
                  {loan.status === 'active' && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-si-over-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${(paid / loan.installments) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-si-5">{paid}/{loan.installments}</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-si-1">{fmtBRL(loan.amount)}</p>
                  <ChevronRight className="w-4 h-4 text-si-5 mt-1 ml-auto" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Como funciona */}
      <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Como funciona</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { n: '1', t: 'Crie',     d: 'Defina valor, juros e parcelas' },
            { n: '2', t: 'Convide',  d: 'Envie o contrato via WhatsApp ou e-mail' },
            { n: '3', t: 'Aceite',   d: 'Devedor aceita os termos digitalmente' },
            { n: '4', t: 'Gerencie', d: 'Sibanki cuida dos lembretes e histórico' },
          ].map(({ n, t, d }) => (
            <div key={n} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-si-over-2 text-si-3 text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
              <div>
                <p className="text-sm font-semibold text-si-2">{t}</p>
                <p className="text-xs text-si-5">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tela vazia ────────────────────────────────────────────────────────────────
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-si-over-2 flex items-center justify-center mx-auto">
        <HandCoins className="w-8 h-8 text-si-5" />
      </div>
      <div>
        <p className="text-si-2 font-semibold">Nenhum empréstimo ainda</p>
        <p className="text-si-5 text-sm mt-1">Formalize empréstimos informais e evite confusões</p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-si-1 text-si-bg text-sm font-bold hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> Criar primeiro empréstimo
      </button>
    </div>
  );
}

// ── Fluxo de criação ──────────────────────────────────────────────────────────
interface CreateLoanFlowProps {
  credorName: string;
  onSave: (loan: Loan) => void;
  onCancel: () => void;
}

function CreateLoanFlow({ credorName, onSave, onCancel }: CreateLoanFlowProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    counterpartName: '',
    contactType: 'whatsapp' as ContactType,
    counterpartContact: '',
    amount: '',
    interestRate: '0',
    installments: '1',
    firstDueDate: '',
    notes: '',
  });

  const amount       = parseFloat(form.amount) || 0;
  const rate         = parseFloat(form.interestRate) || 0;
  const n            = parseInt(form.installments) || 1;
  const installValue = calcInstallments(amount, rate, n);
  const totalReturn  = installValue * n;

  const steps = ['Empréstimo', 'Devedor', 'Revisão'];

const canNext = [
    amount > 0 && n >= 1 && !!form.firstDueDate,
    !!form.counterpartName && !!form.counterpartContact,
    !saving,
  ][step];

  async function handleConfirm() {
    setSaving(true);
    setSaveError(null);
    try {
      const { loanId, acceptToken } = await apiCreateLoan({
        counterpartName: form.counterpartName,
        counterpartContact: form.counterpartContact,
        contactType: form.contactType,
        amount,
        interestRate: rate,
        installments: n,
        firstDueDate: form.firstDueDate,
        notes: form.notes,
      });
      const firstDate = new Date(form.firstDueDate + 'T12:00:00');
      const list: LoanInstallment[] = Array.from({ length: n }, (_, i) => {
        const d = new Date(firstDate);
        d.setMonth(d.getMonth() + i);
        return { number: i + 1, dueDate: d.toISOString().slice(0, 10), amount: installValue, status: 'pending' as const, paidAt: null };
      });
      onSave({
        id: loanId,
        role: 'credor',
        credorName: credorName,
        devedorName: form.counterpartName,
        devedorContact: form.counterpartContact,
        devedorContactType: form.contactType,
        amount,
        interestRate: rate,
        installments: n,
        firstDueDate: form.firstDueDate,
        notes: form.notes,
        status: 'pending_acceptance',
        acceptToken,
        installmentsList: list,
        createdAt: new Date().toISOString().slice(0, 10),
        acceptedAt: null,
      });
    } catch (e: any) {
      setSaveError(e?.message ?? 'Erro ao criar empréstimo. Tente novamente.');
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Topo */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-si-over-2 transition-colors">
          <X className="w-5 h-5 text-si-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-si-1">Novo empréstimo</h2>
          <p className="text-xs text-si-5">{steps[step]}</p>
        </div>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? 'bg-si-1' : 'bg-si-over-3'}`} />
          ))}
        </div>
      </div>

      {/* Step 0 — Detalhes do empréstimo */}
      {step === 0 && (
        <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Detalhes do empréstimo</p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Valor</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
              <input
                type="number" min="1" placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-si-bg border border-si-border rounded-xl pl-9 pr-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Juros (% ao mês)</label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
                <input
                  type="number" min="0" step="0.1" placeholder="0"
                  value={form.interestRate}
                  onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                  className="w-full bg-si-bg border border-si-border rounded-xl pl-9 pr-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
                />
              </div>
              <p className="text-xs text-si-5">0% = sem juros</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Parcelas</label>
              <select
                value={form.installments}
                onChange={(e) => setForm({ ...form, installments: e.target.value })}
                className="w-full bg-si-bg border border-si-border rounded-xl px-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
              >
                {[1,2,3,4,5,6,8,10,12,18,24].map((v) => (
                  <option key={v} value={v}>{v}× {v === 1 ? '(à vista)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Vencimento da 1ª parcela</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
              <input
                type="date"
                value={form.firstDueDate}
                onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })}
                className="w-full bg-si-bg border border-si-border rounded-xl pl-9 pr-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Observação (opcional)</label>
            <textarea
              placeholder="Ex: ajuda para emergência médica"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-si-bg border border-si-border rounded-xl px-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md resize-none"
            />
          </div>

          {/* Preview */}
          {amount > 0 && (
            <div className="bg-si-over-1 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Resumo</p>
              <div className="flex justify-between text-sm">
                <span className="text-si-4">Valor emprestado</span>
                <span className="font-bold text-si-1">{fmtBRL(amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-si-4">{n}× de</span>
                <span className="font-bold text-si-1">{fmtBRL(installValue)}</span>
              </div>
              {rate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-si-4">Total a receber</span>
                  <span className="font-bold text-emerald-400">{fmtBRL(totalReturn)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 1 — Dados do devedor */}
      {step === 1 && (
        <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Quem vai receber?</p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
              <input
                type="text" placeholder="Nome completo"
                value={form.counterpartName}
                onChange={(e) => setForm({ ...form, counterpartName: e.target.value })}
                className="w-full bg-si-bg border border-si-border rounded-xl pl-9 pr-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Enviar convite por</label>
            <div className="grid grid-cols-2 gap-2">
              {(['whatsapp', 'email'] as ContactType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, contactType: t })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
                    form.contactType === t ? 'bg-si-1 text-si-bg border-transparent' : 'bg-si-bg border-si-border text-si-4'
                  }`}
                >
                  {t === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  {t === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">
              {form.contactType === 'whatsapp' ? 'Número WhatsApp' : 'E-mail'}
            </label>
            <div className="relative">
              {form.contactType === 'whatsapp'
                ? <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
                : <Mail  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
              }
              <input
                type={form.contactType === 'email' ? 'email' : 'tel'}
                placeholder={form.contactType === 'whatsapp' ? '11 9 9999-9999' : 'email@exemplo.com'}
                value={form.counterpartContact}
                onChange={(e) => setForm({ ...form, counterpartContact: e.target.value })}
                className="w-full bg-si-bg border border-si-border rounded-xl pl-9 pr-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
              />
            </div>
            <p className="text-xs text-si-5">
              {form.counterpartName || 'A pessoa'} receberá um link para aceitar os termos
              {form.counterpartName ? '' : ' do empréstimo'}
            </p>
          </div>
        </div>
      )}

      {/* Step 2 — Revisão */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Resumo do contrato</p>
            {[
              { label: 'Credor',         value: credorName },
              { label: 'Devedor',        value: form.counterpartName },
              { label: 'Valor',          value: fmtBRL(amount) },
              { label: 'Juros',          value: rate === 0 ? 'Sem juros' : `${rate}% a.m.` },
              { label: 'Parcelas',       value: `${n}× de ${fmtBRL(installValue)}` },
              { label: '1º vencimento',  value: fmtDate(form.firstDueDate) },
              ...(form.notes ? [{ label: 'Observação', value: form.notes }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <span className="text-si-5">{label}</span>
                <span className="font-medium text-si-2 text-right">{value}</span>
              </div>
            ))}
            {rate > 0 && (
              <div className="pt-3 border-t border-si-border flex justify-between text-sm">
                <span className="text-si-4 font-semibold">Total a receber</span>
                <span className="font-bold text-emerald-400">{fmtBRL(totalReturn)}</span>
              </div>
            )}
          </div>

          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-sm text-amber-300">
            <Send className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Ao confirmar, enviaremos o convite para <strong>{form.counterpartName}</strong> via{' '}
              {form.contactType === 'whatsapp' ? 'WhatsApp' : 'e-mail'}. O empréstimo só fica ativo após o aceite.
            </p>
          </div>
          {saveError && <p className="text-rose-400 text-xs">{saveError}</p>}
        </div>
      )}

      {/* Navegação */}
      <div className="flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-si-card border border-si-border text-si-3 text-sm font-semibold"
          >
            <ChevronLeft className="w-4 h-4" /> Voltar
          </button>
        )}
        <button
          onClick={() => {
            if (step < 2) { setStep(step + 1); }
            else { handleConfirm(); }
          }}
          disabled={!canNext}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-si-1 text-si-bg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            : step < 2
              ? <>Continuar <ChevronRight className="w-4 h-4" /></>
              : <><Send className="w-4 h-4" /> Enviar convite</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Detalhe do empréstimo ──────────────────────────────────────────────────────
interface LoanDetailProps {
  loan: Loan;
  onBack: () => void;
  onMarkPaid: (loanId: string, installmentNum: number) => void;
}

function LoanDetail({ loan, onBack, onMarkPaid }: LoanDetailProps) {
  const [copied, setCopied] = useState(false);
  const acceptLink = getLoanAcceptUrl(loan.acceptToken);

  function copyLink() {
    navigator.clipboard.writeText(acceptLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const paidAmt = loan.installmentsList.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const remaining = loan.installmentsList.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
  const st = statusLabel(loan.status);

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-si-over-2 transition-colors">
          <ChevronLeft className="w-5 h-5 text-si-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-si-1">{counterpart(loan)}</h2>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
        </div>
      </div>

      {/* Valores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-si-card border border-si-border rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-si-5 font-bold">Total</p>
          <p className="font-bold text-si-1 mt-1">{fmtBRL(loan.amount)}</p>
        </div>
        <div className="bg-si-card border border-si-border rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-si-5 font-bold">Pago</p>
          <p className="font-bold text-emerald-400 mt-1">{fmtBRL(paidAmt)}</p>
        </div>
        <div className="bg-si-card border border-si-border rounded-xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-si-5 font-bold">Restante</p>
          <p className="font-bold text-si-1 mt-1">{fmtBRL(remaining)}</p>
        </div>
      </div>

      {/* Link de aceite */}
      {loan.status === 'pending_acceptance' && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">Aguardando aceite</p>
          <p className="text-sm text-si-3">Compartilhe o link com {counterpart(loan)}:</p>
          <div className="flex items-center gap-2 bg-si-bg border border-si-border rounded-lg px-3 py-2">
            <p className="flex-1 text-xs text-si-4 truncate">{acceptLink}</p>
            <button onClick={copyLink} className="shrink-0 text-si-4 hover:text-si-2 transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Parcelas */}
      <div className="bg-si-card border border-si-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-si-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Parcelas</p>
        </div>
        <div className="divide-y divide-white/5">
          {loan.installmentsList.map((inst) => {
            const icon = {
              paid:    <CheckCircle className="w-4 h-4 text-emerald-400" />,
              pending: <Clock       className="w-4 h-4 text-si-5" />,
              overdue: <AlertCircle className="w-4 h-4 text-rose-400" />,
            }[inst.status];
            return (
              <div key={inst.number} className="flex items-center gap-4 px-5 py-4">
                {icon}
                <div className="flex-1">
                  <p className="text-sm font-medium text-si-2">Parcela {inst.number}</p>
                  <p className="text-xs text-si-5">Vence {fmtDate(inst.dueDate)}{inst.paidAt ? ` · Pago em ${fmtDate(inst.paidAt)}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-si-1">{fmtBRL(inst.amount)}</p>
                  {inst.status === 'pending' && loan.role === 'credor' && loan.status === 'active' && (
                    <button
                      onClick={() => onMarkPaid(loan.id, inst.number)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold hover:bg-emerald-500/20 transition-colors"
                    >
                      Marcar pago
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalhes */}
      <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Detalhes</p>
        {[
          { icon: <User         className="w-3.5 h-3.5" />, label: loan.devedorContactType === 'whatsapp' ? 'WhatsApp' : 'E-mail', value: loan.devedorContact },
          { icon: <TrendingDown className="w-3.5 h-3.5" />, label: 'Juros', value: loan.interestRate === 0 ? 'Sem juros' : `${loan.interestRate}% a.m.` },
          { icon: <Calendar     className="w-3.5 h-3.5" />, label: 'Criado em', value: fmtDate(loan.createdAt) },
          ...(loan.notes ? [{ icon: <FileText className="w-3.5 h-3.5" />, label: 'Observação', value: loan.notes }] : []),
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="text-si-5">{icon}</span>
            <span className="text-si-5 w-20 shrink-0">{label}</span>
            <span className="text-si-3">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
