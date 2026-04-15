import { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { updateUserDoc } from '../../services/persistUserData';
import { updateProfile } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import {
  User, Phone, Briefcase, Target, ChevronRight, ChevronLeft,
  X, Check, Building2, Banknote, Loader2, AlertCircle, Gift, ExternalLink,
} from 'lucide-react';
import { OpenFinanceConnect } from '../openFinance/OpenFinanceConnect';

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'identidade', label: 'Identidade',         icon: User      },
  { id: 'contato',    label: 'Contato',             icon: Phone     },
  { id: 'financeiro', label: 'Perfil Financeiro',   icon: Briefcase },
  { id: 'objetivo',   label: 'Objetivos',           icon: Target    },
  { id: 'bancos',     label: 'Conectar Bancos',     icon: Building2 },
  { id: 'valores',    label: 'Dinheiro Esquecido',  icon: Banknote  },
] as const;

// ─── Opções ───────────────────────────────────────────────────────────────────
const PERFIS = [
  { id: 'clt',        label: 'CLT'        },
  { id: 'mei',        label: 'MEI'        },
  { id: 'empresario', label: 'Empresário' },
  { id: 'estudante',  label: 'Estudante'  },
  { id: 'outro',      label: 'Outro'      },
];

const RENDAS = [
  { id: 'ate2k',    label: 'Até R$ 2.000'       },
  { id: '2k5k',     label: 'R$ 2.000 – R$ 5.000' },
  { id: '5k10k',    label: 'R$ 5.000 – R$ 10.000' },
  { id: '10k20k',   label: 'R$ 10.000 – R$ 20.000' },
  { id: 'acima20k', label: 'Acima de R$ 20.000'  },
];

const OBJETIVOS = [
  { id: 'dividas',       label: 'Sair das dívidas'          },
  { id: 'reserva',       label: 'Criar reserva de emergência' },
  { id: 'investir',      label: 'Começar a investir'        },
  { id: 'casa',          label: 'Comprar imóvel'            },
  { id: 'aposentadoria', label: 'Planejar aposentadoria'    },
  { id: 'controle',      label: 'Controlar gastos'          },
];

// ─── Validação CPF ────────────────────────────────────────────────────────────
function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(digits[i]) * (t + 1 - i);
    const rest = (sum * 10) % 11;
    if ((rest === 10 ? 0 : rest) !== Number(digits[t])) return false;
  }
  return true;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WizardForm {
  nome: string; apelido: string; nasc: string; cpf: string; sexo: string;
  tel: string; cep: string; estado: string; cidade: string;
  perfil: string; renda: string; obj: string[]; pesq: boolean;
}

const INITIAL_FORM: WizardForm = {
  nome: '', apelido: '', nasc: '', cpf: '', sexo: '',
  tel: '', cep: '', estado: '', cidade: '',
  perfil: '', renda: '', obj: [], pesq: false,
};

type ValoresResult = {
  hasValues: boolean | null;
  count?: number;
  institutions?: string[];
  claimUrl?: string;
  error?: string;
} | null;

interface Props { open: boolean; onClose: () => void; onComplete?: () => void; }

// ─── Componente ───────────────────────────────────────────────────────────────
export function RegistrationWizard({ open, onClose, onComplete }: Props) {
  const { user, data } = useAppContext();
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState<WizardForm>(INITIAL_FORM);
  const [busy, setBusy]           = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [bankConnected, setBankConnected] = useState(false);

  // Valores a Receber
  const [valoresLoading, setValoresLoading] = useState(false);
  const [valoresResult, setValoresResult]   = useState<ValoresResult>(null);

  const set = useCallback(<K extends keyof WizardForm>(key: K, value: WizardForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleObj = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      obj: prev.obj.includes(id) ? prev.obj.filter((o) => o !== id) : [...prev.obj, id],
    }));
  }, []);

  // Fechar com Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Auto-consultar BCB quando chegar no step "valores"
  useEffect(() => {
    if (STEPS[step]?.id !== 'valores') return;
    if (valoresResult !== null) return; // já consultou
    const cpf = form.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) { setValoresResult({ hasValues: null, error: 'CPF não informado.' }); return; }

    setValoresLoading(true);
    const fn = httpsCallable<{ cpf: string }, ValoresResult>(functions, 'valoresAReceberApi');
    fn({ cpf })
      .then((res) => setValoresResult(res.data))
      .catch(() => setValoresResult({ hasValues: null, error: 'Não foi possível consultar agora.' }))
      .finally(() => setValoresLoading(false));
  }, [step, form.cpf, valoresResult]);

  // Lookup CEP
  const lookupCEP = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const d = await res.json();
      if (!d.erro) setForm((prev) => ({ ...prev, estado: d.uf || prev.estado, cidade: d.localidade || prev.cidade }));
    } catch { /* silent */ } finally { setCepLoading(false); }
  }, []);

  const isStepValid = useCallback((): boolean => {
    switch (STEPS[step]?.id) {
      case 'identidade': return form.nome.trim().length > 2 && isValidCPF(form.cpf);
      case 'contato':    return form.tel.replace(/\D/g, '').length >= 10;
      case 'financeiro': return !!form.perfil && !!form.renda;
      case 'objetivo':   return form.obj.length > 0;
      case 'bancos':     return true; // sempre pode avançar (é opcional)
      case 'valores':    return true; // sempre pode concluir
      default:           return false;
    }
  }, [step, form]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setBusy(true);
    try {
      await updateUserDoc(user.uid, {
        cadastroCompleto: form,
        cadastroCompletoEm: serverTimestamp(),
        openBankingConectadoNoOnboarding: bankConnected,
      } as any);
      if (user.displayName !== form.nome && form.nome.trim()) {
        await updateProfile(user, { displayName: form.nome.trim() });
      }
      onComplete?.();
      onClose();
    } catch { /* silent */ } finally { setBusy(false); }
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    if (step === STEPS.length - 1) { handleSave(); return; }
    setStep((s) => s + 1);
  };

  if (!open) return null;

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;
  const progress = ((step + 1) / STEPS.length) * 100;
  const isLastStep = step === STEPS.length - 1;
  const isOptionalStep = currentStep.id === 'bancos' || currentStep.id === 'valores';

  const chipClass = (active: boolean) =>
    `px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 border-blue-600 text-white'
        : 'bg-si-over-2 border-si-border-md text-si-3 hover:bg-si-over-3'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-si-card border border-si-border-md rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-si-1">{currentStep.label}</h3>
              <p className="text-xs text-si-5">Etapa {step + 1} de {STEPS.length}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-si-over-3 text-si-5" title="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progresso */}
        <div className="h-1 bg-si-over-2 mx-6 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4 min-h-[300px]">

          {/* STEP 0 — Identidade */}
          {currentStep.id === 'identidade' && (
            <>
              <Input label="Nome completo" value={form.nome} onChange={(v) => set('nome', v)} placeholder="Como no documento" />
              <Input label="Como prefere ser chamado" value={form.apelido} onChange={(v) => set('apelido', v)} placeholder="Apelido (opcional)" />
              <Input label="Data de nascimento" value={form.nasc} onChange={(v) => set('nasc', v)} type="date" />
              <Input
                label="CPF"
                value={form.cpf}
                onChange={(v) => set('cpf', v.replace(/\D/g, '').slice(0, 11))}
                placeholder="Apenas números"
                error={form.cpf.length === 11 && !isValidCPF(form.cpf) ? 'CPF inválido' : undefined}
              />
            </>
          )}

          {/* STEP 1 — Contato */}
          {currentStep.id === 'contato' && (
            <>
              <Input label="Telefone / WhatsApp" value={form.tel} onChange={(v) => set('tel', v)} placeholder="(11) 99999-9999" />
              <Input label="CEP" value={form.cep} onChange={(v) => set('cep', v)} onBlur={() => lookupCEP(form.cep)} placeholder="00000-000" loading={cepLoading} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Estado" value={form.estado} onChange={(v) => set('estado', v)} placeholder="UF" />
                <Input label="Cidade" value={form.cidade} onChange={(v) => set('cidade', v)} placeholder="Cidade" />
              </div>
            </>
          )}

          {/* STEP 2 — Perfil Financeiro */}
          {currentStep.id === 'financeiro' && (
            <>
              <p className="text-sm text-si-4">Qual seu perfil profissional?</p>
              <div className="flex flex-wrap gap-2">
                {PERFIS.map((p) => (
                  <button key={p.id} type="button" onClick={() => set('perfil', p.id)} className={chipClass(form.perfil === p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-si-4 mt-2">Faixa de renda mensal</p>
              <div className="flex flex-wrap gap-2">
                {RENDAS.map((r) => (
                  <button key={r.id} type="button" onClick={() => set('renda', r.id)} className={chipClass(form.renda === r.id)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP 3 — Objetivos */}
          {currentStep.id === 'objetivo' && (
            <>
              <p className="text-sm text-si-4">Quais são seus objetivos financeiros?</p>
              <div className="grid grid-cols-2 gap-2">
                {OBJETIVOS.map((o) => (
                  <button key={o.id} type="button" onClick={() => toggleObj(o.id)} className={chipClass(form.obj.includes(o.id))}>
                    {o.label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 mt-4 text-sm text-si-4">
                <input type="checkbox" checked={form.pesq} onChange={(e) => set('pesq', e.target.checked)} className="rounded border-si-border-md" />
                Participar de pesquisas de melhoria
              </label>
            </>
          )}

          {/* STEP 4 — Conectar Bancos (Open Finance) */}
          {currentStep.id === 'bancos' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-si-border-md bg-si-over-1 p-4 space-y-2">
                <p className="text-sm font-semibold text-si-1">Conecte seus bancos agora</p>
                <p className="text-xs text-si-4 leading-relaxed">
                  Com o Open Finance, importamos seus saldos e lançamentos automaticamente — sem digitar nada.
                  O <span className="text-si-2 font-medium">Ld (Dias de Liberdade)</span> e o{' '}
                  <span className="text-si-2 font-medium">Sg (Spread Gap)</span> ficam precisos desde o primeiro acesso.
                </p>
              </div>

              {bankConnected ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-300">Banco conectado!</p>
                    <p className="text-xs text-si-4">Seus dados serão importados em instantes.</p>
                  </div>
                </div>
              ) : (
                <OpenFinanceConnect
                  uid={user?.uid ?? ''}
                  data={data}
                  theme="dark"
                  onConnected={() => setBankConnected(true)}
                />
              )}

              <p className="text-xs text-si-5 text-center">
                Você pode conectar depois em <span className="text-si-3">Configurações → Open Finance</span>.
              </p>
            </div>
          )}

          {/* STEP 5 — Valores a Receber (BCB) */}
          {currentStep.id === 'valores' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-si-border-md bg-si-over-1 p-4">
                <p className="text-sm font-semibold text-si-1 mb-1">Verificando dinheiro esquecido no Banco Central…</p>
                <p className="text-xs text-si-4">
                  O BC tem R$ 8+ bilhões em valores não resgatados. Estamos consultando se há algo no seu CPF.
                </p>
              </div>

              {/* Carregando */}
              {valoresLoading && (
                <div className="flex items-center justify-center gap-3 py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                  <span className="text-sm text-si-4">Consultando Banco Central…</span>
                </div>
              )}

              {/* Resultado: encontrou valores */}
              {!valoresLoading && valoresResult?.hasValues === true && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Gift className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-300">
                        Encontramos valores disponíveis para você!
                      </p>
                      <p className="text-xs text-si-4 mt-1">
                        {valoresResult.count && valoresResult.count > 1
                          ? `${valoresResult.count} ocorrências em `
                          : 'Valor disponível em '}
                        {valoresResult.institutions && valoresResult.institutions.length > 0
                          ? valoresResult.institutions.slice(0, 3).join(', ')
                          : 'instituições financeiras'}
                        {valoresResult.institutions && valoresResult.institutions.length > 3
                          ? ` e mais ${valoresResult.institutions.length - 3}…`
                          : '.'}
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://valoresareceber.bcb.gov.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                  >
                    Resgatar no Banco Central <ExternalLink className="w-4 h-4" />
                  </a>
                  <p className="text-xs text-si-5">Requer login no gov.br para confirmar a identidade.</p>
                </div>
              )}

              {/* Resultado: não encontrou */}
              {!valoresLoading && valoresResult?.hasValues === false && (
                <div className="flex items-center gap-3 rounded-xl border border-si-border-md bg-si-over-1 p-4">
                  <Check className="w-5 h-5 text-si-4 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-si-2">Nenhum valor encontrado</p>
                    <p className="text-xs text-si-5 mt-0.5">Boa notícia — seu CPF não tem pendências no Banco Central.</p>
                  </div>
                </div>
              )}

              {/* Resultado: API indisponível */}
              {!valoresLoading && valoresResult?.hasValues === null && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">API do Banco Central indisponível</p>
                    <p className="text-xs text-si-4 mt-0.5">
                      Você pode verificar manualmente em{' '}
                      <a href="https://valoresareceber.bcb.gov.br" target="_blank" rel="noopener noreferrer"
                        className="underline text-blue-400">valoresareceber.bcb.gov.br</a>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            type="button"
            onClick={() => step > 0 ? setStep((s) => s - 1) : onClose()}
            className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-si-4 text-sm hover:bg-si-over-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step > 0 ? 'Voltar' : 'Depois'}
          </button>

          <div className="flex items-center gap-2">
            {/* Botão "Pular" para steps opcionais */}
            {isOptionalStep && !isLastStep && (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="px-4 py-2.5 rounded-xl text-si-4 text-sm hover:bg-si-over-2"
              >
                Pular
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid() || busy}
              className="inline-flex items-center gap-1 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold"
            >
              {busy
                ? 'Salvando…'
                : isLastStep
                ? (<><Check className="w-4 h-4" /> Concluir</>)
                : (<>Continuar <ChevronRight className="w-4 h-4" /></>)
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Input helper ─────────────────────────────────────────────────────────────
function Input({
  label, value, onChange, placeholder, type = 'text', error, onBlur, loading,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; error?: string; onBlur?: () => void; loading?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-si-5 mb-1">{label}</label>
      <div className="relative">
        <input
          type={type} value={value}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 rounded-xl bg-si-bg border text-si-1 text-sm focus:outline-none focus:border-blue-500 ${error ? 'border-rose-500' : 'border-si-border-md'}`}
        />
        {loading && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />}
      </div>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
