import { useState } from 'react';
import { storage } from '../firebase';
import {
  updateProfile,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { useFinancialData } from '../hooks/useFinancialData';
import { updateUserDoc } from '../services/persistUserData';
import { User, Camera, Lock, Shield, Users } from 'lucide-react';

const PRIVACY_OPTIONS: { k: string; title: string; description: string }[] = [
  { k: 'analise', title: 'Análise de dados para melhorar a IA', description: 'Seus dados anonimizados ajudam a tornar a IA mais precisa' },
  { k: 'personalizacao', title: 'Personalização de recomendações', description: 'Permite que a IA use seu histórico para sugestões mais relevantes' },
  { k: 'marketing', title: 'Comunicações de marketing', description: 'Receba dicas, novidades e ofertas por e-mail' },
  { k: 'parceiros', title: 'Compartilhamento com parceiros', description: 'Dados para propostas personalizadas de crédito e seguros' },
  { k: 'relatorios', title: 'Relatórios agregados de mercado', description: 'Contribua anonimamente para estatísticas financeiras' },
];

const DEFAULT_PRIVACY: Record<string, boolean> = {
  analise: true,
  personalizacao: true,
  marketing: false,
  parceiros: false,
  relatorios: true,
};

export default function Profile() {
  const { user } = useAuth();
  const { data } = useFinancialData(user?.uid);
  const [name, setName] = useState(user?.displayName ?? data?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const avatarURL = data?.avatarURL ?? user?.photoURL ?? null;
  const isEmailProvider = user?.providerData?.some((p) => p.providerId === 'password');

  const [privacyLocal, setPrivacyLocal] = useState<Record<string, boolean> | null>(null);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const privacyState = privacyLocal ?? { ...DEFAULT_PRIVACY, ...(data?.privacy ?? {}) };

  const handleTogglePrivacy = async (key: string) => {
    if (!user?.uid) return;
    const next = !privacyState[key];
    const nextState = { ...privacyState, [key]: next };
    setPrivacyLocal(nextState);
    setPrivacyBusy(true);
    try {
      await updateUserDoc(user.uid, { privacy: nextState });
    } finally {
      setPrivacyBusy(false);
      setPrivacyLocal(null);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setMessage(null);
    setBusy(true);
    try {
      await updateProfile(user, { displayName: name.trim() });
      await updateUserDoc(user.uid, { name: name.trim() });
      setMessage({ type: 'ok', text: 'Nome salvo.' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar nome.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!user || !file || !file.type.startsWith('image/')) return;
    setMessage(null);
    setBusy(true);
    try {
      const path = `avatars/${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateUserDoc(user.uid, { avatarURL: url });
      setMessage({ type: 'ok', text: 'Foto atualizada.' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao enviar foto.' });
    } finally {
      setBusy(false);
    }
    e.target.value = '';
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !currentPassword.trim() || !newPassword.trim()) return;
    if (newPassword !== newPasswordConfirm) {
      setPasswordMessage({ type: 'err', text: 'A nova senha e a confirmação não conferem.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'err', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    setPasswordMessage(null);
    setPasswordBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      setPasswordMessage({ type: 'ok', text: 'Senha alterada com sucesso.' });
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg =
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Senha atual incorreta.'
          : (err as Error)?.message ?? 'Erro ao alterar senha.';
      setPasswordMessage({ type: 'err', text: msg });
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Perfil</h2>
        <p className="text-zinc-500 text-sm">Nome e foto – sincronizados com o app</p>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${message.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-[#0a0f18] rounded-2xl border border-white/5 p-8 max-w-lg space-y-8">
        <div className="flex flex-col items-center gap-6">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full border-2 border-blue-500/30 bg-[#111f30] flex items-center justify-center overflow-hidden">
              {avatarURL ? (
                <img src={avatarURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-zinc-400">
                  {(name || user?.email || 'U').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={busy}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Alterar foto do perfil"
            />
          </label>
          <p className="text-xs text-zinc-500">Clique na foto para alterar</p>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-zinc-500 mb-1">
              Nome
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" /> {busy ? 'Salvando…' : 'Salvar nome'}
          </button>
        </form>

        <p className="text-zinc-500 text-sm">E-mail: {user?.email ?? '—'}</p>
      </div>

      <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-8 max-w-lg">
        <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-blue-400" />
          Segurança
        </h3>
        {isEmailProvider ? (
          <>
            <p className="text-zinc-500 text-sm mb-6">Altere sua senha de acesso (conta e-mail/senha).</p>
            {passwordMessage && (
              <div
                className={`rounded-xl px-4 py-3 text-sm mb-4 ${
                  passwordMessage.type === 'ok'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block text-xs font-medium text-zinc-500 mb-1">
                  Senha atual
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-xs font-medium text-zinc-500 mb-1">
                  Nova senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label htmlFor="new-password-confirm" className="block text-xs font-medium text-zinc-500 mb-1">
                  Confirmar nova senha
                </label>
                <input
                  id="new-password-confirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#05080d] border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={passwordBusy}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" /> {passwordBusy ? 'Alterando…' : 'Alterar senha'}
              </button>
            </form>
          </>
        ) : (
          <p className="text-zinc-500 text-sm">
            Você entrou com provedor social (ex.: Google). Para alterar a senha da sua conta, use as opções de segurança do provedor.
          </p>
        )}
      </section>

      <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-8 max-w-lg">
        <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Privacidade e Dados
        </h3>
        <p className="text-zinc-500 text-sm mb-6">Escolha como seus dados podem ser usados pelo app.</p>
        <div className="space-y-0 divide-y divide-white/5">
          {PRIVACY_OPTIONS.map((opt) => {
            const isOn = privacyState[opt.k];
            return (
            <div
              key={opt.k}
              className="flex justify-between items-center gap-4 py-4 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-zinc-200 text-sm">{opt.title}</div>
                <div className="text-zinc-500 text-xs mt-0.5 leading-relaxed">{opt.description}</div>
              </div>
              <button
                type="button"
                aria-label={isOn ? `Desativar ${opt.title}` : `Ativar ${opt.title}`}
                disabled={privacyBusy}
                onClick={() => handleTogglePrivacy(opt.k)}
                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0a0f18] disabled:opacity-50 ${
                  isOn ? 'bg-blue-600 border-blue-500' : 'bg-zinc-700 border-white/10'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${
                    isOn ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#0a0f18] rounded-2xl border border-white/5 p-8 max-w-2xl">
        <h3 className="font-semibold text-zinc-100 flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-blue-400" />
          Modo Família (em breve no React)
        </h3>
        <p className="text-zinc-500 text-sm mb-4">
          No app atual, o Modo Família permite convidar parceiro(a) e organizar as finanças em conjunto. No React, vamos trazer este fluxo de forma gradual,
          começando por convites simples e visualização compartilhada do dashboard.
        </p>
        <ul className="list-disc list-inside text-zinc-400 text-sm space-y-1 mb-4">
          <li>Convide alguém pelo e-mail para acompanhar os principais indicadores.</li>
          <li>Escolha se a outra pessoa pode apenas visualizar ou também lançar movimentações.</li>
          <li>Controle centralizado continua no seu usuário principal.</li>
        </ul>
        <p className="text-xs text-zinc-600">
          Enquanto o Modo Família completo não chega ao React, você pode continuar usando esta função no app legado em{' '}
          <span className="underline">/app</span> sem perder dados.
        </p>
      </section>
    </div>
  );
}
