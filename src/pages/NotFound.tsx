import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-6xl font-black text-zinc-700 mb-2">404</p>
      <h2 className="text-xl font-bold text-si-3 mb-2">Página não encontrada</h2>
      <p className="text-si-5 text-sm mb-8 max-w-sm">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="bg-blue-600 hover:bg-blue-500 text-si-1 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <Home className="w-4 h-4" /> Início
        </Link>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="bg-si-over-2 border border-si-border-md hover:bg-si-over-3 text-si-3 px-6 py-3 rounded-xl font-medium text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
      </div>
    </div>
  );
}
