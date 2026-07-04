import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Login dedicado do painel admin (deploy separado em sibanki-admin).
 * A sessão Firebase é por origem — logar no app NÃO carrega pra cá.
 *
 * Os admins do Sibanki usam contas Google, então "Entrar com Google" é a
 * ação principal. E-mail/senha fica como alternativa (contas dedicadas).
 * Em ambos os casos o AdminRoute valida a claim `admin` após o login.
 */
const googleProvider = new GoogleAuthProvider();

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const loginWithGoogle = async () => {
    setErr('');
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // O AdminRoute valida a claim admin após o login.
    } catch (ex: any) {
      const code = ex?.code || '';
      // Usuário fechou o popup / cancelou — não é erro pra mostrar.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setBusy(false);
        return;
      }
      setErr(
        code === 'auth/popup-blocked'
          ? 'O navegador bloqueou o pop-up. Libere e tente de novo.'
          : 'Falha no login com Google. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      // O AdminRoute valida a claim admin após o login.
    } catch (ex: any) {
      const code = ex?.code || '';
      setErr(
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Senha incorreta.'
          : code === 'auth/user-not-found'
            ? 'Usuário não encontrado.'
            : 'Falha no login. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-si-card border border-si-border-md rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-si-over-2 border border-si-border flex items-center justify-center text-si-2">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-[0.2em] text-si-1 uppercase">Sibanki Admin</h1>
            <p className="text-[10px] text-si-4 font-bold tracking-[0.15em] uppercase mt-1">Acesso restrito</p>
          </div>
        </div>

        {/* Ação principal — login com Google (como os admins de fato acessam) */}
        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={busy}
          className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-bold tracking-[0.06em] flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.34z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          {busy ? 'Entrando...' : 'Entrar com Google'}
        </button>

        {/* Divisor */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-si-border" />
          <span className="text-[10px] text-si-5 font-bold tracking-[0.15em] uppercase">ou</span>
          <div className="flex-1 h-px bg-si-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="E-mail de administrador"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full px-3 py-2.5 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
          />
          <input
            type="password"
            required
            placeholder="Senha"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete="current-password"
            className="w-full px-3 py-2.5 bg-si-bg border border-si-border rounded-lg text-xs text-si-1 outline-none focus:border-si-border-lg transition-colors placeholder:text-si-5"
          />
          {err && <p className="text-[11px] text-red-400 font-medium">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 px-4 rounded-lg bg-si-over-2 hover:bg-si-over-3 border border-si-border text-xs font-bold tracking-[0.18em] uppercase text-si-1 transition-colors disabled:opacity-50"
          >
            {busy ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
