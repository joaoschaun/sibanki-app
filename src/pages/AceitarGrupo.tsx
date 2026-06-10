/**
 * Página pública de aceite de consórcio (ConsorcioAmigo).
 * Acessada via link: /aceitar/grupo/:token
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import {
  Users, CheckCircle, AlertCircle, Loader2,
  Calendar, DollarSign, Shuffle, Hash, Trophy, ArrowRight,
} from 'lucide-react';

interface GroupPreview {
  name: string;
  adminName: string;
  contributionAmount: number;
  frequency: 'monthly' | 'biweekly';
  drawMethod: 'random' | 'order' | 'bid';
  startDate: string;
  totalParticipants: number;
  status: string;
  invitedMember: { name: string } | null;
}

const FREQ_LABELS: Record<string, string>  = { monthly: 'Mensal', biweekly: 'Quinzenal' };
const DRAW_LABELS: Record<string, string>  = { random: 'Sorteio aleatório', order: 'Ordem de entrada', bid: 'Maior lance' };
const DRAW_ICONS:  Record<string, JSX.Element> = {
  random: <Shuffle className="w-4 h-4" />,
  order:  <Hash    className="w-4 h-4" />,
  bid:    <Trophy  className="w-4 h-4" />,
};

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export default function AceitarGrupo() {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  const [group, setGroup]         = useState<GroupPreview | null>(null);
  const [loading, setLoading]     = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    const fn = httpsCallable<{ token: string }, GroupPreview>(functions, 'consorcioGetByToken');
    fn({ token })
      .then((r) => setGroup(r.data))
      .catch(() => setError('Convite não encontrado ou já processado.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    try {
      const fn = httpsCallable(functions, 'consorcioAccept');
      await fn({ token });
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao aceitar. Tente novamente.');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-si-4" />
    </div>
  );

  if (error && !group) return (
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

  if (done) return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-si-1">Você entrou no grupo!</h1>
          <p className="text-si-5 text-sm mt-1">
            Bem-vindo ao <strong className="text-si-2">{group?.name}</strong>.
            Você receberá lembretes de cada rodada.
          </p>
        </div>
        <div className="bg-si-card border border-si-border rounded-2xl p-4 text-left space-y-2">
          <p className="text-xs font-bold text-si-5 uppercase tracking-widest">Detalhes</p>
          <div className="flex justify-between text-sm"><span className="text-si-5">Contribuição</span><span className="font-bold text-si-1">{fmtBRL(group?.contributionAmount ?? 0)}/rodada</span></div>
          <div className="flex justify-between text-sm"><span className="text-si-5">Participantes</span><span className="font-bold text-si-1">{group?.totalParticipants}</span></div>
          <div className="flex justify-between text-sm"><span className="text-si-5">Início</span><span className="font-bold text-si-1">{group?.startDate ? fmtDate(group.startDate) : ''}</span></div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-si-1 text-si-bg font-bold text-sm hover:opacity-90"
        >
          Abrir Sibanki <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (!group) return null;
  const alreadyActive = group.status === 'active' || group.status === 'completed';
  const poolPerRound  = group.contributionAmount * group.totalParticipants;

  return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-5">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-si-card border border-si-border flex items-center justify-center mx-auto">
            <Users className="w-7 h-7 text-si-3" />
          </div>
          <h1 className="text-xl font-bold text-si-1">{group.name}</h1>
          <p className="text-sm text-si-5">
            <strong className="text-si-2">{group.adminName}</strong> te convidou para a caixinha
          </p>
          {group.invitedMember && (
            <p className="text-xs text-si-4">Convite para: <strong>{group.invitedMember.name}</strong></p>
          )}
        </div>

        {/* Detalhes */}
        <div className="bg-si-card border border-si-border rounded-2xl p-5 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-si-5">Como vai funcionar</p>
          {[
            { icon: <Users      className="w-3.5 h-3.5" />, label: 'Participantes', value: `${group.totalParticipants} pessoas` },
            { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Sua contribuição', value: `${fmtBRL(group.contributionAmount)} por rodada` },
            { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'Cota do ganhador', value: fmtBRL(poolPerRound) },
            { icon: <Calendar   className="w-3.5 h-3.5" />, label: 'Frequência', value: FREQ_LABELS[group.frequency] },
            { icon: <Calendar   className="w-3.5 h-3.5" />, label: '1ª rodada', value: fmtDate(group.startDate) },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className="text-si-5 w-4 shrink-0">{icon}</span>
              <span className="text-si-5 w-28 shrink-0">{label}</span>
              <span className="font-medium text-si-2">{value}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 text-sm pt-1 border-t border-si-border">
            <span className="text-si-5 w-4 shrink-0">{DRAW_ICONS[group.drawMethod]}</span>
            <span className="text-si-5 w-28 shrink-0">Sorteio</span>
            <span className="font-medium text-si-2">{DRAW_LABELS[group.drawMethod]}</span>
          </div>
        </div>

        {/* Como funciona */}
        <div className="bg-si-over-1 rounded-xl p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-si-5">O que acontece após aceitar</p>
          {[
            'Você entra no grupo e recebe lembretes de cada rodada',
            'Contribua no dia da rodada — o admin confirma o pagamento',
            `A cada rodada, ${DRAW_LABELS[group.drawMethod].toLowerCase()} determina quem recebe ${fmtBRL(poolPerRound)}`,
            'Quando todos receberem, o grupo é encerrado',
          ].map((text, i) => (
            <div key={i} className="flex gap-2 text-sm text-si-4">
              <span className="w-5 h-5 rounded-full bg-si-over-2 text-si-5 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Ação */}
        {alreadyActive ? (
          <div className="flex items-center gap-2 justify-center text-emerald-400 text-sm font-semibold">
            <CheckCircle className="w-4 h-4" /> Você já faz parte deste grupo
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-si-1 text-si-bg font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {accepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {accepting ? 'Entrando...' : 'Entrar no grupo'}
            </button>
            <p className="text-xs text-si-5 text-center">
              Ao entrar, você concorda em contribuir {fmtBRL(group.contributionAmount)} por rodada.
            </p>
            {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
          </div>
        )}

        <div className="border-t border-si-border pt-4 text-center">
          <p className="text-xs text-si-5">Não tem conta no Sibanki?</p>
          <button onClick={() => navigate('/register')} className="text-xs text-si-3 hover:text-si-1 underline mt-1">
            Crie sua conta gratuita e acompanhe no app
          </button>
        </div>
      </div>
    </div>
  );
}
