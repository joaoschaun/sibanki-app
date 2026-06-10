import { Flame, Target, TrendingUp, Calendar, DollarSign, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Fire() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto">
          <Flame className="w-8 h-8 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calculadora FIRE</h1>
          <p className="text-si-5 text-sm mt-1">Financial Independence, Retire Early</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
          Em construção
        </span>
      </div>

      {/* O que vai ser */}
      <div className="bg-si-card rounded-2xl border border-si-border p-6 space-y-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-si-5">O que vai ter aqui</p>
        <div className="space-y-4">
          {[
            { icon: <Target className="w-4 h-4 text-orange-400" />, title: 'Meta de independência financeira', desc: 'Calcule quanto você precisa acumular para viver dos rendimentos' },
            { icon: <Calendar className="w-4 h-4 text-orange-400" />, title: 'Data estimada da liberdade', desc: 'Projeção de quando você atinge o número FIRE com sua taxa de poupança atual' },
            { icon: <TrendingUp className="w-4 h-4 text-orange-400" />, title: 'Simulador de cenários', desc: 'Ajuste taxa de poupança, retorno esperado e veja o impacto na data de aposentadoria' },
            { icon: <DollarSign className="w-4 h-4 text-orange-400" />, title: 'Regra dos 4%', desc: 'Patrimônio necessário baseado nos seus gastos atuais para saques perpétuos' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-si-over-2 flex items-center justify-center shrink-0 mt-0.5">
                {icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-si-2">{title}</p>
                <p className="text-xs text-si-5 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seu Ld como prévia */}
      <div className="bg-si-card rounded-2xl border border-si-border p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-si-5 mb-3">Por enquanto, acompanhe seu progresso em</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-si-over-2 border border-si-border hover:border-si-border-md transition-colors"
        >
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-si-4" />
            <div className="text-left">
              <p className="text-sm font-semibold text-si-2">Dias de Liberdade (Ld)</p>
              <p className="text-xs text-si-5">Sua prévia da independência financeira</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-si-5" />
        </button>
      </div>
    </div>
  );
}
