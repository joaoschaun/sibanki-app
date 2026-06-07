/**
 * AppLoadingScreen — Tela de carregamento inicial do Sibanki.
 * Exibida enquanto o Firebase Auth verifica a sessão do usuário
 * e o splash mínimo de 3 segundos não passou.
 */
export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-si-bg">
      {/* Logo / Identidade visual */}
      <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
        {/* Ícone animado */}
        <div className="relative w-16 h-16">
          {/* Anel externo pulsante */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
          {/* Anel de progresso */}
          <div className="absolute inset-0 rounded-full border-2 border-si-border border-t-blue-500 animate-spin" />
          {/* Núcleo */}
          <div className="absolute inset-2 rounded-full bg-blue-600/10 flex items-center justify-center">
            <span className="text-blue-400 font-bold text-xl select-none">S</span>
          </div>
        </div>

        {/* Texto */}
        <div className="text-center space-y-1">
          <p className="text-si-1 font-bold text-lg tracking-tight">Sibanki</p>
          <p className="text-si-5 text-sm">Carregando sua vida financeira…</p>
        </div>
      </div>
    </div>
  );
}
