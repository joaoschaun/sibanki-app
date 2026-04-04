import { useState, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { updateUserDoc } from '../../services/persistUserData';
import { updateProfile } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { User, Phone, Briefcase, Target, ChevronRight, ChevronLeft, X, Check } from 'lucide-react';

const STEPS = [
  { id: 'identidade', label: 'Identidade', icon: User },
  { id: 'contato', label: 'Contato', icon: Phone },
  { id: 'financeiro', label: 'Financeiro', icon: Briefcase },
  { id: 'objetivo', label: 'Objetivo', icon: Target },
] as const;

const PERFIS = [
  { id: 'clt', label: 'CLT' },
  { id: 'mei', label: 'MEI' },
  { id: 'empresario', label: 'Empresário' },
  { id: 'estudante', label: 'Estudante' },
  { id: 'outro', label: 'Outro' },
];

const RENDAS = [
  { id: 'ate2k', label: 'Até R$ 2.000' },
  { id: '2k5k', label: 'R$ 2.000 – R$ 5.000' },
  { id: '5k10k', label: 'R$ 5.000 – R$ 10.000' },
  { id: '10k20k', label: 'R$ 10.000 – R$ 20.000' },
  { id: 'acima20k', label: 'Acima de R$ 20.000' },
];

const OBJETIVOS = [
  { id: 'dividas', label: 'Sair das dívidas' },
  { id: 'reserva', label: 'Criar reserva de emergência' },
  { id: 'investir', label: 'Começar a investir' },
  { id: 'casa', label: 'Comprar imóvel' },
  { id: 'aposentadoria', label: 'Planejar aposentadoria' },
  { id: 'controle', label: 'Controlar gastos' },
];

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

interface WizardForm {
  nome: string;
  apelido: string;
  nasc: string;
  cpf: string;
  sexo: string;
  tel: string;
  cep: string;
  estado: string;
  cidade: string;
  perfil: string;
  renda: string;
  obj: string[];
  pesq: boolean;
}

const INITIAL_FORM: WizardForm = {
  nome: '', apelido: '', nasc: '', cpf: '', sexo: '',
  tel: '', cep: '', estado: '', cidade: '',
  perfil: '', renda: '', obj: [], pesq: false,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function RegistrationWizard({ open, onClose, onComplete }: Props) {
  const { user } = useAppContext();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [busy, setBusy] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const set = useCallback(<K extends keyof WizardForm>(key: K, value: WizardForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleObj = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      obj: prev.obj.includes(id) ? prev.obj.filter((o) => o !== id) : [...prev.obj, id],
    }));
  }, []);

  const lookupCEP = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          estado: data.uf || prev.estado,
          cidade: data.localidade || prev.cidade,
        }));
      }
    } catch { /* silent */ } finally { setCepLoading(false); }
  }, []);

  const isStepValid = useCallback((): boolean => {
    switch (step) {
      case 0: return form.nome.trim().length > 2 && isValidCPF(form.cpf);
      case 1: return form.tel.replace(/\D/g, '').length >= 10;
      case 2: return !!form.perfil && !!form.renda;
      case 3: return form.obj.length > 0;
      default: return false;
    }
  }, [step, form]);

  const handleSave = async () => {
    if (!user?.uid) return;
    setBusy(true);
    try {
      await updateUserDoc(user.uid, {
        cadastroCompleto: form,
        cadastroCompletoEm: serverTimestamp(),
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

  const StepIcon = STEPS[step].icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  const chipClass = (active: boolean) =>
    `px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
      active
        ? 'bg-blue-600 border-blue-600 text-white'
        : 'bg-si-over-2 border-si-border-md text-si-3 hover:bg-si-over-3'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-si-card border border-si-border-md rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400"><StepIcon className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-si-1">{STEPS[step].label}</h3>
              <p className="text-xs text-si-5">Etapa {step + 1} de {STEPS.length}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-si-over-3 text-si-5" title="Fechar"><X className="w-5 h-5" /></button>
        </div>

        <div className="h-1 bg-si-over-2 mx-6 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-6 space-y-4 min-h-[280px]">
          {step === 0 && (
            <>
              <Input label="Nome completo" value={form.nome} onChange={(v) => set('nome', v)} placeholder="Como no documento" />
              <Input label="Como prefere ser chamado" value={form.apelido} onChange={(v) => set('apelido', v)} placeholder="Apelido (opcional)" />
              <Input label="Data de nascimento" value={form.nasc} onChange={(v) => set('nasc', v)} type="date" />
              <Input label="CPF" value={form.cpf} onChange={(v) => set('cpf', v.replace(/\D/g, '').slice(0, 11))} placeholder="Apenas números" error={form.cpf.length === 11 && !isValidCPF(form.cpf) ? 'CPF inválido' : undefined} />
            </>
          )}

          {step === 1 && (
            <>
              <Input label="Telefone / WhatsApp" value={form.tel} onChange={(v) => set('tel', v)} placeholder="(11) 99999-9999" />
              <Input label="CEP" value={form.cep} onChange={(v) => set('cep', v)} onBlur={() => lookupCEP(form.cep)} placeholder="00000-000" loading={cepLoading} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Estado" value={form.estado} onChange={(v) => set('estado', v)} placeholder="UF" />
                <Input label="Cidade" value={form.cidade} onChange={(v) => set('cidade', v)} placeholder="Cidade" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-si-4">Qual seu perfil profissional?</p>
              <div className="flex flex-wrap gap-2">
                {PERFIS.map((p) => (
                  <button key={p.id} type="button" onClick={() => set('perfil', p.id)} className={chipClass(form.perfil === p.id)}>{p.label}</button>
                ))}
              </div>
              <p className="text-sm text-si-4 mt-2">Faixa de renda mensal</p>
              <div className="flex flex-wrap gap-2">
                {RENDAS.map((r) => (
                  <button key={r.id} type="button" onClick={() => set('renda', r.id)} className={chipClass(form.renda === r.id)}>{r.label}</button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-si-4">Quais são seus objetivos financeiros?</p>
              <div className="grid grid-cols-2 gap-2">
                {OBJETIVOS.map((o) => (
                  <button key={o.id} type="button" onClick={() => toggleObj(o.id)} className={chipClass(form.obj.includes(o.id))}>{o.label}</button>
                ))}
              </div>
              <label className="flex items-center gap-2 mt-4 text-sm text-si-4">
                <input type="checkbox" checked={form.pesq} onChange={(e) => set('pesq', e.target.checked)} className="rounded border-si-border-md" />
                Participar de pesquisas de melhoria
              </label>
            </>
          )}
        </div>

        <div className="flex items-center justify-between px-6 pb-6">
          <button type="button" onClick={() => step > 0 ? setStep((s) => s - 1) : onClose()}
            className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl text-si-4 text-sm hover:bg-si-over-2">
            <ChevronLeft className="w-4 h-4" /> {step > 0 ? 'Voltar' : 'Depois'}
          </button>
          <button type="button" onClick={handleNext} disabled={!isStepValid() || busy}
            className="inline-flex items-center gap-1 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold">
            {busy ? 'Salvando...' : step === STEPS.length - 1 ? (<><Check className="w-4 h-4" /> Concluir</>) : (<>Continuar <ChevronRight className="w-4 h-4" /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text', error, onBlur, loading }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; error?: string; onBlur?: () => void; loading?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-si-5 mb-1">{label}</label>
      <div className="relative">
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 rounded-xl bg-si-bg border text-si-1 text-sm focus:outline-none focus:border-blue-500 ${error ? 'border-rose-500' : 'border-si-border-md'}`} />
        {loading && <div className="absolute right-3 top-3 w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />}
      </div>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
