import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

/**
 * Login dedicado do painel admin (deploy separado em sibanki-admin).
 * A sessão Firebase é por origem — logar no app NÃO carrega pra cá.
 */
export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

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
