import { useState, useMemo, useEffect } from 'react';
import {
  Users, Plus, ChevronRight, ChevronLeft, X,
  DollarSign, Calendar, Hash, Shuffle, Trophy,
  CheckCircle, Clock, AlertCircle, User, Phone,
  Mail, Send, MessageCircle, Trash2, Check, Copy, Loader2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  getGroups, createGroup as apiCreateGroup, drawWinner as apiDrawWinner,
  getGroupInviteUrl,
  type ConsorcioGroup, type GroupMember, type GroupRound, type ContactType,
} from '../services/socialAmigo';

type DrawMethod = ConsorcioGroup['drawMethod'];
type Frequency  = ConsorcioGroup['frequency'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}
const DRAW_LABELS: Record<DrawMethod, string> = {
  random: 'Sorteio aleatório',
  order:  'Ordem de entrada',
  bid:    'Maior lance',
};
const FREQ_LABELS: Record<Frequency, string> = {
  monthly:   'Mensal',
  biweekly:  'Quinzenal',
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function ConsorcioAmigo() {
  const { data } = useAppContext();
  const adminName = data?.name ?? 'Você';

  const [groups, setGroups]     = useState<ConsorcioGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<ConsorcioGroup | null>(null);

  useEffect(() => {
    getGroups()
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoadingGroups(false));
  }, []);

  const activeGroups    = useMemo(() => groups.filter((g) => g.status === 'active').length, [groups]);
  const totalCirculating = useMemo(() =>
    groups.filter((g) => g.status === 'active')
      .reduce((s, g) => s + g.contributionAmount * g.members.length, 0), [groups]);

  async function handleDrawWinner(groupId: string, roundNum: number) {
    const { winnerId, winnerName } = await apiDrawWinner(groupId, roundNum);
    const update = (g: ConsorcioGroup): ConsorcioGroup => g.id !== groupId ? g : {
      ...g,
      members: g.members.map((m) => m.id === winnerId ? { ...m, receivedRound: roundNum } : m),
      rounds: g.rounds.map((r) => r.number === roundNum ? { ...r, winnerId, status: 'completed' as const } : r),
    };
    setGroups((prev) => prev.map(update));
    setSelected((prev) => prev ? update(prev) : null);
    void winnerName; // usado para notificação futura
  }

  if (loadingGroups) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-si-4" />
    </div>
  );

  if (creating) return (
    <CreateGroupFlow
      adminName={adminName}
      onSave={(g) => { setGroups((p) => [g, ...p]); setCreating(false); }}
      onCancel={() => setCreating(false)}
    />
  );

  if (selected) return (
    <GroupDetail
      group={selected}
      onBack={() => setSelected(null)}
      onDrawWinner={handleDrawWinner}
    />
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6" /> Consórcio Amigo
          </h2>
          <p className="text-xs text-si-5 uppercase tracking-widest font-bold mt-0.5">
            Caixinha entre pessoas de confiança
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-si-1 text-si-bg text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Novo grupo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Grupos ativos',    value: activeGroups },
          { label: 'Em circulação',    value: fmtBRL(totalCirculating) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-si-card border border-si-border rounded-2xl p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">{label}</p>
            <p className="text-xl font-bold text-si-1 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {groups.length === 0 ? (
        <EmptyState onNew={() => setCreating(true)} />
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Seus grupos</p>
          {groups.map((group) => {
            const activeRound = group.rounds.find((r) => r.status === 'active');
            const completedRounds = group.rounds.filter((r) => r.status === 'completed').length;
            return (
              <button
                key={group.id}
                onClick={() => setSelected(group)}
                className="w-full bg-si-card border border-si-border rounded-2xl p-5 flex items-center gap-4 hover:border-si-border-md transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-si-over-2 flex items-center justify-center shrink-0 font-bold text-si-3 text-lg">
                  {group.members.length}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-si-1">{group.name}</p>
                  <p className="text-xs text-si-5 mt-0.5">
                    {group.members.length} participantes · {fmtBRL(group.contributionAmount)}/mês cada
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-si-over-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(completedRounds / group.rounds.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-si-5">{completedRounds}/{group.rounds.length} rodadas</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {activeRound && (
                    <p className="text-xs text-amber-400 font-semibold">Rodada {activeRound.number} ativa</p>
                  )}
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
            { n: '1', t: 'Crie o grupo',  d: 'Defina valor, frequência e regras' },
            { n: '2', t: 'Convide',       d: 'Membros aceitam o convite pelo link' },
            { n: '3', t: 'Contribuam',    d: 'Todos pagam, um sorteia ou declara' },
            { n: '4', t: 'Repita',        d: 'Até todos terem recebido a cota' },
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

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-si-over-2 flex items-center justify-center mx-auto">
        <Users className="w-8 h-8 text-si-5" />
      </div>
      <div>
        <p className="text-si-2 font-semibold">Nenhum grupo ainda</p>
        <p className="text-si-5 text-sm mt-1">Crie uma caixinha com seus amigos e familie</p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-si-1 text-si-bg text-sm font-bold hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> Criar primeiro grupo
      </button>
    </div>
  );
}

// ── Fluxo de criação ──────────────────────────────────────────────────────────
interface CreateGroupFlowProps {
  adminName: string;
  onSave: (g: ConsorcioGroup) => void;
  onCancel: () => void;
}

function CreateGroupFlow({ adminName, onSave, onCancel }: CreateGroupFlowProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    contributionAmount: '',
    frequency: 'monthly' as Frequency,
    drawMethod: 'random' as DrawMethod,
    startDate: '',
  });
  const [members, setMembers] = useState<{ name: string; contact: string; contactType: ContactType }[]>([]);
  const [newMember, setNewMember] = useState({ name: '', contact: '', contactType: 'whatsapp' as ContactType });

  const amount = parseFloat(form.contributionAmount) || 0;
  const totalParticipants = members.length + 1; // +1 = admin
  const poolPerRound = amount * totalParticipants;

  const steps = ['Grupo', 'Participantes', 'Revisão'];
  const canNext = [
    !!form.name && amount > 0 && !!form.startDate,
    members.length >= 1,
    true,
  ][step];

  function addMember() {
    if (!newMember.name || !newMember.contact) return;
    setMembers((p) => [...p, { ...newMember }]);
    setNewMember({ name: '', contact: '', contactType: 'whatsapp' });
  }

  function buildGroup(): ConsorcioGroup {
    const start = new Date(form.startDate + 'T12:00:00');
    const n = totalParticipants;
    const rounds: GroupRound[] = Array.from({ length: n }, (_, i) => {
      const d = new Date(start);
      if (form.frequency === 'monthly') d.setMonth(d.getMonth() + i);
      else d.setDate(d.getDate() + i * 14);
      return { number: i + 1, dueDate: d.toISOString().slice(0, 10), winnerId: null, status: i === 0 ? 'active' : 'upcoming' };
    });
    const builtMembers: GroupMember[] = [
      { id: 'me', name: `${adminName} (Admin)`, contact: '', contactType: 'whatsapp', isAdmin: true, status: 'accepted', receivedRound: null, inviteToken: null, payments: rounds.map((r) => ({ round: r.number, paid: false, date: null })) },
      ...members.map((m, i) => ({
        id: `m${i + 1}`, ...m, isAdmin: false, status: 'invited' as const, receivedRound: null, inviteToken: null,
        payments: rounds.map((r) => ({ round: r.number, paid: false, date: null })),
      })),
    ];
    return {
      id: `grp_${Date.now()}`,
      name: form.name,
      createdAt: new Date().toISOString().slice(0, 10),
      adminUid: 'me',
      adminName,
      contributionAmount: amount,
      frequency: form.frequency,
      drawMethod: form.drawMethod,
      startDate: form.startDate,
      status: 'pending',
      inviteToken: '',
      members: builtMembers,
      rounds,
    };
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Topo */}
      <div className="flex items-center gap-3">
        <button onClick={onCancel} className="p-2 rounded-xl hover:bg-si-over-2 transition-colors">
          <X className="w-5 h-5 text-si-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-si-1">Novo grupo</h2>
          <p className="text-xs text-si-5">{steps[step]}</p>
        </div>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? 'bg-si-1' : 'bg-si-over-3'}`} />
          ))}
        </div>
      </div>

      {/* Step 0 — Configuração do grupo */}
      {step === 0 && (
        <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Configuração do grupo</p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Nome do grupo</label>
            <input
              type="text" placeholder="Ex: Caixinha da galera"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-si-bg border border-si-border rounded-xl px-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Contribuição por pessoa</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
              <input
                type="number" min="1" placeholder="0,00"
                value={form.contributionAmount}
                onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })}
                className="w-full bg-si-bg border border-si-border rounded-xl pl-9 pr-4 py-3 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Frequência</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
                className="w-full bg-si-bg border border-si-border rounded-xl px-4 py-3 text-si-1 text-sm focus:outline-none"
              >
                <option value="monthly">Mensal</option>
                <option value="biweekly">Quinzenal</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-si-4 uppercase tracking-wider">1ª rodada em</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-si-5" />
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full bg-si-bg border border-si-border rounded-xl pl-9 pr-3 py-3 text-si-1 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-si-4 uppercase tracking-wider">Método de sorteio</label>
            <div className="space-y-2">
              {(['random', 'order', 'bid'] as DrawMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setForm({ ...form, drawMethod: m })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                    form.drawMethod === m ? 'border-si-border-md bg-si-over-2' : 'border-si-border'
                  }`}
                >
                  {m === 'random' ? <Shuffle className="w-4 h-4 text-si-4" />
                    : m === 'order' ? <Hash className="w-4 h-4 text-si-4" />
                    : <Trophy className="w-4 h-4 text-si-4" />}
                  <div>
                    <p className="text-sm font-semibold text-si-2">{DRAW_LABELS[m]}</p>
                    <p className="text-xs text-si-5">
                      {m === 'random' ? 'Sorteio ao vivo a cada rodada'
                        : m === 'order' ? 'Ordem de entrada na caixinha'
                        : 'Quem oferecer mais "pontos" recebe primeiro'}
                    </p>
                  </div>
                  {form.drawMethod === m && <Check className="w-4 h-4 text-si-2 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — Participantes */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Convidar participantes</p>

            <div className="flex items-center gap-3 p-3 bg-si-over-1 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-si-over-2 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-si-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-si-2">{adminName} (Você)</p>
                <p className="text-xs text-si-5">Administrador</p>
              </div>
            </div>

            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-si-over-1 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-si-over-2 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-si-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-si-2">{m.name}</p>
                  <p className="text-xs text-si-5">{m.contactType === 'whatsapp' ? '📱' : '✉️'} {m.contact}</p>
                </div>
                <button onClick={() => setMembers((p) => p.filter((_, j) => j !== i))} className="text-si-5 hover:text-rose-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Add member form */}
            <div className="border border-dashed border-si-border rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-si-5 uppercase tracking-widest">Adicionar participante</p>
              <input
                type="text" placeholder="Nome"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                className="w-full bg-si-bg border border-si-border rounded-xl px-4 py-2.5 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
              />
              <div className="grid grid-cols-2 gap-2">
                {(['whatsapp', 'email'] as ContactType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewMember({ ...newMember, contactType: t })}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      newMember.contactType === t ? 'bg-si-1 text-si-bg border-transparent' : 'bg-si-bg border-si-border text-si-4'
                    }`}
                  >
                    {t === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                    {t === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {newMember.contactType === 'whatsapp'
                    ? <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-si-5" />
                    : <Mail  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-si-5" />}
                  <input
                    type={newMember.contactType === 'email' ? 'email' : 'tel'}
                    placeholder={newMember.contactType === 'whatsapp' ? '11 9 9999-9999' : 'email@exemplo.com'}
                    value={newMember.contact}
                    onChange={(e) => setNewMember({ ...newMember, contact: e.target.value })}
                    className="w-full bg-si-bg border border-si-border rounded-xl pl-9 pr-3 py-2.5 text-si-1 text-sm focus:outline-none focus:border-si-border-md"
                  />
                </div>
                <button
                  onClick={addMember}
                  disabled={!newMember.name || !newMember.contact}
                  className="px-4 py-2.5 rounded-xl bg-si-1 text-si-bg text-sm font-bold hover:opacity-90 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {amount > 0 && members.length > 0 && (
            <div className="bg-si-over-1 rounded-xl p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Resumo do grupo</p>
              <div className="flex justify-between text-sm"><span className="text-si-4">Participantes</span><span className="font-bold text-si-1">{totalParticipants}</span></div>
              <div className="flex justify-between text-sm"><span className="text-si-4">Contribuição</span><span className="font-bold text-si-1">{fmtBRL(amount)} por pessoa</span></div>
              <div className="flex justify-between text-sm"><span className="text-si-4">Cota por rodada</span><span className="font-bold text-emerald-400">{fmtBRL(poolPerRound)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-si-4">Total de rodadas</span><span className="font-bold text-si-1">{totalParticipants}</span></div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Revisão */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-si-card border border-si-border rounded-2xl p-6 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Resumo do grupo</p>
            {[
              { label: 'Nome',          value: form.name },
              { label: 'Participantes', value: `${totalParticipants} pessoas` },
              { label: 'Contribuição',  value: `${fmtBRL(amount)} por pessoa` },
              { label: 'Cota',          value: fmtBRL(poolPerRound) },
              { label: 'Frequência',    value: FREQ_LABELS[form.frequency] },
              { label: 'Sorteio',       value: DRAW_LABELS[form.drawMethod] },
              { label: '1ª rodada',     value: fmtDate(form.startDate) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <span className="text-si-5">{label}</span>
                <span className="font-medium text-si-2 text-right">{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">Participantes convidados</p>
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-si-3">
                <User className="w-3.5 h-3.5 text-si-5" />
                <span>{m.name}</span>
                <span className="text-si-5">·</span>
                <span className="text-si-5">{m.contactType === 'whatsapp' ? '📱' : '✉️'} {m.contact}</span>
              </div>
            ))}
          </div>

          <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-sm text-amber-300">
            <Send className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Ao confirmar, enviaremos os convites para todos os participantes. O grupo fica ativo quando todos aceitarem.</p>
          </div>
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
        {saveError && <p className="text-rose-400 text-xs">{saveError}</p>}
        <button
          onClick={async () => {
            if (step < 2) { setStep(step + 1); return; }
            setSaving(true);
            setSaveError(null);
            try {
              const { groupId, inviteToken } = await apiCreateGroup({
                name: form.name,
                contributionAmount: amount,
                frequency: form.frequency,
                drawMethod: form.drawMethod,
                startDate: form.startDate,
                members: members.map((m) => ({ name: m.name, contact: m.contact, contactType: m.contactType })),
              });
              onSave({ ...buildGroup(), id: groupId, inviteToken });
            } catch (e: any) {
              setSaveError(e?.message ?? 'Erro ao criar grupo. Tente novamente.');
              setSaving(false);
            }
          }}
          disabled={!canNext || saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-si-1 text-si-bg text-sm font-bold hover:opacity-90 disabled:opacity-40"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
            : step < 2
              ? <>Continuar <ChevronRight className="w-4 h-4" /></>
              : <><Send className="w-4 h-4" /> Criar grupo e enviar convites</>
          }
        </button>
      </div>
    </div>
  );
}

// ── Detalhe do grupo ──────────────────────────────────────────────────────────
interface GroupDetailProps {
  group: ConsorcioGroup;
  onBack: () => void;
  onDrawWinner: (groupId: string, roundNum: number) => void;
}

function GroupDetail({ group, onBack, onDrawWinner }: GroupDetailProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'rodadas' | 'membros'>('rodadas');

  const inviteLink = getGroupInviteUrl(group.inviteToken);
  const activeRound = group.rounds.find((r) => r.status === 'active');
  const poolPerRound = group.contributionAmount * group.members.length;

  function copyLink() {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const pendingMembers = group.members.filter((m) => m.status === 'invited');

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-si-over-2 transition-colors">
          <ChevronLeft className="w-5 h-5 text-si-4" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-si-1">{group.name}</h2>
          <p className="text-xs text-si-5">{group.members.length} participantes · {FREQ_LABELS[group.frequency]}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cota',      value: fmtBRL(poolPerRound) },
          { label: 'Por pessoa', value: fmtBRL(group.contributionAmount) },
          { label: 'Sorteio',   value: DRAW_LABELS[group.drawMethod].split(' ')[0] },
        ].map(({ label, value }) => (
          <div key={label} className="bg-si-card border border-si-border rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-si-5 font-bold">{label}</p>
            <p className="font-bold text-si-1 text-sm mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Pendentes */}
      {pendingMembers.length > 0 && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
            {pendingMembers.length} convite{pendingMembers.length > 1 ? 's' : ''} pendente{pendingMembers.length > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2 bg-si-bg border border-si-border rounded-lg px-3 py-2">
            <p className="flex-1 text-xs text-si-4 truncate">{inviteLink}</p>
            <button onClick={copyLink} className="shrink-0 text-si-4 hover:text-si-2">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Rodada ativa */}
      {activeRound && (
        <div className="bg-si-card border border-emerald-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Rodada {activeRound.number} — Ativa</p>
            <p className="text-xs text-si-5">Vence {fmtDate(activeRound.dueDate)}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-si-1">{fmtBRL(poolPerRound)}</p>
              <p className="text-xs text-si-5">a ser sorteado</p>
            </div>
            {!activeRound.winnerId && group.drawMethod === 'random' && (
              <button
                onClick={() => onDrawWinner(group.id, activeRound.number)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-bold hover:bg-emerald-500/25 transition-colors"
              >
                <Shuffle className="w-4 h-4" /> Sortear
              </button>
            )}
            {activeRound.winnerId && (
              <div className="text-right">
                <p className="text-xs text-si-5">Ganhador</p>
                <p className="font-bold text-emerald-400">{group.members.find((m) => m.id === activeRound.winnerId)?.name}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-si-card border border-si-border rounded-xl p-1">
        {(['rodadas', 'membros'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors capitalize ${
              activeTab === t ? 'bg-si-over-3 text-si-1' : 'text-si-5 hover:text-si-3'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Rodadas */}
      {activeTab === 'rodadas' && (
        <div className="bg-si-card border border-si-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {group.rounds.map((r) => {
              const winner = group.members.find((m) => m.id === r.winnerId);
              const icon = r.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                : r.status === 'active' ? <Clock className="w-4 h-4 text-amber-400" />
                : <Clock className="w-4 h-4 text-si-5" />;
              return (
                <div key={r.number} className="flex items-center gap-4 px-5 py-4">
                  {icon}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-si-2">Rodada {r.number}</p>
                    <p className="text-xs text-si-5">{fmtDate(r.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-si-1 text-sm">{fmtBRL(poolPerRound)}</p>
                    {winner && <p className="text-xs text-emerald-400">{winner.name}</p>}
                    {!winner && r.status === 'upcoming' && <p className="text-xs text-si-5">A sortear</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Membros */}
      {activeTab === 'membros' && (
        <div className="bg-si-card border border-si-border rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {group.members.map((m) => {
              const paidRounds = m.payments.filter((p) => p.paid).length;
              const statusIcon = m.status === 'accepted'
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                : m.status === 'invited' ? <Clock className="w-3.5 h-3.5 text-amber-400" />
                : <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-si-over-2 flex items-center justify-center shrink-0 font-bold text-si-3 text-sm">
                    {m.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-si-2">{m.name}</p>
                      {statusIcon}
                    </div>
                    <p className="text-xs text-si-5">{paidRounds}/{group.rounds.length} rodadas pagas</p>
                  </div>
                  {m.receivedRound !== undefined && (
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Recebeu R{m.receivedRound}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
