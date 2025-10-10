import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';

export const PWAUpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('✅ Service Worker registrado');
      // Verificar por atualizações a cada hora
      r && setInterval(() => {
        r.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      console.log('✅ App pronto para funcionar offline');
      setShowPrompt(true);
      // Auto-fechar após 5s
      setTimeout(() => setShowPrompt(false), 5000);
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <Card className="p-4 border-primary/50 shadow-lg">
        {needRefresh ? (
          <>
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">Nova versão disponível!</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Uma atualização está pronta. Recarregue para obter a versão mais recente.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateServiceWorker(true)}
                    className="gap-2"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Atualizar Agora
                  </Button>
                  <Button size="sm" variant="outline" onClick={close}>
                    Depois
                  </Button>
                </div>
              </div>
              <button
                onClick={close}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 rounded-full bg-success" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">App pronto para offline!</h4>
                <p className="text-xs text-muted-foreground">
                  Você pode usar o app mesmo sem conexão agora.
                </p>
              </div>
              <button
                onClick={close}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
