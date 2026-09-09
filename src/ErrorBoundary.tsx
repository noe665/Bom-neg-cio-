import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020123] text-white flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-3xl font-bold text-rose-500 mb-4">Ops! Algo deu errado.</h1>
          <p className="text-slate-300 mb-4 max-w-md">Ocorreu um erro inesperado. Pedimos desculpas pelo inconveniente.</p>
          <pre className="text-xs text-slate-500 bg-black/50 p-4 rounded-lg text-left overflow-auto max-w-2xl w-full">
            {this.state.error?.message}
          </pre>
          <button
            className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg transition-colors"
            onClick={() => window.location.reload()}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
