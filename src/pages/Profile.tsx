import { useState } from 'react';
import { storage } from '../firebase';
import {
  updateProfile,
  reauthenticateWithCredential,
  updatePassword,
  updateEmail,
  EmailAuthProvider,
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppContext } from '../context/AppContext';
import { useSibcoinToast } from '../hooks/useSibcoinToast';
import { updateUserDoc } from '../services/persistUserData';
import { User, Camera, Lock, Shield, Users } from 'lucide-react';
import { SibcoinMissionBanner } from '../components/sibcoin/SibcoinMissionBanner';

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
  const { user, data, entries, goals, accounts, score } = useAppContext();
  const { triggerWithToast } = useSibcoinToast();
  const [name, setName] = useState(user?.displayName ?? data?.name ?? '');
  const [phone, setPhone] = useState(((data as any)?.phone as string) ?? '');
  const [financialObjective, setFinancialObjective] = useState(((data as any)?.financialObjective as string) ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [newEmail, setNewEmail] = useState(user?.email ?? '');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const avatarURL = data?.avatarURL ?? user?.photoURL ?? null;
  const isEmailProvider = user?.providerData?.some((p) => p.providerId === 'password');

  const [privacyLocal, setPrivacyLocal] = useState<Record<string, boolean> | null>(null);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const privacyState = privacyLocal ?? { ...DEFAULT_PRIVACY, ...(data?.privacy ?? {}) };
  const [familyInviteEmail, setFamilyInviteEmail] = useState(((data as any)?.family?.inviteEmail as string) ?? '');
  const [familyRole, setFamilyRole] = useState<'viewer' | 'editor'>((((data as any)?.family?.role as 'viewer' | 'editor') ?? 'viewer'));
  const [familyBusy, setFamilyBusy] = useState(false);

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
      await updateUserDoc(user.uid, {
        name: name.trim(),
        phone: phone.trim() || null,
        financialObjective: financialObjective.trim() || null,
      } as any);
      // Trigger profile_completed when all three fields are filled
      if (name.trim() && phone.trim() && financialObjective.trim()) {
        triggerWithToast('profile_completed'); // fire-and-forget SibCoin
      }
      setMessage({ type: 'ok', text: 'Perfil salvo.' });
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

  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setMessage(null);
    setFamilyBusy(true);
    try {
      await updateUserDoc(user.uid, {
        family: {
          inviteEmail: familyInviteEmail.trim() || null,
          role: familyRole,
          updatedAt: new Date().toISOString(),
        },
      } as any);
      setMessage({ type: 'ok', text: 'Configuração de Modo Família salva.' });
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar Modo Família.' });
    } finally {
      setFamilyBusy(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !newEmail.trim() || !emailPassword.trim()) return;
    if (newEmail.trim().toLowerCase() === user.email.toLowerCase()) {
      setEmailMessage({ type: 'err', text: 'Informe um e-mail diferente do atual.' });
      return;
    }
    setEmailMessage(null);
    setEmailBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, cred);
      await updateEmail(user, newEmail.trim());
      await updateUserDoc(user.uid, { email: newEmail.trim() } as any);
      setEmailMessage({ type: 'ok', text: 'E-mail alterado com sucesso.' });
      setEmailPassword('');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const msg =
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Senha atual incorreta.'
          : (err as Error)?.message ?? 'Erro ao alterar e-mail.';
      setEmailMessage({ type: 'err', text: msg });
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Perfil</h2>
        <p className="text-si-5 text-sm">Nome e foto – sincronizados com o app</p>
      </div>

      <SibcoinMissionBanner eventType="profile_completed" />

      <section className="bg-si-card rounded-2xl border border-si-border p-6 max-w-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-si-5">Score</p>
            <p className="text-xl font-bold text-emerald-400">{score}</p>
          </div>
          <div>
            <p className="text-xs text-si-5">Lançamentos</p>
            <p className="text-xl font-bold text-si-1">{entries.length}</p>
          </div>
          <div>
            <p className="text-xs text-si-5">Metas</p>
            <p className="text-xl font-bold text-si-1">{goals.length}</p>
          </div>
          <div>
            <p className="text-xs text-si-5">Contas</p>
            <p className="text-xl font-bold text-si-1">{accounts.length}</p>
          </div>
        </div>
      </section>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${message.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-si-card rounded-2xl border border-si-border p-8 max-w-lg space-y-8">
        <div className="flex flex-col items-center gap-6">
          <label className="relative cursor-pointer group">
            <div className="w-24 h-24 rounded-full border-2 border-blue-500/30 bg-[#111f30] flex items-center justify-center overflow-hidden">
              {avatarURL ? (
                <img src={avatarURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-si-4">
                  {(name || user?.email || 'U').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-si-1" />
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
          <p className="text-xs text-si-5">Clique na foto para alterar</p>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-si-5 mb-1">
              Nome
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="block text-xs font-medium text-si-5 mb-1">
              Telefone
            </label>
            <input
              id="profile-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="profile-objective" className="block text-xs font-medium text-si-5 mb-1">
              Objetivo financeiro
            </label>
            <input
              id="profile-objective"
              type="text"
              value={financialObjective}
              onChange={(e) => setFinancialObjective(e.target.value)}
              placeholder="Ex: Reserva de emergência"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4" /> {busy ? 'Salvando…' : 'Salvar nome'}
          </button>
        </form>

        <p className="text-si-5 text-sm">E-mail: {user?.email ?? '—'}</p>
      </div>

      <section className="bg-si-card rounded-2xl border border-si-border p-8 max-w-lg">
        <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-blue-400" />
          Segurança
        </h3>
        {isEmailProvider ? (
          <>
            <p className="text-si-5 text-sm mb-6">Altere sua senha de acesso (conta e-mail/senha).</p>
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
                <label htmlFor="current-password" className="block text-xs font-medium text-si-5 mb-1">
                  Senha atual
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block text-xs font-medium text-si-5 mb-1">
                  Nova senha
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label htmlFor="new-password-confirm" className="block text-xs font-medium text-si-5 mb-1">
                  Confirmar nova senha
                </label>
                <input
                  id="new-password-confirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={passwordBusy}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" /> {passwordBusy ? 'Alterando…' : 'Alterar senha'}
              </button>
            </form>
          </>
        ) : (
          <p className="text-si-5 text-sm">
            Você entrou com provedor social (ex.: Google). Para alterar a senha da sua conta, use as opções de segurança do provedor.
          </p>
        )}
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-8 max-w-lg">
        <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-blue-400" />
          Alterar e-mail
        </h3>
        {isEmailProvider ? (
          <>
            {emailMessage && (
              <div
                className={`rounded-xl px-4 py-3 text-sm mb-4 ${
                  emailMessage.type === 'ok'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {emailMessage.text}
              </div>
            )}
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label htmlFor="new-email" className="block text-xs font-medium text-si-5 mb-1">
                  Novo e-mail
                </label>
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novo@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="email-password" className="block text-xs font-medium text-si-5 mb-1">
                  Senha atual
                </label>
                <input
                  id="email-password"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={emailBusy}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 font-bold text-sm"
              >
                {emailBusy ? 'Alterando…' : 'Alterar e-mail'}
              </button>
            </form>
          </>
        ) : (
          <p className="text-si-5 text-sm">
            Sua conta usa provedor social (ex.: Google). Altere o e-mail diretamente no provedor.
          </p>
        )}
      </section>

      <section className="bg-si-card rounded-2xl border border-si-border p-8 max-w-lg">
        <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Privacidade e Dados
        </h3>
        <p className="text-si-5 text-sm mb-6">Escolha como seus dados podem ser usados pelo app.</p>
        <div className="space-y-0 divide-y divide-white/5">
          {PRIVACY_OPTIONS.map((opt) => {
            const isOn = privacyState[opt.k];
            return (
            <div
              key={opt.k}
              className="flex justify-between items-center gap-4 py-4 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-si-2 text-sm">{opt.title}</div>
                <div className="text-si-5 text-xs mt-0.5 leading-relaxed">{opt.description}</div>
              </div>
              <button
                type="button"
                aria-label={isOn ? `Desativar ${opt.title}` : `Ativar ${opt.title}`}
                disabled={privacyBusy}
                onClick={() => handleTogglePrivacy(opt.k)}
                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-si-card disabled:opacity-50 ${
                  isOn ? 'bg-blue-600 border-blue-500' : 'bg-zinc-700 border-si-border-md'
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

      <section className="bg-si-card rounded-2xl border border-si-border p-8 max-w-2xl">
        <h3 className="font-semibold text-si-1 flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-blue-400" />
          Modo Família
        </h3>
        <p className="text-si-5 text-sm mb-4">
          Convide parceiro(a) por e-mail e defina o nível de acesso inicial para acompanhamento compartilhado.
        </p>
        <form onSubmit={handleSaveFamily} className="space-y-4">
          <div>
            <label htmlFor="family-invite-email" className="block text-xs font-medium text-si-5 mb-1">
              E-mail do convite
            </label>
            <input
              id="family-invite-email"
              type="email"
              value={familyInviteEmail}
              onChange={(e) => setFamilyInviteEmail(e.target.value)}
              placeholder="parceiro@exemplo.com"
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="family-role" className="block text-xs font-medium text-si-5 mb-1">
              Permissão
            </label>
            <select
              id="family-role"
              value={familyRole}
              onChange={(e) => setFamilyRole(e.target.value as 'viewer' | 'editor')}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500"
            >
              <option value="viewer">Somente visualizar</option>
              <option value="editor">Visualizar e lançar movimentações</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={familyBusy}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-si-1 text-sm font-bold"
          >
            {familyBusy ? 'Salvando…' : 'Salvar configuração de família'}
          </button>
        </form>
      </section>
    </div>
  );
}
