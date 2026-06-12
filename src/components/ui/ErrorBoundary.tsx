import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '', errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState((prev) => ({ errorCount: prev.errorCount + 1 }));
    try {
      const { trackEvent } = require('../../services/platformEvents');
      trackEvent?.('error_boundary', {
        message: error.message,
        stack: (error.stack || '').slice(0, 500),
        component: (info.componentStack || '').slice(0, 300),
      });
    } catch { /* analytics optional */ }
  }

  private handleRetry = () => this.setState({ hasError: false, message: '' });
  private handleGoHome = () => { window.location.href = '/'; };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const tooManyErrors = this.state.errorCount >= 3;

      return (
        <div className="flex flex-col items-center justify-center py-24 gap-5 px-4">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-lg font-bold text-si-2">Algo deu errado</p>
            <p className="text-sm text-si-5 max-w-sm">
              {tooManyErrors
                ? 'Esse erro continua acontecendo. Tente voltar ao início.'
                : this.state.message || 'Ocorreu um erro inesperado nesta página.'}
            </p>
          </div>
          <div className="flex gap-3">
            {!tooManyErrors && (
              <button type="button" onClick={this.handleRetry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-sm font-bold transition-colors">
                <RotateCcw className="w-4 h-4" />
                Tentar novamente
              </button>
            )}
            <button type="button" onClick={this.handleGoHome}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-si-over-2 hover:bg-si-over-3 text-si-3 text-sm font-bold transition-colors">
              <Home className="w-4 h-4" />
              Início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
