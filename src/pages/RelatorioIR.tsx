import { FileText, Download, Calendar, Tag, PieChart, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RelatorioIR() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-4">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatório IR</h1>
          <p className="text-si-5 text-sm mt-1">Imposto de Renda — seus dados organizados</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
          Em construção
        </span>
      </div>

      {/* O que vai ter */}
      <div className="bg-si-card rounded-2xl border border-si-border p-6 space-y-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-si-5">O que vai ter aqui</p>
        <div className="space-y-4">
          {[
            { icon: <Calendar className="w-4 h-4 text-blue-400" />, title: 'Receitas e despesas por ano-base', desc: 'Seus lançamentos organizados por competência para a declaração' },
            { icon: <Tag className="w-4 h-4 text-blue-400" />, title: 'Categorização para a Receita Federal', desc: 'Mapeamento automático das suas categorias para os campos da declaração' },
            { icon: <PieChart className="w-4 h-4 text-blue-400" />, title: 'Rendimentos de investimentos', desc: 'JCP, dividendos, renda fixa e cripto organizados por código de tributação' },
            { icon: <Download className="w-4 h-4 text-blue-400" />, title: 'Exportar PDF e CSV', desc: 'Formatos prontos para seu contador ou para importar no programa da Receita' },
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

      {/* Alternativa atual */}
      <div className="bg-si-card rounded-2xl border border-si-border p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-si-5 mb-3">Por enquanto, exporte seus dados em</p>
        <button
          onClick={() => navigate('/relatorios')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-si-over-2 border border-si-border hover:border-si-border-md transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-si-4" />
            <div className="text-left">
              <p className="text-sm font-semibold text-si-2">Relatórios PDF</p>
              <p className="text-xs text-si-5">Exporte lançamentos e resumo financeiro</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-si-5" />
        </button>
      </div>
    </div>
  );
}
