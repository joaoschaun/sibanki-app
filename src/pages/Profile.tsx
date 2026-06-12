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
import { User, Camera, Lock, Shield, Users, Loader2 } from 'lucide-react';
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

// Canvas Helper to resize and compress images on the client side
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 400;
      const MAX_HEIGHT = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha ao obter contexto 2D do canvas.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao comprimir imagem.'));
          }
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => reject(new Error('Erro ao carregar a imagem para compressão.'));
  });
};

// Helper for BR Phone Mask format: (XX) 9XXXX-XXXX
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) {
    return digits;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export default function Profile() {
  const { user, data, entries, goals, accounts, score } = useAppContext();
  const { triggerWithToast } = useSibcoinToast();
  
  // Cockpit Navigation state
  const [activeTab, setActiveTab] = useState<'dados' | 'seguranca' | 'privacidade' | 'familia'>('dados');

  // Input states (Strictly typed via UserData properties)
  const [name, setName] = useState(user?.displayName ?? data?.name ?? '');
  const [phone, setPhone] = useState(data?.phone ?? '');
  const [financialObjective, setFinancialObjective] = useState(data?.financialObjective ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Security states
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

  // Privacy states
  const [privacyLocal, setPrivacyLocal] = useState<Record<string, boolean> | null>(null);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const privacyState = privacyLocal ?? { ...DEFAULT_PRIVACY, ...(data?.privacy ?? {}) };
  
  // Family states
  const [familyInviteEmail, setFamilyInviteEmail] = useState(data?.family?.inviteEmail ?? '');
  const [familyRole, setFamilyRole] = useState<'viewer' | 'editor'>(data?.family?.role ?? 'viewer');
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
      });
      
      // Trigger profile_completed when all three fields are filled
      if (name.trim() && phone.trim() && financialObjective.trim()) {
        triggerWithToast('profile_completed'); // fire-and-forget SibCoin
      }
      setMessage({ type: 'ok', text: 'Perfil salvo com sucesso.' });
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
      // Compress client-side via HTML5 canvas to maintain high efficiency and lower Firebase costs
      const compressedBlob = await compressImage(file);
      const path = `avatars/${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, compressedBlob);
      const url = await getDownloadURL(storageRef);
      await updateUserDoc(user.uid, { avatarURL: url });
      setMessage({ type: 'ok', text: 'Foto de perfil atualizada.' });
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
      });
      setMessage({ type: 'ok', text: 'Configuração de Modo Família salva com sucesso.' });
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
      await updateUserDoc(user.uid, { email: newEmail.trim() });
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
    <div className="space-y-6">
      
      {/* ── Header ── */}
      <div>
        <h2 className="text-3xl font-bold">Perfil</h2>
        <p className="text-si-5 text-sm">Gerencie seus dados pessoais, segurança, privacidade e conta compartilhada</p>
      </div>

      <SibcoinMissionBanner eventType="profile_completed" />

      {/* ── Sub-navegação do Cockpit ── */}
      <div className="flex items-center gap-2 border-b border-si-border pb-4 flex-wrap">
        {(
          [
            { id: 'dados', label: 'Meus Dados', icon: User },
            { id: 'seguranca', label: 'Segurança', icon: Lock },
            { id: 'privacidade', label: 'Privacidade', icon: Shield },
            { id: 'familia', label: 'Modo Família', icon: Users },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase border transition-all ${
                active
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-si-over-1 text-si-4 hover:bg-si-over-2 hover:text-si-2 border-si-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {message && activeTab === 'dados' && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${message.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
        >
          {message.text}
        </div>
      )}

      {/* ── ABA: MEUS DADOS (TAB ANIMADA) ── */}
      {activeTab === 'dados' && (
        <div key="dados" className="grid gap-6 md:grid-cols-3 items-start tab-animate">
          
          {/* Lado Esquerdo: Formulário principal */}
          <div className="bg-si-card rounded-2xl border border-si-border p-6 md:col-span-2 space-y-6">
            <div className="flex flex-col items-center gap-4 pb-4 border-b border-si-border">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full border-2 border-blue-500/30 bg-si-over-3 flex items-center justify-center overflow-hidden relative">
                  {avatarURL ? (
                    <img src={avatarURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-si-4">
                      {(name || user?.email || 'U').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  {busy && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
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
              <p className="text-xs text-si-5">Clique na foto para alterar (compressão automática ativa)</p>
            </div>

            <form onSubmit={handleSaveName} className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="profile-phone" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                  Telefone celular
                </label>
                <input
                  id="profile-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label htmlFor="profile-objective" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                  Objetivo financeiro principal
                </label>
                <input
                  id="profile-objective"
                  type="text"
                  value={financialObjective}
                  onChange={(e) => setFinancialObjective(e.target.value)}
                  placeholder="Ex: Reserva de emergência, Comprar imóvel"
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" /> {busy ? 'Salvando…' : 'Salvar dados cadastrais'}
                </button>
              </div>
            </form>
          </div>

          {/* Lado Direito: Cartão de Soberania (Membro Premium) & Estatísticas */}
          <div className="space-y-6">
            {/* O Cartão Metálico */}
            {(() => {
              const tier = data?.sibcoinTier ?? 'bronze';
              const sibcoins = data?.sibcoinBalance ?? 0;
              const cardThemes = {
                bronze: {
                  bg: 'linear-gradient(135deg, #2b1f1d 0%, #1e1210 50%, #120908 100%)',
                  border: 'border-orange-500/20 shadow-orange-500/5',
                  glow: 'rgba(249, 115, 22, 0.08)',
                  textColor: 'text-orange-400',
                  badge: 'Membro Bronze',
                  accent: 'from-orange-500/20 to-orange-900/10'
                },
                silver: {
                  bg: 'linear-gradient(135deg, #2a2c30 0%, #18191c 50%, #0d0d0f 100%)',
                  border: 'border-zinc-400/20 shadow-zinc-400/5',
                  glow: 'rgba(161, 161, 170, 0.08)',
                  textColor: 'text-zinc-300',
                  badge: 'Membro Prata',
                  accent: 'from-zinc-400/20 to-zinc-800/10'
                },
                gold: {
                  bg: 'linear-gradient(135deg, #382e18 0%, #201a0d 50%, #100c05 100%)',
                  border: 'border-amber-400/30 shadow-amber-400/5',
                  glow: 'rgba(251, 191, 36, 0.08)',
                  textColor: 'text-amber-400',
                  badge: 'Membro Ouro',
                  accent: 'from-amber-400/20 to-amber-900/10'
                },
                diamond: {
                  bg: 'linear-gradient(135deg, #1b2f3a 0%, #0c1a24 50%, #050a0f 100%)',
                  border: 'border-cyan-400/30 shadow-cyan-400/10',
                  glow: 'rgba(34, 211, 238, 0.12)',
                  textColor: 'text-cyan-400',
                  badge: 'Investidor Diamante',
                  accent: 'from-cyan-400/25 to-blue-900/15'
                }
              }[tier];

              return (
                <div 
                  className={`relative overflow-hidden aspect-[1.58/1] w-full rounded-2xl border ${cardThemes.border} p-5 flex flex-col justify-between shadow-2xl transition-all duration-500 hover:-translate-y-1`}
                  style={{ 
                    background: cardThemes.bg,
                    boxShadow: `0 20px 40px -15px ${cardThemes.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
                  }}
                >
                  {/* Luz reflexiva de metal premium */}
                  <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${cardThemes.accent} blur-[40px] rounded-full pointer-events-none`} />
                  
                  <div className="flex justify-between items-start z-10">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Cartão Soberano</h4>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${cardThemes.textColor} block mt-0.5`}>
                        {cardThemes.badge}
                      </span>
                    </div>
                    {/* Chip do Cartão */}
                    <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-400/30 to-amber-500/10 border border-amber-400/20 relative overflow-hidden">
                      <div className="absolute inset-x-0 top-2 border-b border-amber-400/30" />
                      <div className="absolute inset-y-0 left-3 border-r border-amber-400/30" />
                    </div>
                  </div>

                  <div className="z-10 mt-auto">
                    <p className="text-si-1 font-black tracking-widest text-lg font-mono">
                      •••• •••• •••• {score}
                    </p>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Titular</p>
                        <p className="text-xs font-bold text-zinc-300 truncate max-w-[150px]">{name || user?.displayName || 'Usuário Sibanki'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Saldo SibCoin</p>
                        <p className="text-xs font-black text-emerald-400">₵ {sibcoins.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Dados consolidados */}
            <div className="bg-si-card rounded-2xl border border-si-border p-5 space-y-4">
              <h3 className="font-bold text-si-1 text-[11px] uppercase tracking-[0.15em] border-b border-si-border pb-2 text-zinc-400">Dados Consolidados</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#111] p-3 rounded-xl border border-white/[0.03] text-center">
                  <p className="text-[10px] text-si-5 font-bold uppercase tracking-wider mb-1">FinScore</p>
                  <p className="text-lg font-black text-emerald-400">{score}</p>
                </div>
                <div className="bg-[#111] p-3 rounded-xl border border-white/[0.03] text-center">
                  <p className="text-[10px] text-si-5 font-bold uppercase tracking-wider mb-1">Lançamentos</p>
                  <p className="text-lg font-black text-si-1">{entries.length}</p>
                </div>
                <div className="bg-[#111] p-3 rounded-xl border border-white/[0.03] text-center">
                  <p className="text-[10px] text-si-5 font-bold uppercase tracking-wider mb-1">Metas</p>
                  <p className="text-lg font-black text-si-1">{goals.length}</p>
                </div>
                <div className="bg-[#111] p-3 rounded-xl border border-white/[0.03] text-center">
                  <p className="text-[10px] text-si-5 font-bold uppercase tracking-wider mb-1">Contas</p>
                  <p className="text-lg font-black text-si-1">{accounts.length}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── ABA: SEGURANÇA (TAB ANIMADA) ── */}
      {activeTab === 'seguranca' && (
        <div key="seguranca" className="max-w-xl space-y-6 tab-animate">
          {isEmailProvider ? (
            <>
              {/* Form 1: Senha */}
              <div className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
                <h3 className="font-bold text-si-1 text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-400" /> Alterar Senha
                </h3>
                <p className="text-si-5 text-xs">Mantenha sua senha forte com letras, números e símbolos.</p>
                
                {passwordMessage && (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
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
                    <label htmlFor="current-password" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                      Senha atual
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                      Nova senha
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                      minLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password-confirm" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                      Confirmar nova senha
                    </label>
                    <input
                      id="new-password-confirm"
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={passwordBusy}
                    className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" /> {passwordBusy ? 'Alterando…' : 'Atualizar Senha'}
                  </button>
                </form>
              </div>

              {/* Form 2: Email */}
              <div className="bg-si-card rounded-2xl border border-si-border p-6 space-y-4">
                <h3 className="font-bold text-si-1 text-base flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" /> Alterar E-mail
                </h3>
                <p className="text-si-5 text-xs">Atenção: o novo e-mail será necessário para fazer login após salvar.</p>

                {emailMessage && (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
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
                    <label htmlFor="new-email" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                      Novo e-mail de acesso
                    </label>
                    <input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="novo@email.com"
                      className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email-password" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                      Senha atual para confirmação
                    </label>
                    <input
                      id="email-password"
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={emailBusy}
                    className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold text-sm"
                  >
                    {emailBusy ? 'Alterando…' : 'Confirmar Novo E-mail'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="bg-si-card rounded-2xl border border-si-border p-6 flex flex-col items-center text-center space-y-4">
              <Shield className="w-12 h-12 text-blue-400" />
              <div>
                <h3 className="font-bold text-si-1 text-lg">Provedor Social Ativo</h3>
                <p className="text-si-5 text-sm mt-1 max-w-sm">
                  Sua conta está vinculada através de um provedor social externo (ex: Google). 
                  Toda a segurança de credenciais e troca de e-mail é gerenciada de forma segura pelo respectivo provedor.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA: PRIVACIDADE (TAB ANIMADA) ── */}
      {activeTab === 'privacidade' && (
        <div key="privacidade" className="bg-si-card rounded-2xl border border-si-border p-6 max-w-xl space-y-6 tab-animate">
          <div>
            <h3 className="font-bold text-si-1 text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" /> Políticas de Privacidade e Consentimento
            </h3>
            <p className="text-si-5 text-xs mt-1">Gerencie a governança sobre o tráfego e processamento de seus dados financeiros.</p>
          </div>
          
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
                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-si-card disabled:opacity-50 cursor-pointer ${
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
        </div>
      )}

      {/* ── ABA: MODO FAMÍLIA (TAB ANIMADA) ── */}
      {activeTab === 'familia' && (
        <div key="familia" className="bg-si-card rounded-2xl border border-si-border p-6 max-w-xl space-y-4 tab-animate">
          <div>
            <h3 className="font-bold text-si-1 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Acompanhamento de Finanças Compartilhadas
            </h3>
            <p className="text-si-5 text-xs mt-1">Convide seu cônjuge ou familiar por e-mail para acompanhar de forma integrada o orçamento da casa.</p>
          </div>

          {data?.family?.inviteEmail && (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-xs leading-relaxed text-zinc-300">
              <p className="font-bold text-amber-400 uppercase tracking-wider mb-1">✉ Convite Pendente / Ativo</p>
              <p>O e-mail <span className="font-bold text-si-1">{data.family.inviteEmail}</span> está associado ao seu Modo Família com permissão de <span className="font-bold text-si-1">{data.family.role === 'editor' ? 'Visualizar e Lançar' : 'Somente Visualizar'}</span>.</p>
              <p className="text-[11px] text-zinc-500 mt-2">Atualizado em: {new Date(data.family.updatedAt).toLocaleDateString('pt-BR')} às {new Date(data.family.updatedAt).toLocaleTimeString('pt-BR')}</p>
            </div>
          )}

          <form onSubmit={handleSaveFamily} className="space-y-4 pt-2">
            <div>
              <label htmlFor="family-invite-email" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                E-mail do parceiro(a)
              </label>
              <input
                id="family-invite-email"
                type="email"
                value={familyInviteEmail}
                onChange={(e) => setFamilyInviteEmail(e.target.value)}
                placeholder="parceiro@exemplo.com"
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label htmlFor="family-role" className="block text-xs font-semibold text-si-5 uppercase tracking-wider mb-1">
                Permissão de Acesso
              </label>
              <select
                id="family-role"
                value={familyRole}
                onChange={(e) => setFamilyRole(e.target.value as 'viewer' | 'editor')}
                className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 focus:outline-none focus:border-blue-500 text-sm font-semibold"
              >
                <option value="viewer">Apenas visualizar (Leitura)</option>
                <option value="editor">Visualizar e lançar transações (Escrita)</option>
              </select>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={familyBusy}
                className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 text-sm font-bold transition-all"
              >
                {familyBusy ? 'Salvando…' : 'Salvar configurações de compartilhamento'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
