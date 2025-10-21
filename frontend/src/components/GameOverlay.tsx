import { useState, useEffect } from 'react';
import { useLiveStore } from '@/store/liveStore';
import { useBuildStore } from '@/store/buildStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Minimize2,
  Maximize2,
  Bell,
  BellOff,
  Radio,
  Timer,
  Zap
} from 'lucide-react';
import { formatGameTime, getUpcomingEvents } from '@/utils/gameTimers';

/**
 * GameOverlay - Overlay fixo em tela cheia durante o jogo
 *
 * Mostra:
 * - Status da conexão GSI
 * - Próximos eventos (5 minutos)
 * - Alertas visuais grandes
 * - Pode ser minimizado
 */
export function GameOverlay() {
  const [minimized, setMinimized] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const snapshot = useLiveStore((state) => state.snapshot);
  const status = useLiveStore((state) => state.status);
  const timers = useBuildStore((state) => state.timers);

  const isConnected = status === 'connected';
  const isInGame = isConnected && snapshot !== null;
  const gameTime = snapshot?.map?.gameTime || 0;

  // Pegar próximos eventos
  const upcomingEvents = isInGame ? getUpcomingEvents(gameTime, 300) : [];
  const nextEvent = upcomingEvents[0];

  // Se não está conectado, não mostrar
  if (!isConnected) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="p-4 bg-destructive/10 border-destructive">
          <div className="flex items-center gap-2 text-destructive">
            <BellOff className="w-4 h-4" />
            <span className="text-sm font-medium">GSI Desconectado</span>
          </div>
        </Card>
      </div>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="p-3 bg-card/95 backdrop-blur border-primary/50">
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium">
                {isInGame ? formatGameTime(gameTime) : 'Aguardando...'}
              </span>
            </div>

            {/* Next Event */}
            {nextEvent && (
              <div className="text-xs">
                {nextEvent.name} - {Math.floor(nextEvent.timeRemaining / 60)}:{(Math.floor(nextEvent.timeRemaining % 60)).toString().padStart(2, '0')}
              </div>
            )}

            {/* Expand Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMinimized(false)}
              className="h-6 w-6 p-0"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="p-4 bg-card/95 backdrop-blur border-primary/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-green-500 animate-pulse" />
            <span className="font-semibold">Live Mode</span>
            {isInGame && (
              <Badge variant="default" className="text-xs">
                <Timer className="w-3 h-3 mr-1" />
                {formatGameTime(gameTime)}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className="h-7 w-7 p-0"
            >
              {alertsEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMinimized(true)}
              className="h-7 w-7 p-0"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Game Status */}
        {isInGame && snapshot.hero && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{snapshot.hero.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  Nível {snapshot.hero.level} • {snapshot.player?.kills || 0}/{snapshot.player?.deaths || 0}/{snapshot.player?.assists || 0}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-mono">{snapshot.player?.gold || 0}g</div>
                <div className="text-xs text-muted-foreground">
                  {snapshot.player?.gpm || 0} GPM
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Event - BIG ALERT */}
        {nextEvent && nextEvent.timeRemaining < 60 && alertsEnabled && (
          <div className={`mb-4 p-4 rounded-lg border-2 ${
            nextEvent.timeRemaining < 10
              ? 'bg-red-500/20 border-red-500 animate-pulse'
              : 'bg-orange-500/20 border-orange-500'
          }`}>
            <div className="text-center">
              <div className="text-3xl mb-2">{nextEvent.name.split(' ')[0]}</div>
              <div className={`text-4xl font-bold font-mono ${
                nextEvent.timeRemaining < 10 ? 'text-red-400' : 'text-orange-400'
              }`}>
                {Math.floor(nextEvent.timeRemaining / 60)}:{(Math.floor(nextEvent.timeRemaining % 60)).toString().padStart(2, '0')}
              </div>
              <div className="text-xs mt-2 text-muted-foreground">
                {nextEvent.name}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Events List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            PRÓXIMOS EVENTOS
          </div>

          {upcomingEvents.length === 0 && (
            <div className="text-xs text-center text-muted-foreground py-4">
              {isInGame ? 'Nenhum evento nos próximos 5 min' : 'Entre em uma partida'}
            </div>
          )}

          {upcomingEvents.slice(0, 5).map((event, index) => {
            const minutes = Math.floor(event.timeRemaining / 60);
            const seconds = Math.floor(event.timeRemaining % 60);

            return (
              <div
                key={`${event.type}-${event.spawnTime}`}
                className={`p-2 rounded border ${
                  index === 0
                    ? 'bg-primary/10 border-primary/50'
                    : 'bg-card border-border/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {index === 0 && <Zap className="w-3 h-3 text-primary" />}
                    <span className="text-xs">{event.name}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active Timers */}
        {timers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="text-xs font-semibold text-muted-foreground mb-2">
              TIMERS ATIVOS ({timers.length})
            </div>
            <div className="space-y-1">
              {timers.slice(0, 3).map((timer) => {
                const remaining = Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;

                return (
                  <div key={timer.id} className="flex items-center justify-between text-xs">
                    <span className="truncate flex-1">{timer.name}</span>
                    <span className="font-mono">
                      {minutes}:{seconds.toString().padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer - GSI Status */}
        <div className="mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground text-center">
          GSI: <span className="text-green-500">Conectado</span>
          {isInGame && ` • Match ${snapshot.map?.matchId || 'Unknown'}`}
        </div>
      </Card>
    </div>
  );
}
