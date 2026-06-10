import { useState } from 'react';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [registerMode, setRegisterMode] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setForgotError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setForgotSent(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      setForgotError(
        code === 'auth/user-not-found'
          ? 'Não há conta com este e-mail.'
          : (err as Error)?.message ?? 'Erro ao enviar. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // se falhar, ainda assim seguimos com a conta criada
      }
      setRegisterDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-si-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-si-card border border-si-border-md rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-2">Sibanki</h1>
        <p className="text-si-5 text-sm text-center mb-1">Controle financeiro com IA</p>
        <p className="text-si-5 text-xs text-center mb-8">
          {registerMode ? 'Crie sua conta para começar.' : 'Entre para acessar seus dados.'}
        </p>
        <div className="mb-6 grid gap-2 text-[11px] text-si-5">
          <div className="rounded-lg border border-si-border bg-si-over-1 px-3 py-2">Sem compartilhar senha bancaria no app</div>
          <div className="rounded-lg border border-si-border bg-si-over-1 px-3 py-2">Leitura para insights: sem movimentar seu dinheiro</div>
        </div>

        {error && !forgotMode && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {forgotMode ? (
          <div className="space-y-4">
            {forgotSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                Link de redefinição enviado. Verifique seu e-mail (e a pasta de spam).
              </div>
            ) : (
              <>
                {forgotError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    {forgotError}
                  </div>
                )}
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <input
                    type="email"
                    placeholder="E-mail da sua conta"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar link de redefinição'}
                  </button>
                </form>
              </>
            )}
            <button
              type="button"
              onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError(''); }}
              className="w-full text-center text-si-5 text-sm hover:text-si-3"
            >
              Voltar ao login
            </button>
          </div>
        ) : registerMode ? (
          <div className="space-y-4">
            {registerDone ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm text-center">
                Conta criada! Enviamos um e-mail de verificação. Confirme o endereço antes de entrar.
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                  required
                />
                <input
                  type="password"
                  placeholder="Senha (mín. 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold disabled:opacity-50"
                >
                  {loading ? 'Criando...' : 'Criar conta'}
                </button>
              </form>
            )}
            <button
              type="button"
              onClick={() => { setRegisterMode(false); setRegisterDone(false); setError(''); }}
              className="w-full text-center text-si-5 text-sm hover:text-si-3"
            >
              Já tenho conta, voltar para login
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              required
            />
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => setForgotMode(true)}
                className="text-si-5 text-sm hover:text-si-3"
              >
                Esqueci a senha
              </button>
              <button
                type="button"
                onClick={() => { setRegisterMode(true); setError(''); }}
                className="text-si-5 text-sm hover:text-si-3"
              >
                Criar conta
              </button>
            </div>
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-si-bg border border-si-border-md text-si-1 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {!forgotMode && (
        <>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-si-border-md" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-si-card text-si-5">ou</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-si-over-2 border border-si-border-md text-si-2 font-bold hover:bg-si-over-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Entrar com Google
        </button>
        </>
        )}
      </div>
    </div>
  );
}
