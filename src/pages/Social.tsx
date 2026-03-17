import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import { useCommunityFeed } from '../hooks/useCommunityFeed';
import { updateCommProfile, setCommBookmarks } from '../services/persistUserData';
import { addCommunityPost, toggleCommunityLike } from '../services/community';
import type { CommProfile } from '../types/userData';
import { Modal } from '../components/ui/Modal';
import { Users, Send, Heart, Bookmark, Trophy } from 'lucide-react';
import type { CommPost } from '../types/userData';

const COMM_CATEGORIES = [
  { value: 'discussao', label: 'Discussão' },
  { value: 'dica', label: 'Dica' },
  { value: 'conquista', label: 'Conquista' },
  { value: 'duvida', label: 'Dúvida' },
  { value: 'analise', label: 'Análise' },
];

const AVATAR_COLORS = ['#4F8CFF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export type RankSort = 'pts' | 'posts' | 'likes';
export interface RankUser {
  nickname: string;
  color: string;
  posts: number;
  likes: number;
  comments: number;
  pts: number;
}

function buildRankingFromPosts(posts: CommPost[]): RankUser[] {
  const byNick: Record<string, RankUser> = {};
  for (const p of posts) {
    const n = p.nickname || 'Anônimo';
    if (!byNick[n]) byNick[n] = { nickname: n, color: p.color || '#4F8CFF', posts: 0, likes: 0, comments: 0, pts: 0 };
    byNick[n].posts += 1;
    byNick[n].likes += (p.likes ?? []).length;
    byNick[n].comments += (p.comments ?? []).length;
  }
  return Object.values(byNick).map((s) => ({
    ...s,
    pts: s.posts * 3 + s.likes * 2 + s.comments,
  })).sort((a, b) => b.pts - a.pts);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('pt-BR');
}

export default function Social() {
  const { user } = useAuth();
  const { data, commProfile, commBookmarks, loading: userLoading } = useFinancialData(user?.uid);
  const { posts, loading: feedLoading } = useCommunityFeed();
  const [setupOpen, setSetupOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [postText, setPostText] = useState('');
  const [postCat, setPostCat] = useState('discussao');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'ranking'>('feed');
  const [rankSort, setRankSort] = useState<RankSort>('pts');

  const hasProfile = commProfile && commProfile.nickname;
  const rankingRaw = useMemo(() => buildRankingFromPosts(posts), [posts]);
  const ranking = useMemo(() => {
    const list = [...rankingRaw];
    if (rankSort === 'posts') list.sort((a, b) => b.posts - a.posts);
    else if (rankSort === 'likes') list.sort((a, b) => b.likes - a.likes);
    else list.sort((a, b) => b.pts - a.pts);
    return list;
  }, [rankingRaw, rankSort]);
  const myPos = useMemo(() => ranking.findIndex((r) => r.nickname === commProfile?.nickname), [ranking, commProfile?.nickname]);
  const sortLabel = rankSort === 'posts' ? 'posts' : rankSort === 'likes' ? 'curtidas' : 'pts';
  const avatarURL = data?.avatarURL ?? null;

  const openSetup = () => {
    setNickname(commProfile?.nickname ?? '');
    setColor(commProfile?.color ?? AVATAR_COLORS[0]);
    setError(null);
    setSetupOpen(true);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nick = nickname.trim();
    if (!user?.uid || nick.length < 3) {
      setError('Apelido precisa ter pelo menos 3 caracteres.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const profile: CommProfile = {
        nickname: nick,
        color,
        joinedAt: commProfile?.joinedAt ?? new Date().toISOString(),
        photoURL: avatarURL ?? null,
      };
      await updateCommProfile(user.uid, profile);
      setSetupOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !commProfile) return;
    const text = postText.trim();
    if (text.length < 10) {
      setError('Mínimo 10 caracteres para publicar.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await addCommunityPost(user.uid, commProfile, text, postCat, commProfile.photoURL ?? avatarURL);
      setPostText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar.');
    } finally {
      setBusy(false);
    }
  };

  const toggleBookmark = async (postId: string) => {
    if (!user?.uid) return;
    const idx = commBookmarks.indexOf(postId);
    const next = idx >= 0 ? commBookmarks.filter((_, i) => i !== idx) : [...commBookmarks, postId];
    setBusy(true);
    try {
      await setCommBookmarks(user.uid, next);
    } finally {
      setBusy(false);
    }
  };

  const handleLike = async (postId: string, currentLikes: string[]) => {
    if (!commProfile?.nickname) return;
    try {
      await toggleCommunityLike(postId, commProfile.nickname, currentLikes);
    } catch {
      setError('Erro ao curtir.');
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Social</h2>
          <p className="text-zinc-500 text-sm">Comunidade – dicas, conquistas e discussões</p>
        </div>
        {hasProfile && (
          <button
            type="button"
            onClick={openSetup}
            className="bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-medium"
          >
            Editar perfil
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {!hasProfile ? (
        <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-8 max-w-md">
          <p className="text-zinc-400 mb-6">
            Configure um apelido para participar da comunidade e publicar no feed.
          </p>
          <button
            type="button"
            onClick={() => { setSetupOpen(true); setError(null); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm"
          >
            Configurar perfil da comunidade
          </button>
        </div>
      ) : (
        <>
          <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6 flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0 overflow-hidden"
              style={{ backgroundColor: commProfile?.color ?? '#4F8CFF' }}
            >
              {avatarURL ? (
                <img src={avatarURL} alt="" className="w-full h-full object-cover" />
              ) : (
                (commProfile?.nickname ?? '?').slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-bold text-zinc-100">{commProfile?.nickname}</p>
              {commProfile?.joinedAt && (
                <p className="text-xs text-zinc-500">
                  Entrou em {new Date(commProfile.joinedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
            <h3 className="text-sm font-bold text-zinc-400 mb-4">Publicar</h3>
            <form onSubmit={handlePublish} className="space-y-4">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Compartilhe uma dica, conquista ou dúvida (mín. 10 caracteres)..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex flex-wrap items-center gap-3">
                <select
                  aria-label="Categoria da publicação"
                  value={postCat}
                  onChange={(e) => setPostCat(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#05080d] border border-white/10 text-zinc-100 text-sm"
                >
                  {COMM_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busy || postText.trim().length < 10}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Publicar
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${activeTab === 'feed' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
        >
          <Users className="w-4 h-4 inline-block mr-2 align-middle" /> Feed
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ranking')}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${activeTab === 'ranking' ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
        >
          <Trophy className="w-4 h-4 inline-block mr-2 align-middle" /> Ranking
        </button>
      </div>

      {activeTab === 'ranking' && (
        <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" /> Ranking
            <span className="text-xs font-normal text-zinc-500 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">MENSAL</span>
          </h3>
          <p className="text-zinc-500 text-sm mb-4">
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-zinc-500">Ordenar:</span>
            {(['pts', 'posts', 'likes'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setRankSort(k)}
                className={`px-3 py-1.5 rounded-lg text-sm ${rankSort === k ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
              >
                {k === 'pts' ? 'Pontos' : k === 'posts' ? 'Posts' : 'Curtidas'}
              </button>
            ))}
          </div>
          {ranking.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma atividade ainda. Publique na comunidade!</p>
            </div>
          ) : (
            <>
              {ranking.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto items-end">
                  {[1, 0, 2].map((oi) => {
                    const r = ranking[oi];
                    const pos = [2, 1, 3];
                    return (
                      <div key={oi} className="flex flex-col items-center">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white border-2 border-white/20 mb-2"
                          style={{ backgroundColor: r.color }}
                        >
                          {(r.nickname ?? '?').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-zinc-200 font-medium text-sm text-center">{r.nickname}</span>
                        <span className="text-blue-400 font-bold text-sm">{r[rankSort]} {sortLabel}</span>
                        <span className="text-zinc-500 text-xs mt-1">{pos[oi]}º</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <ul className="space-y-2">
                {ranking.map((r, i) => (
                  <li
                    key={r.nickname}
                    className={`flex items-center gap-4 p-3 rounded-xl ${r.nickname === commProfile?.nickname ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-white/5'}`}
                  >
                    <span className="w-8 text-zinc-500 font-bold">{i + 1}º</span>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ backgroundColor: r.color }}
                    >
                      {(r.nickname ?? '?').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-zinc-200 flex-1">{r.nickname}</span>
                    <span className="text-blue-400 font-bold">{r[rankSort]} {sortLabel}</span>
                  </li>
                ))}
              </ul>
              {myPos >= 0 && myPos >= 3 && (
                <p className="text-zinc-500 text-sm mt-4 text-center">
                  Sua posição: <strong className="text-zinc-300">{myPos + 1}º</strong>
                </p>
              )}
              <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-blue-400 mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Prêmios do ranking
                </h4>
                <p className="text-zinc-500 text-xs mb-3">
                  1º: 15% OFF + Badge Ouro · 2º: 10% OFF + Badge Prata · 3º: 5% OFF + Badge Bronze. Descontos acumulam. Teto 50% OFF.
                </p>
                <p className="text-zinc-500 text-xs">Dados anônimos. Ranking no 1º dia de cada mês.</p>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'feed' && (
      <div>
        <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" /> Feed
        </h3>
        {feedLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-12 text-center text-zinc-500">
            Nenhuma publicação ainda. Seja o primeiro a compartilhar!
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <div
                key={p.id}
                className="bg-[#0a0f18] rounded-2xl border border-white/5 p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.photoURL ? (
                      <img src={p.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (p.nickname ?? '?').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-zinc-100">{p.nickname}</span>
                      <span className="text-xs text-zinc-500">{formatTime(p.createdAt)}</span>
                      {p.cat && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">
                          {COMM_CATEGORIES.find((c) => c.value === p.cat)?.label ?? p.cat}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 text-sm mt-2 whitespace-pre-wrap">{p.text}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        type="button"
                        onClick={() => handleLike(p.id, p.likes ?? [])}
                        className={`flex items-center gap-1 text-sm ${(p.likes ?? []).includes(commProfile?.nickname ?? '') ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Curtir"
                      >
                        <Heart className={`w-4 h-4 ${(p.likes ?? []).includes(commProfile?.nickname ?? '') ? 'fill-current' : ''}`} />
                        {(p.likes ?? []).length}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(p.id)}
                        className={`flex items-center gap-1 text-sm ${commBookmarks.includes(p.id) ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title={commBookmarks.includes(p.id) ? 'Remover dos salvos' : 'Salvar'}
                      >
                        <Bookmark className="w-4 h-4" />
                        {commBookmarks.includes(p.id) ? 'Salvo' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title={hasProfile ? 'Editar perfil' : 'Perfil da comunidade'}>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label htmlFor="comm-nick" className="block text-xs font-medium text-zinc-500 mb-1">Apelido</label>
            <input
              id="comm-nick"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Mín. 3 caracteres"
              minLength={3}
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">Cor do avatar</label>
            <div className="flex gap-2 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-10 h-10 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#fff' : 'transparent',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={busy} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm">
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" onClick={() => setSetupOpen(false)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-medium text-sm hover:bg-white/10">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
