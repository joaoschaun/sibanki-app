/**
 * Modo Família / Casal — Finanças compartilhadas e Educação Infantil.
 * Arquitetura alinhada ao legado:
 *   invites/{id}  → { from, fromName, fromEmail, toEmail, status, created }
 *   couples/{id}  → { members:[uid1,uid2], names:{}, emails:{}, entries:[], goals:[], created }
 * Zero leitura cruzada de users/{uid} — tudo no doc compartilhado.
 */
import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  query, where, getDocs, onSnapshot, getDoc,
} from 'firebase/firestore';
import { PageTransition } from '../components/ui/PageTransition';
import {
  Heart, Users, Mail, Check, Unlink,
  TrendingUp, TrendingDown, Clock, X,
  Baby, Lock
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import FilhosPage from './Filhos';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface CoupleDoc {
  members: string[];
  names: Record<string, string>;
  emails: Record<string, string>;
  entries: Array<{ uid: string; type?: string; value?: number; date?: string; category?: string; desc?: string }>;
  goals: Array<{ uid: string; title?: string; target?: number; current?: number }>;
  created: string;
}

interface InviteDoc {
  id: string;
  from: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  created: string;
}

export default function Casal() {
  const { user, entries: myEntries, data, loading } = useAppContext();
  const { requireFeature } = useFeatureFlags();
  const { allowed: familiaAllowed, upsellInfo } = requireFeature('familia_compartilhado');

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'filhos' ? 'filhos' : 'casal';

  const uid = user?.uid ?? '';
  const myEmail = (user?.email ?? '').toLowerCase();
  const myName = (data as { name?: string })?.name || user?.displayName || 'Você';

  const [couple, setCouple] = useState<{ id: string; data: CoupleDoc } | null>(null);
  const [sentInvite, setSentInvite] = useState<InviteDoc | null>(null);
  const [receivedInvite, setReceivedInvite] = useState<InviteDoc | null>(null);
  const [toEmailInput, setToEmailInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const mk = useMemo(() => monthKey(), []);

  // Carrega estado do casal e convites
  useEffect(() => {
    if (!uid || !myEmail || !familiaAllowed) return;
    let unsubCouple: (() => void) | null = null;

    async function load() {
      // 1. Já vinculado?
      const coupleQ = query(collection(db, 'couples'), where('members', 'array-contains', uid));
      const coupleSnap = await getDocs(coupleQ);
      if (!coupleSnap.empty) {
        const d = coupleSnap.docs[0];
        setCouple({ id: d.id, data: d.data() as CoupleDoc });
        // listener em tempo real
        unsubCouple = onSnapshot(doc(db, 'couples', d.id), snap => {
          if (snap.exists()) setCouple({ id: snap.id, data: snap.data() as CoupleDoc });
        });
        return;
      }
      // 2. Convite recebido?
      const recvQ = query(collection(db, 'invites'), where('toEmail', '==', myEmail), where('status', '==', 'pending'));
      const recvSnap = await getDocs(recvQ);
      if (!recvSnap.empty) {
        const d = recvSnap.docs[0];
        setReceivedInvite({ id: d.id, ...(d.data() as Omit<InviteDoc, 'id'>) });
      }
      // 3. Convite enviado?
      const sentQ = query(collection(db, 'invites'), where('from', '==', uid), where('status', '==', 'pending'));
      const sentSnap = await getDocs(sentQ);
      if (!sentSnap.empty) {
        const d = sentSnap.docs[0];
        setSentInvite({ id: d.id, ...(d.data() as Omit<InviteDoc, 'id'>) });
      }
    }
    load();
    return () => { if (unsubCouple) unsubCouple(); };
  }, [uid, myEmail, familiaAllowed]);

  // Sync meus lançamentos do mês para o doc do casal
  useEffect(() => {
    if (!couple || !uid || !familiaAllowed) return;
    const monthEntries = myEntries
      .filter(e => (e.date ?? '').startsWith(mk))
      .map(e => ({ uid, type: e.type, value: e.value, date: e.date, category: e.category, desc: e.desc ?? '' }));
    // Mantém os lançamentos do parceiro, substitui os meus
    const partnerEntries = (couple.data.entries ?? []).filter(e => e.uid !== uid);
    updateDoc(doc(db, 'couples', couple.id), {
      [`entries`]: [...partnerEntries, ...monthEntries],
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEntries, mk, couple?.id, familiaAllowed]);

  // KPIs combinados
  const combined = useMemo(() => {
    const all = couple?.data.entries ?? [];
    let receita = 0, despesa = 0;
    for (const e of all) {
      if (e.type === 'receita') receita += Number(e.value) || 0;
      if (e.type === 'despesa') despesa += Number(e.value) || 0;
    }
    return { receita, despesa, saldo: receita - despesa };
  }, [couple]);

  async function handleSendInvite() {
    if (!uid || !toEmailInput.trim()) return;
    const to = toEmailInput.trim().toLowerCase();
    if (to === myEmail) { setErrorMsg('Não é possível se convidar.'); return; }
    setStatus('loading'); setErrorMsg('');
    try {
      const ref = await addDoc(collection(db, 'invites'), {
        from: uid, fromName: myName, fromEmail: myEmail,
        toEmail: to, status: 'pending', created: new Date().toISOString(),
      });
      setSentInvite({ id: ref.id, from: uid, fromName: myName, fromEmail: myEmail, toEmail: to, status: 'pending', created: new Date().toISOString() });
      setStatus('success');
    } catch { setStatus('error'); setErrorMsg('Erro ao enviar convite.'); }
  }

  async function handleAccept() {
    if (!receivedInvite || !uid) return;
    setStatus('loading');
    try {
      const inv = receivedInvite;
      const senderDoc = await getDoc(doc(db, 'users', inv.from));
      const senderName = senderDoc.exists() ? (senderDoc.data()?.name ?? inv.fromName) : inv.fromName;
      const coupleDoc: CoupleDoc = {
        members: [inv.from, uid],
        names: { [inv.from]: senderName, [uid]: myName },
        emails: { [inv.from]: inv.fromEmail, [uid]: myEmail },
        entries: [], goals: [], created: new Date().toISOString(),
      };
      const coupleRef = await addDoc(collection(db, 'couples'), coupleDoc);
      await updateDoc(doc(db, 'invites', inv.id), { status: 'accepted', coupleId: coupleRef.id });
      setCouple({ id: coupleRef.id, data: coupleDoc });
      setReceivedInvite(null);
      setStatus('success');
    } catch { setStatus('error'); setErrorMsg('Erro ao aceitar convite.'); }
  }

  async function handleReject() {
    if (!receivedInvite) return;
    await updateDoc(doc(db, 'invites', receivedInvite.id), { status: 'rejected' });
    setReceivedInvite(null);
  }

  async function handleDesvincular() {
    if (!couple || !uid) return;
    if (!confirm('Desvincular o casal? Os lançamentos compartilhados serão mantidos no histórico.')) return;
    await deleteDoc(doc(db, 'couples', couple.id));
    setCouple(null);
  }

  // Se estiver carregando, exibe spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Tela de bloqueio e Upsell do Plano Família
  if (!familiaAllowed && upsellInfo) {
    return (
      <PageTransition>
        <div className="max-w-xl mx-auto py-12 px-4 space-y-8 text-center">
          <div className="relative w-24 h-24 mx-auto rounded-3xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shadow-lg shadow-pink-500/5">
            <Lock className="w-10 h-10 text-pink-400" />
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-si-1 uppercase tracking-wider">{upsellInfo.label}</h2>
            <p className="text-si-4 text-sm leading-relaxed max-w-md mx-auto">
              O **Modo Família** é um recurso premium que permite orquestrar e organizar todo o ecossistema financeiro da sua casa em conjunto.
            </p>
          </div>

          <div className="bg-si-card border border-si-border rounded-2xl p-6 text-left max-w-md mx-auto space-y-4">
            <h3 className="text-xs font-bold text-si-3 uppercase tracking-widest border-b border-si-border pb-2">Benefícios Inclusos</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-xs text-si-2">
                <Heart className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span><strong>Espaço Casal</strong>: Sincronize saldos e gerencie metas conjuntas em tempo real com seu parceiro(a).</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-si-2">
                <Baby className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Educação Financeira Infantil</strong>: Perfis para filhos, controle de mesadas automáticas e tarefas gamificadas.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-si-2">
                <Users className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>Compartilhamento Pro</strong>: Libere todos os recursos do plano Pro para até 4 membros da família.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <a
              href="/configuracoes#planos"
              className="inline-block px-6 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-sm tracking-wider uppercase shadow-lg shadow-pink-600/25 transition-all duration-200"
            >
              Fazer Upgrade para Família
            </a>
            <p className="text-[10px] text-si-4 uppercase tracking-widest mt-3">30 dias grátis de Família. Cancele quando quiser.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  // 2. Modo Família Disponível (Renderização das Abas)
  const partnerUid = couple?.data.members.find(m => m !== uid) ?? '';
  const partnerName = couple?.data.names[partnerUid] || 'Parceiro(a)';

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header Unificado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-si-border pb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-si-1">Modo Família</h1>
              <p className="text-sm text-si-4">Gerencie as finanças do lar e ensine educação financeira para os filhos.</p>
            </div>
          </div>
        </div>

        {/* Seleção de Abas */}
        <div className="flex gap-1.5 p-1 bg-si-card border border-si-border rounded-xl w-fit">
          <button
            onClick={() => setSearchParams({ tab: 'casal' })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'casal'
                ? 'bg-si-over-2 text-si-1 shadow-sm border border-si-border-md'
                : 'text-si-5 hover:text-si-3 border border-transparent'
            }`}
          >
            <Heart size={14} className="text-rose-400" /> Espaço Casal
          </button>
          <button
            onClick={() => setSearchParams({ tab: 'filhos' })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'filhos'
                ? 'bg-si-over-2 text-si-1 shadow-sm border border-si-border-md'
                : 'text-si-5 hover:text-si-3 border border-transparent'
            }`}
          >
            <Baby size={14} className="text-pink-400" /> Finanças dos Filhos
          </button>
        </div>

        {/* Conteúdo dinâmico das Abas */}
        <div className="pt-2">
          {activeTab === 'casal' ? (
            <div className="space-y-6 max-w-lg mx-auto">
              {!couple ? (
                <div className="space-y-6">
                  <div className="text-center space-y-2 py-4">
                    <Heart className="mx-auto text-rose-500" size={40} />
                    <h2 className="text-lg font-bold">Vincular Parceiro(a)</h2>
                    <p className="text-sm text-si-4">Envie um convite para unificar o planejamento financeiro do casal.</p>
                  </div>

                  {sentInvite && (
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400">
                      Convite enviado para <strong>{sentInvite.toEmail}</strong>. Aguardando aceitação.
                    </div>
                  )}

                  {receivedInvite && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-si-2">Convite recebido:</p>
                      <div className="flex items-center justify-between rounded-xl bg-si-card border border-si-border p-4">
                        <div>
                          <p className="font-medium">{receivedInvite.fromName}</p>
                          <p className="text-xs text-si-4">{receivedInvite.fromEmail}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept()}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleReject()}
                            className="px-3 py-1.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 text-si-4 text-xs font-medium transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400">{errorMsg}</div>
                  )}

                  <form
                    onSubmit={e => { e.preventDefault(); handleSendInvite(); }}
                    className="space-y-3"
                  >
                    <label className="block text-sm font-medium text-si-2">Convidar parceiro(a) por e-mail</label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={toEmailInput}
                        onChange={e => setToEmailInput(e.target.value)}
                        placeholder="email@exemplo.com"
                        disabled={status === 'loading'}
                        className="flex-1 rounded-xl bg-si-card border border-si-border px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500/50"
                      />
                      <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <Mail size={15} /> Convidar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Informações de Vinculação */}
                  <div className="flex items-center justify-between border-b border-si-border pb-4">
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-rose-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{partnerName}</p>
                        <p className="text-xs text-si-4">{couple.data.emails[partnerUid]}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDesvincular}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-si-over-2 hover:bg-si-over-3 text-xs text-si-4 transition-colors"
                    >
                      <Unlink size={13} /> Desvincular
                    </button>
                  </div>

                  {/* KPIs combinados do mês */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                      <TrendingUp size={16} className="mx-auto text-emerald-400 mb-1" />
                      <p className="text-xs text-si-4">Receitas</p>
                      <p className="text-sm font-semibold text-emerald-400">{fmtBRL(combined.receita)}</p>
                    </div>
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-center">
                      <TrendingDown size={16} className="mx-auto text-rose-400 mb-1" />
                      <p className="text-xs text-si-4">Despesas</p>
                      <p className="text-sm font-semibold text-rose-400">{fmtBRL(combined.despesa)}</p>
                    </div>
                    <div className="rounded-xl bg-si-card border border-si-border p-3 text-center">
                      <Clock size={16} className="mx-auto text-si-4 mb-1" />
                      <p className="text-xs text-si-4">Saldo</p>
                      <p className={`text-sm font-semibold ${combined.saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {fmtBRL(combined.saldo)}
                      </p>
                    </div>
                  </div>

                  {/* Lançamentos do mês (últimos 10) */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-si-2">Lançamentos do mês</p>
                    {(couple.data.entries ?? [])
                      .filter(e => (e.date ?? '').startsWith(mk))
                      .slice(-10)
                      .reverse()
                      .map((e, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-si-over-1 px-3 py-2.5 text-sm">
                          <div>
                            <span className="text-xs text-si-5 mr-2">{couple.data.names[e.uid] || e.uid}</span>
                            <span className="text-si-2">{e.desc || e.category}</span>
                          </div>
                          <span className={e.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}>
                            {e.type === 'receita' ? '+' : '-'}{fmtBRL(Number(e.value) || 0)}
                          </span>
                        </div>
                      ))}
                    {(couple.data.entries ?? []).filter(e => (e.date ?? '').startsWith(mk)).length === 0 && (
                      <p className="text-sm text-si-5 text-center py-4">Nenhum lançamento neste mês.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <FilhosPage hideHeader={true} />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
