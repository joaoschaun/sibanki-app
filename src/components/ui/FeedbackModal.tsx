import { useState } from 'react';
import { X, MessageSquare, Lightbulb, AlertTriangle, Send, CheckCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { saveFeedback, type FeedbackCategory } from '../../services/saveFeedback';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: FeedbackCategory; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'sugestao',
    label: 'SUGESTÃO',
    icon: <Lightbulb className="w-4 h-4" />,
    desc: 'Ideia para melhorar o produto',
  },
  {
    id: 'critica',
    label: 'CRÍTICA',
    icon: <MessageSquare className="w-4 h-4" />,
    desc: 'Algo que não está funcionando bem',
  },
  {
    id: 'erro',
    label: 'ERRO',
    icon: <AlertTriangle className="w-4 h-4" />,
    desc: 'Bug ou problema técnico',
  },
];

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { user } = useAppContext();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const reset = () => {
    setCategory(null);
    setTitle('');
    setDescription('');
    setSent(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title.trim() || !description.trim() || !user) return;

    setLoading(true);
    try {
      await saveFeedback({
        uid: user.uid,
        userName: user.displayName ?? 'Anônimo',
        userEmail: user.email ?? '',
        category,
        title: title.trim(),
        description: description.trim(),
        page: window.location.pathname,
      });
      setSent(true);
    } catch (err) {
      console.error('[FeedbackModal] Erro ao salvar feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enviar feedback"
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-md bg-[#111111] border border-si-border-md rounded-2xl shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-si-border">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-si-4">
              Enviar Feedback
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 hover:bg-si-over-2 rounded-md transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-si-4" />
            </button>
          </div>

          {/* Body */}
          {sent ? (
            <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-semibold text-si-2">Feedback enviado!</p>
              <p className="text-xs text-si-5">
                Obrigado. Sua mensagem foi registrada e será analisada pela equipe.
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 px-5 py-2 text-[10px] font-bold tracking-[0.15em] uppercase border border-si-border rounded-lg hover:bg-si-over-2 transition-colors text-si-3"
              >
                Fechar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
              {/* Category selector */}
              <div>
                <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-si-5 mb-3">
                  Categoria
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${
                        category === cat.id
                          ? 'border-si-3 bg-si-over-2 text-si-1'
                          : 'border-si-border text-si-5 hover:border-si-border-md hover:text-si-3'
                      }`}
                    >
                      {cat.icon}
                      <span className="text-[8px] font-bold tracking-[0.12em] leading-tight">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label
                  htmlFor="fb-title"
                  className="block text-[9px] font-bold tracking-[0.18em] uppercase text-si-5 mb-2"
                >
                  Título
                </label>
                <input
                  id="fb-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Resumo em uma linha"
                  maxLength={120}
                  className="w-full bg-si-over-1 border border-si-border rounded-lg px-3 py-2.5 text-sm text-si-2 placeholder:text-si-5 focus:outline-none focus:border-si-border-md transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="fb-description"
                  className="block text-[9px] font-bold tracking-[0.18em] uppercase text-si-5 mb-2"
                >
                  Descrição
                </label>
                <textarea
                  id="fb-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva com mais detalhes..."
                  maxLength={1000}
                  rows={4}
                  className="w-full bg-si-over-1 border border-si-border rounded-lg px-3 py-2.5 text-sm text-si-2 placeholder:text-si-5 focus:outline-none focus:border-si-border-md transition-colors resize-none"
                />
                <p className="text-right text-[9px] text-si-5 mt-1">
                  {description.length}/1000
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!category || !title.trim() || !description.trim() || loading}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-si-border bg-si-over-2 hover:bg-si-over-3 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[10px] font-bold tracking-[0.15em] uppercase text-si-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-si-4 border-t-si-2 rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {loading ? 'Enviando...' : 'Enviar Feedback'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
