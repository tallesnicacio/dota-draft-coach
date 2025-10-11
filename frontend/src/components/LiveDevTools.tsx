import { useState } from 'react';
import { Code, ChevronDown, ChevronUp, Activity, Wifi, Package, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLiveStore, selectConnectionQuality } from '@/store/liveStore';
import { liveClient } from '@/services/liveClient';

/**
 * LiveDevTools - Debug panel for Live Mode
 *
 * Shows connection metrics, snapshot data, and diagnostic information
 * Useful for development and troubleshooting
 */

export const LiveDevTools = () => {
  const [expanded, setExpanded] = useState(false);
  const [snapshotExpanded, setSnapshotExpanded] = useState(false);

  const store = useLiveStore();
  const connectionQuality = selectConnectionQuality(store);
  const clientStatus = liveClient.getStatus();

  return (
    <Card className="border-purple-500/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-500">
              <Code className="h-5 w-5" />
              Live Mode DevTools
            </CardTitle>
            <CardDescription>Informações de debug e métricas de conexão</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Status da Conexão
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Enabled:</span>{' '}
                <Badge variant={store.enabled ? 'default' : 'secondary'}>
                  {store.enabled ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>{' '}
                <Badge variant={store.status === 'connected' ? 'default' : 'secondary'}>
                  {store.status}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Conectado:</span>{' '}
                <Badge variant={clientStatus.connected ? 'default' : 'secondary'}>
                  {clientStatus.connected ? 'Sim' : 'Não'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Autenticado:</span>{' '}
                <Badge variant={clientStatus.authenticated ? 'default' : 'secondary'}>
                  {clientStatus.authenticated ? 'Sim' : 'Não'}
                </Badge>
              </div>
            </div>
            {store.error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                <strong>Erro:</strong> {store.error}
              </div>
            )}
          </div>

          {/* Connection Quality */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Qualidade da Conexão
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Confiabilidade:</span>{' '}
                <Badge
                  variant={
                    connectionQuality.reliability === 'high'
                      ? 'default'
                      : connectionQuality.reliability === 'medium'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {connectionQuality.reliability}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Pacotes:</span>{' '}
                <span className="font-mono">{connectionQuality.packetsReceived}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Duplicados:</span>{' '}
                <span className="font-mono">{connectionQuality.duplicates}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Dedup Rate:</span>{' '}
                <span className="font-mono">{connectionQuality.deduplicationRate.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Reconexões:</span>{' '}
                <span className="font-mono">{connectionQuality.reconnectAttempts}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Última atualização:</span>{' '}
                <span className="font-mono">
                  {store.lastUpdate ? `${Math.floor((Date.now() - store.lastUpdate) / 1000)}s` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Match */}
          {store.matchId && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Partida Atual
              </h4>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Match ID:</span>{' '}
                  <code className="bg-muted px-1 rounded">{store.matchId}</code>
                </div>
                {store.snapshot?.hero && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Herói:</span>{' '}
                      <span className="font-medium">{store.snapshot.hero.displayName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Level:</span>{' '}
                      <span className="font-mono">{store.snapshot.hero.level}</span>
                    </div>
                    {store.snapshot.player && (
                      <>
                        <div>
                          <span className="text-muted-foreground">K/D/A:</span>{' '}
                          <span className="font-mono">
                            {store.snapshot.player.kills}/{store.snapshot.player.deaths}/{store.snapshot.player.assists}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Gold:</span>{' '}
                          <span className="font-mono">{store.snapshot.player.gold.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Snapshot Data */}
          {store.snapshot && (
            <Collapsible open={snapshotExpanded} onOpenChange={setSnapshotExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  {snapshotExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Ocultar Snapshot JSON
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Ver Snapshot JSON
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-96">
                  {JSON.stringify(store.snapshot, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (store.enabled && store.status !== 'disconnected') {
                  liveClient.disconnect();
                  useLiveStore.getState().reset();
                  liveClient.connect();
                }
              }}
              disabled={!store.enabled || store.status === 'disconnected'}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconectar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => useLiveStore.getState().reset()}
            >
              Limpar Estado
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
