import { useState, useMemo, useRef, useEffect, useReducer, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useSibcoinToast } from '../hooks/useSibcoinToast';
import {
  addEntry,
  addTransfer,
  updateEntry,
  deleteEntry,
  generateEntriesFromRecurrents,
  addRecurrent,
  ValidationError,
} from '../services/persistUserData';
import type { Entry } from '../types/userData';
import { Modal } from '../components/ui/Modal';
import { EntryForm } from '../components/transactions/EntryForm';
import { TransferForm } from '../components/transactions/TransferForm';
import { Search, Filter, X, FileText, Camera, Mic, Upload, Receipt } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
// generateReportPdf carregado via dynamic import (evita vendor-pdf no load inicial)
import { isTransferEntry } from '../utils/entryUtils';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';
import { ImportEntries } from '../components/import/ImportEntries';
import { SovereigntyBadge } from '../components/ui/SovereigntyBadge';
import { PageTransition } from '../components/ui/PageTransition';
import { useSovereigntyScores } from '../hooks/useSovereigntyScores';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { MerchantLogo } from '../components/transactions/MerchantLogo';

// ── Tipos do Formulário ────────────────────────────────────────────────────
interface RecurrenceSettings {
  freq: string;
  durationType: 'indefinido' | 'data' | 'qtd';
  repeatCount: number;
  endDate: string;
}

type FilterPreset = '' | 'hoje' | 'mes' | '30d' | '90d';

interface FilterState {
  type: '' | 'receita' | 'despesa';
  category: string;
  account: string;
  start: string;
  end: string;
  preset: FilterPreset;
}

type FilterAction =
  | { kind: 'set'; field: keyof FilterState; value: string }
  | { kind: 'preset'; preset: FilterPreset }
  | { kind: 'clear' };

// ── Helpers ────────────────────────────────────────────────────────────────
function monthStartStr(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.kind) {
    case 'set': return { ...state, [action.field]: action.value };
    case 'clear': return { type: '', category: '', account: '', start: '', end: '', preset: '' };
    case 'preset': {
      if (!action.preset) return { ...state, start: '', end: '', preset: '' };
      const today = todayStr();
      if (action.preset === 'hoje') return { ...state, start: today, end: today, preset: 'hoje' };
      if (action.preset === 'mes') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        return { ...state, start, end: today, preset: 'mes' };
      }
      const days = action.preset === '30d' ? 30 : 90;
      const d = new Date(); d.setDate(d.getDate() - days);
      return { ...state, start: d.toISOString().slice(0, 10), end: today, preset: action.preset };
    }
  }
}


export default function Transactions() {
  const { user, data, entries, recurrents, loading, accounts: allAccounts } = useAppContext();
  const { triggerWithToast } = useSibcoinToast();
  const { hasFeature } = useFeatureFlags();
  const navigate = useNavigate();
  const canOcr = hasFeature('ocr_foto');
  const canStt = hasFeature('stt_voz');

  const [addOpen, setAddOpen]         = useState(false);
  const [editing, setEditing]         = useState<Entry | null>(null);
  const [deletingId, setDeletingId]   = useState<number | null>(null);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [ocrBusy, setOcrBusy]         = useState(false);
  const [sttBusy, setSttBusy]         = useState(false);
  const [aiResult, setAiResult]       = useState<{ entry: Entry | null; source: string; raw?: string } | null>(null);
  const [aiAccount, setAiAccount]     = useState<string>('');
  const fileInputRef                  = useRef<HTMLInputElement>(null);
  const mediaRecorderRef              = useRef<MediaRecorder | null>(null);
  const audioChunksRef                = useRef<Blob[]>([]);
  const [recording, setRecording]     = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  // Preset padrão = 'mes' (13/06/2026): "hoje" vazio dava primeira impressão de
  // app sem dados; o mês corrente mostra a vida financeira de cara.
  const [filters, dispatchFilter]     = useReducer(filterReducer, {
    type: '', category: '', account: '',
    start: monthStartStr(), end: todayStr(), preset: 'mes',
  });
  const [filterOpen, setFilterOpen]   = useState(false);
  // ✅ FIX: mousedown + ref ao invés de click global — não conflita com outros listeners
  const filterRef = useRef<HTMLDivElement>(null);
  const [subTab, setSubTab]           = useState<'lancar' | 'transf' | 'fixos'>('lancar');
  const [fixedMessage, setFixedMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const userName = user?.displayName ?? (data?.name as string) ?? '';

  const entriesForTab = useMemo(() =>
    subTab === 'lancar'
      ? entries.filter((e) => !isTransferEntry(e))
      : entries.filter((e) => isTransferEntry(e)),
    [entries, subTab]
  );

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node))
        setFilterOpen(false);
    };
    // ✅ FIX: mousedown previne conflito com listeners de click do Header/Sidebar
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (subTab !== 'lancar' && filterOpen) setFilterOpen(false);
  }, [subTab, filterOpen]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    entriesForTab.forEach((e) => e.category && set.add(e.category));
    return Array.from(set).sort();
  }, [entriesForTab]);

  const accounts = useMemo(() => {
    const set = new Set<string>();
    entriesForTab.forEach((e) => e.account && set.add(e.account));
    return Array.from(set).sort();
  }, [entriesForTab]);

  const sorted = useMemo(() => {
    const base = [...entriesForTab];
    if (subTab === 'transf') {
      return base.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 200);
    }
    return base
      .filter((e) =>
        (!search || [e.desc, e.category, e.account].some((s) =>
          String(s ?? '').toLowerCase().includes(search.toLowerCase()))) &&
        (!filters.type || e.type === filters.type) &&
        (!filters.category || e.category === filters.category) &&
        (!filters.account || e.account === filters.account) &&
        (!filters.start || e.date >= filters.start) &&
        (!filters.end || e.date <= filters.end)
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 500); // ✅ FIX: aumentado para 500 para garantir todos do dia
  }, [entriesForTab, subTab, search, filters]);

  // ── Agrupamento por data para layout em cards ─────────────────────────────
  const groupedByDate = useMemo(() => {
    if (subTab !== 'lancar') return [];
    const map = new Map<string, Entry[]>();
    for (const e of sorted) {
      const key = e.date || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [sorted, subTab]);

  /** Sv por lançamento — hook compartilhado (mesma implementação do Painel). */
  const scoreMap = useSovereigntyScores();
  // ────────────────────────────────────────────────────────────────────────────

  const hasActiveFilter = filters.type !== '' || filters.category !== '' || filters.account !== '' ||
    filters.start !== '' || filters.end !== '';
  const totalFiltrado = sorted.reduce((sum, e) =>
    sum + (e.type === 'despesa' ? -(Number(e.value) || 0) : (Number(e.value) || 0)), 0);

  const applyPeriodPreset = useCallback((preset: FilterPreset) => {
    dispatchFilter({ kind: 'preset', preset });
  }, []);

  const clearFilters = useCallback(() => {
    dispatchFilter({ kind: 'clear' });
    setFilterOpen(false);
  }, []);

  const handleAdd = useCallback(async (entryData: Omit<Entry, 'id'>, recurrentSettings?: RecurrenceSettings) => {
    if (!user?.uid) return;
    setError(null); setBusy(true);
    try {
      await addEntry(user.uid, entries, entryData);
      triggerWithToast('entry_added'); // fire-and-forget SibCoin (shows toast on mission complete)
      if (recurrentSettings) {
        const [,, dayStr] = (entryData.date as string).split('-');
        await addRecurrent(user.uid, recurrents, {
          type: entryData.type,
          desc: entryData.desc,
          category: entryData.category,
          value: entryData.value,
          date: entryData.date,
          day: parseInt(dayStr, 10),
          account: entryData.account,
          freq: recurrentSettings.freq,
          active: true,
          durationType: recurrentSettings.durationType,
          repeatCount: recurrentSettings.durationType === 'qtd' ? recurrentSettings.repeatCount : undefined,
          endDate: recurrentSettings.durationType === 'data' ? recurrentSettings.endDate : undefined,
        });
      }
      setAddOpen(false);
    } catch (err) {
      if (err instanceof ValidationError) setError(err.errors.join('\n'));
      else setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar lançamento.');
    }
    finally { setBusy(false); }
  }, [user?.uid, entries, recurrents]);

  const handleTransfer = useCallback(async (t: { from: string; to: string; date: string; value: number }) => {
    if (!user?.uid) return;
    setError(null); setBusy(true);
    try { await addTransfer(user.uid, entries, t); setSubTab('transf'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao transferir'); }
    finally { setBusy(false); }
  }, [user?.uid, entries]);

  const handleGenerateFixed = useCallback(async () => {
    if (!user?.uid) return;
    setError(null); setFixedMessage(null); setBusy(true);
    try {
      const count = await generateEntriesFromRecurrents(user.uid, entries, recurrents);
      setFixedMessage({
        type: 'ok',
        text: count > 0
          ? `${count} lançamento(s) gerado(s) a partir dos recorrentes.`
          : 'Nenhum lançamento novo neste mês (já gerados ou sem recorrentes ativos).',
      });
    } catch (err) { setFixedMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao gerar.' }); }
    finally { setBusy(false); }
  }, [user?.uid, entries, recurrents]);

  const handleUpdate = useCallback(async (entryData: Omit<Entry, 'id'>) => {
    if (!user?.uid || !editing) return;
    setError(null); setBusy(true);
    try { await updateEntry(user.uid, entries, editing.id, entryData); setEditing(null); }
    catch (err) {
      if (err instanceof ValidationError) setError(err.errors.join('\n'));
      else setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar lançamento.');
    }
    finally { setBusy(false); }
  }, [user?.uid, entries, editing]);

  const handleDelete = useCallback(async (id: number) => {
    if (!user?.uid) return;
    setError(null); setBusy(true);
    try { await deleteEntry(user.uid, entries, id); setDeletingId(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erro ao excluir'); }
    finally { setBusy(false); }
  }, [user?.uid, entries]);

  // ── OCR: foto → lançamento ────────────────────────────────────────────────
  const handleOcrFile = useCallback(async (file: File) => {
    if (!user?.uid) return;
    setOcrBusy(true); setError(null); setAiResult(null);
    try {
      const buf = await file.arrayBuffer();
      const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const ocrApi = httpsCallable<{ imageBase64: string; mimeType: string }, { entry: Entry | null; ocrText: string | null; provider: string }>(functions, 'ocrToEntry');
      const res = await ocrApi({ imageBase64, mimeType: file.type || 'image/jpeg' });
      if (res.data.entry) {
        setAiResult({ entry: res.data.entry, source: 'foto', raw: res.data.ocrText ?? undefined });
        setAiAccount(res.data.entry.account ?? '');
      } else {
        setError('Não foi possível extrair um lançamento da imagem.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar foto.');
    } finally { setOcrBusy(false); }
  }, [user?.uid]);

  // ── STT: voz → lançamento ───────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!user?.uid || audioChunksRef.current.length === 0) return;
        setSttBusy(true); setError(null); setAiResult(null);
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const buf = await blob.arrayBuffer();
          const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const sttApi = httpsCallable<{ audioBase64: string; mimeType: string }, { entry: Entry | null; transcript: string | null; provider: string }>(functions, 'sttToEntry');
          const res = await sttApi({ audioBase64, mimeType: 'audio/webm' });
          if (res.data.entry) {
            setAiResult({ entry: res.data.entry, source: 'voz', raw: res.data.transcript ?? undefined });
            setAiAccount(res.data.entry.account ?? '');
          } else {
            setError('Não foi possível extrair um lançamento do áudio.');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao processar áudio.');
        } finally { setSttBusy(false); }
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      setError('Sem permissão para usar o microfone.');
    }
  }, [user?.uid]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const confirmAiEntry = useCallback(async () => {
    if (!aiResult?.entry || !user?.uid) return;
    setBusy(true);
    try {
      const entry = { ...aiResult.entry, id: undefined, account: aiAccount || aiResult.entry.account || undefined };
      await addEntry(user.uid, entries, entry as Omit<Entry, 'id'>);
      triggerWithToast('entry_added');
      setAiResult(null);
    } catch (err) {
      if (err instanceof ValidationError) setError(err.errors.join('\n'));
      else setError(err instanceof Error ? err.message : 'Erro inesperado ao salvar lançamento.');
    } finally { setBusy(false); }
  }, [aiResult, user?.uid, entries, triggerWithToast]);

  // ── Formatadores ──────────────────────────────────────────────────────────
  const fmtDate = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  const fmtVal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <PageTransition className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <span className="text-blue-400">↕</span> Lançamentos
          </h2>
          <p className="text-si-5 text-sm">Registre receitas, despesas, transferências e lançamentos fixos. Filtre e consulte o histórico.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" title="Selecionar foto"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOcrFile(f); e.target.value = ''; }} />
          {canOcr && (
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={ocrBusy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-si-border-md bg-si-over-2 text-si-2 hover:bg-si-over-3 text-sm font-medium disabled:opacity-50"
              title="Lançar por foto (OCR)">
              <Camera className="w-4 h-4" /> {ocrBusy ? 'Lendo…' : 'Foto'}
            </button>
          )}
          {canStt && (
            <button type="button"
              onClick={() => recording ? stopRecording() : startRecording()}
              disabled={sttBusy}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium disabled:opacity-50 ${
                recording ? 'border-rose-500 bg-rose-500/20 text-rose-300 animate-pulse' : 'border-si-border-md bg-si-over-2 text-si-3'
              }`}
              title="Lançar por voz">
              <Mic className="w-4 h-4" /> {sttBusy ? 'Transcrevendo…' : recording ? 'Parar' : 'Voz'}
            </button>
          )}
          <button type="button" onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-si-border-md bg-si-over-2 text-si-2 text-sm font-medium"
            title="Importar CSV/OFX">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button type="button"
            onClick={async () => { try { const { generateReportPdf } = await import('../utils/generateReportPdf'); generateReportPdf({ userName, entries, investments: { length: (data?.investments ?? []).length }, goals: { length: (data?.goals ?? []).length } }); } catch (err) { console.error(err); } }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-white text-sm text-zinc-900 font-medium">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <SibcoinMissionBanner eventType="entry_added" satisfied={entries.length > 0} />

      {/* Sub-abas */}
      <div className="bg-si-card rounded-2xl border border-si-border flex overflow-hidden">
        {[
          { id: 'lancar', label: '✏️ Lançar' },
          { id: 'transf', label: '↔ Transferir' },
          { id: 'fixos',  label: '📌 Fixos' },
        ].map((tab) => (
          <button key={tab.id} type="button"
            onClick={() => {
              if (tab.id === 'lancar' && subTab === 'lancar') { setAddOpen(true); return; }
              setSubTab(tab.id as 'lancar' | 'transf' | 'fixos');
            }}
            className={`flex-1 py-4 text-sm font-bold transition-colors ${
              subTab === tab.id ? 'bg-si-over-2 text-si-1 border-b-2 border-si-1' : 'text-si-4 hover:bg-si-over-2'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">{error}</div>
      )}

      {/* Aba Transferir */}
      {subTab === 'transf' && (
        <div className="bg-si-card rounded-2xl border border-si-border p-6">
          <h3 className="text-lg font-bold mb-1">Transferir entre contas</h3>
          <p className="text-si-5 text-sm mb-4">Cria 2 lançamentos (saída + entrada).</p>
          <TransferForm accounts={allAccounts} busy={busy} onSubmit={handleTransfer} />
        </div>
      )}

      {/* Aba Fixos */}
      {subTab === 'fixos' && (
        <div className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-bold">Lançamentos fixos (recorrentes)</h3>
              <p className="text-si-5 text-sm">Veja fixos e gere lançamentos do mês.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleGenerateFixed} disabled={busy}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-si-1 text-sm font-bold">
                Gerar do mês
              </button>
              <button type="button" onClick={() => navigate('/recorrentes')}
                className="px-4 py-2 rounded-xl bg-si-over-2 border border-si-border-md text-si-3 text-sm font-medium hover:bg-si-over-3">
                Gerenciar fixos
              </button>
            </div>
          </div>
          {fixedMessage && (
            <div className={`rounded-xl px-4 py-3 text-sm ${fixedMessage.type === 'ok' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
              {fixedMessage.text}
            </div>
          )}
          <div className="divide-y divide-si-border rounded-xl border border-si-border bg-si-bg">
            {recurrents.length === 0 ? (
              <div className="p-6 text-sm text-si-5">Nenhum recorrente cadastrado.</div>
            ) : recurrents.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-si-1 truncate">{r.desc}</p>
                  <p className="text-xs text-si-5">{r.category ?? '—'} · dia {r.day} · {r.freq ?? 'mensal'}{r.account ? ` · ${r.account}` : ''}</p>
                </div>
                <span className={`text-sm font-bold ${r.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {Number(r.value ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aba Lançar — filtros + lista agrupada por data */}
      {subTab === 'lancar' && (
        <div className="space-y-3">
          {/* ✅ FIX: Botões de filtro de período — "Hoje" como padrão */}
          <div className="flex flex-wrap gap-2 items-center">
            {([
              { key: 'hoje', label: 'Hoje' },
              { key: 'mes',  label: 'Este mês' },
              { key: '',     label: 'Todos' },
            ] as { key: FilterPreset; label: string }[]).map((p) => (
              <button key={p.key} type="button"
                onClick={() => applyPeriodPreset(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  filters.preset === p.key
                    ? 'bg-white text-zinc-900 border-white'
                    : 'bg-si-over-2 border-si-border-md text-si-4 hover:bg-si-over-3'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Barra de busca + filtro avançado */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-si-card border border-si-border rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors" />
            </div>

            <div className="relative" ref={filterRef}>
              <button type="button" onClick={() => setFilterOpen((o) => !o)}
                aria-label="Filtros avançados"
                className={`bg-si-card border p-3 rounded-xl transition-colors ${hasActiveFilter && filters.preset === '' ? 'border-blue-500/50 text-blue-400' : 'border-si-border hover:bg-si-over-2'}`}>
                <Filter className="w-5 h-5" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 py-3 px-4 bg-si-card border border-si-border-md rounded-xl shadow-xl z-30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-si-5 uppercase">Filtros avançados</span>
                    {hasActiveFilter && (
                      <button type="button" onClick={clearFilters} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                        <X className="w-3 h-3" /> Limpar
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="filter-type" className="block text-xs text-si-5 mb-1">Tipo</label>
                      <select id="filter-type" value={filters.type} onChange={(e) => dispatchFilter({ kind: 'set', field: 'type', value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-sm text-si-1">
                        <option value="">Todos</option>
                        <option value="receita">Receita</option>
                        <option value="despesa">Despesa</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="filter-cat" className="block text-xs text-si-5 mb-1">Categoria</label>
                      <select id="filter-cat" value={filters.category} onChange={(e) => dispatchFilter({ kind: 'set', field: 'category', value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-sm text-si-1">
                        <option value="">Todas</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="filter-acc" className="block text-xs text-si-5 mb-1">Conta</label>
                      <select id="filter-acc" value={filters.account} onChange={(e) => dispatchFilter({ kind: 'set', field: 'account', value: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-sm text-si-1">
                        <option value="">Todas</option>
                        {accounts.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="filter-start" className="block text-xs text-si-5 mb-1">De</label>
                        <input id="filter-start" type="date" value={filters.start} onChange={(e) => dispatchFilter({ kind: 'set', field: 'start', value: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-sm text-si-1" />
                      </div>
                      <div>
                        <label htmlFor="filter-end" className="block text-xs text-si-5 mb-1">Até</label>
                        <input id="filter-end" type="date" value={filters.end} onChange={(e) => dispatchFilter({ kind: 'set', field: 'end', value: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-si-bg border border-si-border-md text-sm text-si-1" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ FIX: Registros agrupados por data com total do dia */}
      {subTab === 'lancar' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : groupedByDate.length === 0 ? (
            search || entries.length > 0 ? (
              <div className="bg-si-card rounded-2xl border border-si-border p-12 text-center text-si-5 text-sm">
                {search ? 'Nenhum lançamento encontrado para esta busca.' : 'Nenhum lançamento neste período — ajuste o filtro acima.'}
              </div>
            ) : (
              <div className="bg-si-card rounded-2xl border border-si-border">
                <EmptyState
                  icon={<Receipt className="w-7 h-7" />}
                  title="Cada lançamento vira inteligência"
                  description="Registre receitas e despesas e o Sibanki calcula seu custo de vida real, seus Dias de Liberdade e o Sovereignty Score de cada gasto."
                  actionLabel="+ Primeiro lançamento"
                  onAction={() => setAddOpen(true)}
                  assistantPrompt="Quero lançar uma despesa: "
                />
              </div>
            )
          ) : (
            groupedByDate.map(([date, dayEntries]) => {
              const dayTotal = dayEntries.reduce((s, e) =>
                s + (e.type === 'despesa' ? -(Number(e.value) || 0) : (Number(e.value) || 0)), 0);
              return (
                <div key={date} className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
                  {/* Header do grupo de data */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-si-border bg-si-over-1">
                    <span className="text-xs font-bold text-si-4 uppercase tracking-wide">
                      {fmtDate(date)}
                    </span>
                    <span className={`text-xs font-bold ${dayTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      Total do dia: {dayTotal >= 0 ? '+' : ''} R$ {fmtVal(Math.abs(dayTotal))}
                    </span>
                  </div>

                  {/* Registros do dia */}
                  <div className="divide-y divide-si-border">
                    {dayEntries.map((e) => (
                      <div key={e.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-si-over-1 transition-colors">
                        <MerchantLogo
                          description={e.desc}
                          category={e.category}
                          type={e.type}
                          size={32}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-si-1 truncate">{e.desc || e.category || '—'}</p>
                          <p className="text-xs text-si-5 mt-0.5">
                            {e.category}{e.account ? ` · ${e.account}` : ''}{e.formaPgto ? ` · ${e.formaPgto}` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className={`text-sm font-bold ${e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {e.type === 'receita' ? '+' : '-'} R$ {fmtVal(Number(e.value))}
                          </span>
                          {e.type === 'despesa' && scoreMap.has(e.id) && (
                            <SovereigntyBadge
                              score={scoreMap.get(e.id)!.score}
                              daysLost={scoreMap.get(e.id)!.daysLost}
                              opportunityCost10y={scoreMap.get(e.id)!.opportunityCost10y}
                              compact
                            />
                          )}
                        </div>
                        {/* Ações (hover) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button type="button" onClick={() => setEditing(e)}
                            className="p-1.5 rounded-lg hover:bg-si-over-3 text-si-5 hover:text-si-1 text-xs" title="Editar">
                            ✏️
                          </button>
                          <button type="button" onClick={() => setDeletingId(e.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-si-5 hover:text-rose-400 text-xs" title="Excluir">
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          {/* Soma filtrada */}
          {sorted.length > 0 && (
            <p className="text-sm text-si-5 px-1">
              Soma filtrada:{' '}
              <span className={`font-bold ${totalFiltrado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                R$ {fmtVal(totalFiltrado)} {totalFiltrado >= 0 ? '(+)' : '(-)'}
              </span>
              {' '}· {sorted.length} registro(s)
            </p>
          )}
        </div>
      )}

      {/* Tabela simples para transferências */}
      {subTab === 'transf' && sorted.length > 0 && (
        <div className="bg-si-card rounded-2xl border border-si-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-si-border text-[11px] font-bold text-si-5 uppercase tracking-widest">
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-si-border">
              {sorted.map((e) => (
                <tr key={e.id} className="hover:bg-si-over-1">
                  <td className="px-6 py-4 text-sm">{e.desc || '—'}</td>
                  <td className="px-6 py-4 text-sm text-si-4">{e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  <td className={`px-6 py-4 text-sm font-bold text-right ${e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {e.type === 'receita' ? '+' : '-'} R$ {fmtVal(Number(e.value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ImportEntries open={importOpen} onClose={() => setImportOpen(false)} />

      {/* Modal — Lançamento via IA (OCR/STT) */}
      <Modal open={!!aiResult} onClose={() => setAiResult(null)} title={`Lançamento via ${aiResult?.source === 'foto' ? 'Foto' : 'Voz'}`}>
        {aiResult?.entry && (
          <div className="space-y-4">
            {aiResult.raw && (
              <div className="p-3 rounded-xl bg-si-over-2 border border-si-border text-xs text-si-5">
                <span className="font-bold text-si-4">{aiResult.source === 'foto' ? 'Texto extraído:' : 'Transcrição:'}</span>
                <p className="mt-1 break-words">{aiResult.raw}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-si-5">Tipo:</span> <span className="text-si-1 font-semibold">{aiResult.entry.type === 'receita' ? '📈 Receita' : '📉 Despesa'}</span></div>
              <div><span className="text-si-5">Valor:</span> <span className="text-si-1 font-semibold">R$ {Number(aiResult.entry.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              <div><span className="text-si-5">Descrição:</span> <span className="text-si-1">{aiResult.entry.desc || '—'}</span></div>
              <div><span className="text-si-5">Categoria:</span> <span className="text-si-1">{aiResult.entry.category || '—'}</span></div>
              {aiResult.entry.date && <div><span className="text-si-5">Data:</span> <span className="text-si-1">{aiResult.entry.date}</span></div>}
            </div>
            <div>
              <label className="block text-xs font-medium text-si-5 mb-1">Conta</label>
              <select value={aiAccount} onChange={(e) => setAiAccount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm focus:outline-none focus:border-blue-500">
                <option value="">— sem conta —</option>
                {allAccounts.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAiResult(null)} className="flex-1 py-2.5 rounded-xl border border-si-border text-si-4 text-sm hover:bg-si-over-2">Cancelar</button>
              <button type="button" onClick={confirmAiEntry} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold disabled:opacity-50">{busy ? 'Salvando…' : 'Confirmar lançamento'}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal — Novo lançamento */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Novo lançamento">
        <EntryForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
        {busy && <p className="mt-3 text-si-5 text-sm">Salvando…</p>}
      </Modal>

      {/* Modal — Editar lançamento */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar lançamento">
        {editing && <EntryForm entry={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />}
        {busy && <p className="mt-3 text-si-5 text-sm">Salvando…</p>}
      </Modal>

      {/* Modal — Confirmar exclusão */}
      <Modal open={deletingId !== null} onClose={() => setDeletingId(null)} title="Excluir lançamento">
        <p className="text-si-4 text-sm mb-6">Tem certeza? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => deletingId !== null && handleDelete(deletingId)}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-si-1 font-bold text-sm">
            {busy ? 'Excluindo…' : 'Excluir'}
          </button>
          <button type="button" onClick={() => setDeletingId(null)}
            className="px-6 py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 font-medium text-sm hover:bg-si-over-3">
            Cancelar
          </button>
        </div>
      </Modal>
    </PageTransition>
  );
}
