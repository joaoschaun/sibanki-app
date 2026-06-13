import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';

function BrandLogo({ height = 30 }: { height?: number }) {
  return (
    <svg height={height} viewBox="0 0 132 30" xmlns="http://www.w3.org/2000/svg" aria-label="Sibanki">
      <rect x="5.6" y="4.4" width="16" height="4.6" rx="2.3" fill="currentColor" />
      <rect x="5" y="8.6" width="4.2" height="12.6" rx="2.1" fill="currentColor" transform="rotate(16 7.1 9.5)" />
      <rect x="17.6" y="8.6" width="4.2" height="12.6" rx="2.1" fill="currentColor" transform="rotate(-16 19.7 9.5)" />
      <text x="31" y="21.5" fontFamily="Inter, sans-serif" fontSize="17.5" fontWeight="700" fill="currentColor" letterSpacing="-0.7">
        sibanki
      </text>
    </svg>
  );
}

const inputCls =
  'w-full px-4 py-3.5 rounded-xl bg-si-bg border border-si-border-md text-si-1 text-[15px] placeholder:text-si-5 focus:outline-none focus:border-si-3 focus:ring-1 focus:ring-si-border-md transition-colors';
const primaryBtnCls =
  'w-full py-3.5 rounded-xl bg-white hover:bg-zinc-100 active:scale-[0.99] text-zinc-900 font-bold text-[15px] disabled:opacity-50 transition-all';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [registerMode, setRegisterMode] = useState(
    () => new URLSearchParams(window.location.search).get('modo') === 'cadastro'
  );
  const [registerDone, setRegisterDone] = useState(false);
  const [ldDemo, setLdDemo] = useState(0);

  // Login é superfície de marca: sempre dark, independente do tema escolhido
  // dentro do app. Restaura a preferência do usuário ao sair da tela.
  useEffect(() => {
    const prev = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = 'dark';
    return () => {
      try {
        document.documentElement.dataset.theme =
          localStorage.getItem('sibanki-theme') || prev || 'dark';
      } catch {
        document.documentElement.dataset.theme = prev || 'dark';
      }
    };
  }, []);

  // contador animado do painel de marca
  useEffect(() => {
    const target = 127;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 1800, 1);
      setLdDemo(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

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

  const RING_C = 251; // 2πr para r=40
  const ringOffset = RING_C - RING_C * Math.min((ldDemo / 365) * 1.6, 1);

  return (
    <div className="min-h-screen bg-si-bg grid lg:grid-cols-[1.1fr_1fr]">
      {/* ── Painel de marca (desktop) ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between relative overflow-hidden border-r border-si-border p-12 xl:p-16">
        <div
          className="absolute -top-40 -left-32 w-[640px] h-[640px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 62%)' }}
        />
        <a href="https://www.sibanki.com.br" className="text-si-1 relative z-10 w-fit">
          <BrandLogo height={32} />
        </a>

        <div className="relative z-10 max-w-md">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-si-5 mb-4">
            Financial OS · Brasil
          </p>
          <h1 className="text-si-1 text-4xl xl:text-[44px] font-extrabold leading-[1.08] tracking-[-0.03em] mb-5">
            Quantos dias de liberdade o seu dinheiro compra?
          </h1>
          <p className="text-si-4 text-[15px] leading-relaxed mb-10">
            Conecte seus bancos e veja sua vida financeira como ela é — em uma métrica que nenhum banco te mostra.
          </p>

          <div className="flex items-center gap-7 bg-si-card border border-si-border-md rounded-2xl p-6 w-fit shadow-2xl">
            <div className="relative w-[104px] h-[104px]">
              <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
                <circle cx="52" cy="52" r="40" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle
                  cx="52"
                  cy="52"
                  r="40"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-si-1 text-[26px] font-extrabold leading-none tracking-tight">{ldDemo}</span>
                <span className="text-[8.5px] font-bold tracking-[0.14em] uppercase text-si-5 mt-1">dias livres</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-si-5 mb-2">Ld · Dias de Liberdade</p>
              <span className="inline-flex items-center gap-2 text-emerald-400 text-[13px] font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3.5 py-1.5">
                ● Resiliente
              </span>
              <p className="text-si-5 text-[12px] mt-3">Patrimônio ÷ custo de vida real.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap gap-x-7 gap-y-2 text-[12px] text-si-5">
          <span>🏛️ Open Finance oficial do Banco Central</span>
          <span>👁️ Só leitura — nunca movimenta seu dinheiro</span>
          <span>🇧🇷 LGPD por padrão</span>
        </div>
      </aside>

      {/* ── Formulário ────────────────────────────────────────────── */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden text-si-1 mb-10 flex justify-center">
            <BrandLogo height={30} />
          </div>

          <h2 className="text-si-1 text-[26px] font-extrabold tracking-[-0.02em] mb-1.5">
            {forgotMode ? 'Recuperar acesso' : registerMode ? 'Crie sua conta' : 'Bem-vindo de volta'}
          </h2>
          <p className="text-si-4 text-[14px] mb-8">
            {forgotMode
              ? 'Enviamos um link de redefinição para o seu e-mail.'
              : registerMode
                ? 'Grátis para começar. Sem cartão de crédito.'
                : 'Entre para ver seus Dias de Liberdade.'}
          </p>

          {error && !forgotMode && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
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
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                      {forgotError}
                    </div>
                  )}
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-si-5 mb-2">
                        E-mail da conta
                      </label>
                      <input
                        type="email"
                        placeholder="voce@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </div>
                    <button type="submit" disabled={loading} className={primaryBtnCls}>
                      {loading ? 'Enviando…' : 'Enviar link de redefinição'}
                    </button>
                  </form>
                </>
              )}
              <button
                type="button"
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotError(''); }}
                className="w-full text-center text-si-5 text-sm hover:text-si-2 transition-colors"
              >
                ← Voltar ao login
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
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-si-5 mb-2">
                      E-mail
                    </label>
                    <input
                      type="email"
                      placeholder="voce@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-si-5 mb-2">
                      Senha
                    </label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading} className={primaryBtnCls}>
                    {loading ? 'Criando conta…' : 'Criar conta grátis'}
                  </button>
                  <p className="text-[11.5px] text-si-5 text-center leading-relaxed">
                    Ao criar a conta você concorda em conectar seus dados apenas para leitura. Nada sai do lugar sem você.
                  </p>
                </form>
              )}
              <button
                type="button"
                onClick={() => { setRegisterMode(false); setRegisterDone(false); setError(''); }}
                className="w-full text-center text-si-5 text-sm hover:text-si-2 transition-colors"
              >
                Já tenho conta — entrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-si-5 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-si-5">Senha</label>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-si-5 text-[12px] hover:text-si-2 transition-colors"
                  >
                    Esqueci a senha
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <button type="submit" disabled={loading} className={primaryBtnCls}>
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
          )}

          {!forgotMode && (
            <>
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-si-border-md" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-si-bg text-si-5">ou continue com</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-si-over-2 border border-si-border-md text-si-2 font-semibold text-[14px] hover:bg-si-over-3 hover:text-si-1 disabled:opacity-50 flex items-center justify-center gap-2.5 transition-all"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google
              </button>

              {!registerMode && (
                <p className="text-center text-si-5 text-[13px] mt-7">
                  Primeira vez aqui?{' '}
                  <button
                    type="button"
                    onClick={() => { setRegisterMode(true); setError(''); }}
                    className="text-si-1 font-semibold hover:underline underline-offset-4"
                  >
                    Criar conta grátis
                  </button>
                </p>
              )}
            </>
          )}

          <div className="lg:hidden mt-9 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[11px] text-si-5">
            <span>🏛️ Open Finance BCB</span>
            <span>👁️ Só leitura</span>
            <span>🇧🇷 LGPD</span>
          </div>
        </div>
      </main>
    </div>
  );
}
