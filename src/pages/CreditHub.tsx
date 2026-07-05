/**
 * CreditHub.tsx — Hub de Crédito do Sibanki
 *
 * Ação 12 (29/03/2026): Tela dedicada /credito conforme HUB-CREDITO-ARQUITETURA.md.
 * Separa visão macro de crédito (empréstimos, exposição, plano) de Cartões (operacional).
 *
 * Estrutura:
 *   1. Visão geral — pressão, vencimentos, ação recomendada
 *   2. Cartões de crédito — fatura e limite (curto prazo)
 *   3. Empréstimos e financiamentos — médio/longo prazo
 *   4. Plano de ação — prioridade inteligente
 *   5. Oportunidades — produtos contextuais por saúde financeira
 *   6. Educação financeira — carrossel contextual
 */
import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  CreditCard, AlertTriangle, CheckCircle,
  ChevronRight, Zap, BookOpen, Clock,
  ArrowUpRight, RefreshCw, ShieldCheck, Target,
  Plus, Pencil, Trash2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ComingSoonBadge } from '../components/ui/ComingSoonBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Field';
import { getBillingMonth, setCreditAccounts, setCreditObligations } from '../services/persistUserData';
import type { CreditAccount, CreditSnapshot, CreditObligation } from '../types/userData';
import { analyzeInstallmentDecision, analyzeDebtPayoffStrategy, analyzeFgtsAmortization } from '../utils/decisionEngine';
import { identifyBank } from '../components/banks/bankData';
import Cards from './Cards';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Normaliza rótulos vindos do Open Finance ("nu bank" → "Nubank"). */
function prettyLabel(raw: string): string {
  const bank = identifyBank(raw);
  if (bank) return bank.name;
  return raw.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtPct = (v: number) =>
  `${v.toFixed(1)}%`;

function pressureColor(level?: CreditSnapshot['pressureLevel']) {
  switch (level) {
    case 'controlado': return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    case 'atencao':    return { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   };
    case 'elevado':    return { text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20'  };
    case 'critico':    return { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20'    };
    default:           return { text: 'text-si-4',    bg: 'bg-si-zinc-8',       border: 'border-si-border'        };
  }
}

// ── Dados demo (substituídos por Firestore real via useAppContext) ─────────────
const DEMO_ACCOUNTS: CreditAccount[] = [
  { id: 'ca1', kind: 'cartao',      label: 'Nubank',   institution: 'Nubank',   limitTotal: 8_000,  balanceUsed: 2_400, dueDay: 10, closeDay: 3,  status: 'ativo', source: 'manual' },
  { id: 'ca2', kind: 'cartao',      label: 'Itaú',     institution: 'Itaú',     limitTotal: 12_000, balanceUsed: 4_800, dueDay: 15, closeDay: 8,  status: 'ativo', source: 'manual' },
  { id: 'ca3', kind: 'emprestimo',  label: 'CDC Itaú', institution: 'Itaú',     limitTotal: 20_000, balanceUsed: 14_500, status: 'ativo', monthlyInstallment: 720, annualInterestPct: 28.4, source: 'manual' },
  { id: 'ca4', kind: 'financiamento', label: 'Financ. Veículo', institution: 'Santander', limitTotal: 45_000, balanceUsed: 28_000, status: 'ativo', monthlyInstallment: 1_150, annualInterestPct: 19.8, source: 'manual' },
];

const DEMO_SNAPSHOT: CreditSnapshot = {
  version: 1, updatedAt: new Date().toISOString(),
  accountsCount: 4, obligationsOpenCount: 3,
  totalLimit: 65_000, totalUsed: 49_700,
  availableLimit: 15_300,
  cardUtilizationPct: 36.3,
  monthlyDebtCommitment: 1_870,
  dueSoonAmount: 7_200, dueSoonCount: 2,
  highUtilizationAccounts: 1,
  pressureLevel: 'atencao',
};

const EDUCATION_CARDS = [
  { emoji: '⚠️', title: 'O custo real do mínimo',     desc: 'Pagar só o mínimo do cartão pode triplicar sua dívida em 2 anos.' },
  { emoji: '📉', title: 'Como melhorar seu crédito',   desc: 'Pague em dia, reduza utilização abaixo de 30% e evite novas consultas.' },
  { emoji: '🔄', title: 'Quando antecipar parcelas',   desc: 'Vale se a taxa do empréstimo superar o rendimento das suas reservas.' },
  { emoji: '🧮', title: 'Renegociar nem sempre ajuda', desc: 'Alongar prazo reduz parcela, mas aumenta o custo total. Calcule antes.' },
];

/**
 * Consolidação 6→3 abas (13/06/2026, dossiê módulo a módulo, item nº 8):
 * Visão Geral absorve Empréstimos + Plano de ação; Oportunidades absorve
 * Educação. Menos navegação, mais conteúdo por tela.
 */
const TABS = ['Visão Geral', 'Cartões', 'Empréstimos', 'Oportunidades'] as const;
type Tab = typeof TABS[number];

// ── Componente: barra de utilização ──────────────────────────────────────────
function UtilBar({ pct, warn = 70 }: { pct: number; warn?: number }) {
  const color = pct >= 90 ? 'bg-rose-500' : pct >= warn ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="h-1.5 bg-si-zinc-8 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CreditHub() {
  const { user, data, financialProfile, creditAccounts, creditObligations, cards: contextCards = [] } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('Visão Geral');
  const [eduIdx, setEduIdx] = useState(0);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/cartoes')) {
      setActiveTab('Cartões');
    } else if (path.includes('/emprestimos')) {
      setActiveTab('Empréstimos');
    } else if (path.includes('/oportunidades')) {
      setActiveTab('Oportunidades');
    } else {
      setActiveTab('Visão Geral');
    }
  }, [location.pathname]);

  // States para os simuladores interativos
  const [selectedPayoffStrategy, setSelectedPayoffStrategy] = useState<'avalanche' | 'bola-de-neve'>('avalanche');
  const [simValue, setSimValue] = useState('3000');
  const [simDiscount, setSimDiscount] = useState('10');
  const [simInstallments, setSimInstallments] = useState(10);
  const [simCDI, setSimCDI] = useState('1.0');

  // States para o modal de Amortização
  const [selectedAmortizationLoan, setSelectedAmortizationLoan] = useState<CreditAccount | null>(null);
  const [amortizationExtraAmount, setAmortizationExtraAmount] = useState('5000');
  const [amortizationRemainingMonths, setAmortizationRemainingMonths] = useState(24);
  const [amortizationUseFgts, setAmortizationUseFgts] = useState(false);

  // States para o modal de empréstimo manual
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [editLoanId, setEditLoanId] = useState<string | null>(null);
  const [loanLabel, setLoanLabel] = useState('');
  const [loanInstitution, setLoanInstitution] = useState('');
  const [loanKind, setLoanKind] = useState<'emprestimo' | 'financiamento' | 'consignado' | 'outro'>('emprestimo');
  const [loanLimitTotal, setLoanLimitTotal] = useState('');
  const [loanBalanceUsed, setLoanBalanceUsed] = useState('');
  const [loanMonthlyInstallment, setLoanMonthlyInstallment] = useState('');
  const [loanAnnualInterestPct, setLoanAnnualInterestPct] = useState('');
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanBusy, setLoanBusy] = useState(false);

  const handleOpenAddLoan = () => {
    setEditLoanId(null);
    setLoanLabel('');
    setLoanInstitution('');
    setLoanKind('emprestimo');
    setLoanLimitTotal('');
    setLoanBalanceUsed('');
    setLoanMonthlyInstallment('');
    setLoanAnnualInterestPct('');
    setLoanDueDate(new Date().toISOString().split('T')[0]);
    setLoanError(null);
    setLoanModalOpen(true);
  };

  const handleEditLoan = (loan: CreditAccount) => {
    setEditLoanId(loan.id);
    setLoanLabel(loan.label || '');
    setLoanInstitution(loan.institution || '');
    setLoanKind((loan.kind as any) || 'emprestimo');
    setLoanLimitTotal(loan.limitTotal ? String(loan.limitTotal) : '');
    setLoanBalanceUsed(loan.balanceUsed ? String(loan.balanceUsed) : '');
    setLoanMonthlyInstallment(loan.monthlyInstallment ? String(loan.monthlyInstallment) : '');
    setLoanAnnualInterestPct(loan.annualInterestPct ? String(loan.annualInterestPct) : '');
    
    // Encontrar data de vencimento correspondente em creditObligations
    const ob = creditObligations.find(o => o.accountId === loan.id);
    setLoanDueDate(ob?.dueDate || new Date().toISOString().split('T')[0]);
    
    setLoanError(null);
    setLoanModalOpen(true);
  };

  const handleSaveLoan = async () => {
    if (!user) return;
    if (!loanLabel.trim()) {
      setLoanError('Nome do empréstimo é obrigatório');
      return;
    }
    const balance = parseFloat(loanBalanceUsed) || 0;
    const limitVal = parseFloat(loanLimitTotal) || balance || 0;
    const installment = parseFloat(loanMonthlyInstallment) || 0;
    const annualRate = parseFloat(loanAnnualInterestPct) || 0;

    setLoanBusy(true);
    setLoanError(null);

    try {
      const activeAccounts = [...creditAccounts];
      const activeObligations = [...creditObligations];

      const targetAccountId = editLoanId || `manual-loan-${Date.now()}`;
      
      const newAccount: CreditAccount = {
        id: targetAccountId,
        kind: loanKind,
        label: loanLabel,
        institution: loanInstitution || 'Outros',
        source: 'manual',
        status: balance > 0 ? 'ativo' : 'quitado',
        limitTotal: limitVal,
        balanceUsed: balance,
        monthlyInstallment: installment,
        annualInterestPct: annualRate,
        updatedAt: new Date().toISOString(),
      };

      // Converter taxa anual para mensal em %
      const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
      const monthlyRatePct = Number((monthlyRate * 100).toFixed(4));

      const newObligation: CreditObligation = {
        id: `manual-obligation-${targetAccountId}`,
        accountId: targetAccountId,
        kind: loanKind === 'financiamento' ? 'financiamento' : 'emprestimo',
        label: loanLabel,
        institution: loanInstitution || 'Outros',
        source: 'manual',
        status: balance > 0 ? 'aberta' : 'paga',
        amount: balance,
        dueDate: loanDueDate || new Date().toISOString().split('T')[0],
        interestRatePct: monthlyRatePct,
        updatedAt: new Date().toISOString(),
      };

      // Atualizar ou adicionar nas listas
      const accountIdx = activeAccounts.findIndex(a => a.id === targetAccountId);
      if (accountIdx >= 0) activeAccounts[accountIdx] = newAccount;
      else activeAccounts.push(newAccount);

      const obIdx = activeObligations.findIndex(o => o.accountId === targetAccountId);
      if (obIdx >= 0) activeObligations[obIdx] = newObligation;
      else activeObligations.push(newObligation);

      await setCreditAccounts(user.uid, activeAccounts);
      await setCreditObligations(user.uid, activeObligations);

      setLoanModalOpen(false);
    } catch (err: any) {
      setLoanError(err.message || 'Erro ao salvar empréstimo');
    } finally {
      setLoanBusy(false);
    }
  };

  const handleDeleteLoan = async (id: string) => {
    if (!user || !window.confirm('Tem certeza que deseja excluir este empréstimo?')) return;
    try {
      const activeAccounts = creditAccounts.filter(a => a.id !== id);
      const activeObligations = creditObligations.filter(o => o.accountId !== id);

      await setCreditAccounts(user.uid, activeAccounts);
      await setCreditObligations(user.uid, activeObligations);
    } catch (err: any) {
      alert('Erro ao excluir empréstimo: ' + err.message);
    }
  };

  const hasRealData = Boolean(
    data?.creditSnapshot || 
    (contextCards && contextCards.length > 0) || 
    (data?.creditAccounts && data.creditAccounts.length > 0)
  );

  // UX primeiro contato (10/06/2026): conta nova NÃO vê mais números falsos
  // como se fossem dela. Demo só aparece se o usuário pedir explicitamente.
  const [showDemo, setShowDemo] = useState(() => {
    return (location.state as { forceDemo?: boolean } | null)?.forceDemo ?? false;
  });
  const isDemo = !hasRealData && showDemo;
  const isEmpty = !hasRealData && !showDemo;

  useEffect(() => {
    const state = location.state as { forceDemo?: boolean } | null;
    if (state?.forceDemo) {
      setShowDemo(true);
      navigate('/credito/visao-geral', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  useEffect(() => {
    if (isEmpty && !isDemo) {
      navigate('/credito/cartoes');
    }
  }, [isEmpty, isDemo, navigate]);

  const accounts: CreditAccount[] = useMemo(() => {
    if (isDemo) return DEMO_ACCOUNTS;
    const openFinanceAccounts = data?.creditAccounts ?? [];
    const manualAccounts: CreditAccount[] = (contextCards ?? []).map((c) => {
      const bm = getBillingMonth(c, new Date().toISOString().split('T')[0]);
      const used = (c.purchases ?? []).filter((p) => p.billingMonth === bm).reduce((s, p) => s + p.value, 0);
      return {
        id: `manual-card-${c.id}`,
        kind: 'cartao',
        label: c.name,
        institution: (c as any).bank || 'Outros',
        limitTotal: c.limit ?? 0,
        balanceUsed: used,
        dueDay: c.dueDay ?? 15,
        closeDay: c.closeDay ?? 10,
        status: 'ativo',
        source: 'manual',
        originalId: c.id,
      };
    });
    return [...openFinanceAccounts, ...manualAccounts];
  }, [isDemo, data, contextCards]);

  const snapshot: CreditSnapshot = useMemo(() => {
    if (isDemo) return DEMO_SNAPSHOT;
    const pc = financialProfile.credit;
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      accountsCount: pc.activeCards + (data?.creditAccounts?.length ?? 0),
      obligationsOpenCount: pc.dueSoonCount,
      totalLimit: pc.totalCardLimit,
      totalUsed: pc.estimatedCardUsage,
      availableLimit: pc.availableLimit,
      cardUtilizationPct: pc.cardUtilizationPct,
      monthlyDebtCommitment: pc.monthlyDebtCommitment,
      dueSoonAmount: pc.dueSoonAmount,
      dueSoonCount: pc.dueSoonCount,
      highUtilizationAccounts: pc.highUtilizationCards,
      pressureLevel: pc.pressureLevel,
    };
  }, [isDemo, data, financialProfile]);

  const cards  = accounts.filter((a) => a.kind === 'cartao');
  const loans  = accounts.filter((a) => ['emprestimo', 'financiamento', 'consignado'].includes(a.kind));

  // Preparar dados para o simulador de quitação de dívidas
  const debtsForStrategy = useMemo(() => {
    return accounts
      .filter((a) => (a.balanceUsed ?? 0) > 0)
      .map((a) => {
        let rate = 0.03;
        if (a.kind === 'cartao') {
          rate = 0.14;
        } else if (a.annualInterestPct) {
          rate = Math.pow(1 + a.annualInterestPct / 100, 1 / 12) - 1;
        }
        return {
          name: a.label,
          balance: a.balanceUsed ?? 0,
          monthlyRate: rate,
          minimumPayment: a.kind === 'cartao' ? (a.balanceUsed ?? 0) * 0.15 : a.monthlyInstallment,
        };
      });
  }, [accounts]);

  const payoffResult = useMemo(() => {
    const result = analyzeDebtPayoffStrategy(debtsForStrategy);
    let ordered = [...result.orderedDebts];
    if (selectedPayoffStrategy === 'bola-de-neve') {
      ordered.sort((a, b) => a.balance - b.balance);
    } else {
      ordered.sort((a, b) => b.monthlyRate - a.monthlyRate);
    }
    const orderedDebts = ordered.map((d, index) => ({
      ...d,
      payoffPriority: index + 1,
    }));
    return {
      ...result,
      orderedDebts,
    };
  }, [debtsForStrategy, selectedPayoffStrategy]);

  // Preparar dados para o simulador de decisão de compra
  const purchaseDecisionResult = useMemo(() => {
    const totalValue = parseFloat(simValue) || 0;
    const cashDiscount = (parseFloat(simDiscount) || 0) / 100;
    const installments = simInstallments;
    const investmentMonthlyRate = (parseFloat(simCDI) || 0) / 100;

    const creditPressureLevel = snapshot.pressureLevel ?? 'controlado';
    const totalLimit = snapshot.totalLimit || 1;
    const totalUsed = snapshot.totalUsed || 0;
    const debtCommitmentPct = Math.round((totalUsed / totalLimit) * 100);
    const emergencyReserveMonths = isDemo ? 6 : (financialProfile.credit.availableLimit > 0 ? 4 : 2);

    return analyzeInstallmentDecision({
      totalValue,
      cashDiscount,
      installments,
      investmentMonthlyRate,
      creditPressureLevel,
      debtCommitmentPct,
      emergencyReserveMonths,
      hasCashAvailable: true,
    });
  }, [simValue, simDiscount, simInstallments, simCDI, snapshot, financialProfile, isDemo]);

  // Preparar dados para o simulador de amortização
  const amortizationResult = useMemo(() => {
    if (!selectedAmortizationLoan) return null;
    const balance = selectedAmortizationLoan.balanceUsed ?? 0;
    const payment = selectedAmortizationLoan.monthlyInstallment ?? 0;
    const annualRate = (selectedAmortizationLoan.annualInterestPct ?? 15) / 100;
    const extra = parseFloat(amortizationExtraAmount) || 0;
    const remaining = amortizationRemainingMonths;

    return analyzeFgtsAmortization({
      fgtsBalance: extra,
      remainingDebt: balance,
      currentMonthlyPayment: payment,
      annualInterestRate: annualRate,
      remainingMonths: remaining,
      currentCdiAnnual: 0.1225,
    });
  }, [selectedAmortizationLoan, amortizationExtraAmount, amortizationRemainingMonths]);

  const handleOpenAmortization = (loan: CreditAccount) => {
    setSelectedAmortizationLoan(loan);
    setAmortizationExtraAmount('5000');
    const estMonths = loan.monthlyInstallment && loan.monthlyInstallment > 0
      ? Math.ceil((loan.balanceUsed ?? 0) / loan.monthlyInstallment)
      : 24;
    setAmortizationRemainingMonths(estMonths);
    setAmortizationUseFgts(false);
  };

  // Muralha de Liquidez vs Exposição
  const shortTermExposure = useMemo(() => {
    const cardUsed = cards.reduce((sum, c) => sum + (c.balanceUsed ?? 0), 0);
    const loanInstallments = loans.reduce((sum, l) => sum + (l.monthlyInstallment ?? 0), 0);
    return cardUsed + loanInstallments;
  }, [cards, loans]);

  const liquidityWall = useMemo(() => {
    if (isDemo) return 15000;
    const avail = financialProfile.liquidity?.availableBalance ?? 0;
    const inv = financialProfile.investments?.totalCurrent ?? 0;
    return avail + inv;
  }, [isDemo, financialProfile]);

  const liquidityCoverageRatio = useMemo(() => {
    return shortTermExposure > 0 ? liquidityWall / shortTermExposure : 999;
  }, [liquidityWall, shortTermExposure]);

  // Segmentação por Banco
  const exposureByBank = useMemo(() => {
    const banksMap: Record<string, { label: string; amount: number; color: string }> = {};
    let total = 0;
    
    cards.forEach((c) => {
      const inst = c.institution || 'Outros';
      const balance = c.balanceUsed ?? 0;
      if (balance > 0) {
        total += balance;
        if (banksMap[inst]) {
          banksMap[inst].amount += balance;
        } else {
          let color = '#737373';
          const name = inst.toLowerCase();
          if (name.includes('nubank')) color = '#820ad1';
          else if (name.includes('itaú') || name.includes('itau')) color = '#ec7000';
          else if (name.includes('bradesco')) color = '#cc092f';
          else if (name.includes('inter')) color = '#ff7a00';
          else if (name.includes('c6')) color = '#202020';
          else if (name.includes('brasil') || name.includes('bb')) color = '#fcf800';
          else if (name.includes('santander')) color = '#ec0000';
          else if (name.includes('caixa')) color = '#1f70b7';
          
          banksMap[inst] = {
            label: inst,
            amount: balance,
            color,
          };
        }
      }
    });

    return {
      total,
      list: Object.values(banksMap).sort((a, b) => b.amount - a.amount),
    };
  }, [cards]);

  const pc = pressureColor(snapshot.pressureLevel);

  const pressureLabel: Record<NonNullable<CreditSnapshot['pressureLevel']>, string> = {
    controlado: 'Controlado', atencao: 'Atenção', elevado: 'Elevado', critico: 'Crítico',
  };

  // Ação recomendada baseada na pressão
  function nextAction() {
    switch (snapshot.pressureLevel) {
      case 'critico':    return 'Busque renegociação imediata — há vencimentos críticos pendentes.';
      case 'elevado':    return 'Priorize quitar o cartão com maior utilização antes do fechamento.';
      case 'atencao':    return 'Reduza utilização do cartão abaixo de 30% para melhorar seu score.';
      case 'controlado': return 'Crédito saudável. Avalie antecipar parcelas de maior juros.';
      default:           return 'Acompanhe seus vencimentos e mantenha pagamentos em dia.';
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-violet-400" />
            Hub de Crédito
          </h2>
          <p className="text-si-5 text-sm mt-1">Visão consolidada do seu passivo financeiro</p>
        </div>
        {isDemo && (
          <button
            type="button"
            onClick={() => setShowDemo(false)}
            className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-xl hover:bg-amber-500/20"
          >
            DEMONSTRAÇÃO — sair
          </button>
        )}
      </div>

      {/* Estado vazio: conta nova sem cartões/dívidas — nada de números falsos */}
      {isEmpty && (
        <div className="bg-si-card rounded-2xl border border-si-border">
          <EmptyState
            icon={<CreditCard className="w-8 h-8" />}
            title="Seu crédito ainda não tem dados"
            description="Adicione um cartão manualmente ou conecte seu banco via Open Finance para ver limites, faturas e seu nível de pressão de crédito aqui."
            actionLabel="Adicionar cartão"
            onAction={() => navigate('/credito/cartoes', { state: { autoOpenAdd: true } })}
          />
          <div className="flex items-center justify-center gap-4 pb-6 text-xs">
            <Link to="/configuracoes#open-finance" className="text-si-4 underline underline-offset-2 hover:text-si-2">
              Conectar banco (Open Finance)
            </Link>
            <button type="button" onClick={() => setShowDemo(true)} className="text-si-5 underline underline-offset-2 hover:text-si-3">
              Ver demonstração
            </button>
          </div>
        </div>
      )}

      {!isEmpty && <>
      {/* Tabs */}
      <div className="flex gap-1 bg-si-card rounded-xl p-1 border border-si-border overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => {
            if (t === 'Visão Geral') navigate('/credito/visao-geral');
            else if (t === 'Cartões') navigate('/credito/cartoes');
            else if (t === 'Empréstimos') navigate('/credito/emprestimos');
            else if (t === 'Oportunidades') navigate('/credito/oportunidades');
          }}
            className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === t ? 'bg-white text-zinc-900 shadow' : 'text-si-5 hover:text-si-3'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* ══ VISÃO GERAL ══ */}
      {activeTab === 'Visão Geral' && (
        <div className="space-y-4">
          {/* Top Grid: Pressão de Crédito e Muralha de Liquidez */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pressão de crédito */}
            <div className={`rounded-2xl border p-5 ${pc.bg} ${pc.border} flex flex-col justify-between`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-si-5 mb-1">Pressão do crédito</p>
                  <p className={`text-2xl font-bold ${pc.text}`}>
                    {pressureLabel[snapshot.pressureLevel ?? 'controlado'] ?? '—'}
                  </p>
                  <p className="text-xs text-si-4 mt-2 max-w-sm">{nextAction()}</p>
                </div>
                <ShieldCheck className={`w-10 h-10 shrink-0 ${pc.text} opacity-60`} />
              </div>
            </div>

            {/* Muralha de Liquidez vs Exposição */}
            {(() => {
              const coverageColor = liquidityCoverageRatio >= 1.5
                ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                : liquidityCoverageRatio >= 1.0
                  ? 'text-violet-400 border-violet-500/20 bg-violet-500/5'
                  : liquidityCoverageRatio >= 0.5
                    ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                    : 'text-rose-400 border-rose-500/20 bg-rose-500/5';
              const coverageText = liquidityCoverageRatio >= 1.5
                ? 'Excelente. Seu patrimônio líquido cobre confortavelmente todas as suas obrigações de curto prazo.'
                : liquidityCoverageRatio >= 1.0
                  ? 'Seguro. Suas reservas cobrem as faturas, mas evite novos parcelamentos para manter a margem.'
                  : 'Atenção. Suas dívidas de curto prazo superam suas reservas disponíveis. Você está vulnerável.';
              const ratioDisplay = liquidityCoverageRatio === 999
                ? '∞'
                : `${liquidityCoverageRatio.toFixed(1)}x`;

              return (
                <div className={`rounded-2xl border p-5 flex flex-col justify-between ${coverageColor}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-si-5 mb-1">Muralha de Liquidez vs Exposição</p>
                      <p className="text-2xl font-bold text-si-1">
                        {ratioDisplay} <span className="text-xs text-si-5 font-normal">cobertura</span>
                      </p>
                      <p className="text-xs text-si-4 leading-snug">{coverageText}</p>
                    </div>
                    <Target className="w-10 h-10 shrink-0 opacity-60" />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-si-5 mt-4 pt-3 border-t border-si-border/30">
                    <span>Reserva líquida: <strong className="text-si-2">{fmtBRL(liquidityWall)}</strong></span>
                    <span>Exposição 30d: <strong className="text-rose-400">{fmtBRL(shortTermExposure)}</strong></span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Limite total',       value: fmtBRL(snapshot.totalLimit),             sub: 'capacidade de crédito' },
              { label: 'Total utilizado',    value: fmtBRL(snapshot.totalUsed),              sub: fmtPct(snapshot.cardUtilizationPct) + ' utilizado' },
              { label: 'Compromisso mensal', value: fmtBRL(snapshot.monthlyDebtCommitment),  sub: 'em parcelas e faturas' },
              { label: 'Vence em breve',     value: fmtBRL(snapshot.dueSoonAmount),           sub: `${snapshot.dueSoonCount} obrigações` },
            ].map((k) => (
              <div key={k.label} className="bg-si-card rounded-2xl border border-si-border p-4">
                <p className="text-xs text-si-5 mb-1">{k.label}</p>
                <p className="text-xl font-bold text-si-1">{k.value}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Utilização geral */}
          <div className="bg-si-card rounded-2xl border border-si-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-si-3">Utilização do limite</span>
              <span className={`text-sm font-bold ${snapshot.cardUtilizationPct > 70 ? 'text-rose-400' : snapshot.cardUtilizationPct > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {fmtPct(snapshot.cardUtilizationPct)}
              </span>
            </div>
            <UtilBar pct={snapshot.cardUtilizationPct} />
            <p className="text-xs text-zinc-600 mt-2">
              Ideal: abaixo de 30% para não impactar o score
            </p>
          </div>

          {/* Resumo de contas */}
          <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
            <div className="px-5 py-4 border-b border-si-border flex items-center justify-between">
              <span className="text-sm font-semibold text-si-3">{accounts.length} {accounts.length === 1 ? 'conta' : 'contas'} de crédito</span>
              <button onClick={() => setActiveTab('Cartões')}
                className="text-xs text-si-3 hover:text-si-1 hover:underline flex items-center gap-1">
                Ver detalhes <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {accounts.slice(0, 3).map((a) => {
              const used = a.balanceUsed ?? 0;
              const total = a.limitTotal ?? 1;
              const pct = (used / total) * 100;
              return (
                <div key={a.id} className="px-5 py-3 border-b border-si-border last:border-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-sm font-medium text-si-2">{prettyLabel(a.label)}</span>
                      <span className="ml-2 text-xs text-zinc-600">{a.institution}</span>
                    </div>
                    <span className="text-sm font-semibold text-si-1">{fmtBRL(used)}</span>
                  </div>
                  <UtilBar pct={pct} />
                </div>
              );
            })}
          </div>

          {/* Distribuição de Exposição por Emissor */}
          {exposureByBank.total > 0 && (
            <div className="bg-si-card rounded-2xl border border-si-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-si-3">Concentração de Risco por Emissor</span>
                <span className="text-xs text-si-5">Total devedor consolidado</span>
              </div>
              
              {/* Barra de progresso segmentada estilo Apple */}
              <div className="h-3 bg-si-zinc-8 rounded-full overflow-hidden flex">
                {exposureByBank.list.map((item) => {
                  const pct = (item.amount / exposureByBank.total) * 100;
                  return (
                    <div
                      key={item.label}
                      className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: item.color,
                      }}
                      title={`${item.label}: ${pct.toFixed(0)}%`}
                    />
                  );
                })}
              </div>

              {/* Lista de Legendas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {exposureByBank.list.map((item) => {
                  const pct = (item.amount / exposureByBank.total) * 100;
                  return (
                    <div key={item.label} className="flex items-start gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: item.color }} />
                      <div className="min-w-0">
                        <p className="font-semibold text-si-2 truncate">{item.label}</p>
                        <p className="text-[11px] text-si-5">{pct.toFixed(0)}% ({fmtBRL(item.amount)})</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}



      {/* ══ CARTÕES ══ */}
      {activeTab === 'Cartões' && (
        <Cards isEmbedded={true} />
      )}

      {/* ══ EMPRÉSTIMOS ══ */}
      {activeTab === 'Empréstimos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-si-1">Empréstimos & Financiamentos</h2>
              <p className="text-xs text-si-5">Acompanhe seus passivos de médio/longo prazo e simule antecipações ou amortizações.</p>
            </div>
            <button
              onClick={handleOpenAddLoan}
              className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold transition-colors shrink-0 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo empréstimo
            </button>
          </div>

          {loans.length === 0 ? (
            <div className="p-12 rounded-2xl border border-si-border bg-si-card/30 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-si-5 mx-auto opacity-30 animate-pulse" />
              <p className="text-sm font-semibold text-si-3">Nenhum empréstimo ou financiamento registrado.</p>
              <p className="text-xs text-si-5 max-w-md mx-auto">
                Registre seus financiamentos de veículos, imóveis ou empréstimos pessoais para calcular o Spread Gap e ver o impacto real no seu fluxo de caixa e patrimônio líquido.
              </p>
              <button
                onClick={handleOpenAddLoan}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold transition-colors uppercase tracking-wider"
              >
                Cadastrar agora
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {loans.map((l) => {
                const saldo   = l.balanceUsed ?? 0;
                const parcela = l.monthlyInstallment ?? 0;
                const juros   = l.annualInterestPct ?? 0;
                const pct     = l.limitTotal ? (saldo / l.limitTotal) * 100 : 0;
                const prettyKind = l.kind === 'emprestimo' ? 'Empréstimo' : l.kind === 'financiamento' ? 'Financiamento' : l.kind === 'consignado' ? 'Consignado' : 'Outro';
                return (
                  <div key={l.id} className="bg-si-card rounded-2xl border border-si-border p-5 space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-si-1">{l.label}</p>
                            {l.source === 'manual' && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleEditLoan(l)}
                                  className="p-1 text-si-5 hover:text-si-2 transition-colors"
                                  title="Editar"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLoan(l.id)}
                                  className="p-1 text-si-5 hover:text-rose-400 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-si-5">{l.institution} · {prettyKind}</p>
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 shrink-0">
                          {juros.toFixed(1)}% a.a.
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 text-center bg-si-over-1 rounded-xl p-3 border border-si-border/40">
                        <div>
                          <p className="text-[10px] text-si-4 uppercase tracking-wider">Saldo devedor</p>
                          <p className="font-bold text-rose-400 text-sm mt-0.5">{fmtBRL(saldo)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-si-4 uppercase tracking-wider">Parcela mensal</p>
                          <p className="font-bold text-si-1 text-sm mt-0.5">{fmtBRL(parcela)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-si-4 uppercase tracking-wider">Progresso</p>
                          <p className="font-bold text-si-4 text-sm mt-0.5">{fmtPct(100 - pct)}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-si-5">
                          <span>Restante</span>
                          <span>Amortizado</span>
                        </div>
                        <UtilBar pct={pct} warn={90} />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-si-border/30">
                      <button
                        onClick={() => handleOpenAmortization(l)}
                        className="flex-1 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 hover:text-si-1 hover:bg-si-over-3 text-xs font-semibold transition-colors"
                      >
                        Simular antecipação
                      </button>
                      <ComingSoonBadge>
                        <button disabled className="flex-1 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4/50 text-xs cursor-not-allowed">
                          Renegociar
                        </button>
                      </ComingSoonBadge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ PLANO DE AÇÃO — dentro da Visão Geral (consolidação 13/06) ══ */}
      {activeTab === 'Visão Geral' && (
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase text-si-5 pt-2">
            Plano de ação
          </h3>
          <div className={`rounded-2xl border p-5 ${pc.bg} ${pc.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Target className={`w-5 h-5 ${pc.text}`} />
              <p className={`font-bold ${pc.text}`}>Próximo passo recomendado</p>
            </div>
            <p className="text-sm text-si-3">{nextAction()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              {[
                {
                  icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10',
                  title: 'Prioridade #1 — Quitar',
                  body: `${cards.sort((a, b) => ((b.balanceUsed ?? 0) / (b.limitTotal ?? 1)) - ((a.balanceUsed ?? 0) / (a.limitTotal ?? 1)))[0]?.label ?? '—'}: maior utilização relativa. Reduzir fatura melhora score e reduz encargos do rotativo.`,
                  action: 'Pagar agora',
                },
                {
                  icon: RefreshCw, color: 'text-amber-400', bg: 'bg-amber-500/10',
                  title: 'Renegociação pendente',
                  body: loans.length > 0
                    ? `${loans[0].label} a ${loans[0].annualInterestPct?.toFixed(1) ?? '?'}% a.a. — avalie portabilidade de crédito para reduzir juros.`
                    : 'Nenhum empréstimo ativo. Ótimo momento para construir reserva.',
                  action: 'Simular',
                },
                {
                  icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10',
                  title: 'Vencimentos próximos',
                  body: `${fmtBRL(snapshot.dueSoonAmount)} em ${snapshot.dueSoonCount} obrigações vencem nos próximos dias. Garanta saldo em conta.`,
                  action: 'Ver calendário',
                },
                {
                  icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10',
                  title: 'Progresso recente',
                  body: 'Utilização geral de ' + fmtPct(snapshot.cardUtilizationPct) + ' — ' + (snapshot.cardUtilizationPct < 30 ? 'excelente! Abaixo de 30%.' : snapshot.cardUtilizationPct < 70 ? 'dentro do aceitável. Meta: abaixo de 30%.' : 'acima do ideal. Foque em reduzir.'),
                  action: null,
                },
              ].map((item) => (
                <div key={item.title} className="bg-si-card rounded-2xl border border-si-border p-4 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                    <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-si-2 text-xs mb-1">{item.title}</p>
                    <p className="text-[11px] text-si-5 leading-relaxed">{item.body}</p>
                  </div>
                  {item.action && (
                    <ComingSoonBadge>
                      <button disabled className="shrink-0 px-2 py-1 rounded-lg bg-si-over-2 text-si-5 text-[11px] font-semibold cursor-not-allowed flex items-center gap-0.5">
                        {item.action} <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </ComingSoonBadge>
                  )}
                </div>
              ))}
            </div>

            {/* Simulador de Quitação de Dívidas */}
            <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="font-bold text-si-2 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400" />
                  Simulador de Quitação Estratégica
                </h3>
                <p className="text-xs text-si-5 mt-1">
                  Mude a estratégia para recalcular a ordem de ataque prioritário das suas dívidas.
                </p>
              </div>

              <div className="flex gap-2 p-1 bg-si-bg border border-si-border rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedPayoffStrategy('avalanche')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedPayoffStrategy === 'avalanche'
                      ? 'bg-white text-zinc-900 shadow'
                      : 'text-si-5 hover:text-si-3'
                  }`}
                >
                  🏔️ Avalanche (Foco em Juros)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayoffStrategy('bola-de-neve')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedPayoffStrategy === 'bola-de-neve'
                      ? 'bg-white text-zinc-900 shadow'
                      : 'text-si-5 hover:text-si-3'
                  }`}
                >
                  ⛄ Bola de Neve (Foco em Saldo)
                </button>
              </div>

              {debtsForStrategy.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-si-border rounded-xl space-y-2">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 opacity-60" />
                  <p className="text-xs font-semibold text-si-2">Nenhuma dívida pendente detectada!</p>
                  <p className="text-[11px] text-si-5">Seu patrimônio está livre de juros. Parabéns!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {payoffResult.orderedDebts.map((d) => (
                      <div key={d.name} className="flex items-center justify-between border-b border-si-border/40 last:border-0 pb-2.5 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5.5 h-5.5 rounded-full bg-violet-600/20 text-violet-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                            {d.payoffPriority}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-si-2 truncate">{d.name}</p>
                            <p className="text-[11px] text-si-5">Juros de {(d.monthlyRate * 100).toFixed(1)}% a.m.</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-si-1">{fmtBRL(d.balance)}</p>
                          <p className="text-[10px] text-rose-400 font-medium">Juros: {fmtBRL(d.monthlyInterestCost)}/mês</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-si-over-1 border border-si-border/60 text-[11px] text-si-4 leading-relaxed whitespace-pre-line">
                    {payoffResult.narrativa}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ OPORTUNIDADES ══ */}
      {activeTab === 'Oportunidades' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Simulador de Compra (Left Column) */}
          <div className="lg:col-span-7 bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-400" />
              <div>
                <h3 className="font-bold text-si-2 text-sm">Simulador de Compra Inteligente</h3>
                <p className="text-xs text-si-5">Compare pagamento à vista com desconto vs. parcelar e investir.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-si-4 font-semibold mb-0.5 block">Valor do Item (R$)</label>
                <input
                  type="number"
                  value={simValue}
                  onChange={(e) => setSimValue(e.target.value)}
                  className="w-full bg-si-bg border border-si-border rounded-xl px-3 py-1.5 text-xs text-si-1 focus:outline-none focus:border-si-border-lg transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-si-4 font-semibold mb-0.5 block">Desconto à Vista (%)</label>
                <input
                  type="number"
                  value={simDiscount}
                  onChange={(e) => setSimDiscount(e.target.value)}
                  className="w-full bg-si-bg border border-si-border rounded-xl px-3 py-1.5 text-xs text-si-1 focus:outline-none focus:border-si-border-lg transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-si-4 font-semibold mb-0.5 block flex justify-between">
                  <span>Parcelas</span>
                  <span className="text-violet-400 font-bold">{simInstallments}x</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={simInstallments}
                  onChange={(e) => setSimInstallments(parseInt(e.target.value))}
                  className="w-full accent-violet-500 bg-si-zinc-8 h-1 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] text-si-4 font-semibold mb-0.5 block">Rendimento (% a.m. CDI)</label>
                <input
                  type="number"
                  step="0.05"
                  value={simCDI}
                  onChange={(e) => setSimCDI(e.target.value)}
                  className="w-full bg-si-bg border border-si-border rounded-xl px-3 py-1.5 text-xs text-si-1 focus:outline-none focus:border-si-border-lg transition-colors"
                />
              </div>
            </div>

            {/* Verdict Box */}
            {(() => {
              const styles: Record<
                typeof purchaseDecisionResult.verdict,
                { bg: string; border: string; text: string; badge: string; icon: any }
              > = {
                'parcelar-e-investir': {
                  bg: 'bg-emerald-500/5',
                  border: 'border-emerald-500/20',
                  text: 'text-emerald-400',
                  badge: 'bg-emerald-500/10 text-emerald-400',
                  icon: CheckCircle,
                },
                'avista-com-desconto': {
                  bg: 'bg-violet-500/5',
                  border: 'border-violet-500/20',
                  text: 'text-violet-400',
                  badge: 'bg-violet-500/10 text-violet-400',
                  icon: Zap,
                },
                'avista-por-pressao': {
                  bg: 'bg-amber-500/5',
                  border: 'border-amber-500/20',
                  text: 'text-amber-400',
                  badge: 'bg-amber-500/10 text-amber-400',
                  icon: AlertTriangle,
                },
                'nao-comprar-agora': {
                  bg: 'bg-rose-500/5',
                  border: 'border-rose-500/20',
                  text: 'text-rose-400',
                  badge: 'bg-rose-500/10 text-rose-400',
                  icon: AlertTriangle,
                },
                'neutro': {
                  bg: 'bg-zinc-500/5',
                  border: 'border-zinc-500/20',
                  text: 'text-zinc-400',
                  badge: 'bg-zinc-500/10 text-zinc-400',
                  icon: Clock,
                },
              };
              const style = styles[purchaseDecisionResult.verdict] || styles.neutro;
              const Icon = style.icon;
              return (
                <div className={`rounded-xl border p-4 space-y-3 ${style.bg} ${style.border}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${style.badge}`}>
                      {purchaseDecisionResult.breakdown.recommendation}
                    </span>
                    <Icon className={`w-4 h-4 ${style.text}`} />
                  </div>
                  <div>
                    <p className="text-[11px] text-si-5">Vantagem Líquida Calculada</p>
                    <p className="text-xl font-bold text-si-1">
                      {fmtBRL(purchaseDecisionResult.netAdvantage)}
                    </p>
                  </div>

                  {/* Portal do Tempo */}
                  <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-violet-400 font-semibold text-[10px] uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      <span>Portal do Tempo (Custo de Oportunidade)</span>
                    </div>
                    <p className="text-[10px] text-si-4 leading-normal">
                      Se desistir desta compra e investir os <span className="font-semibold text-si-1">{fmtBRL(purchaseDecisionResult.cashPrice)}</span> a uma taxa real estimada de <span className="font-semibold text-si-1">0.8% a.m.</span>, em **10 anos** seu capital valeria:
                    </p>
                    <p className="text-base font-extrabold text-violet-400">
                      {fmtBRL(purchaseDecisionResult.opportunityCost10y)}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-si-bg/40 border border-si-border/30 text-[11px] text-si-4 leading-relaxed whitespace-pre-line">
                    {purchaseDecisionResult.narrativa}
                  </div>

                  {/* Comparativo de Custo */}
                  <div className="border border-si-border/30 rounded-lg overflow-hidden text-[11px]">
                    <div className="grid grid-cols-3 bg-si-zinc-8/50 border-b border-si-border/30 p-1.5 text-si-4 font-bold">
                      <span>Métrica</span>
                      <span className="text-right">À Vista</span>
                      <span className="text-right">Parcelado</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-si-border/20 p-1.5 text-si-3">
                      <span>Preço Nominal</span>
                      <span className="text-right">{fmtBRL(purchaseDecisionResult.cashPrice)}</span>
                      <span className="text-right">{fmtBRL(purchaseDecisionResult.installmentTotalCost)}</span>
                    </div>
                    <div className="grid grid-cols-3 border-b border-si-border/20 p-1.5 text-si-3">
                      <span>Rendimento Est.</span>
                      <span className="text-right">R$ 0,00</span>
                      <span className="text-right text-emerald-400">+{fmtBRL(purchaseDecisionResult.investmentGainIfInstallment)}</span>
                    </div>
                    <div className="grid grid-cols-3 bg-si-bg/20 p-1.5 text-si-2 font-semibold">
                      <span>Custo Líquido Real</span>
                      <span className="text-right">{fmtBRL(purchaseDecisionResult.cashPrice)}</span>
                      <span className="text-right text-violet-400">{fmtBRL(purchaseDecisionResult.breakdown.installmentOption.netCost)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Oportunidades Contextuais (Right Column) */}
          <div className="lg:col-span-5 space-y-4">
            {(snapshot.pressureLevel === 'elevado' || snapshot.pressureLevel === 'critico') && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-amber-300 text-[11px] leading-snug">
                  Com pressão de crédito elevada, priorizamos opções de renegociação — não de contratação.
                </p>
              </div>
            )}

            {[
              {
                show: snapshot.pressureLevel !== 'controlado',
                emoji: '🔄',
                title: 'Portabilidade de crédito',
                desc: 'Transfira seu empréstimo para outra instituição com taxa menor. Processo gratuito e regulamentado pelo Bacen.',
                cta: 'Simular portabilidade',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20',
              },
              {
                show: snapshot.pressureLevel === 'controlado' || snapshot.pressureLevel === 'atencao',
                emoji: '📈',
                title: 'Aumento de limite',
                desc: 'Seu comportamento de pagamento qualifica para aumento. Utilização sobe, mas score pode melhorar se você manter o uso baixo.',
                cta: 'Solicitar aumento',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
              },
              {
                show: true,
                emoji: '🏠',
                title: 'Consolidação de dívidas',
                desc: 'Unifique cartões e empréstimos em uma única parcela com taxa menor. Parceiros: Creditas, Open Co, Banco Inter.',
                cta: 'Ver simulação',
                color: 'text-violet-400',
                bg: 'bg-violet-500/10',
                border: 'border-violet-500/20',
              },
              {
                show: snapshot.pressureLevel === 'controlado',
                emoji: '🛡️',
                title: 'Seguro prestamista',
                desc: 'Proteja suas parcelas em caso de desemprego ou incapacidade. A partir de R$ 12/mês.',
                cta: 'Ver planos',
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20',
              },
            ].filter((o) => o.show).map((o) => (
              <div key={o.title} className={`rounded-2xl border p-4.5 ${o.bg} ${o.border}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{o.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold ${o.color} text-xs mb-0.5`}>{o.title}</p>
                    <p className="text-[11px] text-si-5 leading-normal mb-2.5">{o.desc}</p>
                    <ComingSoonBadge>
                      <button disabled className={`px-3 py-1.5 rounded-xl text-[11px] font-bold ${o.bg} ${o.color}/50 border ${o.border} cursor-not-allowed flex items-center gap-1`}>
                        {o.cta} <ChevronRight className="w-3 h-3" />
                      </button>
                    </ComingSoonBadge>
                  </div>
                </div>
              </div>
            ))}

            <p className="text-[11px] text-zinc-600 text-center">
              Oportunidades exibidas conforme sua saúde financeira atual. Nunca oferecemos crédito que piore sua situação.
            </p>
          </div>
        </div>
      )}

      {/* ══ EDUCAÇÃO FINANCEIRA — dentro de Oportunidades (consolidação 13/06) ══ */}
      {activeTab === 'Oportunidades' && (
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase text-si-5 pt-2">
            Educação de crédito
          </h3>
          {/* Carrossel */}
          <div className="bg-si-card rounded-2xl border border-si-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-violet-400" />
              <p className="font-semibold text-si-2">Educação financeira contextual</p>
            </div>
            <div className="text-center py-4">
              <span className="text-5xl">{EDUCATION_CARDS[eduIdx].emoji}</span>
              <h3 className="font-bold text-si-1 mt-3 mb-2">{EDUCATION_CARDS[eduIdx].title}</h3>
              <p className="text-sm text-si-4 leading-relaxed">{EDUCATION_CARDS[eduIdx].desc}</p>
            </div>
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setEduIdx((i) => (i - 1 + EDUCATION_CARDS.length) % EDUCATION_CARDS.length)}
                className="px-4 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-xs hover:bg-si-over-3"
              >← Anterior</button>
              <div className="flex gap-1.5">
                {EDUCATION_CARDS.map((_, i) => (
                  <div key={i} onClick={() => setEduIdx(i)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${i === eduIdx ? 'bg-violet-400' : 'bg-zinc-700'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setEduIdx((i) => (i + 1) % EDUCATION_CARDS.length)}
                className="px-4 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-xs hover:bg-si-over-3"
              >Próximo →</button>
            </div>
          </div>

          {/* Glossário rápido */}
          <div className="bg-si-card rounded-2xl border border-si-border p-5">
            <p className="font-semibold text-si-2 mb-3 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-400" /> Termos importantes
            </p>
            <div className="space-y-3">
              {[
                { term: 'CET',            def: 'Custo Efetivo Total — inclui juros, IOF, tarifas e seguros. É o custo real do crédito.' },
                { term: 'Utilização',     def: 'Quanto do limite está sendo usado. Acima de 30% começa a impactar o score negativamente.' },
                { term: 'Portabilidade',  def: 'Transferência do seu crédito para outra instituição com taxa menor, sem custo.' },
                { term: 'Amortização',    def: 'Pagamento antecipado de parcelas. Reduz o prazo ou o valor das parcelas restantes.' },
              ].map((g) => (
                <div key={g.term} className="flex gap-3">
                  <span className="text-xs font-bold text-violet-400 shrink-0 mt-0.5 w-24">{g.term}</span>
                  <span className="text-xs text-si-5 leading-relaxed">{g.def}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Amortização */}
      {selectedAmortizationLoan && (
        <Modal
          open={!!selectedAmortizationLoan}
          onClose={() => setSelectedAmortizationLoan(null)}
          title={`Simular Amortização — ${selectedAmortizationLoan.label}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-si-bg p-3 border border-si-border rounded-xl">
                <p className="text-[11px] text-si-4 uppercase font-semibold">Saldo Devedor Atual</p>
                <p className="text-sm font-bold text-rose-400">{fmtBRL(selectedAmortizationLoan.balanceUsed ?? 0)}</p>
              </div>
              <div className="bg-si-bg p-3 border border-si-border rounded-xl">
                <p className="text-[11px] text-si-4 uppercase font-semibold">Parcela Mensal Atual</p>
                <p className="text-sm font-bold text-si-1">{fmtBRL(selectedAmortizationLoan.monthlyInstallment ?? 0)}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-si-4 font-semibold mb-1 block">Valor Extra para Amortizar (R$)</label>
                <input
                  type="number"
                  value={amortizationExtraAmount}
                  onChange={(e) => setAmortizationExtraAmount(e.target.value)}
                  className="w-full bg-si-bg border border-si-border rounded-xl px-3 py-2 text-sm text-si-1 focus:outline-none focus:border-si-border-lg transition-colors"
                  placeholder="Ex: 5000"
                />
              </div>

              <div>
                <label className="text-xs text-si-4 font-semibold mb-1 block flex justify-between">
                  <span>Meses Restantes de Contrato</span>
                  <span className="text-violet-400 font-bold">{amortizationRemainingMonths} meses</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={360}
                  value={amortizationRemainingMonths}
                  onChange={(e) => setAmortizationRemainingMonths(parseInt(e.target.value))}
                  className="w-full accent-violet-500 bg-si-zinc-8 h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={amortizationUseFgts}
                  onChange={(e) => setAmortizationUseFgts(e.target.checked)}
                  className="w-4 h-4 rounded border-si-border text-violet-600 focus:ring-si-border-lg bg-si-bg"
                />
                <span className="text-xs text-si-4 font-medium">Usar saldo do FGTS para a amortização</span>
              </label>
            </div>

            {amortizationResult && (
              <div className="bg-si-over-1 border border-si-border rounded-xl p-4.5 space-y-4">
                <div className="flex items-center justify-between border-b border-si-border/30 pb-2.5">
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                    Análise do Impacto
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    amortizationResult.worthIt ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {amortizationResult.worthIt ? 'Recomendado' : 'Avaliar Alternativas'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-[11px] text-si-5">Nova Parcela Estimada</p>
                    <p className="text-base font-bold text-si-1">{fmtBRL(amortizationResult.newMonthlyPayment)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-si-5">Economia Mensal</p>
                    <p className="text-base font-bold text-emerald-400">+{fmtBRL(amortizationResult.monthlySavings)}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-si-bg/50 border border-si-border/40 text-[11px] text-si-4 leading-relaxed whitespace-pre-line">
                  {amortizationResult.narrativa}
                </div>

                <div className="flex justify-between text-[11px] text-si-5 border-t border-si-border/30 pt-3">
                  <span>Retorno do aporte (Break-even): <strong>{amortizationResult.monthsToBreakeven} meses</strong></span>
                  <span>Economia acumulada 10a: <strong>{fmtBRL(amortizationResult.totalSaved10y)}</strong></span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedAmortizationLoan(null)}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold transition-all uppercase tracking-wider"
              >
                Concluir Simulação
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Adicionar/Editar Empréstimo Manual */}
      {loanModalOpen && (
        <Modal
          open={loanModalOpen}
          onClose={() => setLoanModalOpen(false)}
          title={editLoanId ? 'Editar Empréstimo / Financiamento' : 'Cadastrar Empréstimo / Financiamento'}
          size="md"
        >
          <div className="space-y-4">
            {loanError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400">
                {loanError}
              </div>
            )}

            <Input
              label="Nome do Empréstimo / Descrição"
              type="text"
              value={loanLabel}
              onChange={(e) => setLoanLabel(e.target.value)}
              placeholder="Ex: Empréstimo Pessoal Caixa"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Instituição / Banco"
                type="text"
                value={loanInstitution}
                onChange={(e) => setLoanInstitution(e.target.value)}
                placeholder="Ex: Itaú, BB"
              />
              <Select
                label="Tipo de Passivo"
                value={loanKind}
                onChange={(e) => setLoanKind(e.target.value as any)}
              >
                <option value="emprestimo">Empréstimo</option>
                <option value="financiamento">Financiamento</option>
                <option value="consignado">Consignado</option>
                <option value="outro">Outro</option>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Valor Total Emprestado (R$)"
                type="number"
                value={loanLimitTotal}
                onChange={(e) => setLoanLimitTotal(e.target.value)}
                placeholder="Ex: 20000"
              />
              <Input
                label="Saldo Devedor Atual (R$)"
                type="number"
                value={loanBalanceUsed}
                onChange={(e) => setLoanBalanceUsed(e.target.value)}
                placeholder="Ex: 14500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Parcela Mensal (R$)"
                type="number"
                value={loanMonthlyInstallment}
                onChange={(e) => setLoanMonthlyInstallment(e.target.value)}
                placeholder="Ex: 720"
              />
              <Input
                label="Taxa de Juros Anual (% a.a.)"
                type="number"
                value={loanAnnualInterestPct}
                onChange={(e) => setLoanAnnualInterestPct(e.target.value)}
                placeholder="Ex: 28.4"
              />
            </div>

            <Input
              label="Data do Próximo Vencimento"
              type="date"
              value={loanDueDate}
              onChange={(e) => setLoanDueDate(e.target.value)}
            />

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setLoanModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-si-over-2 hover:bg-si-over-3 text-si-3 text-xs font-bold transition-all uppercase tracking-wider border border-si-border"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveLoan}
                disabled={loanBusy}
                className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold transition-all uppercase tracking-wider disabled:opacity-50"
              >
                {loanBusy ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      </>}

    </div>
  );
}
