/**
 * AppLoadingScreen — Tela de carregamento inicial do Sibanki.
 * Marca atual (banquinho "si bancar") com anel girando — monocromática,
 * no padrão Pierre (rebrand 11/06/2026; substituiu o "S" com anel verde).
 */
export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a0a0a] overflow-hidden">
      <style>{`
        @keyframes sib-spin { to { transform: rotate(360deg); } }
        @keyframes sib-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
        .sib-spin { animation: sib-spin 1.6s cubic-bezier(.6,.15,.4,.85) infinite; }
        .sib-pulse { animation: sib-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Brilho radial sutil da marca */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, rgba(10,10,10,0) 65%)' }}
      />

      <div className="flex flex-col items-center gap-8 z-10 animate-in fade-in duration-700">
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Anel girando — neutro */}
          <svg className="absolute inset-0 w-full h-full sib-spin" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
            <circle
              cx="50" cy="50" r="44" fill="none" stroke="#f5f5f5" strokeWidth="2.5"
              strokeDasharray="52 224" strokeLinecap="round"
            />
          </svg>

          {/* Símbolo do banquinho */}
          <svg className="sib-pulse" width="40" height="40" viewBox="0 0 64 64" aria-hidden="true">
            <rect x="15" y="17" width="34" height="10" rx="5" fill="#f5f5f5" />
            <rect x="14" y="26" width="9" height="27" rx="4.5" fill="#f5f5f5" transform="rotate(16 18.5 28)" />
            <rect x="41" y="26" width="9" height="27" rx="4.5" fill="#f5f5f5" transform="rotate(-16 45.5 28)" />
          </svg>
        </div>

        <div className="text-center space-y-2.5">
          <h2 className="text-white font-bold text-sm tracking-[0.25em] uppercase select-none">sibanki</h2>
          <p className="text-zinc-500 text-[11px] font-semibold tracking-[0.18em] uppercase select-none sib-pulse">
            Calculando a sua soberania
          </p>
        </div>
      </div>
    </div>
  );
}
