/**
 * AppLoadingScreen — Tela de carregamento inicial do Sibanki.
 * Apresenta uma animação SVG + CSS premium no estilo Pierre Finance,
 * com brilho radial, pulsação e rotação suave.
 */
export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a0a0a] overflow-hidden">
      {/* Estilo local para animações personalizadas sem poluir o index.css */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.9; filter: drop-shadow(0 0 15px rgba(34, 197, 94, 0.2)); }
          50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 30px rgba(34, 197, 94, 0.4)); }
        }
        @keyframes spin-custom {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes wave-text {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        .animate-spin-custom {
          animation: spin-custom 10s linear infinite;
        }
        .animate-wave-text {
          animation: wave-text 2s ease-in-out infinite;
        }
      `}</style>

      {/* Gradiente radial de fundo para efeito de profundidade */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40" 
        style={{
          background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.12) 0%, rgba(10, 10, 10, 0) 70%)'
        }}
      />

      <div className="flex flex-col items-center gap-8 z-10 animate-in fade-in duration-700">
        {/* Logo/Símbolo do Sibanki em SVG animado */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Anel Externo com Rotação Lenta */}
          <svg className="absolute inset-0 w-full h-full animate-spin-custom" viewBox="0 0 100 100">
            <circle 
              cx="50" 
              cy="50" 
              r="44" 
              fill="none" 
              stroke="rgba(255, 255, 255, 0.04)" 
              strokeWidth="2"
            />
            <circle 
              cx="50" 
              cy="50" 
              r="44" 
              fill="none" 
              stroke="#22c55e" 
              strokeWidth="2.5"
              strokeDasharray="40 180"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.6))' }}
            />
          </svg>

          {/* Anel de brilho interno com pulsação */}
          <div className="absolute w-16 h-16 rounded-full border border-white/5 bg-white/[0.01] animate-pulse-slow" />

          {/* Letra Central 'S' Estilizada */}
          <span className="text-3xl font-black text-white select-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            S
          </span>

          {/* Dot indicador verde de status online (marca visual) */}
          <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0a] bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
        </div>

        {/* Textos de carregamento */}
        <div className="text-center space-y-2.5">
          <h2 className="text-white font-bold text-sm tracking-[0.25em] uppercase select-none">
            Sibanki
          </h2>
          <p className="text-zinc-500 text-[10px] font-semibold tracking-[0.18em] uppercase select-none animate-wave-text">
            Sincronizando soberania financeira
          </p>
        </div>
      </div>
    </div>
  );
}
