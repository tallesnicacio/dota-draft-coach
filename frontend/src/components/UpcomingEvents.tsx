import { useMemo } from 'react';
import { useLiveStore } from '@/store/liveStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingUp } from 'lucide-react';
import { getUpcomingEvents, formatGameTime } from '@/utils/gameTimers';

/**
 * UpcomingEvents - Shows next 5 minutes of game events
 *
 * Visual timeline of upcoming spawns with countdown
 */
export function UpcomingEvents() {
  const snapshot = useLiveStore((state) => state.snapshot);
  const isConnected = useLiveStore((state) => state.status === 'connected');

  const upcomingEvents = useMemo(() => {
    if (!snapshot?.map) return [];
    const gameTime = snapshot.map.gameTime;
    return getUpcomingEvents(gameTime, 300); // Next 5 minutes
  }, [snapshot]);

  if (!isConnected || upcomingEvents.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            {isConnected ? 'Nenhum evento nos próximos 5 minutos' : 'Conecte ao Live Mode para ver eventos'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-4 h-4 text-primary" />
          Próximos Eventos
          <Badge variant="secondary" className="ml-auto text-xs">
            {upcomingEvents.length} eventos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {upcomingEvents.slice(0, 8).map((event, index) => {
            const spawnGameTime = event.spawnTime;
            const minutes = Math.floor(event.timeRemaining / 60);
            const seconds = Math.floor(event.timeRemaining % 60);

            return (
              <div
                key={`${event.type}-${event.spawnTime}`}
                className={`glass-card p-3 rounded-lg border ${
                  index === 0 ? 'border-primary/50 bg-primary/5' : 'border-border/30'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{event.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Spawn: {formatGameTime(spawnGameTime)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`text-sm font-mono font-semibold ${
                        event.timeRemaining < 30 ? 'text-orange-400' : ''
                      }`}>
                        {minutes}:{seconds.toString().padStart(2, '0')}
                      </div>
                      {index === 0 && (
                        <div className="text-xs text-primary font-semibold">
                          PRÓXIMO
                        </div>
                      )}
                    </div>
                    <Clock className={`w-4 h-4 ${
                      index === 0 ? 'text-primary animate-pulse' : 'text-muted-foreground'
                    }`} />
                  </div>
                </div>

                {/* Progress bar */}
                {event.timeRemaining < 60 && (
                  <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-1000"
                      style={{
                        width: `${100 - (event.timeRemaining / 60) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
          Mostrando próximos 5 minutos de jogo
        </div>
      </CardContent>
    </Card>
  );
}
