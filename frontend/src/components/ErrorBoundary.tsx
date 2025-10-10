import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Callback opcional para logging externo (ex: Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Usar fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback padrão
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="w-6 h-6" />
                Oops! Algo deu errado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                A aplicação encontrou um erro inesperado. Você pode tentar recarregar a página
                ou reportar este problema.
              </p>

              {/* Mostrar detalhes do erro em desenvolvimento */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mt-4 p-4 bg-secondary rounded-lg border border-border">
                  <p className="font-mono text-sm text-destructive font-bold mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 text-xs overflow-auto max-h-64 text-muted-foreground">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={this.handleReset} variant="default" className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Tentar Novamente
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="gap-2"
                >
                  Recarregar Página
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-4 border-t">
                Se o problema persistir, tente limpar o cache do navegador ou entre em contato
                com o suporte.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
