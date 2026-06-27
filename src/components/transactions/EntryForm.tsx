import { useState } from 'react';
import type { Entry } from '../../types/userData';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../../constants/defaults';
import { X, RefreshCw, Calendar, Hash, Infinity } from 'lucide-react';
import { useIntelligence } from '../../context/IntelligenceContext';
import { useAppContext } from '../../context/AppContext';
import { calculateSovereigntyScore } from '../../utils/sovereigntyEngine';
import type { SovereigntyScoreResult } from '../../utils/sovereigntyEngine';
import { SentinelGuardModal } from './SentinelGuardModal';
import { isTransferEntry } from '../../utils/entryUtils';

interface RecurrenceSettings {
  freq: string;
  durationType: 'indefinido' | 'data' | 'qtd';
  repeatCount: number;
  endDate: string;
}

interface EntryFormProps {
  entry?: Entry | null;
  onSubmit: (data: Omit<Entry, 'id'>, recurrentSettings?: RecurrenceSettings) => void;
  onCancel: () => void;
}

// ── Modal interno de configuração de recorrência ─────────────────────────────
function RecurrenceModal({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: RecurrenceSettings;
  onConfirm: (s: RecurrenceSettings) => void;
  onCancel: () => void;
}) {
  const [freq, setFreq] = useState(initial.freq);
  const [durationType, setDurationType] = useState(initial.durationType);
  const [repeatCount, setRepeatCount] = useState(initial.repeatCount);
  const [endDate, setEndDate] = useState(initial.endDate);

  return (
    /* Overlay escuro sobre o modal pai */
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0d1421] border border-blue-500/30 rounded-2xl w-full max-w-sm shadow-2xl shadow-blue-500/10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-si-border">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <h3 className="text-base font-bold text-si-1">Configurar Recorrência</h3>
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-si-over-3 text-si-4" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Periodicidade */}
          <div>
            <label className="block text-xs font-semibold text-si-4 mb-2 uppercase tracking-wide">
              Periodicidade
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'mensal', label: 'Mensal' },
                { value: 'semanal', label: 'Semanal' },
                { value: 'quinzenal', label: 'Quinzenal' },
                { value: 'bimestral', label: 'Bimestral' },
                { value: 'trimestral', label: 'Trimestral' },
                { value: 'semestral', label: 'Semestral' },
                { value: 'anual', label: 'Anual' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFreq(opt.value)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                    freq === opt.value
                      ? 'bg-si-over-3 border-si-1 text-si-1'
                      : 'bg-si-over-2 border-si-border-md text-si-4 hover:bg-si-over-3'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Duração */}
          <div>
            <label className="block text-xs font-semibold text-si-4 mb-2 uppercase tracking-wide">
              Duração
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'indefinido', label: 'Indefinido', icon: Infinity },
                { value: 'qtd', label: 'Nº de vezes', icon: Hash },
                { value: 'data', label: 'Até data', icon: Calendar },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDurationType(opt.value as RecurrenceSettings['durationType'])}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all border flex flex-col items-center gap-1 ${
                      durationType === opt.value
                        ? 'bg-si-over-3 border-si-1 text-si-1'
                        : 'bg-si-over-2 border-si-border-md text-si-4 hover:bg-si-over-3'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo condicional por tipo de duração */}
          {durationType === 'qtd' && (
            <div>
              <label className="block text-xs font-semibold text-si-4 mb-1">
                Número de repetições
              </label>
              <input
                type="number"
                min={1}
                max={360}
                value={repeatCount}
                onChange={(e) => setRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-si-5 mt-1">
                Será lançado por {repeatCount} {repeatCount === 1 ? 'vez' : 'vezes'}.
              </p>
            </div>
          )}

          {durationType === 'data' && (
            <div>
              <label className="block text-xs font-semibold text-si-4 mb-1">
                Data de término
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {durationType === 'indefinido' && (
            <p className="text-xs text-si-5 bg-si-over-2 rounded-xl px-3 py-2">
              O lançamento se repetirá até você desativar na aba <strong className="text-si-3">Fixos</strong>.
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-sm font-medium hover:bg-si-over-3"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ freq, durationType, repeatCount, endDate })}
            className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal do formulário ───────────────────────────────────────
export function EntryForm({ entry, onSubmit, onCancel }: EntryFormProps) {
  const { entries, budgets } = useAppContext();
  const { freedom } = useIntelligence();

  const [type, setType] = useState<'receita' | 'despesa'>(entry?.type ?? 'despesa');
  const [desc, setDesc] = useState(entry?.desc ?? '');
  const [category, setCategory] = useState(entry?.category ?? 'Outros');
  const [value, setValue] = useState(entry?.value !== undefined ? String(entry.value) : '');
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().slice(0, 10));
  const [account, setAccount] = useState(entry?.account ?? '');

  const [sentinelPayload, setSentinelPayload] = useState<{
    scoreData: SovereigntyScoreResult;
    pendingTarget: {
      entryData: Omit<Entry, 'id'>, 
      recurrentSettings?: RecurrenceSettings
    };
  } | null>(null);

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceSettings, setRecurrenceSettings] = useState<RecurrenceSettings>({
    freq: 'mensal',
    durationType: 'indefinido',
    repeatCount: 12,
    endDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value.replace(',', '.'));
    if (Number.isNaN(numValue) || numValue <= 0) return;
    
    const entryData = {
      type,
      desc: desc.trim() || category,
      category: category || 'Outros',
      value: Math.round(numValue * 100) / 100,
      date,
      status: 'pago' as const,
      ...(account ? { account } : {})
    };
    const rSettings = isRecurring ? recurrenceSettings : undefined;

    // 🔥 SENTINEL: Intercepta a transação localmente antes de salvar
    if (type === 'despesa' && !entry) { // Não bloqueia edição, só criação
      const liquidity = freedom.totalLiquidity ?? 0;
      const dailyBurnRate = freedom.dailyBurnRate > 0 ? freedom.dailyBurnRate : 50;
      const budgetLimit = budgets ? Number((budgets as any)[entryData.category]) || undefined : undefined;
      
      const nowMonth = new Date().toISOString().slice(0, 7);
      let catSpent = 0;
      let impulseStreakCount = 0;
      const limit30 = new Date(); limit30.setDate(limit30.getDate() - 30);
      const limit30Str = limit30.toISOString().slice(0,10);
      const dayOfWeek = new Date(entryData.date).getDay();
      
      for (const en of entries) {
        if (en.type === 'despesa' && !isTransferEntry(en)) {
          if ((en.date || '').startsWith(nowMonth) && en.category === entryData.category) {
            catSpent += Number(en.value) || 0;
          }
          if (en.category === entryData.category && new Date(en.date || '').getDay() === dayOfWeek) {
             if ((en.date || '') >= limit30Str) {
               impulseStreakCount++;
             }
          }
        }
      }
      
      const ESSENTIAL_CATS = new Set(['Moradia', 'Saúde', 'Educação', 'Transporte', 'Alimentação', 'Utilidades', 'Serviços essenciais']);
      const isEssential = ESSENTIAL_CATS.has(entryData.category);
      
      const scoreData = calculateSovereigntyScore({
         value: entryData.value,
         category: entryData.category,
         isEssential,
         liquidity,
         dailyBurnRate,
         budgetRemaining: budgetLimit != null ? budgetLimit - catSpent : undefined,
         impulseStreakCount: Math.max(0, impulseStreakCount - 1)
      });

      if (scoreData.verdict === 'atencao' || scoreData.verdict === 'auto-sabotagem') {
         setSentinelPayload({ scoreData, pendingTarget: { entryData: entryData as Omit<Entry, 'id'>, recurrentSettings: rSettings } });
         return; // Interrompe o envio nativo e mostra o modal
      }
    }

    onSubmit(entryData as Omit<Entry, 'id'>, rSettings);
  };

  const freqLabel: Record<string, string> = {
    mensal: 'Mensal', semanal: 'Semanal', quinzenal: 'Quinzenal',
    bimestral: 'Bimestral', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual',
  };

  return (
    <>
      {sentinelPayload && (
        <SentinelGuardModal
          open={true}
          scoreData={sentinelPayload.scoreData}
          entryName={String(sentinelPayload.pendingTarget.entryData.desc || '')}
          entryValue={Number(sentinelPayload.pendingTarget.entryData.value || 0)}
          onConfirm={() => {
            const { entryData, recurrentSettings } = sentinelPayload.pendingTarget;
            setSentinelPayload(null);
            onSubmit(entryData, recurrentSettings); // O usuário pecou, mas confirmou. Libera a catraca.
          }}
          onCancel={() => {
            setSentinelPayload(null);
            onCancel(); // Fecha o form principal ou as abas
          }}
        />
      )}

      {/* Modal de configuração de recorrência (aparece sobre o form) */}
      {showRecurrenceModal && (
        <RecurrenceModal
          initial={recurrenceSettings}
          onConfirm={(s) => {
            setRecurrenceSettings(s);
            setIsRecurring(true);
            setShowRecurrenceModal(false);
          }}
          onCancel={() => {
            setIsRecurring(false);
            setShowRecurrenceModal(false);
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block text-xs font-medium text-si-5 mb-1">Tipo</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('receita')}
              className={`flex-1 py-2 rounded-xl font-medium text-sm ${type === 'receita' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-si-over-2 text-si-4 border border-si-border'}`}>
              Receita
            </button>
            <button type="button" onClick={() => setType('despesa')}
              className={`flex-1 py-2 rounded-xl font-medium text-sm ${type === 'despesa' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-si-over-2 text-si-4 border border-si-border'}`}>
              Despesa
            </button>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-xs font-medium text-si-5 mb-1">Descrição</label>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Ex: Supermercado"
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
        </div>

        {/* Categoria */}
        <div>
          <label htmlFor="entry-form-category" className="block text-xs font-medium text-si-5 mb-1">Categoria</label>
          <select id="entry-form-category" value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500">
            {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* ✅ FIX: Recorrência — botão Sim abre modal completo com identidade visual do sistema */}
        <div className="flex items-center justify-between p-3 bg-si-over-2 border border-si-border-md rounded-xl">
          <div>
            <label className="block text-sm font-medium text-si-1">Repetir (Recorrente)</label>
            <span className="text-xs text-si-5">Criar lançamento fixo recorrente</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowRecurrenceModal(true)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${isRecurring ? 'bg-white text-zinc-900' : 'bg-si-over-2 text-si-4 hover:bg-si-over-3'}`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => { setIsRecurring(false); }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${!isRecurring ? 'bg-zinc-700 text-si-1' : 'bg-si-over-2 text-si-4 hover:bg-si-over-3'}`}
            >
              Não
            </button>
          </div>
        </div>

        {/* Badge de resumo da recorrência configurada */}
        {isRecurring && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-xs text-blue-300">
              {freqLabel[recurrenceSettings.freq] ?? recurrenceSettings.freq}
              {recurrenceSettings.durationType === 'qtd' && ` · ${recurrenceSettings.repeatCount}×`}
              {recurrenceSettings.durationType === 'data' && recurrenceSettings.endDate && ` · até ${new Date(recurrenceSettings.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`}
              {recurrenceSettings.durationType === 'indefinido' && ' · Indefinido'}
            </span>
            <button type="button" onClick={() => setShowRecurrenceModal(true)} className="ml-auto text-xs text-blue-400 hover:underline">
              Editar
            </button>
          </div>
        )}

        {/* Valor */}
        <div>
          <label htmlFor="entry-form-value" className="block text-xs font-medium text-si-5 mb-1">Valor (R$)</label>
          <input id="entry-form-value" type="text" inputMode="decimal" value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9,.-]/, ''))}
            placeholder="0,00"
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            required />
        </div>

        {/* Data */}
        <div>
          <label className="block text-xs font-medium text-si-5 mb-1">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500" />
        </div>

        {/* Conta */}
        <div>
          <label htmlFor="entry-form-account" className="block text-xs font-medium text-si-5 mb-1">Conta</label>
          <select id="entry-form-account" value={account} onChange={(e) => setAccount(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500">
            <option value="">—</option>
            {DEFAULT_ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-sm">
            {entry ? 'Salvar' : 'Adicionar'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}
