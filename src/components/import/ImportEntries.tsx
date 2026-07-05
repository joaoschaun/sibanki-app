import { useState, useCallback, useRef, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { addEntry } from '../../services/persistUserData';
import { useSibcoinToast } from '../../hooks/useSibcoinToast';
import { functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import type { Entry } from '../../types/userData';
import { Upload, FileText, CheckCircle, AlertTriangle, X, Check, ChevronDown, Sparkles } from 'lucide-react';

type ImportFormat = 'csv' | 'ofx' | 'text';

interface ParsedItem {
  date: string;
  desc: string;
  value: number;
  type: 'receita' | 'despesa';
  category: string;
  selected: boolean;
}

const DEFAULT_CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Vestuário', 'Assinatura', 'Viagem', 'Pet', 'Outros',
];

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/supermercado|mercado|padaria|ifood|rappi|uber ?eat|restaurante|lanche|mcdonald|burger|pizza|sushi|acougue|hortifruti|cafe/i, 'Alimentação'],
  [/uber|99|cabify|combustivel|gasolina|alcool|estacionamento|pedagio|transporte|passagem|bilhete|metro|trem|onibus/i, 'Transporte'],
  [/aluguel|condominio|iptu|agua|luz|energia|sabesp|enel|cemig|copel|gas|internet|telecom|claro|vivo|tim|oi/i, 'Moradia'],
  [/farmacia|drogaria|hospital|medico|consulta|plano ?de ?saude|unimed|amil|bradesco ?saude|odonto/i, 'Saúde'],
  [/escola|universidade|faculdade|curso|udemy|alura|mentoria|livro|apostila/i, 'Educação'],
  [/netflix|spotify|disney|hbo|amazon ?prime|youtube|apple ?music|deezer|xbox|playstation|steam/i, 'Assinatura'],
  [/roupa|calcado|sapato|tenis|shein|renner|riachuelo|zara|hm|cea/i, 'Vestuário'],
  [/hotel|airbnb|passagem ?aerea|latam|gol|azul|booking|mala|viagem/i, 'Viagem'],
  [/petshop|racao|veterinar|banho|pet/i, 'Pet'],
  [/cinema|teatro|show|ingresso|parque|jogo|bar|balada|festa|lazer/i, 'Lazer'],
];

function autoDetect(desc: string): string {
  const lower = desc.toLowerCase();
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(lower)) return cat;
  }
  return 'Outros';
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const d = raw.trim().replace(/\//g, '-');
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return null;
}

function parseValue(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim().replace(/[R$\s]/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  return Math.abs(parseFloat(s) || 0);
}

function parseCSV(text: string): ParsedItem[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase().replace(/[áàã]/g, 'a').replace(/[éê]/g, 'e').replace(/[íî]/g, 'i').replace(/[óô]/g, 'o').replace(/[úû]/g, 'u');
  const sepSemi = (header.match(/;/g) || []).length;
  const sepComma = (header.match(/,/g) || []).length;
  const sep = sepSemi > sepComma ? ';' : ',';
  const cols = header.split(sep).map((c) => c.trim());

  let colDate = cols.findIndex((c) => c.includes('data') || c.includes('date'));
  let colDesc = cols.findIndex((c) => c.includes('descri') || c.includes('titulo') || c.includes('title') || c.includes('estabelecimento') || c.includes('lancamento'));
  let colVal = cols.findIndex((c) => c.includes('valor') || c.includes('amount') || c.includes('preco') || c.includes('value'));
  let colCat = cols.findIndex((c) => c.includes('categ') || c.includes('category'));

  if (colDate < 0 && cols[0]?.includes('date')) { colDate = 0; colCat = 1; colDesc = 2; colVal = 3; }
  if (colDate < 0 && cols.length >= 3) { colDate = 0; colDesc = 1; colVal = cols.length - 1; }

  const items: ParsedItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(sep);
    const date = parseDate(parts[colDate] ?? '');
    if (!date) continue;
    const val = parseValue(parts[colVal] ?? '');
    if (val === 0) continue;
    const desc = (parts[colDesc] ?? '').replace(/^"|"$/g, '').trim() || 'Sem descrição';
    const catRaw = colCat >= 0 ? (parts[colCat] ?? '').trim() : '';
    const category = catRaw || autoDetect(desc);
    items.push({ date, desc, value: val, type: 'despesa', category, selected: true });
  }
  return items;
}

function parseOFX(text: string): ParsedItem[] {
  const blocks = text.split('<STMTTRN>');
  const items: ParsedItem[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const dateMatch = b.match(/<DTPOSTED>(\d{8})/);
    const amtMatch = b.match(/<TRNAMT>([^\n<]+)/);
    const memoMatch = b.match(/<MEMO>([^\n<]+)/) || b.match(/<NAME>([^\n<]+)/);
    if (!dateMatch || !amtMatch) continue;
    const raw = dateMatch[1];
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const val = parseFloat(amtMatch[1].replace(',', '.'));
    if (val === 0) continue;
    const desc = (memoMatch?.[1] ?? 'Sem descrição').trim();
    const type = val < 0 ? 'despesa' : 'receita';
    items.push({ date, desc, value: Math.abs(val), type, category: autoDetect(desc), selected: true });
  }
  return items;
}

function parseText(text: string): ParsedItem[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const items: ParsedItem[] = [];
  const dateRe = /(\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/;
  const valRe = /R?\$?\s*([\d.,]+)/;
  for (const line of lines) {
    const dm = line.match(dateRe);
    const vm = line.match(valRe);
    if (!dm || !vm) continue;
    const date = parseDate(dm[1]);
    if (!date) continue;
    const val = parseValue(vm[1]);
    if (val === 0) continue;
    const desc = line.replace(dateRe, '').replace(valRe, '').replace(/[|;,]/g, ' ').trim() || 'Sem descrição';
    items.push({ date, desc, value: val, type: 'despesa', category: autoDetect(desc), selected: true });
  }
  return items;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ImportEntries({ open, onClose }: Props) {
  const { user, entries } = useAppContext();
  const { triggerWithToast } = useSibcoinToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<ImportFormat>('csv');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiCatBusy, setAiCatBusy] = useState(false);
  const [result, setResult] = useState<{ total: number; ok: number; skipped?: number } | null>(null);

  const handleFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) { alert('Arquivo excede 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const ext = file.name.toLowerCase();
      if (ext.endsWith('.ofx') || ext.endsWith('.qfx')) {
        setItems(parseOFX(text));
        setFormat('ofx');
      } else {
        setItems(parseCSV(text));
        setFormat('csv');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return;
    setItems(parseText(pasteText));
  }, [pasteText]);

  const toggleAll = (v: boolean) => setItems((prev) => prev.map((it) => ({ ...it, selected: v })));
  const toggleItem = (idx: number) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it));
  const updateCategory = (idx: number, cat: string) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, category: cat } : it));

  const selected = useMemo(() => items.filter((it) => it.selected), [items]);
  const totalValue = useMemo(() => selected.reduce((s, it) => s + it.value, 0), [selected]);

  const categorizeWithAi = useCallback(async () => {
    if (items.length === 0) return;
    setAiCatBusy(true);
    try {
      const toCategorize = items.map((it, i) => ({ index: i, desc: it.desc, type: it.type }));
      const BATCH_SIZE = 50;
      const MAX_CONCURRENT = 3;
      const batches = [];
      for (let b = 0; b < toCategorize.length; b += BATCH_SIZE) {
        batches.push(toCategorize.slice(b, b + BATCH_SIZE));
      }

      const aiCat = httpsCallable<{ items: any[] }, { results: { index: number; category: string }[] }>(functions, 'aiCategorizeCsv');
      let allResults: { index: number; category: string }[] = [];
      
      let i = 0;
      while (i < batches.length) {
        const currentTasks = batches.slice(i, i + MAX_CONCURRENT).map((b) => aiCat({ items: b }).catch(() => null));
        const resList = await Promise.all(currentTasks);
        resList.forEach((r) => {
          if (r?.data?.results) allResults.push(...r.data.results);
        });
        i += MAX_CONCURRENT;
      }

      if (allResults.length > 0) {
        setItems((prev) => {
          const updated = [...prev];
          for (const r of allResults) {
            if (updated[r.index] && r.category) updated[r.index] = { ...updated[r.index], category: r.category };
          }
          return updated;
        });
      }
    } catch { /* fallback to regex categories */ }
    finally { setAiCatBusy(false); }
  }, [items]);

  const confirmImport = useCallback(async () => {
    if (!user?.uid || selected.length === 0) return;
    setBusy(true);

    const existingHashes = new Set(
      entries.map((e) => `${e.date}|${(e.desc || '').trim().toLowerCase()}|${Number(e.value).toFixed(2)}`)
    );

    let ok = 0;
    let skipped = 0;
    for (const it of selected) {
      const hash = `${it.date}|${(it.desc || '').trim().toLowerCase()}|${Number(it.value).toFixed(2)}`;
      if (existingHashes.has(hash)) { skipped++; continue; }
      existingHashes.add(hash);
      try {
        const entry: Omit<Entry, 'id'> = {
          date: it.date,
          desc: it.desc,
          value: it.value,
          type: it.type,
          category: it.category,
          tags: ['importado'],
        } as any;
        await addEntry(user.uid, entries, entry);
        ok++;
      } catch { /* skip */ }
    }
    if (ok > 0) triggerWithToast('entry_added');
    setResult({ total: selected.length, ok, skipped });
    setBusy(false);
  }, [user?.uid, entries, selected, triggerWithToast]);

  const reset = () => { setItems([]); setResult(null); setPasteText(''); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-si-card border border-si-border-md rounded-2xl w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-si-border">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-si-1">Importar lançamentos</h3>
          </div>
          <button type="button" onClick={() => { reset(); onClose(); }} className="p-2 rounded-lg hover:bg-si-over-3 text-si-5" title="Fechar"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {result ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-lg font-bold text-si-1">{result.ok} de {result.total} importados</p>
              {result.skipped && result.skipped > 0 && (
                <p className="text-sm text-amber-400 mt-1">{result.skipped} duplicados ignorados</p>
              )}
              <p className="text-sm text-si-5 mt-1">Lançamentos adicionados com sucesso.</p>
              <div className="mt-6 flex gap-3 justify-center">
                <button type="button" onClick={reset} className="px-4 py-2.5 rounded-xl bg-si-over-2 border border-si-border-md text-si-4 text-sm">Importar mais</button>
                <button type="button" onClick={() => { reset(); onClose(); }} className="px-4 py-2.5 rounded-xl bg-white text-zinc-900 text-sm font-bold">Fechar</button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <>
              <div className="flex gap-2">
                {(['csv', 'ofx', 'text'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFormat(f)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${format === f ? 'bg-white text-zinc-900' : 'bg-si-over-2 text-si-4 hover:bg-si-over-3'}`}>
                    {f === 'csv' ? 'CSV' : f === 'ofx' ? 'OFX' : 'Colar texto'}
                  </button>
                ))}
              </div>

              {format !== 'text' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-si-border-md rounded-2xl p-12 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
                >
                  <FileText className="w-10 h-10 text-si-5 mx-auto mb-3" />
                  <p className="text-si-3 text-sm font-medium">Clique ou arraste seu arquivo {format.toUpperCase()}</p>
                  <p className="text-si-5 text-xs mt-1">Suporta extratos do Nubank, Inter, Itaú, C6, BTG e outros</p>
                  <input ref={fileInputRef} type="file" accept={format === 'csv' ? '.csv,.txt' : '.ofx,.qfx'} className="hidden" title="Selecionar arquivo"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Cole o texto do extrato aqui (data, descrição e valor em cada linha)"
                    className="w-full h-40 px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-sm resize-none focus:outline-none focus:border-si-border-lg" />
                  <button type="button" onClick={handlePaste} disabled={!pasteText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold disabled:opacity-50">
                    Analisar texto
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-si-3">
                  <span className="font-bold text-si-1">{selected.length}</span> de {items.length} selecionados
                  · R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex gap-2 items-center">
                  <button type="button" onClick={() => toggleAll(true)} className="text-xs text-blue-400 hover:underline">Todos</button>
                  <button type="button" onClick={() => toggleAll(false)} className="text-xs text-si-5 hover:underline">Nenhum</button>
                  <button type="button" onClick={categorizeWithAi} disabled={aiCatBusy}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-si-over-2 text-si-2 text-xs font-semibold hover:bg-si-over-3 disabled:opacity-50"
                    title="Usar IA para categorizar automaticamente">
                    <Sparkles className="w-3 h-3" /> {aiCatBusy ? 'Categorizando…' : 'IA Categorizar'}
                  </button>
                </div>
              </div>

              <div className="border border-si-border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-si-over-1 sticky top-0">
                    <tr className="text-left text-xs text-si-4 uppercase tracking-wide">
                      <th className="p-3 w-8"></th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {items.map((it, idx) => (
                      <tr key={idx} className={`${it.selected ? '' : 'opacity-40'} hover:bg-si-over-1`}>
                        <td className="p-3">
                          <input type="checkbox" checked={it.selected} onChange={() => toggleItem(idx)} className="rounded" title="Selecionar lançamento" />
                        </td>
                        <td className="p-3 text-si-4 whitespace-nowrap">{it.date}</td>
                        <td className="p-3 text-si-1 truncate max-w-[200px]" title={it.desc}>{it.desc}</td>
                        <td className="p-3">
                          <div className="relative">
                            <select value={it.category} onChange={(e) => updateCategory(idx, e.target.value)}
                              title="Categoria"
                              className="appearance-none bg-si-over-2 border border-si-border rounded-lg px-2 py-1 text-xs text-si-3 pr-6 w-full">
                              {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-si-5 pointer-events-none" />
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-rose-400">
                          R$ {it.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {items.length > 50 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">Muitos itens — a importação pode demorar alguns segundos.</p>
                </div>
              )}
            </>
          )}
        </div>

        {items.length > 0 && !result && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-si-border">
            <button type="button" onClick={reset} className="text-sm text-si-5 hover:text-si-3">Voltar</button>
            <button type="button" onClick={confirmImport} disabled={busy || selected.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold disabled:opacity-50">
              <Check className="w-4 h-4" /> {busy ? `Importando... (${selected.length})` : `Importar ${selected.length} lançamentos`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
